"use client";

import type { AppState, Card, Grade, QueueItem } from "./types";
import { clozeNumbers } from "./cloze";
import { bucketOf, scheduleKey, type Bucket } from "./scheduling";
import { shuffle } from "./shuffle";

const SESSION_KEY = "mck-prep-session";

export type ResultEntry = {
  cardId: string;
  cloze?: number;
  grade: Grade;
};

export type ActiveSession = {
  sectionId: string | "__mixed__";
  sectionLabel: string;
  queue: QueueItem[];
  index: number;
  results: ResultEntry[];
  startedAt: number;
};

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

type LegacyResultEntry = {
  cardId: string;
  cloze?: number;
  grade?: Grade;
  result?: Grade;
};

type StoredSession = {
  sectionId: string | "__mixed__";
  sectionLabel: string;
  queue?: QueueItem[];
  cardIds?: string[];
  index?: number;
  results?: LegacyResultEntry[];
  startedAt: number;
};

export function loadSession(): ActiveSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    const queue: QueueItem[] = parsed.queue
      ? parsed.queue
      : (parsed.cardIds ?? []).map((id) => ({ cardId: id }));
    const results: ResultEntry[] = (parsed.results ?? []).map((r) => ({
      cardId: r.cardId,
      cloze: r.cloze,
      grade: (r.grade ?? r.result ?? "again") as Grade,
    }));
    return {
      sectionId: parsed.sectionId,
      sectionLabel: parsed.sectionLabel,
      queue,
      index: parsed.index ?? 0,
      results,
      startedAt: parsed.startedAt,
    };
  } catch {
    return null;
  }
}

export function saveSession(s: ActiveSession): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {}
}

export function clearSession(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {}
}

// Expand a list of card ids into a queue. Cloze cards expand into one queue
// item per cloze number.
export function expandQueue(ids: string[], byId: Map<string, Card>): QueueItem[] {
  const out: QueueItem[] = [];
  for (const id of ids) {
    const card = byId.get(id);
    if (!card) continue;
    if (card.type === "cloze") {
      const nums = clozeNumbers(card.text);
      if (nums.length === 0) continue;
      for (const n of nums) out.push({ cardId: id, cloze: n });
    } else {
      out.push({ cardId: id });
    }
  }
  return out;
}

export const DEFAULT_NEW_PER_SESSION = 20;
export const DEFAULT_REVIEW_CAP = 100;

// Bucket queue items by SR state and apply Anki-like ordering: due reviews
// first, then learning, then up to `newCap` new cards. Each bucket is shuffled
// internally for variety. If nothing is due/learning/new, returns an empty
// queue (caller can fall back to cram-mode).
export function buildStudyQueue(
  items: readonly QueueItem[],
  state: AppState,
  opts: { newCap?: number; reviewCap?: number; now?: number } = {}
): QueueItem[] {
  const now = opts.now ?? Date.now();
  const newCap = opts.newCap ?? DEFAULT_NEW_PER_SESSION;
  const reviewCap = opts.reviewCap ?? DEFAULT_REVIEW_CAP;

  const buckets: Record<Bucket, QueueItem[]> = {
    due: [],
    learning: [],
    new: [],
    later: [],
  };
  for (const it of items) {
    const key = scheduleKey(it.cardId, it.cloze);
    const sched = state.scheduling[key];
    buckets[bucketOf(sched, now)].push(it);
  }
  return [
    ...shuffle(buckets.due).slice(0, reviewCap),
    ...shuffle(buckets.learning),
    ...shuffle(buckets.new).slice(0, newCap),
  ];
}

// Cram mode: every item, shuffled, no SR filtering.
export function buildCramQueue(items: readonly QueueItem[]): QueueItem[] {
  return shuffle(items);
}

export type QueueCounts = Record<Bucket, number>;

export function countBuckets(
  items: readonly QueueItem[],
  state: AppState,
  now: number = Date.now()
): QueueCounts {
  const counts: QueueCounts = { due: 0, learning: 0, new: 0, later: 0 };
  for (const it of items) {
    const key = scheduleKey(it.cardId, it.cloze);
    counts[bucketOf(state.scheduling[key], now)] += 1;
  }
  return counts;
}

export function startSession(
  sectionId: string | "__mixed__",
  sectionLabel: string,
  queue: QueueItem[]
): ActiveSession {
  const session: ActiveSession = {
    sectionId,
    sectionLabel,
    queue,
    index: 0,
    results: [],
    startedAt: Date.now(),
  };
  saveSession(session);
  return session;
}
