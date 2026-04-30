"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";
import type { Attachment } from "@/lib/types";
import { useImageURL } from "@/lib/attachments";
import { ImageLightbox } from "@/components/ImageLightbox";

type Size = "lg" | "sm";

type Props = {
  attachments: Attachment[] | undefined;
  size?: Size;
};

export function CardImages({ attachments, size = "lg" }: Props) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

  const items = attachments ?? [];
  if (items.length === 0) return null;

  const visible = items.slice(0, 3);
  const hidden = Math.max(0, items.length - 3);

  function open(i: number) {
    setLightboxIndex(i);
    setLightboxOpen(true);
  }

  const heightLg = items.length === 1 ? "max-h-[280px]" : "max-h-[180px]";
  const heightSm = items.length === 1 ? "max-h-[160px]" : "max-h-[120px]";
  const tileHeight = size === "lg" ? heightLg : heightSm;

  const grid =
    items.length === 1
      ? "grid-cols-1"
      : items.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  return (
    <>
      <div
        className={`grid ${grid} gap-2 ${size === "lg" ? "mb-5" : "mt-5"}`}
        aria-label={`${items.length} attached image${items.length === 1 ? "" : "s"}`}
      >
        {visible.map((a, i) => (
          <Tile
            key={a.id}
            attachment={a}
            heightCls={tileHeight}
            overlayCount={i === 2 && hidden > 0 ? hidden : 0}
            onClick={() => open(i)}
          />
        ))}
      </div>

      <ImageLightbox
        attachments={items}
        open={lightboxOpen}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onOpenChange={setLightboxOpen}
      />
    </>
  );
}

function Tile({
  attachment,
  heightCls,
  overlayCount,
  onClick,
}: {
  attachment: Attachment;
  heightCls: string;
  overlayCount: number;
  onClick: () => void;
}) {
  const url = useImageURL(attachment.id);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open image"
      className={`relative block w-full ${heightCls} rounded-lg overflow-hidden border border-border bg-muted hover:border-foreground/20 transition-colors duration-1 group`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover transition-transform duration-2 ease-out group-hover:scale-[1.015]"
          draggable={false}
        />
      ) : (
        <Placeholder />
      )}

      {overlayCount > 0 && (
        <div className="absolute inset-0 grid place-items-center bg-black/55 text-white text-lg font-semibold tabular-nums">
          +{overlayCount}
        </div>
      )}
    </button>
  );
}

function Placeholder() {
  return (
    <div className="absolute inset-0 grid place-items-center text-muted-foreground bg-muted">
      <div className="flex flex-col items-center gap-1.5">
        <ImageOff className="h-5 w-5 opacity-60" />
        <span className="text-[11px]">Image unavailable</span>
      </div>
    </div>
  );
}
