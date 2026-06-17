const BUCKET = "doctor-photos";

export function doctorPhotoPublicUrl(
  photoPath: string | null | undefined,
  cacheKey?: string | null,
): string | null {
  if (!photoPath?.trim()) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const url = `${base}/storage/v1/object/public/${BUCKET}/${photoPath}`;
  if (!cacheKey) return url;
  return `${url}?v=${encodeURIComponent(cacheKey)}`;
}

export const DOCTOR_PHOTO_BUCKET = BUCKET;
