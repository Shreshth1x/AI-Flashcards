"use client";

import type {
  AppState,
  Attachment,
  Card,
  Grade,
  Section,
  SectionStats,
  SessionRecord,
  Stats,
} from "./types";
import {
  applyGrade,
  scheduleKey,
  type Scheduling,
} from "./scheduling";
import { SEED_CARDS, SEED_SECTIONS } from "./seed";
import { deleteAttachment } from "./attachments";

const STORAGE_KEY = "mck-prep-state";
const STATE_VERSION = 4;

type StoredStateV1 = {
  version?: 1;
  sections: Section[];
  cards: Array<{
    id: string;
    sectionId: string;
    type?: "basic" | "cloze";
    prompt?: string;
    answer?: string;
    hint?: string;
    text?: string;
    notes?: string;
    attachments?: Attachment[];
    createdAt: number;
  }>;
  stats: Record<
    string,
    Partial<SectionStats> & {
      attempted?: number;
      right?: number;
      partial?: number;
      wrong?: number;
    }
  >;
  history: Array<
    SessionRecord & { right?: number; partial?: number; wrong?: number }
  >;
};

type StoredStateV2 = AppState & { version: 2 | 3 | 4 };

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

function emptyStats(sections: Section[]): Stats {
  const out: Stats = {};
  for (const s of sections) {
    out[s.id] = { attempted: 0, again: 0, hard: 0, good: 0, easy: 0 };
  }
  return out;
}

function defaultState(): AppState {
  const now = Date.now();
  return {
    sections: SEED_SECTIONS.map((s) => ({ ...s })),
    cards: SEED_CARDS.map((c) => ({ ...c, createdAt: now })),
    stats: emptyStats(SEED_SECTIONS),
    history: [],
    scheduling: {},
  };
}

function normalizeAttachments(
  raw: Attachment[] | undefined
): Attachment[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Attachment[] = [];
  for (const a of raw) {
    if (
      a &&
      typeof a.id === "string" &&
      typeof a.mimeType === "string" &&
      typeof a.width === "number" &&
      typeof a.height === "number" &&
      typeof a.bytes === "number"
    ) {
      out.push({
        id: a.id,
        mimeType: a.mimeType,
        width: a.width,
        height: a.height,
        bytes: a.bytes,
        createdAt: a.createdAt ?? Date.now(),
      });
    }
  }
  return out.length > 0 ? out : undefined;
}

function normalizeCard(raw: StoredStateV1["cards"][number]): Card | null {
  const type = raw.type ?? (raw.text ? "cloze" : "basic");
  const attachments = normalizeAttachments(raw.attachments);
  if (type === "cloze") {
    if (!raw.text) return null;
    return {
      id: raw.id,
      sectionId: raw.sectionId,
      type: "cloze",
      text: raw.text,
      notes: raw.notes,
      attachments,
      createdAt: raw.createdAt,
    };
  }
  if (!raw.prompt || !raw.answer) return null;
  return {
    id: raw.id,
    sectionId: raw.sectionId,
    type: "basic",
    prompt: raw.prompt,
    answer: raw.answer,
    hint: raw.hint,
    attachments,
    createdAt: raw.createdAt,
  };
}

function normalizeStats(raw: StoredStateV1["stats"]): Stats {
  const out: Stats = {};
  for (const [sid, s] of Object.entries(raw ?? {})) {
    out[sid] = {
      attempted: s.attempted ?? 0,
      again: s.again ?? s.wrong ?? 0,
      hard: s.hard ?? s.partial ?? 0,
      good: s.good ?? s.right ?? 0,
      easy: s.easy ?? 0,
    };
  }
  return out;
}

function normalizeHistory(
  raw: StoredStateV1["history"]
): SessionRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((h) => ({
    id: h.id,
    startedAt: h.startedAt,
    endedAt: h.endedAt,
    sectionId: h.sectionId,
    total: h.total,
    again: h.again ?? h.wrong ?? 0,
    hard: h.hard ?? h.partial ?? 0,
    good: h.good ?? h.right ?? 0,
    easy: h.easy ?? 0,
  }));
}

function readRaw(): AppState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as
      | StoredStateV1
      | (StoredStateV2 & { scheduling?: Record<string, Scheduling> });
    if (!parsed || typeof parsed !== "object") return null;
    const scheduling =
      "scheduling" in parsed && parsed.scheduling ? parsed.scheduling : {};
    return {
      sections: parsed.sections,
      cards: (parsed.cards as StoredStateV1["cards"])
        .map(normalizeCard)
        .filter((c): c is Card => c !== null),
      stats: normalizeStats(parsed.stats as StoredStateV1["stats"]),
      history: normalizeHistory(parsed.history as StoredStateV1["history"]),
      scheduling,
    };
  } catch {
    return null;
  }
}

function writeRaw(state: AppState): void {
  if (!isBrowser()) return;
  if (process.env.NODE_ENV !== "production") {
    for (const c of state.cards) {
      if (c.attachments) {
        for (const a of c.attachments as unknown as Array<
          Attachment & { data?: string }
        >) {
          if ("data" in a && typeof (a as { data?: unknown }).data === "string") {
            throw new Error(
              "writeRaw: attachment.data leaked into card metadata. " +
                "Image bytes belong in IndexedDB, not localStorage."
            );
          }
        }
      }
    }
  }
  try {
    const stored: StoredStateV2 = { ...state, version: STATE_VERSION };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // localStorage unavailable / quota exceeded — silently ignore
  }
}

function purgeAttachments(ids: string[]): void {
  if (!isBrowser() || ids.length === 0) return;
  for (const id of ids) {
    void deleteAttachment(id);
  }
}

