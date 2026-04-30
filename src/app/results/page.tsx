"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ResultsSummary } from "@/components/ResultsSummary";
import type { AppState, SessionRecord } from "@/lib/types";
import { loadState, recordSession } from "@/lib/storage";
import {
  clearSession,
  loadSession,
  startSession,
  type ActiveSession,
} from "@/lib/session";
import { ArrowLeft, RefreshCcw, Repeat } from "lucide-react";
import { shuffle } from "@/lib/shuffle";

export default function ResultsPage() {
  const router = useRouter();
  const [state, setState] = React.useState<AppState | null>(null);
  const [session, setSession] = React.useState<ActiveSession | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  const recordedRef = React.useRef(false);

  React.useEffect(() => {
    setState(loadState());
    setSession(loadSession());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || !session || !state || recordedRef.current) return;
    if (session.results.length === 0) return;
    recordedRef.current = true;
    const counts = countResults(session);
    const record: SessionRecord = {
      id: `s-${session.startedAt}`,
      startedAt: session.startedAt,
      endedAt: Date.now(),
      sectionId: session.sectionId,
      total: counts.total,
      again: counts.again,
      hard: counts.hard,
      good: counts.good,
      easy: counts.easy,
    };
    setState(recordSession(state, record));
  }, [hydrated, session, state]);

  if (!hydrated) {
    return (
      <main className="min-h-screen px-4 py-12 max-w-3xl mx-auto">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </main>
    );
  }

  if (!session || session.results.length === 0) {
    return (
      <main className="min-h-screen px-4 py-12 max-w-3xl mx-auto">
        <div className="space-y-4">
          <p className="text-muted-foreground">No completed drill to show.</p>
          <Button onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
            Back to decks
          </Button>
        </div>
      </main>
    );
  }

  const counts = countResults(session);

  function redoMissed() {
    if (!session) return;
    const missed = session.results
      .filter((r) => r.grade === "again" || r.grade === "hard")
      .map((r) => ({ cardId: r.cardId, cloze: r.cloze }));
    if (missed.length === 0) return;
    startSession(session.sectionId, session.sectionLabel, shuffle(missed));
    router.push("/drill");
  }

  function restartSection() {
    if (!session) return;
    startSession(session.sectionId, session.sectionLabel, shuffle(session.queue));
    router.push("/drill");
  }

  function backToMenu() {
    clearSession();
    router.push("/");
  }

  const missedCount = session.results.filter(
    (r) => r.grade === "again" || r.grade === "hard"
  ).length;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 sm:py-14 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Drill complete · {session.sectionLabel}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1.5">
          Session results
        </h1>
      </div>

      <ResultsSummary counts={counts} />

      <div className="mt-8 flex flex-wrap gap-2">
        <Button onClick={redoMissed} disabled={missedCount === 0}>
          <Repeat className="h-4 w-4" />
          Redo missed{missedCount > 0 ? ` · ${missedCount}` : ""}
        </Button>
        <Button variant="outline" onClick={restartSection}>
          <RefreshCcw className="h-4 w-4" />
          Restart deck
        </Button>
        <Button variant="ghost" onClick={backToMenu}>
          <ArrowLeft className="h-4 w-4" />
          Back to decks
        </Button>
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
  return { total: s.results.length, again, hard, good, easy };
}
