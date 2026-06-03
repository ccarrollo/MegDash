"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatFacilityDisplayName, formatFacilityOptionLabel, isPlaceholderFacilityName } from "@/lib/facilityDisplay";
import { isArchivedDoctor } from "@/lib/doctorStatus";
import { filterFacilities } from "@/lib/search";
import type { DoctorRow, FacilityRow } from "@/lib/types";
import { DeleteArchivedDoctorButton } from "./DeleteArchivedDoctorButton";
import { LogVisitForm } from "./LogVisitForm";
import { ListSearchBar } from "./ListSearchBar";
import { OverrideVisitDateForm } from "./OverrideVisitDateForm";

function facilitySubtitle(f: FacilityRow) {
  return [f.address, f.location_label, f.city].filter(Boolean).join(" · ");
}

export function DoctorProfileEditor({
  doctor,
  facilities,
}: {
  doctor: DoctorRow;
  facilities: FacilityRow[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(doctor.status);
  const [facilityId, setFacilityId] = useState(doctor.facility_id);
  const [facilityQuery, setFacilityQuery] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [dailyQueueHidden, setDailyQueueHidden] = useState(
    doctor.daily_queue_hidden ?? false,
  );
  const [saving, setSaving] = useState(false);

  const filteredFacilities = useMemo(() => {
    const q = facilityQuery.trim();
    if (!q) return facilities;
    return filterFacilities(facilities, q);
  }, [facilityQuery, facilities]);

  const selectedFacility = useMemo(
    () => facilities.find((f) => f.id === facilityId) ?? null,
    [facilities, facilityId],
  );

  const needsOfficeName = selectedFacility
    ? isPlaceholderFacilityName(selectedFacility.name)
    : isPlaceholderFacilityName(doctor.facility_name);

  async function saveDoctorMeta() {
    if (!facilityId) {
      alert("Pick a facility for this doctor.");
      return;
    }
    setSaving(true);
    try {
      const nameToSave = officeName.trim();
      if (needsOfficeName && !nameToSave) {
        throw new Error("Enter an office name (import left this as “Unknown facility”).");
      }
      if (nameToSave && selectedFacility && nameToSave !== selectedFacility.name) {
        const facRes = await fetch(`/api/facilities/${facilityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nameToSave }),
        });
        const facData = (await facRes.json()) as { error?: string };
        if (!facRes.ok) throw new Error(facData.error ?? "Could not save office name");
      }

      const res = await fetch(`/api/doctors/${doctor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          facilityId,
          dailyQueueHidden,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "save failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not save doctor details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-violet-200 bg-fuchsia-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Doctor settings</h2>
        <div className="mt-2 grid gap-2">
          <div>
            <p className="text-xs font-medium text-violet-700 dark:text-slate-400">
              Office / facility
            </p>
            {selectedFacility && (
              <p className="mt-1 text-sm text-violet-950 dark:text-slate-200">
                {formatFacilityDisplayName(selectedFacility)}
                {isPlaceholderFacilityName(selectedFacility.name) && (
                  <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">
                    (name not set yet)
                  </span>
                )}
                <span className="block text-xs text-violet-700 dark:text-slate-400">
                  {facilitySubtitle(selectedFacility)}
                </span>
              </p>
            )}
            {needsOfficeName && (
              <label className="mt-2 block text-xs text-violet-700 dark:text-slate-400">
                Office name
                <input
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  placeholder="e.g. Georgetown Foot & Ankle"
                  className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
                />
              </label>
            )}
            <div className="mt-2">
              <ListSearchBar
                value={facilityQuery}
                onChange={setFacilityQuery}
                placeholder="Search facilities to link…"
              />
            </div>
            <select
              value={facilityId}
              onChange={(e) => {
                setFacilityId(e.target.value);
                setOfficeName("");
              }}
              className="mt-2 w-full rounded border px-3 py-2 text-sm"
            >
              {filteredFacilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {formatFacilityOptionLabel(f)}
                </option>
              ))}
            </select>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option>1. Active</option>
            <option>2. Introduced</option>
            <option>3. Got Card Only</option>
            <option>4. No Card, FWD info</option>
            <option>8. Target</option>
            <option>9. Archived</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-violet-900 dark:text-slate-300">
            <input
              type="checkbox"
              checked={dailyQueueHidden}
              onChange={(e) => setDailyQueueHidden(e.target.checked)}
            />
            Don't show in suggestions
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveDoctorMeta()}
            className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save settings
          </button>
          {isArchivedDoctor(status) && (
            <div className="rounded-lg border border-red-200 bg-red-50/80 p-3 dark:border-red-900 dark:bg-red-950/30">
              <p className="text-xs text-red-800 dark:text-red-300">
                This doctor is archived. You can permanently delete them if they
                should no longer appear in the database.
              </p>
              <div className="mt-2">
                <DeleteArchivedDoctorButton
                  doctorId={doctor.id}
                  doctorName={doctor.name}
                />
              </div>
            </div>
          )}
          <p className="text-xs text-violet-700 dark:text-slate-400">
            Many imports saved the office as “Unknown facility” — set the real
            name above or pick a different office. Set status to{" "}
            <strong>9. Archived</strong> to hide from default lists.
          </p>
        </div>
        <OverrideVisitDateForm
          doctorId={doctor.id}
          doctorName={doctor.name}
          currentDate={doctor.manual_last_visit_date ?? doctor.last_visit_at}
          isOverridden={doctor.is_last_visit_overridden}
        />
      </section>

      <section className="rounded-xl border border-violet-200 bg-fuchsia-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Log activity</h2>
        <div className="mt-2">
          <LogVisitForm doctorId={doctor.id} />
        </div>
      </section>
    </div>
  );
}
