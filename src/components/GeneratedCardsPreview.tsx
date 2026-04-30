"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Brackets, Check, Trash2 } from "lucide-react";
import { hasClozes } from "@/lib/cloze";

export type DraftBasicCard = {
  localId: string;
  type: "basic";
  prompt: string;
  answer: string;
  hint: string;
  selected: boolean;
};

export type DraftClozeCard = {
  localId: string;
  type: "cloze";
  text: string;
  notes: string;
  selected: boolean;
};

export type DraftCard = DraftBasicCard | DraftClozeCard;

export function isDraftValid(c: DraftCard): boolean {
  if (c.type === "basic") {
    return c.prompt.trim().length > 0 && c.answer.trim().length > 0;
  }
  return c.text.trim().length > 0 && hasClozes(c.text);
}

export function GeneratedCardsPreview({
  cards,
  onChange,
}: {
  cards: DraftCard[];
  onChange: (next: DraftCard[]) => void;
}) {
  function update(localId: string, patch: Partial<DraftCard>) {
    onChange(
      cards.map((c) =>
        c.localId === localId ? ({ ...c, ...patch } as DraftCard) : c
      )
    );
  }

  function remove(localId: string) {
    onChange(cards.filter((c) => c.localId !== localId));
  }

  if (cards.length === 0) return null;

  const selectedCount = cards.filter((c) => c.selected && isDraftValid(c)).length;
  const allSelected = cards.every((c) => c.selected);

  function toggleAll() {
    onChange(cards.map((c) => ({ ...c, selected: !allSelected })));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium tabular-nums">
            {selectedCount}
          </span>{" "}
          of{" "}
          <span className="tabular-nums">{cards.length}</span> selected
        </div>
        <Button variant="ghost" size="sm" onClick={toggleAll}>
          <Check className="h-4 w-4" />
          {allSelected ? "Deselect all" : "Select all"}
        </Button>
      </div>

      <ul className="space-y-2">
        {cards.map((c) => (
          <li
            key={c.localId}
            className={[
              "rounded-md border bg-card transition-colors duration-1",
              c.selected ? "border-border" : "border-border/40 opacity-60",
            ].join(" ")}
          >
            <div className="px-3 py-3 flex items-start gap-3">
              <input
                type="checkbox"
                checked={c.selected}
                onChange={(e) => update(c.localId, { selected: e.target.checked })}
                aria-label="Include this card"
                className="mt-1 h-4 w-4 cursor-pointer accent-foreground"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={c.type === "cloze" ? "default" : "outline"}>
                    {c.type === "cloze" ? (
                      <>
                        <Brackets className="h-3 w-3" />
                        cloze
                      </>
                    ) : (
                      "basic"
                    )}
                  </Badge>
                  {!isDraftValid(c) && (
                    <span className="text-[11px] text-destructive">
                      {c.type === "cloze"
                        ? "needs at least one {{c1::...}}"
                        : "prompt and answer required"}
                    </span>
                  )}
                </div>

                {c.type === "basic" ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Prompt
                      </Label>
                      <Textarea
                        value={c.prompt}
                        onChange={(e) =>
                          update(c.localId, { prompt: e.target.value })
                        }
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Answer
                      </Label>
                      <Textarea
                        value={c.answer}
                        onChange={(e) =>
                          update(c.localId, { answer: e.target.value })
                        }
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Hint (optional)
                      </Label>
                      <Input
                        value={c.hint}
                        onChange={(e) =>
                          update(c.localId, { hint: e.target.value })
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Text (with {"{{c1::...}}"} blanks)
                      </Label>
                      <Textarea
                        value={c.text}
                        onChange={(e) =>
                          update(c.localId, { text: e.target.value })
                        }
                        rows={3}
                        className="font-mono text-[12.5px] leading-relaxed"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Notes (optional)
                      </Label>
                      <Input
                        value={c.notes}
                        onChange={(e) =>
                          update(c.localId, { notes: e.target.value })
                        }
                        className="text-sm"
                        placeholder="Shown after flip"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(c.localId)}
                aria-label="Discard card"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
