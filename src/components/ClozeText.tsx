"use client";

import * as React from "react";
import { tokenize, type ClozeSegment } from "@/lib/cloze";

type Props = {
  text: string;
  activeNum: number;
  side: "front" | "back";
};

function isListGap(gap: string): boolean {
  const t = gap.trim();
  if (t.length > 12) return false;
  const stripped = t.replace(/[,;]/g, "").trim().toLowerCase();
  return (
    stripped === "" || ["and", "or", "then", "plus", "&"].includes(stripped)
  );
}

function isClozeList(segments: ClozeSegment[]): boolean {
  const clozes = segments.filter((s) => s.kind === "cloze");
  if (clozes.length < 3) return false;
  let listLikeGaps = 0;
  let totalInterGaps = 0;
  for (let i = 0; i < segments.length - 2; i++) {
    if (
      segments[i].kind === "cloze" &&
      segments[i + 1]?.kind === "text" &&
      segments[i + 2]?.kind === "cloze"
    ) {
      totalInterGaps++;
      const gap = (segments[i + 1] as { kind: "text"; value: string }).value;
      if (isListGap(gap)) listLikeGaps++;
    }
  }
  return totalInterGaps > 0 && listLikeGaps / totalInterGaps >= 0.7;
}

function renderSeg(
  seg: ClozeSegment,
  activeNum: number,
  side: "front" | "back",
  key: React.Key
): React.ReactNode {
  if (seg.kind === "text") {
    return <React.Fragment key={key}>{seg.value}</React.Fragment>;
  }
  if (seg.num === activeNum) {
    if (side === "front") {
      return (
        <span key={key} className="cloze-blank">
          [{seg.hint ? seg.hint : "..."}]
        </span>
      );
    }
    return (
      <span key={key} className="cloze-revealed">
        {seg.content}
      </span>
    );
  }
  return <React.Fragment key={key}>{seg.content}</React.Fragment>;
}

export function ClozeText({ text, activeNum, side }: Props) {
  const segments = React.useMemo(() => tokenize(text), [text]);
  const listMode = React.useMemo(() => isClozeList(segments), [segments]);

  if (!listMode) {
    return (
      <span>
        {segments.map((seg, i) => renderSeg(seg, activeNum, side, i))}
      </span>
    );
  }

  const firstIdx = segments.findIndex((s) => s.kind === "cloze");
  let lastIdx = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].kind === "cloze") {
      lastIdx = i;
      break;
    }
  }

  const leadSegs = segments.slice(0, firstIdx);
  const itemSegs = segments
    .slice(firstIdx, lastIdx + 1)
    .filter((s) => s.kind === "cloze");

  const trimmedLead = leadSegs.map((s, i) => {
    if (i === leadSegs.length - 1 && s.kind === "text") {
      return { ...s, value: s.value.replace(/\s+$/, "") };
    }
    return s;
  });

  return (
    <div>
      {trimmedLead.length > 0 && (
        <p className="mb-4">
          {trimmedLead.map((s, i) => renderSeg(s, activeNum, side, `lead-${i}`))}
        </p>
      )}
      <ol className="anki-list space-y-3">
        {itemSegs.map((seg, i) => (
          <li key={`item-${i}`}>{renderSeg(seg, activeNum, side, `c-${i}`)}</li>
        ))}
      </ol>
    </div>
  );
}
