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
  matcher: Matcher,
  crossBoundary = false
): ClozeSegment[][] {
  const groups: ClozeSegment[][] = [[]];
  let depth = 0;

  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx];
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
          if (piece) {
            groups[groups.length - 1].push({ kind: "text", value: piece });
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
    if (tail) groups[groups.length - 1].push({ kind: "text", value: tail });

    // Cross-segment sentence boundary: when a text segment ends with sentence
    // punctuation followed by whitespace and the next segment is a cloze, the
    // sentence boundary is real even though the matcher's lookahead can't see
    // past the segment edge.
    if (
      crossBoundary &&
      depth === 0 &&
      segIdx + 1 < segments.length &&
      segments[segIdx + 1].kind === "cloze" &&
      /[.!?;]\s+$/.test(text.slice(start))
    ) {
      groups.push([]);
    }
  }

  // Trim only the leading whitespace of each group's first text segment and
  // the trailing whitespace of its last text segment. Interior whitespace
  // between segments is preserved so cloze content stays visually separated
  // from the surrounding prose.
  return groups
    .map((g) => trimGroupEdges(g))
    .filter((g) => g.length > 0);
}

function trimGroupEdges(group: ClozeSegment[]): ClozeSegment[] {
  if (group.length === 0) return group;
  let out = group;
  const first = out[0];
  if (first.kind === "text") {
    const trimmed = first.value.replace(/^\s+/, "");
    if (trimmed.length === 0) out = out.slice(1);
    else out = [{ kind: "text", value: trimmed }, ...out.slice(1)];
  }
  if (out.length === 0) return out;
  const last = out[out.length - 1];
  if (last.kind === "text") {
    const trimmed = last.value.replace(/\s+$/, "");
    if (trimmed.length === 0) out = out.slice(0, -1);
    else out = [...out.slice(0, -1), { kind: "text", value: trimmed }];
  }
  return out.filter(
    (s) => s.kind === "cloze" || (s.kind === "text" && s.value.length > 0)
  );
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

  // A list-shaped sentence with no clozes in the body is just enumerative
  // prose ("Ask: a, b, or c?") — render it as a paragraph instead of a list.
  let bodyHasCloze = false;
  for (let i = colonSegIdx + 1; i < segments.length; i++) {
    if (segments[i].kind === "cloze") {
      bodyHasCloze = true;
      break;
    }
  }
  if (!bodyHasCloze) return null;

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

  // Choose the split mode based on body shape:
  // - Body is a single sentence with comma-separated items → comma split.
  // - Body is multiple full sentences (each starts with a cloze, ends with
  //   ". " or "; ") → each sentence is one list item.
  // - 2-sentence bodies are ambiguous (header + epilogue?) → not a list.
  const bodySentences = splitByMatcher(body, sentenceMatcher, true);
  let items: ClozeSegment[][];
  if (bodySentences.length >= 3) {
    items = bodySentences;
  } else if (bodySentences.length <= 1) {
    items = splitByMatcher(body, commaMatcher);
  } else {
    return null;
  }
  if (items.length < 3) return null;

  // Strip trailing punctuation from each item's last text segment so the list
  // reads cleanly regardless of which delimiter we used.
  for (const item of items) {
    if (item.length === 0) continue;
    const tailSeg = item[item.length - 1];
    if (tailSeg.kind !== "text") continue;
    const cleaned = tailSeg.value.replace(/[.,;:\s]+$/, "");
    if (cleaned.length === 0) item.pop();
    else item[item.length - 1] = { kind: "text", value: cleaned };
  }

  return { kind: "list", header, items };
}

function buildBlocks(text: string): Block[] {
  const segments = tokenize(text);

  // Prefer treating the whole card as one list when there's a single header
  // colon — this is how most cloze cards are actually written, including
  // ones whose items are separated by ". " across cloze boundaries.
  const wholeAsList = tryAsList(segments);
  if (wholeAsList) return [wholeAsList];

  // Otherwise split into sentences (with cross-segment boundary support) and
  // try the same list detection on each. Plain sentences become paragraphs.
  const sentences = splitByMatcher(segments, sentenceMatcher, true);
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
