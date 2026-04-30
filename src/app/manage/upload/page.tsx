"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  GeneratedCardsPreview,
  isDraftValid,
  type DraftCard,
} from "@/components/GeneratedCardsPreview";
import {
  ArrowLeft,
  FileText,
  FileWarning,
  Loader2,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import type { AppState, BasicCard, Card as CardType, ClozeCard } from "@/lib/types";
import {
  bulkUpsertCards,
  loadState,
  upsertSection,
} from "@/lib/storage";

type Phase = "idle" | "uploading" | "ready" | "saving";

type ServerEvent =
  | { type: "card"; card: ServerCard }
  | { type: "done"; count: number }
  | { type: "error"; message: string };

type ServerCard =
  | { type: "basic"; prompt: string; answer: string; hint?: string }
  | { type: "cloze"; text: string; notes?: string };

const NEW_SECTION_VALUE = "__new__";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function deriveSectionName(filename: string) {
  const base = filename.replace(/\.[^.]+$/, "");
  return base.replace(/[_-]+/g, " ").trim() || "Imported notes";
}

export default function UploadPage() {
  const router = useRouter();

  const [state, setState] = React.useState<AppState | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [sectionChoice, setSectionChoice] = React.useState<string>(
    NEW_SECTION_VALUE
  );
  const [newSectionName, setNewSectionName] = React.useState<string>("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<DraftCard[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    setState(loadState());
  }, []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        router.push("/manage");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (!state) {
    return (
      <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-12 max-w-4xl mx-auto">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </main>
    );
  }

  const sortedSections = [...state.sections].sort((a, b) => a.order - b.order);

  function pickFile(f: File | null) {
    setError(null);
    setDrafts([]);
    setPhase("idle");
    setFile(f);
    if (f && !newSectionName.trim()) {
      setNewSectionName(deriveSectionName(f.name));
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    pickFile(f);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = Array.from(e.dataTransfer.files).find(
      (x) => x.type === "application/pdf" || x.name.toLowerCase().endsWith(".pdf")
    );
    if (f) pickFile(f);
  }

  async function generate() {
    if (!file) return;
    setError(null);
    setDrafts([]);
    setPhase("uploading");

    const controller = new AbortController();
    abortRef.current = controller;

    const form = new FormData();
    form.set("pdf", file);

    try {
      const res = await fetch("/api/generate-cards", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = `Server returned ${res.status}`;
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          // body wasn't JSON; keep status message
        }
        setError(msg);
        setPhase("idle");
        return;
      }

      if (!res.body) {
        setError("No response body from server.");
        setPhase("idle");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const collected: DraftCard[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let evt: ServerEvent | null = null;
          try {
            evt = JSON.parse(trimmed) as ServerEvent;
          } catch {
            continue;
          }
          if (evt.type === "card") {
            const draft = serverCardToDraft(evt.card);
            collected.push(draft);
            setDrafts((prev) => [...prev, draft]);
          } else if (evt.type === "error") {
            setError(evt.message);
          }
        }
      }

      if (collected.length === 0 && !error) {
        setError(
          "No cards were extracted. The PDF may be blank, fully illegible, or the model returned nothing."
        );
        setPhase("idle");
        return;
      }

      setPhase("ready");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setPhase("idle");
        return;
      }
      setError(err instanceof Error ? err.message : "Network error.");
      setPhase("idle");
    } finally {
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setDrafts([]);
    setError(null);
    setNewSectionName("");
    setPhase("idle");
  }

  function commit() {
    if (!state) return;
    const valid = drafts.filter((d) => d.selected && isDraftValid(d));
    if (valid.length === 0) return;

    setPhase("saving");

    let nextState: AppState = state;

    let sectionId: string;
    if (sectionChoice === NEW_SECTION_VALUE) {
      const name = newSectionName.trim() || "Imported notes";
      const baseId = slugify(name) || `imported_${Date.now().toString(36)}`;
      const existingIds = new Set(nextState.sections.map((s) => s.id));
      let candidate = baseId;
      let suffix = 2;
      while (existingIds.has(candidate)) {
        candidate = `${baseId}_${suffix++}`;
      }
      sectionId = candidate;
      const order =
        nextState.sections.reduce((m, s) => Math.max(m, s.order), 0) + 1;
      nextState = upsertSection(nextState, { id: sectionId, name, order });
    } else {
      sectionId = sectionChoice;
    }

    const now = Date.now();
    const cards: CardType[] = valid.map((d, i) => {
      const base = {
        id: uuid(),
        sectionId,
        createdAt: now + i,
      };
      if (d.type === "basic") {
        const card: BasicCard = {
          ...base,
          type: "basic",
          prompt: d.prompt.trim(),
          answer: d.answer.trim(),
          hint: d.hint.trim() ? d.hint.trim() : undefined,
        };
        return card;
      }
      const card: ClozeCard = {
        ...base,
        type: "cloze",
        text: d.text.trim(),
        notes: d.notes.trim() ? d.notes.trim() : undefined,
      };
      return card;
    });

    nextState = bulkUpsertCards(nextState, cards);
    setState(nextState);
    router.push("/manage");
  }

  const selectedValidCount = drafts.filter(
    (d) => d.selected && isDraftValid(d)
  ).length;

  const isUploading = phase === "uploading";
  const isSaving = phase === "saving";

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-12 max-w-4xl mx-auto">
      <header className="flex items-start justify-between gap-4 mb-8">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/manage")}
            className="-ml-3 mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to manage
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">
            Import from PDF
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Upload a GoodNotes export — handwritten or typed. The notes are
            OCR&rsquo;d and turned into flashcards in one pass.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="space-y-6">
        <Card className="p-5 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm">PDF</Label>
            {file ? (
              <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                {!isUploading && !isSaving && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => pickFile(null)}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={[
                  "flex flex-col items-center justify-center gap-1 h-32 rounded-md border border-dashed transition-colors duration-1 cursor-pointer",
                  dragOver
                    ? "border-brand bg-brand/5 text-foreground"
                    : "border-border bg-card hover:bg-muted/30 text-muted-foreground",
                ].join(" ")}
              >
                <FileText className="h-5 w-5" />
                <div className="text-sm">
                  {dragOver ? "Drop PDF here" : "Drag a PDF or click to choose"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Up to 32 MB · 100 pages
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={onPick}
                  className="hidden"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="section-choice">Add to section</Label>
              <select
                id="section-choice"
                value={sectionChoice}
                onChange={(e) => setSectionChoice(e.target.value)}
                disabled={isUploading || isSaving}
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-soft transition-colors duration-1"
              >
                <option value={NEW_SECTION_VALUE}>+ New section</option>
                {sortedSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {sectionChoice === NEW_SECTION_VALUE && (
              <div className="space-y-1.5">
                <Label htmlFor="new-section-name">New section name</Label>
                <Input
                  id="new-section-name"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="e.g. Cardiac pharmacology"
                  disabled={isUploading || isSaving}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-start gap-2">
              <FileWarning className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {phase === "uploading" ? (
              <>
                <Button disabled>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {drafts.length > 0
                    ? `Generating… ${drafts.length} card${drafts.length === 1 ? "" : "s"} so far`
                    : "Reading PDF…"}
                </Button>
                <Button variant="ghost" onClick={cancel}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={generate}
                disabled={!file || isSaving}
                variant="brand"
              >
                <Sparkles className="h-4 w-4" />
                Generate cards
              </Button>
            )}
            {(drafts.length > 0 || file) && phase !== "uploading" && (
              <Button
                variant="ghost"
                onClick={reset}
                disabled={isSaving}
                className="ml-auto"
              >
                Reset
              </Button>
            )}
          </div>
        </Card>

        {drafts.length > 0 && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Preview</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Edit anything that&rsquo;s wrong, uncheck what you don&rsquo;t want.
                </p>
              </div>
              {phase === "uploading" && (
                <Badge variant="secondary" className="normal-case tracking-normal">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Streaming
                </Badge>
              )}
            </div>

            <GeneratedCardsPreview cards={drafts} onChange={setDrafts} />

            <div className="flex items-center gap-2 pt-2 border-t border-border/60">
              <Button
                onClick={commit}
                disabled={
                  selectedValidCount === 0 ||
                  isSaving ||
                  isUploading ||
                  (sectionChoice === NEW_SECTION_VALUE &&
                    newSectionName.trim().length === 0)
                }
              >
                <Save className="h-4 w-4" />
                Save {selectedValidCount} card
                {selectedValidCount === 1 ? "" : "s"}
              </Button>
              {sectionChoice === NEW_SECTION_VALUE &&
                newSectionName.trim().length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Name the new section to save.
                  </span>
                )}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

function serverCardToDraft(c: ServerCard): DraftCard {
  const localId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  if (c.type === "basic") {
    return {
      localId,
      type: "basic",
      prompt: c.prompt,
      answer: c.answer,
      hint: c.hint ?? "",
      selected: true,
    };
  }
  return {
    localId,
    type: "cloze",
    text: c.text,
    notes: c.notes ?? "",
    selected: true,
  };
}
