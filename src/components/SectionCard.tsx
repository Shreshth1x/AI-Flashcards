"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import type { Section, SectionStats } from "@/lib/types";
import type { QueueCounts } from "@/lib/session";
import { ChevronRight } from "lucide-react";

type Props = {
  section: Section;
  cardCount: number;
  reviewCount: number;
  counts: QueueCounts;
  stats: SectionStats;
  onStart: (sectionId: string) => void;
  disabled?: boolean;
};

export function SectionCard({
  section,
  cardCount,
  reviewCount,
  counts,
  onStart,
  disabled,
}: Props) {
  const studyable = counts.due + counts.learning + counts.new;

  return (
    <button
      type="button"
      onClick={() => !disabled && onStart(section.id)}
      disabled={disabled || reviewCount === 0}
      className="text-left group rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={`Study ${section.name}`}
    >
      <Card className="h-full transition-[box-shadow,border-color,transform] duration-2 ease-out group-hover:shadow-pop group-hover:border-foreground/15 group-active:translate-y-px">
        <div className="p-5 flex flex-col gap-4 h-full">
          <div className="flex items-start justify-between gap-3">
            <div className="font-medium text-md leading-snug text-balance">
              {section.name}
            </div>
            <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground transition-transform duration-2 ease-out group-hover:translate-x-0.5 shrink-0" />
          </div>

          <div className="text-xs text-muted-foreground tabular-nums">
            {cardCount} {cardCount === 1 ? "card" : "cards"}
            {reviewCount !== cardCount && (
              <span> · {reviewCount} reviews</span>
            )}
          </div>

          <div className="mt-auto flex items-center gap-3 text-xs tabular-nums">
            <Count tone="new" value={counts.new} label="new" />
            <Count tone="learn" value={counts.learning} label="learn" />
            <Count tone="due" value={counts.due} label="due" />
            {counts.later > 0 && (
              <span className="text-muted-foreground ml-auto">
                +{counts.later} later
              </span>
            )}
          </div>

          {studyable === 0 && counts.later > 0 && (
            <p className="text-[11px] text-muted-foreground">
              All caught up. Click to cram anyway.
            </p>
          )}
        </div>
      </Card>
    </button>
  );
}

function Count({
  tone,
  value,
  label,
}: {
  tone: "new" | "learn" | "due";
  value: number;
  label: string;
}) {
  const dotCls =
    tone === "new"
      ? "anki-count-dot anki-count-dot-new"
      : tone === "learn"
        ? "anki-count-dot anki-count-dot-learn"
        : "anki-count-dot anki-count-dot-review";
  const valueCls =
    tone === "new"
      ? "anki-count-new"
      : tone === "learn"
        ? "anki-count-learn"
        : "anki-count-review";
  return (
    <span className="inline-flex items-baseline">
      <span className={dotCls} />
      <span className={`${valueCls}`}>{value}</span>
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider ml-1">
        {label}
      </span>
    </span>
  );
}
