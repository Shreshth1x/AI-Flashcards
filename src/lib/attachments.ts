"use client";

import * as React from "react";
import type { AppState, Attachment, AttachmentMime } from "./types";

const DB_NAME = "mck-prep";
const DB_VERSION = 1;
const STORE = "attachments";

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!isBrowser()) return Promise.reject(new Error("IndexedDB unavailable"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
    req.onblocked = () => reject(new Error("IDB blocked"));
  }).catch((err) => {
    dbPromise = null;
    throw err;
  });
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | T
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result: T | undefined;
    let resolved = false;
    const out = fn(store);
    if (out && typeof (out as IDBRequest).onsuccess !== "undefined") {
      const req = out as IDBRequest<T>;
      req.onsuccess = () => {
        result = req.result;
        resolved = true;
      };
      req.onerror = () => reject(req.error ?? new Error("IDB op failed"));
    } else {
      result = out as T;
      resolved = true;
    }
    tx.oncomplete = () => resolve((resolved ? (result as T) : (undefined as T)) as T);
    tx.onerror = () => reject(tx.error ?? new Error("IDB tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IDB tx aborted"));
  });
}

export function isIdbAvailable(): boolean {
  return isBrowser();
}

type StoredAttachment = {
  id: string;
  blob: Blob;
  createdAt: number;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const ALLOWED_MIME = new Set<AttachmentMime>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_PRE_RESIZE_BYTES = 25 * 1024 * 1024;
const MAX_PRE_RESIZE_PIXELS = 50_000_000;

export type ResizeOptions = {
  maxEdge?: number;
  quality?: number;
};

export async function resizeForUpload(
  file: File,
  opts: ResizeOptions = {}
): Promise<{ blob: Blob; width: number; height: number; mimeType: AttachmentMime }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported.");
  }
  if (file.size > MAX_PRE_RESIZE_BYTES) {
    throw new Error("Image is too large (max 25MB before resize).");
  }

  const maxEdge = opts.maxEdge ?? 2000;
  const quality = opts.quality ?? 0.85;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
  } catch {
    bitmap = await createImageBitmap(file);
  }
  if (!bitmap) throw new Error("Could not decode image.");

  if (bitmap.width * bitmap.height > MAX_PRE_RESIZE_PIXELS) {
    bitmap.close();
    throw new Error("Image resolution is too large.");
  }

  const scale = Math.min(maxEdge / Math.max(bitmap.width, bitmap.height), 1);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  let blob: Blob | null = null;
  const mimeType: AttachmentMime = "image/jpeg";

  // Prefer OffscreenCanvas where available
  if (typeof OffscreenCanvas !== "undefined") {
    try {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("OffscreenCanvas 2d context unavailable");
      ctx.drawImage(bitmap, 0, 0, w, h);
      blob = await canvas.convertToBlob({ type: mimeType, quality });
    } catch {
      blob = null;
    }
  }

  if (!blob) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      throw new Error("Canvas 2d context unavailable.");
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, quality)
    );
  }

  bitmap.close();
  if (!blob) throw new Error("Could not encode image.");
  return { blob, width: w, height: h, mimeType };
}

export async function putAttachment(file: File): Promise<Attachment> {
  const { blob, width, height, mimeType } = await resizeForUpload(file);
  const id = uuid();
  const createdAt = Date.now();
  await withStore<undefined>("readwrite", (store) => {
    store.put({ id, blob, createdAt } as StoredAttachment);
    return undefined;
  });
  return {
    id,
    mimeType: ALLOWED_MIME.has(mimeType) ? mimeType : "image/jpeg",
    width,
    height,
    bytes: blob.size,
    createdAt,
  };
}

export async function getAttachmentBlob(id: string): Promise<Blob | null> {
  try {
    const rec = await withStore<StoredAttachment | undefined>(
      "readonly",
      (store) => store.get(id) as IDBRequest<StoredAttachment | undefined>
    );
    return rec?.blob ?? null;
  } catch {
    return null;
  }
}

export async function getAttachmentURL(id: string): Promise<string | null> {
  const blob = await getAttachmentBlob(id);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function getAttachmentBase64(
  id: string
): Promise<{ data: string; mediaType: AttachmentMime } | null> {
  const blob = await getAttachmentBlob(id);
  if (!blob) return null;
  const mediaType = (ALLOWED_MIME.has(blob.type as AttachmentMime)
    ? (blob.type as AttachmentMime)
    : "image/jpeg") as AttachmentMime;
  const data = await blobToBase64(blob);
  return { data, mediaType };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? "");
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

export async function deleteAttachment(id: string): Promise<void> {
  try {
    await withStore<undefined>("readwrite", (store) => {
      store.delete(id);
      return undefined;
    });
  } catch {
    // best-effort
  }
}

export async function listAttachmentIds(): Promise<string[]> {
  try {
    return await withStore<string[]>("readonly", (store) => {
      return store.getAllKeys() as IDBRequest<string[]> as unknown as IDBRequest<
        string[]
      >;
    });
  } catch {
    return [];
  }
}

export async function reconcileOrphans(state: AppState): Promise<number> {
  if (!isBrowser()) return 0;
  try {
    const referenced = new Set<string>();
    for (const c of state.cards) {
      if (c.attachments) {
        for (const a of c.attachments) referenced.add(a.id);
      }
    }
    const all = await listAttachmentIds();
    let purged = 0;
    for (const id of all) {
      if (!referenced.has(id)) {
        await deleteAttachment(id);
        purged++;
      }
    }
    return purged;
  } catch {
    return 0;
  }
}

export function useImageURL(id: string | null | undefined): string | null {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let active: string | null = null;
    getAttachmentURL(id).then((u) => {
      if (cancelled) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      active = u;
      setUrl(u);
    });
    return () => {
      cancelled = true;
      if (active) URL.revokeObjectURL(active);
    };
  }, [id]);
  return url;
}
