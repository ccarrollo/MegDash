import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import {
  mapProspectingRows,
  parseCsv,
  zoneForRow,
} from "@/lib/importProspecting";

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    csv?: string;
    replaceExisting?: boolean;
  };

  if (!body.csv?.trim()) {
    return NextResponse.json({ error: "CSV content is required" }, { status: 400 });
  }

  const parsed = parseCsv(body.csv);
  const rows = mapProspectingRows(parsed);

  if (!rows.length) {
    return NextResponse.json(
      {
        error:
          "No valid rows found. Ensure CSV has Facility, Doctor Name, and Address columns.",
      },
      { status: 400 },
    );
  }

  if (body.replaceExisting) {
    await supabase.from("notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("lunches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("visits").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("doctors").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("facilities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const facilityMap = new Map<string, string>();

  for (const row of rows) {
    const key = `${row.facilityName}::${row.address}`.toLowerCase();
    if (facilityMap.has(key)) continue;

    const { data: existing, error: existingError } = await supabase
      .from("facilities")
      .select("id")
      .eq("name", row.facilityName)
      .eq("address", row.address)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing?.id) {
      facilityMap.set(key, existing.id);
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("facilities")
      .insert({
        name: row.facilityName,
        address: row.address,
        city: row.city,
        location_label: row.locationLabel,
        zone: zoneForRow(row),
        office_vibe: row.officeVibe,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to insert facility" },
        { status: 500 },
      );
    }

    facilityMap.set(key, inserted.id);
  }

  let doctorsInserted = 0;
  let lunchesInserted = 0;
  let notesInserted = 0;

  for (const row of rows) {
    const facilityKey = `${row.facilityName}::${row.address}`.toLowerCase();
    const facilityId = facilityMap.get(facilityKey);
    if (!facilityId) continue;

    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .insert({
        facility_id: facilityId,
        name: row.doctorName,
        primary_focus: row.primaryFocus,
        status: row.status,
        priority: row.priority,
        decision_makers: row.decisionMakers,
        other_names: row.otherNames,
        lunch_scheduled: row.lunchScheduled,
        lunch_date: row.lunchDate,
        front_desk_in: row.frontDeskIn,
        marketing_kit: row.marketingKit,
        follow_up_date: row.followUpDate,
        order_history: row.history,
        front_desk_notes: row.frontDeskNotes,
        competitor_notes: row.competitorNotes,
        follow_up_lunch: row.followUpLunch,
      })
      .select("id")
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: doctorError?.message ?? "Failed to insert doctor" },
        { status: 500 },
      );
    }

    doctorsInserted += 1;

    if (row.lunchDate) {
      const { error: lunchError } = await supabase.from("lunches").insert({
        doctor_id: doctor.id,
        facility_id: facilityId,
        lunch_date: row.lunchDate,
        lunch_order: row.lunchOrder,
        food_notes: row.lunchNotes,
        interaction_notes: row.interactionNotes,
        status: "scheduled",
      });

      if (lunchError) {
        return NextResponse.json({ error: lunchError.message }, { status: 500 });
      }
      lunchesInserted += 1;
    }

    const noteChunks = [
      row.interactionNotes,
      row.otherNotes,
      row.frontDeskNotes,
      row.competitorNotes,
    ].filter(Boolean);

    for (const n of noteChunks) {
      const { error: noteError } = await supabase.from("notes").insert({
        doctor_id: doctor.id,
        body: n,
      });
      if (noteError) {
        return NextResponse.json({ error: noteError.message }, { status: 500 });
      }
      notesInserted += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    facilities: facilityMap.size,
    doctors: doctorsInserted,
    lunches: lunchesInserted,
    notes: notesInserted,
  });
}
