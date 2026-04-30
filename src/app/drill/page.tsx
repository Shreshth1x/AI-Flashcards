"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DrillCard } from "@/components/DrillCard";
import { AskPanel } from "@/components/AskPanel";
import type { AppState, Card, Grade } from "@/lib/types";
import { loadState, recordResult } from "@/lib/storage";
import {
  loadSession,
  saveSession,
  type ActiveSession,
} from "@/lib/session";
import { ArrowLeft } from "lucide-react";

export default function DrillPage() {
  const router = useRouter();
  const [state, setState] = React.useState<AppState | null>(null);
  const [session, setSession] = React.useState<ActiveSession | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  const [askOpen, setAskOpen] = React.useState(false);

  React.useEffect(() => {
    setState(loadState());
    setSession(loadSession());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      router.push("/");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const cardById = React.useMemo(() => {
    const map = new Map<string, Card>();
    if (state) for (const c of state.cards) map.set(c.id, c);
    return map;
  }, [state]);

  React.useEffect(() => {
    if (!session) return;
    if (session.index >= session.queue.length) router.push("/results");
  }, [session, router]);

  React.useEffect(() => {
    if (!session || !state) return;
    const idx = session.index;
    if (idx >= session.queue.length) return;
    const id = session.queue[idx]?.cardId;
    if (!id) return;
    if (!state.cards.some((c) => c.id === id)) {
      const skipped: ActiveSession = { ...session, index: idx + 1 };
      saveSession(skipped);
      setSession(skipped);
    }
  }, [session, state]);

  if (!hydrated) {
    return (
      <main className="min-h-screen px-4 py-12 max-w-3xl mx-auto">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </main>
    );
  }

  if (!session || session.queue.length === 0 || !state) {
    return (
      <main className="min-h-screen px-4 py-12 max-w-3xl mx-auto">
        <div className="space-y-4">
          <p className="text-muted-foreground">No active drill session.</p>
          <Button onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
            Back to menu
          </Button>
        </div>
      </main>
    );
  }

  const total = session.queue.length;
  const index = session.index;
  const item = session.queue[index];
  const currentCard = item ? cardById.get(item.cardId) ?? null : null;
  const counts = countResults(session);
  const remaining = total - index;
  const reviewed = index;

  function handleGrade(grade: Grade) {
    if (!session || !state || !currentCard || !item) return;
    const updated: ActiveSession = {
      ...session,
      results: [
        ...session.results,
        { cardId: currentCard.id, cloze: item.cloze, grade },
      ],
      index: session.index + 1,
    };
    saveSession(updated);
    setSession(updated);
    setState(
      recordResult(
        state,
        currentCard.sectionId,
        grade,
        currentCard.id,
        item.cloze
      )
    );

    if (updated.index >= updated.queue.length) router.push("/results");
  }

  if (!currentCard) {
    return (
      <main className="min-h-screen px-4 py-12 max-w-3xl mx-auto">
        <div className="text-muted-foreground text-sm">Loading next card…</div>
      </main>
    );
  }

  return (
    <main
      className={[
        "min-h-screen flex flex-col transition-[padding] duration-2 ease-out",
        askOpen ? "lg:pr-[400px]" : "",
      ].join(" ")}
    >
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            aria-label="Back to deck list"
            className="-ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Decks</span>
          </Button>
          <div className="flex-1 flex items-center justify-between gap-3">
            <div className="text-sm font-medium truncate">
              {session.sectionLabel}
            </div>
            <div className="anki-top-counts">
              <span
                title="Remaining"
                aria-label={`${remaining} remaining`}
              >
                <span className="anki-count-dot anki-count-dot-new" />
                <span className="anki-count-new tabular-nums">{remaining}</span>
              </span>
              <span
                title="Again"
                aria-label={`${counts.again} again`}
              >
                <span className="anki-count-dot anki-count-dot-learn" />
                <span className="anki-count-learn tabular-nums">{counts.again}</span>
              </span>
              <span
                title="Reviewed"
                aria-label={`${counts.good + counts.easy + counts.hard} reviewed`}
              >
                <span className="anki-count-dot anki-count-dot-review" />
                <span className="anki-count-review tabular-nums">
                  {counts.good + counts.easy + counts.hard}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div
          className="h-px w-full max-w-3xl mx-auto bg-border/60 relative"
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 left-0 bg-brand/70 transition-[width] duration-3 ease-out"
            style={{
              width: `${total > 0 ? (reviewed / total) * 100 : 0}%`,
              height: "2px",
              top: "-0.5px",
            }}
          />
        </div>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-10 sm:py-14 max-w-3xl mx-auto w-full">
        <DrillCard
          key={`${currentCard.id}::${item?.cloze ?? "_"}`}
          card={currentCard}
          item={item!}
          sectionLabel={
            state.sections.find((s) => s.id === currentCard.sectionId)?.name ??
            "Section"
          }
          scheduling={
            state.scheduling[`${currentCard.id}#${item?.cloze ?? "_"}`]
          }
          onGrade={handleGrade}
        />

        <AskPanel
          card={currentCard}
          item={item!}
          sectionLabel={
            state.sections.find((s) => s.id === currentCard.sectionId)?.name ??
            "Section"
          }
          open={askOpen}
          onOpenChange={setAskOpen}
        />

        <p className="mt-8 text-center text-[11px] text-muted-foreground tracking-wide">
          Shortcuts · <kbd>Space</kbd> show / good · <kbd>1</kbd>{" "}
          <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> grade · <kbd>Esc</kbd> exit
        </p>
      </div>
    </main>
  );
}

function countResults(s: ActiveSession) {
  let again = 0;
  let hard = 0;
  let good = 0;
  let easy = 0;
  for (const r of s.results) {
    if (r.grade === "again") again += 1;
    else if (r.grade === "hard") hard += 1;
    else if (r.grade === "good") good += 1;
    else if (r.grade === "easy") easy += 1;
  }
  return { again, hard, good, easy };
}
