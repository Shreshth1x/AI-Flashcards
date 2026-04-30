"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionCard } from "@/components/SectionCard";
import { StatsBar } from "@/components/StatsBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { AppState, Card, QueueItem } from "@/lib/types";
import { loadState, resetStats } from "@/lib/storage";
import {
  buildCramQueue,
  buildStudyQueue,
  countBuckets,
  expandQueue,
  startSession,
  type QueueCounts,
} from "@/lib/session";
import { Layers, Pencil, Play, RotateCcw, Shuffle } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [state, setState] = React.useState<AppState | null>(null);
  const [resetOpen, setResetOpen] = React.useState(false);

  React.useEffect(() => {
    setState(loadState());
  }, []);

  const sortedSections = React.useMemo(() => {
    if (!state) return [];
    return [...state.sections].sort((a, b) => a.order - b.order);
  }, [state]);

  const cardsBySection = React.useMemo(() => {
    const map: Record<string, Card[]> = {};
    if (!state) return map;
    for (const c of state.cards) {
      if (!map[c.sectionId]) map[c.sectionId] = [];
      map[c.sectionId].push(c);
    }
    return map;
  }, [state]);

  const cardIndex = React.useMemo(() => {
    const map = new Map<string, Card>();
    if (state) for (const c of state.cards) map.set(c.id, c);
    return map;
  }, [state]);

  const itemsBySection = React.useMemo(() => {
    const out: Record<string, QueueItem[]> = {};
    if (!state) return out;
    for (const s of state.sections) {
      const ids = (cardsBySection[s.id] ?? []).map((c) => c.id);
      out[s.id] = expandQueue(ids, cardIndex);
    }
    return out;
  }, [state, cardsBySection, cardIndex]);

  const countsBySection = React.useMemo(() => {
    const out: Record<string, QueueCounts> = {};
    if (!state) return out;
    for (const s of state.sections) {
      out[s.id] = countBuckets(itemsBySection[s.id] ?? [], state);
    }
    return out;
  }, [state, itemsBySection]);

  const totalCounts = React.useMemo<QueueCounts>(() => {
    const acc: QueueCounts = { due: 0, learning: 0, new: 0, later: 0 };
    for (const c of Object.values(countsBySection)) {
      acc.due += c.due;
      acc.learning += c.learning;
      acc.new += c.new;
      acc.later += c.later;
    }
    return acc;
  }, [countsBySection]);

  function startStudy(sectionId: string) {
    if (!state) return;
    const items = itemsBySection[sectionId] ?? [];
    if (items.length === 0) return;
    let queue = buildStudyQueue(items, state);
    if (queue.length === 0) queue = buildCramQueue(items);
    const section = state.sections.find((s) => s.id === sectionId);
    startSession(sectionId, section?.name ?? "Section", queue);
    router.push("/drill");
  }

  function startMixedStudy() {
    if (!state) return;
    const all: QueueItem[] = [];
    for (const items of Object.values(itemsBySection)) all.push(...items);
    if (all.length === 0) return;
    let queue = buildStudyQueue(all, state);
    if (queue.length === 0) queue = buildCramQueue(all);
    startSession("__mixed__", "Mixed study", queue);
    router.push("/drill");
  }

  function startCramAll() {
    if (!state) return;
    const all: QueueItem[] = [];
    for (const items of Object.values(itemsBySection)) all.push(...items);
    if (all.length === 0) return;
    startSession("__mixed__", "Cram all", buildCramQueue(all));
    router.push("/drill");
  }

  function handleResetStats() {
    if (!state) return;
    setState(resetStats(state));
    setResetOpen(false);
  }

  const dueOrLearning = totalCounts.due + totalCounts.learning;
  const studyable = dueOrLearning + totalCounts.new;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 sm:py-14 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Case prep
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Spaced-repetition flashcards for SF tech & SaaS interviews.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/manage")}
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">Manage</span>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {state && (
        <>
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={startMixedStudy}
              disabled={studyable === 0 && totalCounts.later === 0}
            >
              <Play className="h-4 w-4" />
              {studyable > 0 ? `Study now · ${studyable}` : "Cram all decks"}
            </Button>

            <div className="anki-top-counts">
              <span>
                <span className="anki-count-dot anki-count-dot-new" />
                <span className="anki-count-new">{totalCounts.new}</span>
                <span className="text-muted-foreground ml-1.5 text-[11px] uppercase tracking-wider">
                  new
                </span>
              </span>
              <span>
                <span className="anki-count-dot anki-count-dot-learn" />
                <span className="anki-count-learn">{totalCounts.learning}</span>
                <span className="text-muted-foreground ml-1.5 text-[11px] uppercase tracking-wider">
                  learn
                </span>
              </span>
              <span>
                <span className="anki-count-dot anki-count-dot-review" />
                <span className="anki-count-review">{totalCounts.due}</span>
                <span className="text-muted-foreground ml-1.5 text-[11px] uppercase tracking-wider">
                  due
                </span>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={startCramAll}>
                <Shuffle className="h-4 w-4" />
                <span className="hidden sm:inline">Cram everything</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResetOpen(true)}
                disabled={Object.values(state.stats).every(
                  (s) => s.attempted === 0
                )}
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </div>
          </div>

          <section
            className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-10"
            aria-label="Decks"
          >
            {sortedSections.map((s) => {
              const cards = cardsBySection[s.id] ?? [];
              const items = itemsBySection[s.id] ?? [];
              return (
                <SectionCard
                  key={s.id}
                  section={s}
                  cardCount={cards.length}
                  reviewCount={items.length}
                  counts={
                    countsBySection[s.id] ?? {
                      due: 0,
                      learning: 0,
                      new: 0,
                      later: 0,
                    }
                  }
                  stats={
                    state.stats[s.id] ?? {
                      attempted: 0,
                      again: 0,
                      hard: 0,
                      good: 0,
                      easy: 0,
                    }
                  }
                  onStart={startStudy}
                />
              );
            })}
            {sortedSections.length === 0 && (
              <div className="col-span-full border border-dashed rounded-lg p-10 text-center text-muted-foreground">
                <Layers className="h-6 w-6 mx-auto mb-2" />
                No decks yet — add some via{" "}
                <button
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => router.push("/manage")}
                >
                  Manage
                </button>
                .
              </div>
            )}
          </section>

          <StatsBar stats={state.stats} />

          {state.history.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Recent sessions
              </h2>
              <ul className="divide-y divide-border/60 rounded-lg border border-border bg-card overflow-hidden">
                {state.history.slice(0, 5).map((h) => {
                  const acc = h.total
                    ? Math.round(
                        ((h.good + h.easy + h.hard * 0.5) / h.total) * 100
                      )
                    : 0;
                  return (
                    <li
                      key={h.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                    >
                      <span className="text-foreground truncate">
                        {labelForSection(state, h.sectionId)}
                      </span>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
                        <span className="font-medium text-foreground">
                          {acc}%
                        </span>
                        <span className="hidden sm:inline">
                          {h.again}/{h.hard}/{h.good}/{h.easy}
                        </span>
                        <span>
                          {new Date(h.endedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all stats and scheduling?</DialogTitle>
            <DialogDescription>
              This clears your accuracy, attempt counts, recent session
              history, and spaced-repetition schedule across every deck. Your
              cards stay intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetStats}>
              Reset everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function labelForSection(state: AppState, sectionId: string) {
  if (sectionId === "__mixed__") return "Mixed";
  const found = state.sections.find((s) => s.id === sectionId);
  return found?.name ?? sectionId;
}
