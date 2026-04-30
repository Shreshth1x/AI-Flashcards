"use client";

import * as React from "react";
import type { Stats } from "@/lib/types";

export function StatsBar({ stats }: { stats: Stats }) {
  const totals = React.useMemo(() => {
    let attempted = 0;
    let again = 0;
    let hard = 0;
    let good = 0;
    let easy = 0;
    for (const s of Object.values(stats)) {
      attempted += s.attempted;
      again += s.again;
      hard += s.hard;
      good += s.good;
      easy += s.easy;
    }
    return { attempted, again, hard, good, easy };
  }, [stats]);

  const accuracy =
    totals.attempted > 0
      ? Math.round(
          ((totals.good + totals.easy + totals.hard * 0.5) / totals.attempted) *
            100
        )
      : 0;

  const denom = Math.max(totals.attempted, 1);
  const segs = [
    { key: "again", v: totals.again, color: "hsl(var(--anki-again))", label: "Again" },
    { key: "hard", v: totals.hard, color: "hsl(var(--anki-hard))", label: "Hard" },
    { key: "good", v: totals.good, color: "hsl(var(--anki-good))", label: "Good" },
    { key: "easy", v: totals.easy, color: "hsl(var(--anki-easy))", label: "Easy" },
  ];

  if (totals.attempted === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        No reviews yet. Start a deck below.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-soft p-5">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold tabular-nums">
            {accuracy}%
          </span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            overall accuracy
          </span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {totals.attempted} reviews
        </span>
      </div>

      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-border/60"
        role="img"
        aria-label={`Accuracy breakdown: again ${totals.again}, hard ${totals.hard}, good ${totals.good}, easy ${totals.easy}`}
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

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs tabular-nums">
        {segs.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-medium">{s.v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
