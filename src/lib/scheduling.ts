// SM-2-lite scheduler. One scheduling record per logical card (per cloze
// number for cloze cards). Stored on AppState.scheduling, keyed by
// `${cardId}#${cloze ?? "_"}`.

import type { Grade } from "./types";

export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;
export const DEFAULT_LAPSES = 0;

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export type CardState = "new" | "learning" | "review";

export type Scheduling = {
  // Days for `review`-state cards; minutes for `learning`-state cards.
  intervalMinutes: number;
  ease: number;
  dueAt: number; // ms timestamp
  reps: number;
  lapses: number;
  state: CardState;
  lastReviewedAt: number | null;
};

export type ScheduleKey = string;

export function scheduleKey(cardId: string, cloze: number | undefined): string {
  return `${cardId}#${cloze ?? "_"}`;
}

export function newScheduling(now: number = Date.now()): Scheduling {
  return {
    intervalMinutes: 0,
    ease: DEFAULT_EASE,
    dueAt: now,
    reps: 0,
    lapses: 0,
    state: "new",
    lastReviewedAt: null,
  };
}

export function isDue(s: Scheduling, now: number = Date.now()): boolean {
  return s.dueAt <= now;
}

// Apply a grade to a scheduling record. Returns the next scheduling.
export function applyGrade(
  prev: Scheduling | undefined,
  grade: Grade,
  now: number = Date.now()
): Scheduling {
  const s = prev ?? newScheduling(now);
  const reps = s.reps + 1;
  const lastReviewedAt = now;

  if (grade === "again") {
    const ease = Math.max(MIN_EASE, s.ease - 0.2);
    return {
      intervalMinutes: 1,
      ease,
      dueAt: now + 1 * MIN,
      reps,
      lapses: s.lapses + (s.state === "review" ? 1 : 0),
      state: "learning",
      lastReviewedAt,
    };
  }

  if (grade === "hard") {
    const ease = Math.max(MIN_EASE, s.ease - 0.15);
    if (s.state === "new" || s.state === "learning") {
      return {
        intervalMinutes: 6,
        ease,
        dueAt: now + 6 * MIN,
        reps,
        lapses: s.lapses,
        state: "learning",
        lastReviewedAt,
      };
    }
    const intervalMinutes = Math.max(
      s.intervalMinutes * 1.2,
      DAY / MIN
    );
    return {
      intervalMinutes,
      ease,
      dueAt: now + intervalMinutes * MIN,
      reps,
      lapses: s.lapses,
      state: "review",
      lastReviewedAt,
    };
  }

  if (grade === "good") {
    if (s.state === "new" || s.state === "learning") {
      const intervalMinutes = DAY / MIN; // graduate to 1 day
      return {
        intervalMinutes,
        ease: s.ease,
        dueAt: now + intervalMinutes * MIN,
        reps,
        lapses: s.lapses,
        state: "review",
        lastReviewedAt,
      };
    }
    const intervalMinutes = s.intervalMinutes * s.ease;
    return {
      intervalMinutes,
      ease: s.ease,
      dueAt: now + intervalMinutes * MIN,
      reps,
      lapses: s.lapses,
      state: "review",
      lastReviewedAt,
    };
  }

  // easy
  const ease = s.ease + 0.15;
  if (s.state === "new" || s.state === "learning") {
    const intervalMinutes = 4 * DAY / MIN;
    return {
      intervalMinutes,
      ease,
      dueAt: now + intervalMinutes * MIN,
      reps,
      lapses: s.lapses,
      state: "review",
      lastReviewedAt,
    };
  }
  const intervalMinutes = s.intervalMinutes * s.ease * 1.3;
  return {
    intervalMinutes,
    ease,
    dueAt: now + intervalMinutes * MIN,
    reps,
    lapses: s.lapses,
    state: "review",
    lastReviewedAt,
  };
}

// What would the interval look like for each grade right now? Used to label
// the four grade buttons during a review.
export function previewIntervals(
  prev: Scheduling | undefined,
  now: number = Date.now()
): Record<Grade, string> {
  const grades: Grade[] = ["again", "hard", "good", "easy"];
  const out: Partial<Record<Grade, string>> = {};
  for (const g of grades) {
    const next = applyGrade(prev, g, now);
    out[g] = formatInterval(next.intervalMinutes);
  }
  return out as Record<Grade, string>;
}

export function formatInterval(minutes: number): string {
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h`;
  const days = minutes / (24 * 60);
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

// Categorize a scheduling for display: "due", "learning", "new", or "later"
// (review card not yet due).
export type Bucket = "due" | "learning" | "new" | "later";

export function bucketOf(s: Scheduling | undefined, now: number = Date.now()): Bucket {
  if (!s || s.state === "new") return "new";
  if (s.state === "learning") return "learning";
  return s.dueAt <= now ? "due" : "later";
}
