"use client";

import * as React from "react";

type Props = {
  text: string;
  className?: string;
  variant?: "answer" | "muted";
};

type Segment = { kind: "para"; text: string } | { kind: "li"; text: string };

function parseSingle(input: string): Segment[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // Numbered list: look for at least two consecutive "N. " markers (1, 2, ...).
  const listRe = /(?:^|\s)(\d+)\.\s+/g;
  const allMatches = [...trimmed.matchAll(listRe)];
  const markers: RegExpMatchArray[] = [];
  for (let i = 0; i < allMatches.length; i++) {
    if (Number(allMatches[i][1]) === i + 1) markers.push(allMatches[i]);
    else break;
  }
  if (markers.length >= 2) {
    const segments: Segment[] = [];
    if (markers[0].index! > 0) {
      const lead = trimmed.slice(0, markers[0].index!).trim();
      if (lead) segments.push({ kind: "para", text: lead });
    }
    for (let i = 0; i < markers.length; i++) {
      const start = markers[i].index! + markers[i][0].length;
      const end =
        i + 1 < markers.length ? markers[i + 1].index! : trimmed.length;
      const body = trimmed.slice(start, end).trim().replace(/[;]+$/, "");
      if (body) segments.push({ kind: "li", text: body });
    }
    return segments;
  }

  // Sentence/clause split:
  //   - .!? followed by space and a capital or open paren
  //   - semicolons (always)
  const pieces = trimmed
    .split(/(?<=[.!?])\s+(?=[A-Z(])|(?<=;)\s+/)
    .map((s) => s.trim().replace(/;\s*$/, ""))
    .filter((s) => s.length > 0);
  return pieces.map((s) => ({ kind: "para" as const, text: s }));
}

function parse(text: string): Segment[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines.flatMap(parseSingle);
  return parseSingle(text);
}

function renderInline(text: string): React.ReactNode {
  const m = /^([A-Z][A-Za-z0-9 &+()/\-]{0,40}?):\s+(.+)$/s.exec(text);
  if (m) {
    return (
      <>
        <span className="font-semibold text-foreground">{m[1]}:</span> {m[2]}
      </>
    );
  }
  return text;
}

export function SegmentedText({ text, className, variant = "answer" }: Props) {
  const segments = React.useMemo(() => parse(text), [text]);
  if (segments.length === 0) return null;

  const baseClass = variant === "muted" ? "anki-hint" : "anki-text";
  const paras = segments.filter((s): s is { kind: "para"; text: string } => s.kind === "para");
  const lis = segments.filter((s): s is { kind: "li"; text: string } => s.kind === "li");

  return (
    <div className={className}>
      {paras.length > 0 && (
        <div className={lis.length > 0 ? "space-y-3 mb-3" : "space-y-3"}>
          {paras.map((p, i) => (
            <p key={`p${i}`} className={baseClass}>
              {renderInline(p.text)}
            </p>
          ))}
        </div>
      )}
      {lis.length > 0 && (
        <ol className={`anki-list space-y-3 ${baseClass}`}>
          {lis.map((s, i) => (
            <li key={`l${i}`}>{renderInline(s.text)}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
