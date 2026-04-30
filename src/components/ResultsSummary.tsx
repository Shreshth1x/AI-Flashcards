"use client";

import * as React from "react";

type Counts = {
  total: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
};

export function ResultsSummary({ counts }: { counts: Counts }) {
  const accuracy =
    counts.total > 0
      ? Math.round(
          ((counts.good + counts.easy + counts.hard * 0.5) / counts.total) * 100
        )
      : 0;

  const denom = Math.max(counts.total, 1);
  const segs = [
    { key: "again", v: counts.again, color: "hsl(var(--anki-again))", label: "Again" },
    { key: "hard", v: counts.hard, color: "hsl(var(--anki-hard))", label: "Hard" },
    { key: "good", v: counts.good, color: "hsl(var(--anki-good))", label: "Good" },
    { key: "easy", v: counts.easy, color: "hsl(var(--anki-easy))", label: "Easy" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card shadow-soft p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Session accuracy
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-5xl font-semibold tabular-nums leading-none">
                {accuracy}%
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {counts.total} {counts.total === 1 ? "review" : "reviews"}
              </span>
            </div>
          </div>
        </div>

        <div
          className="mt-6 flex h-2.5 w-full overflow-hidden rounded-full bg-border/60"
          role="img"
          aria-label={`Breakdown: again ${counts.again}, hard ${counts.hard}, good ${counts.good}, easy ${counts.easy}`}
        >
          {segs.map((s) => {
            const pct = (s.v / denom) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={s.key}
                style={{ width: `${pct}%`, backgroundColor: s.color }}
                title={`${s.label} · ${s.v}`}
                className="h-full transition-[width] duration-3 ease-out"
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {segs.map((s) => (
          <div
            key={s.key}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
            </div>
            <div
              className="mt-2 text-2xl font-semibold tabular-nums"
              style={{ color: s.color }}
            >
              {s.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
