"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { doctorPhotoPublicUrl } from "@/lib/doctorPhoto";

const sizes = {
  sm: { box: "h-14 w-14", icon: "text-xl" },
  md: { box: "h-20 w-20", icon: "text-2xl" },
  lg: { box: "h-32 w-32", icon: "text-3xl" },
} as const;

export function DoctorPhoto({
  doctorId,
  doctorName,
  photoPath,
  size = "sm",
  allowUpload = true,
}: {
  doctorId: string;
  doctorName: string;
  photoPath?: string | null;
  size?: keyof typeof sizes;
  allowUpload?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [localPath, setLocalPath] = useState(photoPath ?? null);

  useEffect(() => {
    setLocalPath(photoPath ?? null);
  }, [photoPath, doctorId]);

  const url = doctorPhotoPublicUrl(localPath);
  const dim = sizes[size];

  async function upload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch(`/api/doctors/${doctorId}/photo`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { photoPath?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setLocalPath(data.photoPath ?? localPath);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save photo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removePhoto() {
    if (!confirm(`Remove photo for ${doctorName}?`)) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/photo`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("failed");
      setLocalPath(null);
      setLightbox(false);
      router.refresh();
    } catch {
      alert("Could not remove photo.");
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  }

  return (
    <>
      <div className="flex shrink-0 flex-col items-center gap-1">
        {url ? (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className={`${dim.box} overflow-hidden rounded-xl border border-violet-200 bg-violet-100 dark:border-slate-600 dark:bg-slate-800`}
            aria-label={`Open photo of ${doctorName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${doctorName} reference`}
              className="h-full w-full object-cover"
            />
          </button>
        ) : (
          <button
            type="button"
            disabled={!allowUpload || uploading}
            onClick={() => inputRef.current?.click()}
            className={`${dim.box} flex flex-col items-center justify-center rounded-xl border border-dashed border-violet-300 bg-violet-50/70 text-violet-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400`}
            aria-label={`Add photo for ${doctorName}`}
          >
            <span className={dim.icon}>📷</span>
            {size !== "sm" && (
              <span className="mt-1 text-[10px] font-medium">Add photo</span>
            )}
          </button>
        )}

        {allowUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileChange}
            />
            {url ? (
              <div className="flex gap-2 text-[10px]">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                  className="text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
                >
                  {uploading ? "Saving…" : "Replace"}
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void removePhoto()}
                  className="text-red-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ) : (
              size === "sm" && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                  className="text-[10px] text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
                >
                  {uploading ? "Saving…" : "Take photo"}
                </button>
              )
            )}
          </>
        )}
      </div>

      {lightbox && url && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Photo of ${doctorName}`}
        >
          <div className="mb-3 flex items-center justify-between text-white">
            <p className="font-medium">{doctorName}</p>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="rounded-lg bg-violet-50/10 px-3 py-1.5 text-sm"
            >
              Close
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={doctorName}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          {allowUpload && (
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-violet-50/15 px-4 py-2 text-sm text-white"
              >
                Replace photo
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => void removePhoto()}
                className="rounded-lg bg-red-600/80 px-4 py-2 text-sm text-white"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
