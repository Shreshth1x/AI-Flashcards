"use client";

import * as React from "react";
import Link from "next/link";
import { v4 as uuid } from "uuid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Brackets,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  FileWarning,
  FolderPlus,
  ImageIcon,
  ImagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type {
  AppState,
  Attachment,
  BasicCard,
  Card as CardType,
  ClozeCard,
  Section,
} from "@/lib/types";
import {
  deleteCard,
  deleteSection,
  exportData,
  factoryReset,
  importData,
  loadState,
  upsertCard,
  upsertSection,
} from "@/lib/storage";
import {
  isIdbAvailable,
  putAttachment,
  reconcileOrphans,
  useImageURL,
} from "@/lib/attachments";
import { clozeNumbers, hasClozes } from "@/lib/cloze";

const MAX_ATTACHMENTS = 6;

type EditingBasic = {
  id: string | null;
  type: "basic";
  sectionId: string;
  prompt: string;
  answer: string;
  hint: string;
  attachments: Attachment[];
};

type EditingCloze = {
  id: string | null;
  type: "cloze";
  sectionId: string;
  text: string;
  notes: string;
  attachments: Attachment[];
};

type EditingCard = EditingBasic | EditingCloze;

export function CardEditor() {
  const [state, setState] = React.useState<AppState | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [editing, setEditing] = React.useState<EditingCard | null>(null);
  const [deletingCard, setDeletingCard] = React.useState<CardType | null>(null);
  const [deletingSection, setDeletingSection] = React.useState<Section | null>(
    null
  );
  const [newSectionOpen, setNewSectionOpen] = React.useState(false);
  const [newSectionName, setNewSectionName] = React.useState("");
  const [factoryOpen, setFactoryOpen] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const clozeTextRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setExpanded(new Set(loaded.sections.map((s) => s.id)));
    void reconcileOrphans(loaded);
  }, []);

  if (!state) {
    return <div className="text-muted-foreground text-sm">Loading…</div>;
  }

  const sortedSections = [...state.sections].sort((a, b) => a.order - b.order);
  const cardsBySection: Record<string, CardType[]> = {};
  for (const c of state.cards) {
    if (!cardsBySection[c.sectionId]) cardsBySection[c.sectionId] = [];
    cardsBySection[c.sectionId].push(c);
  }

  function toggle(sectionId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  function openNewBasic(sectionId: string) {
    setEditing({
      id: null,
      type: "basic",
      sectionId,
      prompt: "",
      answer: "",
      hint: "",
      attachments: [],
    });
  }

  function openNewCloze(sectionId: string) {
    setEditing({
      id: null,
      type: "cloze",
      sectionId,
      text: "",
      notes: "",
      attachments: [],
    });
  }

  function openEditCard(card: CardType) {
    if (card.type === "cloze") {
      setEditing({
        id: card.id,
        type: "cloze",
        sectionId: card.sectionId,
        text: card.text,
        notes: card.notes ?? "",
        attachments: card.attachments ?? [],
      });
    } else {
      setEditing({
        id: card.id,
        type: "basic",
        sectionId: card.sectionId,
        prompt: card.prompt,
        answer: card.answer,
        hint: card.hint ?? "",
        attachments: card.attachments ?? [],
      });
    }
  }

  function saveCard() {
    if (!editing || !state) return;
    const existing = editing.id
      ? state.cards.find((c) => c.id === editing.id)
      : null;
    const createdAt = existing?.createdAt ?? Date.now();
    const attachments =
      editing.attachments.length > 0 ? editing.attachments : undefined;

    if (editing.type === "basic") {
      const prompt = editing.prompt.trim();
      const answer = editing.answer.trim();
      if (!prompt || !answer) return;
      const card: BasicCard = {
        id: editing.id ?? uuid(),
        sectionId: editing.sectionId,
        type: "basic",
        prompt,
        answer,
        hint: editing.hint.trim() ? editing.hint.trim() : undefined,
        attachments,
        createdAt,
      };
      const next = upsertCard(state, card);
      setState(next);
      void reconcileOrphans(next);
    } else {
      const text = editing.text.trim();
      if (!text || !hasClozes(text)) return;
      const card: ClozeCard = {
        id: editing.id ?? uuid(),
        sectionId: editing.sectionId,
        type: "cloze",
        text,
        notes: editing.notes.trim() ? editing.notes.trim() : undefined,
        attachments,
        createdAt,
      };
      const next = upsertCard(state, card);
      setState(next);
      void reconcileOrphans(next);
    }
    setEditing(null);
  }

  function confirmDeleteCard() {
    if (!deletingCard || !state) return;
    setState(deleteCard(state, deletingCard.id));
    setDeletingCard(null);
  }

  function confirmDeleteSection() {
    if (!deletingSection || !state) return;
    setState(deleteSection(state, deletingSection.id));
    setDeletingSection(null);
  }

  function createSection() {
    if (!state) return;
    const name = newSectionName.trim();
    if (!name) return;
    const id =
      slugify(name) || `section-${Math.random().toString(36).slice(2, 8)}`;
    const order = state.sections.reduce((m, s) => Math.max(m, s.order), 0) + 1;
    const next = upsertSection(state, { id, name, order });
    setState(next);
    setExpanded((prev) => new Set(prev).add(id));
    setNewSectionName("");
    setNewSectionOpen(false);
  }

  function handleExport() {
    if (!state) return;
    const payload = exportData(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `mck-prep-cards-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !state) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const next = importData(state, data);
      setState(next);
      setExpanded(new Set(next.sections.map((s) => s.id)));
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to import file."
      );
    }
  }

  function handleFactoryReset() {
    const next = factoryReset();
    setState(next);
    setExpanded(new Set(next.sections.map((s) => s.id)));
    setFactoryOpen(false);
  }

  function wrapSelectionAsCloze() {
    if (!editing || editing.type !== "cloze") return;
    const ta = clozeTextRef.current;
    if (!ta) return;
    const text = editing.text;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = text.slice(start, end);
    if (!selected) return;
    const existing = clozeNumbers(text);
    const nextNum = existing.length === 0 ? 1 : Math.max(...existing) + 1;
    const wrapped = `{{c${nextNum}::${selected}}}`;
    const newText = text.slice(0, start) + wrapped + text.slice(end);
    setEditing({ ...editing, text: newText });
    requestAnimationFrame(() => {
      ta.focus();
      const newStart = start + wrapped.length;
      ta.selectionStart = newStart;
      ta.selectionEnd = newStart;
    });
  }

  function setAttachments(attachments: Attachment[]) {
    if (!editing) return;
    setEditing({ ...editing, attachments });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setNewSectionOpen(true)}>
          <FolderPlus className="h-4 w-4" />
          New section
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button variant="outline" onClick={handleImportClick}>
          <Upload className="h-4 w-4" />
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />
        <Button asChild variant="outline">
          <Link href="/manage/upload">
            <FileText className="h-4 w-4" />
            Import from PDF
          </Link>
        </Button>
        <Button
          variant="ghost"
          onClick={() => setFactoryOpen(true)}
          className="ml-auto"
        >
          <RotateCcw className="h-4 w-4" />
          Factory reset
        </Button>
      </div>

      {!isIdbAvailable() && (
        <div className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-warning flex items-center gap-2">
          <FileWarning className="h-4 w-4" />
          IndexedDB is unavailable in this browser — image attachments may not
          persist (try a non-private window).
        </div>
      )}

      {importError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-center gap-2">
          <FileWarning className="h-4 w-4" />
          {importError}
        </div>
      )}

      <div className="space-y-3">
        {sortedSections.map((section) => {
          const cards = cardsBySection[section.id] ?? [];
          const isOpen = expanded.has(section.id);
          return (
            <Card key={section.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(section.id)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/40 transition-colors duration-1"
                aria-expanded={isOpen}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-md">{section.name}</span>
                <Badge variant="secondary" className="ml-1 normal-case tracking-normal">
                  {cards.length}
                </Badge>
                <code className="ml-2 text-[11px] text-muted-foreground font-mono">
                  {section.id}
                </code>
                <div
                  className="ml-auto flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openNewBasic(section.id)}
                  >
                    <Plus className="h-4 w-4" />
                    Basic
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openNewCloze(section.id)}
                  >
                    <Brackets className="h-4 w-4" />
                    Cloze
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete section"
                    onClick={() => setDeletingSection(section)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border/60 divide-y divide-border/60">
                  {cards.length === 0 && (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      No cards yet. Add a basic or cloze card.
                    </div>
                  )}
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors duration-1"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              card.type === "cloze" ? "default" : "outline"
                            }
                          >
                            {card.type}
                            {card.type === "cloze" &&
                              ` · ${clozeNumbers(card.text).length}`}
                          </Badge>
                          {card.attachments && card.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <ImageIcon className="h-3 w-3" />
                              {card.attachments.length}
                            </span>
                          )}
                        </div>
                        {card.type === "basic" ? (
                          <>
                            <div className="text-sm font-medium leading-snug break-words">
                              {card.prompt}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2 break-words">
                              {card.answer}
                            </div>
                            {card.hint && (
                              <div className="text-xs italic text-muted-foreground">
                                Hint: {card.hint}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm leading-snug break-words font-mono text-[12.5px] whitespace-pre-wrap line-clamp-3">
                            {card.text}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditCard(card)}
                          aria-label="Edit card"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingCard(card)}
                          aria-label="Delete card"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Edit / new card dialog */}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit card" : "New card"}
              {editing && (
                <Badge variant="secondary" className="ml-2 normal-case tracking-normal">
                  {editing.type}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 -mr-1">
              <div className="space-y-1.5">
                <Label htmlFor="card-section">Section</Label>
                <select
                  id="card-section"
                  value={editing.sectionId}
                  onChange={(e) =>
                    setEditing({ ...editing, sectionId: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-soft transition-colors duration-1"
                >
                  {sortedSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {editing.type === "basic" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="card-prompt">Prompt</Label>
                    <Textarea
                      id="card-prompt"
                      value={editing.prompt}
                      onChange={(e) =>
                        setEditing({ ...editing, prompt: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="card-answer">Answer</Label>
                    <Textarea
                      id="card-answer"
                      value={editing.answer}
                      onChange={(e) =>
                        setEditing({ ...editing, answer: e.target.value })
                      }
                      rows={4}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="card-hint">Hint (optional)</Label>
                    <Input
                      id="card-hint"
                      value={editing.hint}
                      onChange={(e) =>
                        setEditing({ ...editing, hint: e.target.value })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="card-cloze">
                        Text (use{" "}
                        <code className="text-[11px]">
                          {"{{c1::content}}"}
                        </code>{" "}
                        for clozes)
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={wrapSelectionAsCloze}
                        title="Wrap selection in next cloze number"
                      >
                        <Brackets className="h-3.5 w-3.5" />
                        Cloze selection
                      </Button>
                    </div>
                    <Textarea
                      id="card-cloze"
                      ref={clozeTextRef}
                      value={editing.text}
                      onChange={(e) =>
                        setEditing({ ...editing, text: e.target.value })
                      }
                      rows={6}
                      className="font-mono text-[13px] leading-relaxed"
                      placeholder={
                        "Profitability buckets: {{c1::Revenue drivers}}, {{c2::Cost drivers}}, {{c3::External factors}}."
                      }
                    />
                    <ClozePreview text={editing.text} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="card-notes">Notes (optional)</Label>
                    <Input
                      id="card-notes"
                      value={editing.notes}
                      onChange={(e) =>
                        setEditing({ ...editing, notes: e.target.value })
                      }
                      placeholder="Shown after flip"
                    />
                  </div>
                </>
              )}

              <AttachmentEditor
                attachments={editing.attachments}
                onChange={setAttachments}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={saveCard} disabled={!isValid(editing)}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New section */}
      <Dialog open={newSectionOpen} onOpenChange={setNewSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New section</DialogTitle>
            <DialogDescription>
              Sections group related cards together for drilling.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="section-name">Name</Label>
            <Input
              id="section-name"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g. Math drills"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") createSection();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewSectionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createSection}
              disabled={newSectionName.trim().length === 0}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete card */}
      <Dialog
        open={deletingCard !== null}
        onOpenChange={(o) => !o && setDeletingCard(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this card?</DialogTitle>
            <DialogDescription>
              This permanently removes the card from your deck. Stats for past
              attempts are kept at the section level.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingCard(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCard}>
              Delete card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete section */}
      <Dialog
        open={deletingSection !== null}
        onOpenChange={(o) => !o && setDeletingSection(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this section?</DialogTitle>
            <DialogDescription>
              This deletes the section{" "}
              <strong>{deletingSection?.name}</strong> and all of its cards.
              Cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingSection(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteSection}>
              Delete section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Factory reset */}
      <Dialog open={factoryOpen} onOpenChange={setFactoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore factory cards?</DialogTitle>
            <DialogDescription>
              Replaces your sections, cards, and stats with the seeded defaults.
              Export your current cards first if you want a backup.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFactoryOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleFactoryReset}>
              Restore defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttachmentEditor({
  attachments,
  onChange,
}: {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const atCap = attachments.length >= MAX_ATTACHMENTS;
  const remaining = MAX_ATTACHMENTS - attachments.length;

  async function ingest(files: File[]) {
    if (atCap) {
      setError(`Up to ${MAX_ATTACHMENTS} images per card.`);
      return;
    }
    setError(null);
    const slice = files.slice(0, remaining);
    setBusy(true);
    const next = [...attachments];
    for (const file of slice) {
      try {
        const att = await putAttachment(file);
        next.push(att);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to import image."
        );
      }
    }
    setBusy(false);
    onChange(next);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length > 0) void ingest(files);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (atCap) return;
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) void ingest(files);
  }

  function remove(id: string) {
    onChange(attachments.filter((a) => a.id !== id));
  }

  function move(id: string, delta: -1 | 1) {
    const idx = attachments.findIndex((a) => a.id === id);
    if (idx < 0) return;
    const next = idx + delta;
    if (next < 0 || next >= attachments.length) return;
    const arr = [...attachments];
    const [item] = arr.splice(idx, 1);
    arr.splice(next, 0, item);
    onChange(arr);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label>Images</Label>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {attachments.length}/{MAX_ATTACHMENTS}
        </span>
      </div>

      <div
        role="button"
        tabIndex={atCap ? -1 : 0}
        onClick={() => !atCap && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (atCap) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          if (atCap) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        aria-disabled={atCap}
        className={[
          "relative flex flex-col items-center justify-center gap-1 h-24 rounded-md border border-dashed transition-colors duration-1",
          atCap
            ? "border-border bg-muted/30 text-muted-foreground/60 cursor-not-allowed"
            : dragOver
              ? "border-brand bg-brand/5 text-foreground cursor-pointer"
              : "border-border bg-card hover:bg-muted/30 cursor-pointer text-muted-foreground",
        ].join(" ")}
      >
        <ImagePlus className="h-5 w-5" />
        <div className="text-xs">
          {busy
            ? "Uploading…"
            : atCap
              ? "Maximum images reached"
              : dragOver
                ? "Drop to upload"
                : "Drag images or click to upload"}
        </div>
        <div className="text-[11px] text-muted-foreground">
          JPG · PNG · WebP up to 25MB
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onPick}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {error && (
        <div className="text-[11px] text-destructive">{error}</div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <Thumb
              key={a.id}
              attachment={a}
              isFirst={i === 0}
              isLast={i === attachments.length - 1}
              onDelete={() => remove(a.id)}
              onUp={() => move(a.id, -1)}
              onDown={() => move(a.id, 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Thumb({
  attachment,
  isFirst,
  isLast,
  onDelete,
  onUp,
  onDown,
}: {
  attachment: Attachment;
  isFirst: boolean;
  isLast: boolean;
  onDelete: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const url = useImageURL(attachment.id);

  return (
    <div className="group relative h-24 w-24 rounded-md overflow-hidden border border-border bg-muted">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="h-full w-full grid place-items-center text-muted-foreground">
          <ImageIcon className="h-4 w-4 opacity-40" />
        </div>
      )}

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-1 bg-black/40">
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete image"
          className="absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-full bg-card/95 text-foreground hover:bg-card transition-colors duration-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onUp}
          disabled={isFirst}
          aria-label="Move up"
          className="absolute bottom-1 left-1 h-6 w-6 grid place-items-center rounded-full bg-card/95 text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card transition-colors duration-1"
        >
          <ChevronDown className="h-3.5 w-3.5 rotate-180" />
        </button>
        <button
          type="button"
          onClick={onDown}
          disabled={isLast}
          aria-label="Move down"
          className="absolute bottom-1 right-1 h-6 w-6 grid place-items-center rounded-full bg-card/95 text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card transition-colors duration-1"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ClozePreview({ text }: { text: string }) {
  const nums = clozeNumbers(text);
  if (nums.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Tip: highlight any phrase and click <em>Cloze selection</em>, or type{" "}
        <code>{"{{c1::your phrase}}"}</code> manually.
      </p>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">
      {nums.length} cloze card{nums.length === 1 ? "" : "s"} (c
      {nums.join(", c")}).
    </p>
  );
}

function isValid(e: EditingCard | null): boolean {
  if (!e) return false;
  if (e.type === "basic") {
    return e.prompt.trim().length > 0 && e.answer.trim().length > 0;
  }
  return e.text.trim().length > 0 && hasClozes(e.text);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
