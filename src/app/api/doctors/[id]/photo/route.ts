import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { DOCTOR_PHOTO_BUCKET } from "@/lib/doctorPhoto";
import { getSupabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

const MAX_BYTES = 8 * 1024 * 1024;

function extForType(type: string, fileName: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".webp")) return "webp";
  if (lower.endsWith(".gif")) return "gif";
  return "jpg";
}

function isImageUpload(file: File) {
  if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
    return true;
  }
  return /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
}

export async function POST(request: Request, ctx: Params) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  const form = await request.formData();
  const file = form.get("photo");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No photo provided" }, { status: 400 });
  }

  if (!isImageUpload(file)) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be under 8 MB" },
      { status: 400 },
    );
  }

  const { data: doctor, error: doctorErr } = await supabase
    .from("doctors")
    .select("id, photo_path")
    .eq("id", id)
    .maybeSingle();

  if (doctorErr || !doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const ext = extForType(file.type, file.name);
  const path = `${id}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType =
    file.type && file.type.startsWith("image/") ? file.type : `image/${ext}`;

  if (doctor.photo_path && doctor.photo_path !== path) {
    await supabase.storage.from(DOCTOR_PHOTO_BUCKET).remove([doctor.photo_path]);
  }

  const { error: uploadErr } = await supabase.storage
    .from(DOCTOR_PHOTO_BUCKET)
    .upload(path, bytes, {
      upsert: true,
      contentType,
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("doctors")
    .update({ photo_path: path })
    .eq("id", id)
    .select("photo_path")
    .single();

  if (updateErr || !updated?.photo_path) {
    return NextResponse.json(
      { error: updateErr?.message ?? "Could not save photo path" },
      { status: 500 },
    );
  }

  revalidatePath(`/doctors/${id}`);
  revalidatePath("/doctors");

  return NextResponse.json({ ok: true, photoPath: updated.photo_path });
}

export async function DELETE(_request: Request, ctx: Params) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;

  const { data: doctor, error: doctorErr } = await supabase
    .from("doctors")
    .select("photo_path")
    .eq("id", id)
    .maybeSingle();

  if (doctorErr || !doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  if (doctor.photo_path) {
    await supabase.storage.from(DOCTOR_PHOTO_BUCKET).remove([doctor.photo_path]);
  }

  const { error } = await supabase
    .from("doctors")
    .update({ photo_path: null })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath(`/doctors/${id}`);
  revalidatePath("/doctors");

  return NextResponse.json({ ok: true });
}
