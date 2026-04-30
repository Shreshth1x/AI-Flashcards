// Anki-style cloze deletion: {{c1::content}} or {{c1::content::hint}}
// One source text generates one card per unique cloze number.

export type ClozeSegment =
  | { kind: "text"; value: string }
  | { kind: "cloze"; num: number; content: string; hint?: string };

const CLOZE_RE =
  /\{\{c(\d+)::((?:(?!\}\}).)*?)(?:::((?:(?!\}\}).)*?))?\}\}/gs;

export function tokenize(text: string): ClozeSegment[] {
  const segments: ClozeSegment[] = [];
  let last = 0;
  CLOZE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CLOZE_RE.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ kind: "text", value: text.slice(last, m.index) });
    }
    segments.push({
      kind: "cloze",
      num: Number(m[1]),
      content: m[2],
      hint: m[3] || undefined,
    });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    segments.push({ kind: "text", value: text.slice(last) });
  }
  return segments;
}

export function clozeNumbers(text: string): number[] {
  const set = new Set<number>();
  for (const s of tokenize(text)) {
    if (s.kind === "cloze") set.add(s.num);
  }
  return [...set].sort((a, b) => a - b);
}

export function hasClozes(text: string): boolean {
  return clozeNumbers(text).length > 0;
}
