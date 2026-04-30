import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-opus-4-7";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BASE64_CHARS = 5_000_000;
const MAX_CARD_IMAGES = 6;
const MAX_INLINE_IMAGES = 4;

type ImagePayload = { data: string; mediaType: string };
type CardImagePayload = ImagePayload & { id: string };

type CardContext = {
  type: "basic" | "cloze";
  sectionName: string;
  prompt?: string;
  answer?: string;
  hint?: string;
  text?: string;
  cloze?: number;
  notes?: string;
  attachments?: CardImagePayload[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AskBody = {
  card: CardContext;
  messages: ChatMessage[];
  inlineImages?: ImagePayload[];
};

const TUTOR_SYSTEM = `You are a McKinsey case-interview tutor embedded in a flashcard drill app. The user is preparing for SF tech/SaaS-heavy interviews and has just been quizzed on the card shown below. They will ask you follow-up questions — most often "why" questions about a bucket, framework choice, metric, or piece of advice on the card.

How to answer

- Default to short and direct: 3–6 sentences, or a tight bullet list when truly enumerable. Skip preamble. Don't restate the question.
- Explain the WHY and the mental model, not just the WHAT. The card already has the what. Surface the underlying principle, the tradeoff, or the failure mode that motivates the answer.
- Tie back to the user's context: tech/SaaS, McKinsey-style structure (objective → buckets → hypothesis → synthesis). Use SaaS metric examples (NRR, CAC payback, gross margin) when relevant.
- When the user asks about a bucket choice, name the alternative and why it loses (e.g. "we picked 'expansion' over 'churn' because the math forces it — gross retention rarely moves 16 points in 18 months").
- When the user pushes back or proposes a different answer, evaluate it on its merits. If their version is also defensible, say so and name the tradeoff. Don't capitulate just to be agreeable, but don't dig in if they're right.
- If the question is fully outside this card, still help — but keep it tight, and bridge back to the consulting frame when natural.
- Never reveal that you have access to the model answer when the user is mid-thinking; if they say "I don't want a hint, just explain X", explain X without spoilers.
- If the card has attached images (charts, diagrams, slides), reference what's actually in them when relevant. The user often wants you to interpret a visual or compare it to the card's text.
- If the user attaches an image inline, treat it as the primary subject of that turn — read it carefully before answering.
- No emoji. No headings unless the user asks for structure. Plain markdown is fine (italics, bold, bullets).

Tone: like a smart senior who has read the same casebooks. Direct, opinionated, calibrated. Concede uncertainty when you have it.`;

function buildCardBlock(card: CardContext): string {
  const lines: string[] = [];
  lines.push(`Section: ${card.sectionName}`);
  if (card.type === "cloze") {
    lines.push(`Type: cloze (focus on c${card.cloze ?? 1})`);
    if (card.text) lines.push(`Text: ${card.text}`);
    if (card.notes) lines.push(`Notes: ${card.notes}`);
  } else {
    lines.push(`Type: basic`);
    if (card.prompt) lines.push(`Prompt: ${card.prompt}`);
    if (card.answer) lines.push(`Model answer: ${card.answer}`);
    if (card.hint) lines.push(`Hint: ${card.hint}`);
  }
  if (card.attachments && card.attachments.length > 0) {
    lines.push(
      `(${card.attachments.length} image${card.attachments.length === 1 ? "" : "s"} attached to this card.)`
    );
  }
  return lines.join("\n");
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "content-type": "application/json" },
  });
}

function validateImage(
  img: ImagePayload | undefined,
  label: string
): string | null {
  if (!img || typeof img.data !== "string" || typeof img.mediaType !== "string") {
    return `${label}: invalid shape`;
  }
  if (!ALLOWED_MIME.has(img.mediaType)) {
    return `${label}: unsupported media type ${img.mediaType}`;
  }
  if (img.data.length > MAX_BASE64_CHARS) {
    return `${label}: image too large (${Math.round(img.data.length / 1000)}KB encoded)`;
  }
  return null;
}

function imageBlock(
  img: ImagePayload
): Anthropic.ImageBlockParam {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: img.mediaType as
        | "image/jpeg"
        | "image/png"
        | "image/webp"
        | "image/gif",
      data: img.data,
    },
  };
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

  let body: AskBody;
  try {
    body = (await req.json()) as AskBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.card || !body.card.sectionName) {
    return badRequest("Missing card context");
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return badRequest("messages must be a non-empty array");
  }
  for (const m of body.messages) {
    if (
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string"
    ) {
      return badRequest("Invalid message shape");
    }
  }

  // Validate attachments
  const cardImages = (body.card.attachments ?? []).slice(0, MAX_CARD_IMAGES);
  for (let i = 0; i < cardImages.length; i++) {
    const err = validateImage(cardImages[i], `card.attachments[${i}]`);
    if (err) return badRequest(err);
  }
  const inlineImages = (body.inlineImages ?? []).slice(0, MAX_INLINE_IMAGES);
  for (let i = 0; i < inlineImages.length; i++) {
    const err = validateImage(inlineImages[i], `inlineImages[${i}]`);
    if (err) return badRequest(err);
  }

  const anthropic = new Anthropic();

  // System: text-only. Cache marker on the card-text block — caches tutor
  // instructions + card text across follow-up turns on the same card.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: TUTOR_SYSTEM },
    {
      type: "text",
      text: `[Current flashcard]\n${buildCardBlock(body.card)}`,
      cache_control: { type: "ephemeral" },
    },
  ];

  // Trim history; card images attach to the FIRST user message (stable for
  // cache hits on follow-ups), inline images attach to the LAST user message.
  const trimmed = body.messages.slice(-16);
  const messages: Anthropic.MessageParam[] = trimmed.map((m, i) => {
    const isLast = i === trimmed.length - 1;
    const isFirst = i === 0;
    const isUser = m.role === "user";

    const wantsCardImages = isFirst && isUser && cardImages.length > 0;
    const wantsInlineImages = isLast && isUser && inlineImages.length > 0;

    if (!wantsCardImages && !wantsInlineImages) {
      return { role: m.role, content: m.content };
    }

    const blocks: Anthropic.ContentBlockParam[] = [];
    if (wantsCardImages) {
      cardImages.forEach((img, j) => {
        const block = imageBlock(img);
        if (j === cardImages.length - 1) {
          block.cache_control = { type: "ephemeral" };
        }
        blocks.push(block);
      });
    }
    if (wantsInlineImages) {
      blocks.push(...inlineImages.map(imageBlock));
    }
    blocks.push({ type: "text", text: m.content });
    return { role: m.role, content: blocks };
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const claudeStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          thinking: { type: "adaptive" },
          system: systemBlocks,
          messages,
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Anthropic.APIError
            ? `Claude API error ${err.status}: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Unknown error";
        controller.enqueue(encoder.encode(`\n\n[error] ${msg}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-content-type-options": "nosniff",
    },
  });
}
