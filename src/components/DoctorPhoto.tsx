"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { doctorPhotoPublicUrl } from "@/lib/doctorPhoto";
import { prepareDoctorPhotoFile } from "@/lib/prepareDoctorPhoto";

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
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pendingPathRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [localPath, setLocalPath] = useState(photoPath ?? null);
  const [cacheKey, setCacheKey] = useState<string | null>(null);

  useEffect(() => {
    if (pendingPathRef.current) {
      if (photoPath === pendingPathRef.current) {
        pendingPathRef.current = null;
      } else if (!photoPath) {
        return;
      }
    }
    setLocalPath(photoPath ?? null);
    if (photoPath) {
      setCacheKey((key) => key ?? photoPath);
    }
  }, [photoPath, doctorId]);

  const url = doctorPhotoPublicUrl(localPath, cacheKey ?? localPath);
  const dim = sizes[size];

  async function upload(file: File) {
    setUploading(true);
    try {
      const prepared = await prepareDoctorPhotoFile(file);
      const form = new FormData();
      form.append("photo", prepared);
      const res = await fetch(`/api/doctors/${doctorId}/photo`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { photoPath?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const savedPath = data.photoPath;
      if (!savedPath) throw new Error("Photo saved but path missing");
      pendingPathRef.current = savedPath;
      setLocalPath(savedPath);
      setCacheKey(String(Date.now()));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save photo.");
    } finally {
      setUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }

  async function removePhoto() {
    if (!confirm(`Remove photo for ${doctorName}?`)) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/photo`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "failed");
      pendingPathRef.current = null;
      setLocalPath(null);
      setCacheKey(null);
      setLightbox(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not remove photo.");
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  }

  function openGallery() {
    galleryInputRef.current?.click();
  }

  function openCamera() {
    cameraInputRef.current?.click();
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
            onClick={openGallery}
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
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileChange}
            />
            {url ? (
              <div className="flex flex-wrap justify-center gap-2 text-[10px]">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={openGallery}
                  className="text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
                >
                  {uploading ? "Saving…" : "Gallery"}
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={openCamera}
                  className="text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
                >
                  Camera
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
              <div className="flex flex-wrap justify-center gap-2 text-[10px]">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={openGallery}
                  className="text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
                >
                  {uploading ? "Saving…" : "Gallery"}
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={openCamera}
                  className="text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
                >
                  Camera
                </button>
              </div>
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
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={openGallery}
                className="rounded-lg bg-violet-50/15 px-4 py-2 text-sm text-white"
              >
                Choose from gallery
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={openCamera}
                className="rounded-lg bg-violet-50/15 px-4 py-2 text-sm text-white"
              >
                Take photo
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
