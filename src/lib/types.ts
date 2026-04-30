export type CardKind = "basic" | "cloze";

export type AttachmentMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

export type Attachment = {
  id: string;
  mimeType: AttachmentMime;
  width: number;
  height: number;
  bytes: number;
  createdAt: number;
};

type CardBase = {
  id: string;
  sectionId: string;
  createdAt: number;
  attachments?: Attachment[];
};

export type BasicCard = CardBase & {
  type: "basic";
  prompt: string;
  answer: string;
  hint?: string;
};

export type ClozeCard = CardBase & {
  type: "cloze";
  text: string;
  notes?: string;
};

export type Card = BasicCard | ClozeCard;

export type Section = {
  id: string;
  name: string;
  order: number;
};

export type SectionStats = {
  attempted: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
};

export type Stats = Record<string, SectionStats>;

export type Grade = "again" | "hard" | "good" | "easy";

export type SessionRecord = {
  id: string;
  startedAt: number;
  endedAt: number;
  sectionId: string | "__mixed__";
  total: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
};

export type AppState = {
  sections: Section[];
  cards: Card[];
  stats: Stats;
  history: SessionRecord[];
  scheduling: Record<string, import("./scheduling").Scheduling>;
};

export type QueueItem = {
  cardId: string;
  cloze?: number; // present for cloze cards: which cloze number is active
};

// Helper for partial recall scoring (right-style accuracy):
// `again` = wrong, `hard` = partial, `good`/`easy` = right
export function accuracyOf(s: SectionStats): number | null {
  if (s.attempted === 0) return null;
  const score = s.good + s.easy + s.hard * 0.5;
  return Math.round((score / s.attempted) * 100);
}
