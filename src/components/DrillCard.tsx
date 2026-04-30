"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClozeText } from "@/components/ClozeText";
import { SegmentedText } from "@/components/SegmentedText";
import { CardImages } from "@/components/CardImages";
import type { Card as CardType, Grade, QueueItem } from "@/lib/types";
import { previewIntervals, type Scheduling } from "@/lib/scheduling";
import { Eye } from "lucide-react";

type Props = {
  card: CardType;
  item: QueueItem;
  sectionLabel: string;
  scheduling: Scheduling | undefined;
  onGrade: (grade: Grade) => void;
};

type Phase = "front" | "back";

const GRADE_LABEL: Record<Grade, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

const GRADE_KEY: Record<Grade, string> = {
  again: "1",
  hard: "2",
  good: "3",
  easy: "4",
};

export function DrillCard({
  card,
  item,
  sectionLabel,
  scheduling,
  onGrade,
}: Props) {
  const [phase, setPhase] = React.useState<Phase>("front");
  const [typed, setTyped] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Reset whenever the queue position changes (cardId or cloze number).
  const resetKey = `${card.id}::${item.cloze ?? "_"}`;
  React.useEffect(() => {
    setPhase("front");
    setTyped("");
    const id = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [resetKey]);

  const flip = React.useCallback(() => {
    setPhase("back");
  }, []);

  // Keyboard: Space/Enter flips on front; 1-4 grade on back.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (phase === "front") {
        if (e.key === "Enter" && !e.shiftKey) {
          // In a textarea, Enter submits (flips). Otherwise Space/Enter flips too.
          if (isTyping || target?.tagName !== "TEXTAREA") {
            e.preventDefault();
            flip();
          }
          return;
        }
        if (e.key === " " && !isTyping) {
          e.preventDefault();
          flip();
          return;
        }
      }

      if (phase === "back" && !isTyping) {
        if (e.key === "1") {
          e.preventDefault();
          onGrade("again");
        } else if (e.key === "2") {
          e.preventDefault();
          onGrade("hard");
        } else if (e.key === "3" || e.key === " ") {
          e.preventDefault();
          onGrade("good");
        } else if (e.key === "4") {
          e.preventDefault();
          onGrade("easy");
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, flip, onGrade]);

  return (
    <div className="anki-card-shell">
      <div className="flex items-center justify-between mb-4 px-1">
        <Badge variant="secondary">{sectionLabel}</Badge>
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider tabular-nums">
          {card.type === "cloze" ? `Cloze · c${item.cloze ?? 1}` : "Basic"}
        </span>
      </div>

      <div className="anki-card">
        <FrontSide card={card} item={item} />

        {phase === "front" && card.type === "basic" && (
          <div className="mt-6">
            <Textarea
              ref={textareaRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type your answer (optional). Enter to flip, Shift+Enter for newline."
              rows={3}
              className="text-md leading-relaxed"
              aria-label="Your answer"
            />
          </div>
        )}

        {phase === "back" && (
          <div className="animate-fade-in">
            <div className="anki-divider" />
            <BackSide card={card} item={item} typed={typed} />
          </div>
        )}
      </div>

      <div className="mt-7">
        {phase === "front" ? (
          <div className="flex flex-col items-center gap-2">
            <Button onClick={flip} size="lg" className="min-w-[200px]">
              <Eye className="h-4 w-4" />
              Show answer
            </Button>
            <span className="text-[11px] text-muted-foreground tracking-wide">
              Space or Enter to flip
            </span>
          </div>
        ) : (
          <GradeBar scheduling={scheduling} onGrade={onGrade} />
        )}
      </div>
    </div>
  );
}

function FrontSide({ card, item }: { card: CardType; item: QueueItem }) {
  if (card.type === "cloze") {
    const num = item.cloze ?? 1;
    return (
      <div>
        <CardImages attachments={card.attachments} size="lg" />
        <div className="anki-text">
          <ClozeText text={card.text} activeNum={num} side="front" />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <CardImages attachments={card.attachments} size="lg" />
      <p className="anki-text">{card.prompt}</p>
      {card.hint && (
        <p className="anki-hint">
          <span className="anki-hint-label">Hint</span> {card.hint}
        </p>
      )}
    </div>
  );
}

function BackSide({
  card,
  item,
  typed,
}: {
  card: CardType;
  item: QueueItem;
  typed: string;
}) {
  if (card.type === "cloze") {
    const num = item.cloze ?? 1;
    return (
      <div className="anki-text space-y-4">
        <ClozeText text={card.text} activeNum={num} side="back" />
        {card.notes && (
          <SegmentedText text={card.notes} variant="muted" className="mt-3" />
        )}
        <CardImages attachments={card.attachments} size="sm" />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {typed.trim().length > 0 && (
        <div>
          <div className="anki-section-label">Your answer</div>
          <p className="anki-typed whitespace-pre-wrap">{typed}</p>
        </div>
      )}
      <div>
        <div className="anki-section-label">Answer</div>
        <SegmentedText text={card.answer} />
      </div>
      <CardImages attachments={card.attachments} size="sm" />
    </div>
  );
}

function GradeBar({
  scheduling,
  onGrade,
}: {
  scheduling: Scheduling | undefined;
  onGrade: (g: Grade) => void;
}) {
  const grades: Grade[] = ["again", "hard", "good", "easy"];
  const intervals = React.useMemo(
    () => previewIntervals(scheduling),
    [scheduling]
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {grades.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onGrade(g)}
          className={`anki-grade anki-grade-${g}`}
          aria-label={`${GRADE_LABEL[g]} (${GRADE_KEY[g]})`}
        >
          <span className="anki-grade-interval">{intervals[g]}</span>
          <span className="anki-grade-label">{GRADE_LABEL[g]}</span>
          <kbd className="anki-grade-kbd">{GRADE_KEY[g]}</kbd>
        </button>
      ))}
    </div>
  );
}
