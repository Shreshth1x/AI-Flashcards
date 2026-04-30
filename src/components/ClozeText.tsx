"use client";

import * as React from "react";
import { tokenize, type ClozeSegment } from "@/lib/cloze";

type Props = {
  text: string;
  activeNum: number;
  side: "front" | "back";
};

type ParaBlock = { kind: "para"; segments: ClozeSegment[] };
type ListBlock = {
  kind: "list";
  header: ClozeSegment[];
  items: ClozeSegment[][];
};
type Block = ParaBlock | ListBlock;

type MatchResult =
  | { matched: false }
  | { matched: true; endAt: number; nextStart: number };

type Matcher = (text: string, pos: number) => MatchResult;

const sentenceMatcher: Matcher = (text, pos) => {
  const ch = text[pos];
  if (
    (ch === "." || ch === "!" || ch === "?") &&
    text[pos + 1] === " " &&
    pos + 2 < text.length &&
    /[A-Z(]/.test(text[pos + 2])
  ) {
    // include the terminal punctuation in the previous group
    return { matched: true, endAt: pos + 1, nextStart: pos + 2 };
  }
  if (ch === ";" && text[pos + 1] === " ") {
    return { matched: true, endAt: pos, nextStart: pos + 2 };
  }
  return { matched: false };
};

const commaMatcher: Matcher = (text, pos) => {
  if (text[pos] === "," && text[pos + 1] === " ") {
    return { matched: true, endAt: pos, nextStart: pos + 2 };
  }
  return { matched: false };
};

function splitByMatcher(
  segments: ClozeSegment[],
  matcher: Matcher
): ClozeSegment[][] {
  const groups: ClozeSegment[][] = [[]];
  let depth = 0;

  for (const seg of segments) {
    if (seg.kind === "cloze") {
      groups[groups.length - 1].push(seg);
      continue;
    }
    const text = seg.value;
    let start = 0;
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (ch === "(" || ch === "[" || ch === "{") {
        depth++;
        i++;
        continue;
      }
      if (ch === ")" || ch === "]" || ch === "}") {
        if (depth > 0) depth--;
        i++;
        continue;
      }
      if (depth === 0) {
        const m = matcher(text, i);
        if (m.matched) {
          const piece = text.slice(start, m.endAt);
          const trimmed = piece.replace(/^\s+|\s+$/g, "");
          if (trimmed) {
            groups[groups.length - 1].push({ kind: "text", value: trimmed });
          }
          groups.push([]);
          start = m.nextStart;
          i = start;
          continue;
        }
      }
      i++;
    }
    const tail = text.slice(start);
    const tailTrimmed = tail.replace(/^\s+|\s+$/g, "");
    if (tailTrimmed) {
      groups[groups.length - 1].push({ kind: "text", value: tailTrimmed });
    }
  }

  return groups
    .map((g) =>
      g.filter(
        (s) => s.kind === "cloze" || (s.kind === "text" && s.value.length > 0)
      )
    )
    .filter((g) => g.length > 0);
}

function tryAsList(segments: ClozeSegment[]): ListBlock | null {
  // Find first top-level `: ` in text segments
  let depth = 0;
  let colonSegIdx = -1;
  let colonCharIdx = -1;
  outer: for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.kind === "cloze") continue;
    const text = seg.value;
    for (let j = 0; j < text.length; j++) {
      const ch = text[j];
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") {
        if (depth > 0) depth--;
      } else if (depth === 0 && ch === ":") {
        if (
          j + 1 < text.length &&
          (text[j + 1] === " " || text[j + 1] === "\n")
        ) {
          colonSegIdx = i;
          colonCharIdx = j;
          break outer;
        }
      }
    }
  }
  if (colonSegIdx < 0) return null;

  const header: ClozeSegment[] = [];
  const body: ClozeSegment[] = [];
  for (let i = 0; i < segments.length; i++) {
    if (i < colonSegIdx) {
      header.push(segments[i]);
    } else if (i === colonSegIdx) {
      const seg = segments[i] as { kind: "text"; value: string };
      const before = seg.value.slice(0, colonCharIdx + 1);
      const after = seg.value.slice(colonCharIdx + 1).replace(/^\s+/, "");
      if (before) header.push({ kind: "text", value: before });
      if (after) body.push({ kind: "text", value: after });
    } else {
      body.push(segments[i]);
    }
  }

  const items = splitByMatcher(body, commaMatcher);
  if (items.length < 3) return null;

  // Strip trailing punctuation from the last item's last text segment.
  const last = items[items.length - 1];
  if (last.length > 0) {
    const tailSeg = last[last.length - 1];
    if (tailSeg.kind === "text") {
      const cleaned = tailSeg.value.replace(/[.,;:\s]+$/, "");
      if (cleaned.length === 0) {
        last.pop();
      } else {
        last[last.length - 1] = { kind: "text", value: cleaned };
      }
    }
  }

  return { kind: "list", header, items };
}

function buildBlocks(text: string): Block[] {
  const segments = tokenize(text);
  const sentences = splitByMatcher(segments, sentenceMatcher);
  return sentences.map((s) => {
    const list = tryAsList(s);
    return list ?? { kind: "para", segments: s };
  });
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
  const blocks = React.useMemo(() => buildBlocks(text), [text]);

  if (blocks.length === 0) return null;

  // Single para → inline span (preserves earlier behavior for short cards).
  if (blocks.length === 1 && blocks[0].kind === "para") {
    const para = blocks[0];
    return (
      <span>
        {para.segments.map((s, i) => renderSeg(s, activeNum, side, i))}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, bi) => {
        if (block.kind === "para") {
          return (
            <p key={`b-${bi}`}>
              {block.segments.map((s, si) =>
                renderSeg(s, activeNum, side, `${bi}-p-${si}`)
              )}
            </p>
          );
        }
        return (
          <div key={`b-${bi}`}>
            {block.header.length > 0 && (
              <p className="mb-3">
                {block.header.map((s, si) =>
                  renderSeg(s, activeNum, side, `${bi}-h-${si}`)
                )}
              </p>
            )}
            <ol className="anki-list space-y-3">
              {block.items.map((item, ii) => (
                <li key={`b-${bi}-i-${ii}`}>
                  {item.map((s, si) =>
                    renderSeg(s, activeNum, side, `${bi}-${ii}-${si}`)
                  )}
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