export function loadState(): AppState {
  const raw = readRaw();
  if (!raw) {
    const seeded = defaultState();
    writeRaw(seeded);
    return seeded;
  }
  const stats: Stats = { ...raw.stats };
  for (const s of raw.sections) {
    if (!stats[s.id]) {
      stats[s.id] = { attempted: 0, again: 0, hard: 0, good: 0, easy: 0 };
    }
  }
  return { ...raw, stats, scheduling: raw.scheduling ?? {} };
}

export function saveState(state: AppState): void {
  writeRaw(state);
}

export function resetStats(state: AppState): AppState {
  const next: AppState = {
    ...state,
    stats: emptyStats(state.sections),
    history: [],
    scheduling: {},
  };
  writeRaw(next);
  return next;
}

export function factoryReset(): AppState {
  const next = defaultState();
  writeRaw(next);
  return next;
}

export function recordResult(
  state: AppState,
  sectionId: string,
  grade: Grade,
  cardId: string,
  cloze: number | undefined
): AppState {
  const prev = state.stats[sectionId] ?? {
    attempted: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  };
  const key = scheduleKey(cardId, cloze);
  const nextScheduling = applyGrade(state.scheduling[key], grade);
  const next: AppState = {
    ...state,
    stats: {
      ...state.stats,
      [sectionId]: {
        attempted: prev.attempted + 1,
        again: prev.again + (grade === "again" ? 1 : 0),
        hard: prev.hard + (grade === "hard" ? 1 : 0),
        good: prev.good + (grade === "good" ? 1 : 0),
        easy: prev.easy + (grade === "easy" ? 1 : 0),
      },
    },
    scheduling: { ...state.scheduling, [key]: nextScheduling },
  };
  writeRaw(next);
  return next;
}

export function recordSession(
  state: AppState,
  record: SessionRecord
): AppState {
  const history = [record, ...state.history].slice(0, 10);
  const next: AppState = { ...state, history };
  writeRaw(next);
  return next;
}

export function upsertCard(state: AppState, card: Card): AppState {
  const existing = state.cards.findIndex((c) => c.id === card.id);
  const cards =
    existing >= 0
      ? state.cards.map((c, i) => (i === existing ? card : c))
      : [...state.cards, card];
  const next = { ...state, cards };
  writeRaw(next);
  return next;
}

export function bulkUpsertCards(state: AppState, incoming: Card[]): AppState {
  if (incoming.length === 0) return state;
  const byId = new Map(state.cards.map((c) => [c.id, c]));
  for (const c of incoming) byId.set(c.id, c);
  const next = { ...state, cards: [...byId.values()] };
  writeRaw(next);
  return next;
}

export function deleteCard(state: AppState, cardId: string): AppState {
  const target = state.cards.find((c) => c.id === cardId);
  const ids = target?.attachments?.map((a) => a.id) ?? [];
  const scheduling = { ...state.scheduling };
  for (const k of Object.keys(scheduling)) {
    if (k.startsWith(`${cardId}#`)) delete scheduling[k];
  }
  const next = {
    ...state,
    cards: state.cards.filter((c) => c.id !== cardId),
    scheduling,
  };
  writeRaw(next);
  purgeAttachments(ids);
  return next;
}

export function upsertSection(state: AppState, section: Section): AppState {
  const existing = state.sections.findIndex((s) => s.id === section.id);
  const sections =
    existing >= 0
      ? state.sections.map((s, i) => (i === existing ? section : s))
      : [...state.sections, section];
  const stats = { ...state.stats };
  if (!stats[section.id]) {
    stats[section.id] = { attempted: 0, again: 0, hard: 0, good: 0, easy: 0 };
  }
  const next = { ...state, sections, stats };
  writeRaw(next);
  return next;
}

export function deleteSection(state: AppState, sectionId: string): AppState {
  const removedCards = state.cards.filter((c) => c.sectionId === sectionId);
  const removedAttIds = removedCards.flatMap(
    (c) => c.attachments?.map((a) => a.id) ?? []
  );
  const sections = state.sections.filter((s) => s.id !== sectionId);
  const removedIds = new Set(removedCards.map((c) => c.id));
  const cards = state.cards.filter((c) => c.sectionId !== sectionId);
  const stats = { ...state.stats };
  delete stats[sectionId];
  const scheduling = { ...state.scheduling };
  for (const k of Object.keys(scheduling)) {
    const cardId = k.split("#")[0];
    if (removedIds.has(cardId)) delete scheduling[k];
  }
  const next = { ...state, sections, cards, stats, scheduling };
  writeRaw(next);
  purgeAttachments(removedAttIds);
  return next;
}

export type ExportPayload = {
  exportedAt: number;
  version: number;
  sections: Section[];
  cards: Card[];
};

export function exportData(state: AppState): ExportPayload {
  return {
    exportedAt: Date.now(),
    version: STATE_VERSION,
    sections: state.sections,
    cards: state.cards,
  };
}

export function importData(state: AppState, payload: unknown): AppState {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray((payload as ExportPayload).sections) ||
    !Array.isArray((payload as ExportPayload).cards)
  ) {
    throw new Error("Invalid import payload — expected sections[] and cards[].");
  }
  const p = payload as ExportPayload;
  const cards = (p.cards as unknown as StoredStateV1["cards"])
    .map(normalizeCard)
    .filter((c): c is Card => c !== null);
  const stats = { ...state.stats };
  for (const s of p.sections) {
    if (!stats[s.id]) {
      stats[s.id] = { attempted: 0, again: 0, hard: 0, good: 0, easy: 0 };
    }
  }
  const next: AppState = {
    ...state,
    sections: p.sections,
    cards,
    stats,
  };
  writeRaw(next);
  return next;
}
