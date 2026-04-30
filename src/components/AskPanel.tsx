"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Card as CardType, QueueItem } from "@/lib/types";
import {
  blobToBase64,
  getAttachmentBase64,
  resizeForUpload,
} from "@/lib/attachments";
import { Send, Sparkles, X, Loader2, Paperclip, Image as ImageIcon } from "lucide-react";

type Props = {
  card: CardType;
  item: QueueItem;
  sectionLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

type CardImagePayload = { id: string; data: string; mediaType: string };
type InlineImage = {
  id: string;
  previewUrl: string;
  data: string;
  mediaType: string;
};

const MAX_INLINE = 4;

function makeCardContext(
  card: CardType,
  item: QueueItem,
  sectionLabel: string,
  attachments: CardImagePayload[]
) {
  const base = {
    sectionName: sectionLabel,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
  if (card.type === "cloze") {
    return {
      ...base,
      type: "cloze" as const,
      text: card.text,
      cloze: item.cloze ?? 1,
      notes: card.notes,
    };
  }
  return {
    ...base,
    type: "basic" as const,
    prompt: card.prompt,
    answer: card.answer,
    hint: card.hint,
  };
}

export function AskPanel({
  card,
  item,
  sectionLabel,
  open,
  onOpenChange,
}: Props) {
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingImages, setPendingImages] = React.useState<InlineImage[]>([]);
  const [cardImagesB64, setCardImagesB64] = React.useState<CardImagePayload[]>(
    []
  );
  const [dragOver, setDragOver] = React.useState(false);

  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const cardKey = `${card.id}::${item.cloze ?? "_"}`;

  // Load card attachments as base64 when card changes (memoized in state)
  React.useEffect(() => {
    let cancelled = false;
    const ids = card.attachments?.map((a) => a.id) ?? [];
    if (ids.length === 0) {
      setCardImagesB64([]);
      return;
    }
    Promise.all(ids.map((id) => getAttachmentBase64(id))).then((results) => {
      if (cancelled) return;
      const out: CardImagePayload[] = [];
      results.forEach((r, i) => {
        if (r) out.push({ id: ids[i], data: r.data, mediaType: r.mediaType });
      });
      setCardImagesB64(out);
    });
    return () => {
      cancelled = true;
    };
  }, [cardKey, card.attachments]);

  // Reset per-card history + pending images when the queue position changes.
  React.useEffect(() => {
    setMessages([]);
    setInput("");
    setError(null);
    setPendingImages((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.previewUrl);
      return [];
    });
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(false);
  }, [cardKey]);

  // Cmd/Ctrl+K toggles panel and focuses input on open.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        onOpenChange(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  // Auto-scroll on new content.
  React.useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Cleanup pending image URLs on unmount.
  React.useEffect(() => {
    return () => {
      for (const p of pendingImages) URL.revokeObjectURL(p.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ingestFiles(files: File[]) {
    const room = MAX_INLINE - pendingImages.length;
    if (room <= 0) return;
    const slice = files.slice(0, room);
    const next: InlineImage[] = [];
    for (const f of slice) {
      try {
        const { blob, mimeType } = await resizeForUpload(f);
        const data = await blobToBase64(blob);
        const previewUrl = URL.createObjectURL(blob);
        next.push({
          id: `inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          previewUrl,
          data,
          mediaType: mimeType,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not attach image");
      }
    }
    setPendingImages((prev) => [...prev, ...next]);
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length > 0) void ingestFiles(files);
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    const files: File[] = [];
    for (const it of items) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      void ingestFiles(files);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) void ingestFiles(files);
  }

  function removePending(id: string) {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function send() {
    const text = input.trim();
    if ((!text && pendingImages.length === 0) || pending) return;
    const userText = text || "(image attached)";

    const nextHistory: ChatMessage[] = [
      ...messages,
      { role: "user", content: userText },
    ];
    const inlineImagesPayload = pendingImages.map((p) => ({
      data: p.data,
      mediaType: p.mediaType,
    }));

    setMessages([...nextHistory, { role: "assistant", content: "" }]);
    setInput("");
    // Revoke preview URLs after we've captured the base64
    for (const p of pendingImages) URL.revokeObjectURL(p.previewUrl);
    setPendingImages([]);
    setPending(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          card: makeCardContext(card, item, sectionLabel, cardImagesB64),
          messages: nextHistory,
          inlineImages:
            inlineImagesPayload.length > 0 ? inlineImagesPayload : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await safeText(res);
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const out = prev.slice();
          out[out.length - 1] = { role: "assistant", content: acc };
          return out;
        });
      }
      acc += decoder.decode();
      setMessages((prev) => {
        const out = prev.slice();
        out[out.length - 1] = { role: "assistant", content: acc };
        return out;
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setMessages((prev) => prev.slice(0, -1));
      } else {
        const msg = (e as Error).message || "Network error";
        setError(msg);
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setPending(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const cardImageCount = cardImagesB64.length;

  return (
    <>
      {/* Floating trigger when closed */}
      {!open && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onOpenChange(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="fixed right-4 bottom-6 z-30 shadow-pop animate-fade-in-soft"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
          <Sparkles className="h-4 w-4" />
          Ask the tutor
          <kbd className="ml-1.5 hidden sm:inline">⌘K</kbd>
        </Button>
      )}

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden animate-fade-in-soft"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="AI tutor"
        aria-hidden={!open}
        className={[
          "fixed top-0 right-0 bottom-0 z-40 w-full sm:w-[400px]",
          "border-l border-border bg-card text-card-foreground shadow-pop",
          "flex flex-col",
          "transition-transform duration-2 ease-out",
          open ? "translate-x-0" : "translate-x-full pointer-events-none",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 shrink-0">
          <Sparkles className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold tracking-tight">Tutor</span>
          {cardImageCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-brand bg-brand/10 px-2 py-0.5 rounded-full">
              <ImageIcon className="h-3 w-3" />
              sees {cardImageCount} image{cardImageCount === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground truncate">
              {sectionLabel}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close tutor"
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 text-sm leading-relaxed"
        >
          {messages.length === 0 && (
            <p className="text-muted-foreground text-[13px]">
              Ask anything about this card — why this bucket, what the
              alternative would be, what the underlying mental model is. Paste
              or drop an image to ask about it directly.
            </p>
          )}
          {messages.map((m, i) => (
            <Bubble
              key={i}
              role={m.role}
              content={m.content}
              streaming={
                pending && i === messages.length - 1 && m.role === "assistant"
              }
            />
          ))}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {pendingImages.length > 0 && (
          <div className="px-3 pt-2 flex flex-wrap items-center gap-2 border-t border-border/60 shrink-0">
            {pendingImages.map((p) => (
              <div key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt=""
                  className="h-10 w-10 rounded-md object-cover border border-border"
                  draggable={false}
                />
                <button
                  type="button"
                  onClick={() => removePending(p.id)}
                  aria-label="Remove image"
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 grid place-items-center rounded-full bg-foreground text-background hover:opacity-90"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {pendingImages.length}/{MAX_INLINE} attached
            </span>
          </div>
        )}

        <div
          className={`px-3 py-2.5 border-t border-border/60 flex gap-2 items-end transition-colors duration-1 shrink-0 ${
            dragOver ? "bg-brand/5" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach image"
            disabled={pendingImages.length >= MAX_INLINE || pending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onPickFiles}
            className="hidden"
          />
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            onPaste={onPaste}
            placeholder="Why this bucket? What would change with a different industry?"
            rows={1}
            className="text-sm min-h-[36px] max-h-[120px] resize-none py-2"
            disabled={pending}
          />
          {pending ? (
            <Button onClick={cancel} variant="outline" size="sm">
              Stop
            </Button>
          ) : (
            <Button
              onClick={send}
              size="sm"
              disabled={input.trim().length === 0 && pendingImages.length === 0}
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}

function Bubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
}) {
  const isUser = role === "user";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-md px-3 py-2 whitespace-pre-wrap bg-primary text-primary-foreground">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] pl-3 border-l-2 border-brand/50 whitespace-pre-wrap">
        {content || (streaming && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            thinking…
          </span>
        ))}
        {streaming && content && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 align-baseline bg-brand opacity-80 animate-pulse" />
        )}
      </div>
    </div>
  );
}

async function safeText(res: Response): Promise<string> {
  try {
    const t = await res.text();
    try {
      const j = JSON.parse(t);
      return j.error ?? t;
    } catch {
      return t;
    }
  } catch {
    return "";
  }
}
