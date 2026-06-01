import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import {
  mapDoctorCsv,
  mergeDoctorImportCsv,
  type ProspectingImportRow,
  zoneForRow,
} from "@/lib/importProspecting";

async function resolveFacilityId(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  facilityMap: Map<string, string>,
  row: ProspectingImportRow,
) {
  const key = `${row.facilityName}::${row.address}`.toLowerCase();
  if (facilityMap.has(key)) return facilityMap.get(key)!;

  const { data: existing, error: existingError } = await supabase
    .from("facilities")
    .select("id")
    .eq("name", row.facilityName)
    .eq("address", row.address)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing?.id) {
    facilityMap.set(key, existing.id);
    return existing.id;
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
    throw new Error(insertError?.message ?? "Failed to insert facility");
  }

  facilityMap.set(key, inserted.id);
  return inserted.id;
}

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
    relationshipsCsv?: string;
    prospectingTargetsCsv?: string;
    replaceExisting?: boolean;
    mergeOnly?: boolean;
  };

  let rows: ProspectingImportRow[] = [];

  if (body.relationshipsCsv?.trim() && body.prospectingTargetsCsv?.trim()) {
    rows = mergeDoctorImportCsv(
      body.relationshipsCsv,
      body.prospectingTargetsCsv,
    );
  } else if (body.csv?.trim()) {
    rows = mapDoctorCsv(body.csv);
  } else {
    return NextResponse.json(
      { error: "CSV content is required (or both Relationships + Prospecting tab CSVs)" },
      { status: 400 },
    );
  }

  if (!rows.length) {
    return NextResponse.json(
      {
        error:
          "No valid rows found. Use Relationships CSV (Facility, Doctor Name, Address) and/or Prospecting tab CSV.",
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

  try {
    for (const row of rows) {
      await resolveFacilityId(supabase, facilityMap, row);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Facility import failed" },
      { status: 500 },
    );
  }

  let doctorsInserted = 0;
  let doctorsSkipped = 0;
  let lunchesInserted = 0;
  let notesInserted = 0;

  for (const row of rows) {
    const facilityKey = `${row.facilityName}::${row.address}`.toLowerCase();
    const facilityId = facilityMap.get(facilityKey);
    if (!facilityId) continue;

    if (body.mergeOnly || !body.replaceExisting) {
      const { data: existingDoctor } = await supabase
        .from("doctors")
        .select("id")
        .eq("facility_id", facilityId)
        .eq("name", row.doctorName)
        .maybeSingle();

      if (existingDoctor) {
        doctorsSkipped += 1;
        continue;
      }
    }

    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .insert({
        facility_id: facilityId,
        name: row.doctorName,
        primary_focus: row.primaryFocus,
        status: row.status,
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
        interaction_notes: row.interactionNotes,
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
    totalRows: rows.length,
    facilities: facilityMap.size,
    doctors: doctorsInserted,
    doctorsSkipped,
    lunches: lunchesInserted,
    notes: notesInserted,
  });
}
