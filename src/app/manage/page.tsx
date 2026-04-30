"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CardEditor } from "@/components/CardEditor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";

export default function ManagePage() {
  const router = useRouter();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        // Don't fight inputs/textareas/dialogs.
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (document.querySelector("[role=dialog]")) return;
        router.push("/");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-12 max-w-5xl mx-auto">
      <header className="flex items-start justify-between gap-4 mb-8">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="-ml-3 mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">
            Manage cards
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Add, edit, or delete cards. Edits save automatically to this device.
          </p>
        </div>
        <ThemeToggle />
      </header>
      <CardEditor />
    </main>
  );
}
