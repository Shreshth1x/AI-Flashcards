"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Attachment } from "@/lib/types";
import { useImageURL } from "@/lib/attachments";

type Props = {
  attachments: Attachment[];
  open: boolean;
  index: number;
  onIndexChange: (i: number) => void;
  onOpenChange: (open: boolean) => void;
};

export function ImageLightbox({
  attachments,
  open,
  index,
  onIndexChange,
  onOpenChange,
}: Props) {
  const total = attachments.length;
  const safeIndex =
    total === 0 ? 0 : ((index % total) + total) % total;
  const active = attachments[safeIndex];

  const next = React.useCallback(() => {
    if (total === 0) return;
    onIndexChange((safeIndex + 1) % total);
  }, [safeIndex, total, onIndexChange]);

  const prev = React.useCallback(() => {
    if (total === 0) return;
    onIndexChange((safeIndex - 1 + total) % total);
  }, [safeIndex, total, onIndexChange]);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-2" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col items-center justify-center outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-2"
          aria-label="Image viewer"
        >
          <div className="relative max-w-[min(96vw,1400px)] max-h-[88vh] w-full h-full flex items-center justify-center px-12">
            {active ? (
              <LightboxImage attachment={active} />
            ) : (
              <div className="text-white/70 text-sm">No image</div>
            )}
          </div>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous image"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 h-11 w-11 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-1"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next image"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 h-11 w-11 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-1"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="absolute top-4 right-4 h-10 w-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-1"
          >
            <X className="h-5 w-5" />
          </button>

          {active && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-3 text-xs text-white/80 tabular-nums px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
              <span>
                {safeIndex + 1} / {total}
              </span>
              <span className="text-white/40">·</span>
              <span>
                {active.width}×{active.height}
              </span>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function LightboxImage({ attachment }: { attachment: Attachment }) {
  const url = useImageURL(attachment.id);
  if (!url) {
    return (
      <div className="text-white/60 text-sm">Loading…</div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="max-w-full max-h-full object-contain rounded-md shadow-pop"
      draggable={false}
    />
  );
}
