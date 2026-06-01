"use client";

import { useMemo, useState } from "react";
import { filterDoctors, filterFacilities } from "@/lib/search";
import type { DoctorRow, FacilityRow } from "@/lib/types";
import { ListSearchBar } from "./ListSearchBar";

function facilitySubtitle(f: FacilityRow) {
  return [f.address, f.location_label, f.city].filter(Boolean).join(" · ");
}

export function AnchorFacilityDoctorPicker({
  facilities,
  doctors,
  facilityId,
  onFacilityIdChange,
  selectedDoctorIds,
  onSelectedDoctorIdsChange,
  singleDoctor = false,
}: {
  facilities: FacilityRow[];
  doctors: DoctorRow[];
  facilityId: string;
  onFacilityIdChange: (id: string) => void;
  selectedDoctorIds: string[];
  onSelectedDoctorIdsChange: (ids: string[]) => void;
  /** Fitting: pick one doctor only. */
  singleDoctor?: boolean;
}) {
  const [placeQuery, setPlaceQuery] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");

  const selectedFacility = useMemo(
    () => facilities.find((f) => f.id === facilityId) ?? null,
    [facilities, facilityId],
  );

  const placeDoctorHits = useMemo(() => {
    const q = placeQuery.trim();
    if (!q) return [];
    return filterDoctors(doctors, q, { includeArchived: true }).slice(0, 20);
  }, [doctors, placeQuery]);

  const placeFacilityHits = useMemo(() => {
    const q = placeQuery.trim();
    if (!q) return [];
    return filterFacilities(facilities, q).slice(0, 12);
  }, [facilities, placeQuery]);

  const doctorsAtFacility = useMemo(() => {
    if (!facilityId) return [];
    const q = doctorFilter.trim().toLowerCase();
    return doctors
      .filter((d) => {
        if (d.facility_id !== facilityId) return false;
        if (!q) return true;
        return d.name.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [doctors, facilityId, doctorFilter]);

  function selectFacility(id: string) {
    onFacilityIdChange(id);
    setPlaceQuery("");
    setDoctorFilter("");
    if (!singleDoctor) {
      onSelectedDoctorIdsChange([]);
    }
  }

  function clearFacility() {
    onFacilityIdChange("");
    onSelectedDoctorIdsChange([]);
    setDoctorFilter("");
  }

  function toggleDoctor(doctorId: string) {
    if (singleDoctor) {
      onSelectedDoctorIdsChange([doctorId]);
      return;
    }
    onSelectedDoctorIdsChange(
      selectedDoctorIds.includes(doctorId)
        ? selectedDoctorIds.filter((id) => id !== doctorId)
        : [...selectedDoctorIds, doctorId],
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-violet-700 dark:text-slate-400">
        {singleDoctor ? "Doctor & facility" : "Facility & doctors attending"}
      </p>

      {!selectedFacility ? (
        <>
          <ListSearchBar
            value={placeQuery}
            onChange={setPlaceQuery}
            placeholder="Search doctor or facility…"
          />
          {placeQuery.trim() ? (
            <div className="max-h-48 space-y-2 overflow-auto rounded border border-violet-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
              {placeDoctorHits.length > 0 && (
                <div>
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-slate-400">
                    Doctors
                  </p>
                  <ul className="mt-1 space-y-1">
                    {placeDoctorHits.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => selectFacility(d.facility_id)}
                          className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-brand-50 dark:hover:bg-slate-800"
                        >
                          <span className="font-medium">{d.name}</span>
                          <span className="block text-xs text-violet-700 dark:text-slate-400">
                            {d.facility_name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {placeFacilityHits.length > 0 && (
                <div>
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-slate-400">
                    Facilities
                  </p>
                  <ul className="mt-1 space-y-1">
                    {placeFacilityHits.map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => selectFacility(f.id)}
                          className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-brand-50 dark:hover:bg-slate-800"
                        >
                          <span className="font-medium">{f.name}</span>
                          <span className="block text-xs text-violet-700 dark:text-slate-400">
                            {facilitySubtitle(f)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 text-sm dark:border-brand-900 dark:bg-brand-950/30">
            <p className="font-medium text-violet-950 dark:text-slate-100">
              {selectedFacility.name}
            </p>
            <p className="text-xs text-violet-700 dark:text-slate-400">
              {facilitySubtitle(selectedFacility)}
            </p>
            <button
              type="button"
              onClick={clearFacility}
              className="mt-1 text-xs text-brand-600 hover:underline"
            >
              Change facility
            </button>
          </div>
          {!singleDoctor && (
            <ListSearchBar
              value={doctorFilter}
              onChange={setDoctorFilter}
              placeholder="Filter doctors at this facility…"
            />
          )}
          <div className="max-h-40 space-y-1 overflow-auto rounded border border-violet-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
            {doctorsAtFacility.length === 0 ? (
              <p className="text-xs text-violet-700 dark:text-slate-400">
                No doctors at this facility.
              </p>
            ) : singleDoctor ? (
              doctorsAtFacility.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDoctor(d.id)}
                  className={`w-full rounded px-2 py-1.5 text-left text-sm hover:bg-brand-50 dark:hover:bg-slate-800 ${
                    selectedDoctorIds.includes(d.id)
                      ? "bg-brand-50 font-medium dark:bg-slate-800"
                      : ""
                  }`}
                >
                  {d.name}
                </button>
              ))
            ) : (
              doctorsAtFacility.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-violet-50 dark:hover:bg-slate-900"
                >
                  <input
                    type="checkbox"
                    checked={selectedDoctorIds.includes(d.id)}
                    onChange={() => toggleDoctor(d.id)}
                  />
                  {d.name}
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-violet-700 dark:text-slate-400">
            {selectedDoctorIds.length}{" "}
            {singleDoctor ? "doctor" : "doctor(s)"} selected
          </p>
        </>
      )}
    </div>
  );
}
