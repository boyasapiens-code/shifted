"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "./ui";

/**
 * Uploads file(s) to a Supabase Storage bucket under the user's own folder
 * (`${userId}/<uuid>.<ext>`), then calls `onPersist` with the resulting value
 * (public URL for public buckets, storage path for private ones). Auto-saves —
 * each file persists immediately on selection.
 */
export function Uploader({
  userId,
  bucket,
  isPublic,
  accept,
  multiple = false,
  label,
  hint,
  onPersist,
}: {
  userId: string;
  bucket: string;
  isPublic: boolean;
  accept: string;
  multiple?: boolean;
  label: string;
  hint?: string;
  onPersist: (value: string) => Promise<void>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setStatus("uploading");
    setError("");
    const supabase = createClient();

    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;

        const value = isPublic
          ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
          : path;
        await onPersist(value);
      }
      setStatus("idle");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-base)] border border-dashed border-stone-300 text-sm font-medium text-stone-600 transition-colors hover:border-ink hover:text-ink disabled:opacity-50",
        )}
      >
        {status === "uploading" ? "Uploading…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {hint && status !== "error" && (
        <p className="mt-1 text-xs text-stone-500">{hint}</p>
      )}
      {status === "error" && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
