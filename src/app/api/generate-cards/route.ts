import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sonnet 4.6 has strong vision (incl. handwriting OCR) and is much faster
// than Opus for batch extraction. The /api/ask tutor route stays on Opus.
const MODEL = "claude-sonnet-4-6";

// Anthropic PDF caps: 32MB and 100 pages per request.
const MAX_PDF_BYTES = 32 * 1024 * 1024;

const SYSTEM_PROMPT = `You are converting a medical student's handwritten notes (a GoodNotes PDF export) into Anki-style flashcards. Read every page, including diagrams, arrows, and margin notes.

Produce ONE card per testable concept. Pick the type that fits:
- BASIC for definitions, single-fact recall, comparisons, "what is X?", mechanism in one line.
- CLOZE for lists, multi-step mechanisms, drug classes, anatomy with multiple blanks, side-effect groupings. Use {{c1::content}} {{c2::content}} numbered from 1. Each blank becomes a separate review.

Quality bar:
- Cover everything testable on the page. Don't skip "obvious" basics — students forget those most.
- Prompts must stand alone. Never reference "the diagram above", "page 3", or "as drawn".
- Answers should be the shortest correct version a clinician would accept.
- Add hint only when the prompt is ambiguous without context.
- If handwriting is illegible for a fragment, skip it rather than inventing content.

Return cards by calling the propose_cards tool exactly once. Do not produce any prose.`;

const PROPOSE_TOOL: Anthropic.Tool = {
  name: "propose_cards",
  description:
    "Emit the full set of flashcards extracted from the document. Call exactly once with all cards.",
  input_schema: {
    type: "object",
    properties: {
      cards: {
        type: "array",
        description: "Flashcards extracted from the notes, in page order.",
        items: {
          oneOf: [
            {
              type: "object",
              properties: {
                type: { const: "basic" },
                prompt: {
                  type: "string",
                  description:
                    "Standalone question. No references to the source page.",
                },
                answer: {
                  type: "string",
                  description:
                    "Shortest correct answer a clinician would accept.",
                },
                hint: {
                  type: "string",
                  description: "Optional disambiguator. Omit when not needed.",
                },
              },
              required: ["type", "prompt", "answer"],
              additionalProperties: false,
            },
            {
              type: "object",
              properties: {
                type: { const: "cloze" },
                text: {
                  type: "string",
                  description:
                    "Sentence or short paragraph with {{c1::...}} {{c2::...}} blanks.",
                },
                notes: {
                  type: "string",
                  description: "Optional context shown after flip.",
                },
              },
              required: ["type", "text"],
              additionalProperties: false,
            },
          ],
        },
      },
    },
    required: ["cards"],
  },
};

type ProposedCard =
  | { type: "basic"; prompt: string; answer: string; hint?: string }
  | { type: "cloze"; text: string; notes?: string };

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "content-type": "application/json" },
  });
}

// Extracts top-level objects from inside the FIRST `[...]` of a streaming
// JSON string. Tracks brace depth, ignoring strings/escapes. Each time a
// top-level object closes, returns its slice. Stateful across feed() calls.
function makeCardSlicer() {
  let buffer = "";
  let arrayStarted = false;
  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let escape = false;

  return function feed(chunk: string): string[] {
    const out: string[] = [];
    for (const ch of chunk) {
      buffer += ch;
      const idx = buffer.length - 1;

      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (!arrayStarted) {
        if (ch === "[") arrayStarted = true;
        continue;
      }

      if (ch === "{") {
        if (depth === 0) objectStart = idx;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0 && objectStart >= 0) {
          out.push(buffer.slice(objectStart, idx + 1));
          objectStart = -1;
        }
      }
    }
    return out;
  };
}

function isValidCard(value: unknown): value is ProposedCard {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.type === "basic") {
    return (
      typeof v.prompt === "string" &&
      v.prompt.trim().length > 0 &&
      typeof v.answer === "string" &&
      v.answer.trim().length > 0 &&
      (v.hint === undefined || typeof v.hint === "string")
    );
  }
  if (v.type === "cloze") {
    return (
      typeof v.text === "string" &&
      /\{\{c\d+::/.test(v.text) &&
      (v.notes === undefined || typeof v.notes === "string")
    );
  }
  return false;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return badRequest("Expected multipart/form-data with a 'pdf' file field.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest("Invalid multipart body.");
  }

  const pdf = form.get("pdf");
  if (!(pdf instanceof File)) {
    return badRequest("Missing 'pdf' file.");
  }
  if (pdf.size === 0) {
    return badRequest("PDF is empty.");
  }
  if (pdf.size > MAX_PDF_BYTES) {
    return badRequest(
      `PDF is ${(pdf.size / 1024 / 1024).toFixed(1)}MB. The limit is 32MB. Split it into smaller files and upload separately.`
    );
  }
  if (pdf.type && pdf.type !== "application/pdf") {
    return badRequest(`Expected application/pdf, got ${pdf.type}.`);
  }

  const buf = Buffer.from(await pdf.arrayBuffer());
  // Cheap PDF sniff — first 4 bytes should be "%PDF".
  if (
    buf.length < 4 ||
    buf[0] !== 0x25 ||
    buf[1] !== 0x50 ||
    buf[2] !== 0x44 ||
    buf[3] !== 0x46
  ) {
    return badRequest("File does not look like a PDF (missing %PDF header).");
  }
  const base64 = buf.toString("base64");

  const anthropic = new Anthropic();

  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ];

  const userBlocks: Anthropic.ContentBlockParam[] = [
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: base64,
      },
    },
    {
      type: "text",
      text: "Extract flashcards from this document and return them via propose_cards.",
    },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      const slicer = makeCardSlicer();
      let emitted = 0;

      try {
        const claudeStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 8192,
          system,
          tools: [PROPOSE_TOOL],
          tool_choice: { type: "tool", name: "propose_cards" },
          messages: [{ role: "user", content: userBlocks }],
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "input_json_delta"
          ) {
            const slices = slicer(event.delta.partial_json);
            for (const s of slices) {
              try {
                const parsed = JSON.parse(s);
                if (isValidCard(parsed)) {
                  emitted += 1;
                  send({ type: "card", card: parsed });
                }
              } catch {
                // Brace-depth slice could span an escape we miscounted; skip.
              }
            }
          }
        }
        send({ type: "done", count: emitted });
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Anthropic.APIError
            ? `Claude API error ${err.status}: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Unknown error";
        send({ type: "error", message: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-content-type-options": "nosniff",
    },
  });
}
