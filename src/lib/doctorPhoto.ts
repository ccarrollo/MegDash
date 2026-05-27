const BUCKET = "doctor-photos";

export function doctorPhotoPublicUrl(photoPath: string | null | undefined): string | null {
  if (!photoPath?.trim()) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${BUCKET}/${photoPath}`;
}

export const DOCTOR_PHOTO_BUCKET = BUCKET;
