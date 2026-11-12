"use client";

import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { useGenerateUploadUrl } from "./hooks";

export type FormImage = { id: Id<"_storage">; url: string };

const MAX = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Props = {
  value: FormImage[];
  onChange: (images: FormImage[]) => void;
  onBusyChange?: (busy: boolean) => void;
};

/** Up to 4 photos. Each uploads straight to Convex storage; the first is the cover. */
export function ImageUploader({ value, onChange, onBusyChange }: Props) {
  const generateUploadUrl = useGenerateUploadUrl();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(files: File[]) {
    setError(null);
    const room = MAX - value.length;
    if (room <= 0) {
      setError(`You can add up to ${MAX} photos.`);
      return;
    }
    const picked = files.slice(0, room);
    const bad = picked.find((f) => !TYPES.includes(f.type) || f.size > MAX_BYTES);
    if (bad) {
      setError(TYPES.includes(bad.type) ? `"${bad.name}" is over 5 MB.` : `"${bad.name}" isn't a JPG, PNG, WebP or GIF.`);
      return;
    }
    if (files.length > room) setError(`Only the first ${room} photo${room === 1 ? "" : "s"} were added (max ${MAX}).`);

    setUploading(picked.length);
    onBusyChange?.(true);
    const added: FormImage[] = [];
    try {
      for (const file of picked) {
        const url = await generateUploadUrl({});
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        if (!res.ok) throw new Error("upload failed");
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        added.push({ id: storageId, url: URL.createObjectURL(file) });
        setUploading((n) => n - 1);
      }
    } catch {
      setError("A photo didn't upload. Check your connection and try again.");
    } finally {
      if (added.length) onChange([...value, ...added]);
      setUploading(0);
      onBusyChange?.(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void upload([...e.dataTransfer.files]);
  }

  const remove = (id: string) => onChange(value.filter((i) => i.id !== id));
  const makeCover = (id: string) => {
    const img = value.find((i) => i.id === id);
    if (img) onChange([img, ...value.filter((i) => i.id !== id)]);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {value.map((img, i) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- user uploads from Convex storage, sizes unknown */}
            <img src={img.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            {i === 0 ? (
              <span className="absolute top-1.5 left-1.5 rounded-md bg-zinc-900/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
                Cover
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeCover(img.id)}
                className="absolute top-1.5 left-1.5 flex cursor-pointer items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700 opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100"
              >
                <Star className="size-3" /> Make cover
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(img.id)}
              className="absolute top-1.5 right-1.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-zinc-900/70 text-white transition hover:bg-zinc-900"
              aria-label={`Remove photo ${i + 1}`}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {Array.from({ length: uploading }, (_, i) => (
          <div key={`up-${i}`} className="flex aspect-square items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
            <Loader2 className="size-5 animate-spin text-zinc-400" />
          </div>
        ))}

        {value.length + uploading < MAX && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-xs font-medium transition ${
              dragging ? "border-brand-600 bg-brand-50 text-brand-800" : "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50"
            }`}
          >
            <ImagePlus className="size-5" />
            {value.length === 0 ? "Add photos" : "Add more"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        multiple
        hidden
        onChange={(e) => {
          void upload([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-zinc-500">Up to {MAX} photos, 5 MB each. The first one is the cover. Drag photos here or click to choose.</p>
      )}
    </div>
  );
}
