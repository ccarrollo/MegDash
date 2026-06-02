"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  formatAnchorDate,
  type AnchorHistoryItem,
} from "@/lib/anchorSchedule";
import { addDaysIso, planDateIso } from "@/lib/dateUtils";
import { isMealAnchorType } from "@/lib/mealAnchor";
import { filterDoctors, filterFacilities } from "@/lib/search";
import type { DayAnchorRow, DoctorRow, FacilityRow } from "@/lib/types";
import { AnchorMealFields } from "./AnchorMealFields";
import { AnchorListItem } from "./AnchorListItem";
import { ListSearchBar } from "./ListSearchBar";

type AnchorKind = "coffee" | "breakfast" | "lunch" | "fitting";

function formatTime(value: string | null) {
  if (!value) return "No time";
  return value.slice(0, 5);
}

function facilitySubtitle(f: FacilityRow) {
  return [f.address, f.location_label, f.city].filter(Boolean).join(" · ");
}

export function AnchorsTabClient({
  planDate,
  anchors,
  history,
  doctors,
  facilities,
}: {
  planDate: string;
  anchors: DayAnchorRow[];
  history: AnchorHistoryItem[];
  doctors: DoctorRow[];
  facilities: FacilityRow[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<AnchorKind>("lunch");
  const [facilityId, setFacilityId] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [fittingDoctorId, setFittingDoctorId] = useState("");
  const [anchorTime, setAnchorTime] = useState("12:00");
  const [label, setLabel] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [foodNotes, setFoodNotes] = useState("");
  const [interactionNotes, setInteractionNotes] = useState("");
  const [patientName, setPatientName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [pastHidden, setPastHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = planDateIso();

  useEffect(() => {
    try {
      if (localStorage.getItem("meg-field:anchors-past-hidden") === "1") {
        setPastHidden(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function togglePastHistory() {
    setPastHidden((hidden) => {
      const next = !hidden;
      try {
        localStorage.setItem("meg-field:anchors-past-hidden", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

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

  const fittingDoctorHits = useMemo(() => {
    const q = placeQuery.trim();
    if (!q) return doctors.slice(0, 25);
    return filterDoctors(doctors, q, { includeArchived: true }).slice(0, 20);
  }, [doctors, placeQuery]);

  function selectFacility(id: string) {
    setFacilityId(id);
    setPlaceQuery("");
    setDoctorFilter("");
    setSelectedDoctorIds([]);
  }

  function clearFacility() {
    setFacilityId("");
    setSelectedDoctorIds([]);
    setDoctorFilter("");
  }

  const displayAnchors = useMemo(
    () =>
      [...anchors].sort((a, b) =>
        `${a.anchor_time ?? ""}${a.doctor_name ?? ""}`.localeCompare(
          `${b.anchor_time ?? ""}${b.doctor_name ?? ""}`,
        ),
      ),
    [anchors],
  );

  const prevDate = addDaysIso(planDate, -1);
  const nextDate = addDaysIso(planDate, 1);

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter((item) =>
      [
        item.doctorName,
        item.facilityName,
        item.label,
        item.anchorType,
        item.planDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [history, historyQuery]);

  const upcomingHistory = useMemo(
    () =>
      filteredHistory
        .filter((item) => item.planDate >= today)
        .sort((a, b) => a.planDate.localeCompare(b.planDate)),
    [filteredHistory, today],
  );

  const pastHistory = useMemo(
    () =>
      filteredHistory
        .filter((item) => item.planDate < today)
        .sort((a, b) => b.planDate.localeCompare(a.planDate)),
    [filteredHistory, today],
  );

  function toggleDoctor(doctorId: string) {
    setSelectedDoctorIds((current) =>
      current.includes(doctorId)
        ? current.filter((id) => id !== doctorId)
        : [...current, doctorId],
    );
  }

  async function addAnchor() {
    setSaving(true);
    try {
      const payload =
        kind === "fitting"
          ? {
              planDate,
              anchorType: kind,
              doctorId: fittingDoctorId || null,
              anchorTime: anchorTime || null,
              patientName: patientName.trim() || null,
              manualAddress: manualAddress.trim() || null,
              label: label.trim() || null,
            }
          : {
              planDate,
              anchorType: kind,
              facilityId,
              doctorIds: selectedDoctorIds,
              anchorTime: anchorTime || null,
              label: label.trim() || null,
              restaurant: restaurant.trim() || null,
              foodNotes: foodNotes.trim() || null,
              interactionNotes: interactionNotes.trim() || null,
              headcount: headcount || null,
              totalCost: totalCost || null,
            };

      const res = await fetch("/api/day-anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create anchor(s).");

      setPlaceQuery("");
      setDoctorFilter("");
      setFacilityId("");
      setSelectedDoctorIds([]);
      setFittingDoctorId("");
      setLabel("");
      setRestaurant("");
      setHeadcount("");
      setTotalCost("");
      setFoodNotes("");
      setInteractionNotes("");
      setPatientName("");
      setManualAddress("");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create anchor(s).");
    } finally {
      setSaving(false);
    }
  }

  async function removeAnchor(anchor: DayAnchorRow) {
    if (!window.confirm("Remove this anchor from the plan?")) return;
    setSaving(true);
    try {
      if (anchor.lunch_id || (anchor.anchor_type === "lunch" && anchor.doctor_id)) {
        const res = await fetch("/api/plan/lunches", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planDate,
            doctorId: anchor.doctor_id ?? undefined,
            lunchId: anchor.lunch_id ?? undefined,
          }),
        });
        if (!res.ok) throw new Error("lunch");
      } else if (anchor.order_id && anchor.is_auto) {
        const res = await fetch("/api/plan/fittings", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planDate,
            orderId: anchor.order_id,
            anchorId: anchor.id.startsWith("auto-") ? undefined : anchor.id,
          }),
        });
        if (!res.ok) throw new Error("fitting");
      } else if (!anchor.is_auto && anchor.id && !anchor.id.startsWith("auto-")) {
        const res = await fetch(`/api/day-anchors/${anchor.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("anchor");
      } else {
        throw new Error("unsupported");
      }
      router.refresh();
    } catch {
      alert("Could not remove anchor.");
    } finally {
      setSaving(false);
    }
  }

  async function removeHistoryItem(item: AnchorHistoryItem) {
    if (!window.confirm("Remove this from the schedule?")) return;
    setSaving(true);
    try {
      if (item.lunchId || (item.anchorType === "lunch" && item.doctorId)) {
        const res = await fetch("/api/plan/lunches", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planDate: item.planDate,
            doctorId: item.doctorId ?? undefined,
            lunchId: item.lunchId ?? undefined,
          }),
        });
        if (!res.ok) throw new Error();
      } else if (item.anchorDbId) {
        const res = await fetch(`/api/day-anchors/${item.anchorDbId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
      }
      router.refresh();
    } catch {
      alert("Could not remove.");
    } finally {
      setSaving(false);
    }
  }

  function historyRow(item: AnchorHistoryItem) {
    return (
      <li
        key={item.key}
        className="flex items-center justify-between gap-2 rounded border border-violet-100 bg-white/70 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/40"
      >
        <div className="min-w-0">
          <a
            href={`/anchors?date=${item.planDate}`}
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            {formatAnchorDate(item.planDate)}
          </a>
          <p className="capitalize text-violet-950 dark:text-slate-200">
            {item.anchorType}
            {item.anchorTime ? ` · ${formatTime(item.anchorTime)}` : ""}
          </p>
          <p className="truncate text-xs text-violet-700 dark:text-slate-400">
            {item.doctorName ?? "No doctor"}
            {item.facilityName ? ` · ${item.facilityName}` : ""}
          </p>
          {item.restaurant && (
            <p className="text-xs text-violet-700 dark:text-slate-400">
              {item.restaurant}
            </p>
          )}
          {item.foodNotes && (
            <p className="line-clamp-1 text-xs text-violet-700 dark:text-slate-400">
              {item.foodNotes}
            </p>
          )}
          {item.fromLunchSchedule && !item.anchorDbId && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              From lunch schedule
            </p>
          )}
        </div>
        {(item.lunchId || item.anchorDbId) && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void removeHistoryItem(item)}
            className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-brand-600 p-4 text-white">
        <p className="text-sm opacity-90">Anchors</p>
        <h1 className="text-2xl font-bold">Add anchor stops</h1>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-white/30 bg-white px-2 py-1">
          <a href={`/anchors?date=${prevDate}`} className="rounded px-2 py-1 text-sm font-medium text-brand-800 hover:bg-brand-50">
            ← Prev
          </a>
          <input
            type="date"
            value={planDate}
            onChange={(e) => {
              if (e.target.value) window.location.href = `/anchors?date=${e.target.value}`;
            }}
            className="rounded border border-violet-200 px-2 py-1 text-sm text-violet-950"
          />
          <a href={`/anchors?date=${nextDate}`} className="rounded px-2 py-1 text-sm font-medium text-brand-800 hover:bg-brand-50">
            Next →
          </a>
        </div>
      </section>

      <section className="rounded-xl border border-violet-200 bg-fuchsia-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Add Anchor</h2>
        <p className="mt-1 text-xs text-violet-700 dark:text-slate-400">
          Coffee, breakfast, and lunch can include multiple doctors at one facility.
        </p>

        <div className="mt-3 grid gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AnchorKind)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="coffee">Coffee</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="fitting">Fitting</option>
          </select>
          <input
            type="time"
            value={anchorTime}
            onChange={(e) => setAnchorTime(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Optional label (e.g. team only)"
            className="rounded border px-3 py-2 text-sm"
          />

          {isMealAnchorType(kind) && (
            <AnchorMealFields
              restaurant={restaurant}
              onRestaurantChange={setRestaurant}
              headcount={headcount}
              onHeadcountChange={setHeadcount}
              totalCost={totalCost}
              onTotalCostChange={setTotalCost}
              foodNotes={foodNotes}
              onFoodNotesChange={setFoodNotes}
              interactionNotes={interactionNotes}
              onInteractionNotesChange={setInteractionNotes}
            />
          )}

          {kind === "fitting" ? (
            <>
              <ListSearchBar
                value={placeQuery}
                onChange={setPlaceQuery}
                placeholder="Search doctor (optional)…"
              />
              {placeQuery.trim() && (
                <ul className="max-h-40 space-y-1 overflow-auto rounded border border-violet-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950">
                  {fittingDoctorHits.length === 0 ? (
                    <li className="px-2 py-1.5 text-xs text-violet-700 dark:text-slate-400">
                      No matches.
                    </li>
                  ) : (
                    fittingDoctorHits.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setFittingDoctorId(d.id);
                            setPlaceQuery("");
                          }}
                          className={`w-full rounded px-2 py-1.5 text-left text-sm hover:bg-brand-50 dark:hover:bg-slate-800 ${
                            fittingDoctorId === d.id
                              ? "bg-brand-50 font-medium text-brand-800 dark:bg-slate-800"
                              : ""
                          }`}
                        >
                          <span className="font-medium">{d.name}</span>
                          <span className="block text-xs text-violet-700 dark:text-slate-400">
                            {d.facility_name}
                            {d.address ? ` · ${d.address}` : ""}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
              {fittingDoctorId && !placeQuery.trim() && (
                <p className="text-xs text-violet-700 dark:text-slate-400">
                  {doctors.find((d) => d.id === fittingDoctorId)?.name ?? "Doctor"} selected
                  {(() => {
                    const d = doctors.find((doc) => doc.id === fittingDoctorId);
                    return d?.facility_name ? ` · ${d.facility_name}` : "";
                  })()}
                  {" · "}
                  <button
                    type="button"
                    onClick={() => setFittingDoctorId("")}
                    className="text-brand-600 hover:underline"
                  >
                    Clear
                  </button>
                </p>
              )}
              <input
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Patient name (optional)"
                className="rounded border px-3 py-2 text-sm"
              />
              <input
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Manual fitting address (required if no doctor)"
                className="rounded border px-3 py-2 text-sm"
              />
            </>
          ) : (
            <>
              {!selectedFacility ? (
                <>
                  <ListSearchBar
                    value={placeQuery}
                    onChange={setPlaceQuery}
                    placeholder="Search doctor or facility…"
                  />
                  {placeQuery.trim() ? (
                    <div className="max-h-56 space-y-2 overflow-auto rounded border border-violet-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
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
                                    {d.address ? ` · ${d.address}` : ""}
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
                      {placeDoctorHits.length === 0 &&
                        placeFacilityHits.length === 0 && (
                          <p className="px-1 text-xs text-violet-700 dark:text-slate-400">
                            No matches.
                          </p>
                        )}
                    </div>
                  ) : (
                    <p className="text-xs text-violet-700 dark:text-slate-400">
                      Search by doctor name or facility — tap a result to set the office.
                    </p>
                  )}
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
                  <ListSearchBar
                    value={doctorFilter}
                    onChange={setDoctorFilter}
                    placeholder="Filter doctors at this facility…"
                  />
                  <div className="max-h-48 space-y-1 overflow-auto rounded border border-violet-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                    {doctorsAtFacility.length === 0 ? (
                      <p className="text-xs text-violet-700 dark:text-slate-400">
                        No doctors at this facility.
                      </p>
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
                    {selectedDoctorIds.length} of {doctorsAtFacility.length}{" "}
                    doctor(s) selected
                  </p>
                </>
              )}
            </>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => void addAnchor()}
            className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Add anchor
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-violet-200 bg-fuchsia-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Anchors on {planDate}</h2>
        <p className="mt-1 text-xs text-violet-700 dark:text-slate-400">
          Includes lunches from the old schedule and fittings from orders — same
          as the day plan.
        </p>
        {displayAnchors.length === 0 ? (
          <p className="mt-2 text-sm text-violet-700 dark:text-slate-400">
            No anchors for this date.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {displayAnchors.map((a) => (
              <AnchorListItem
                key={a.id}
                anchor={a}
                dayAnchors={anchors}
                doctors={doctors}
                facilities={facilities}
                removing={saving}
                onRemove={() => void removeAnchor(a)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-violet-200 bg-fuchsia-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Schedule history</h2>
        <p className="mt-1 text-xs text-violet-700 dark:text-slate-400">
          All upcoming and past anchors and lunches. Tap a date to open that day.
        </p>
        <div className="mt-3">
          <ListSearchBar
            value={historyQuery}
            onChange={setHistoryQuery}
            placeholder="Search doctor, facility, type…"
          />
        </div>
        <p className="mt-2 text-xs text-violet-700 dark:text-slate-400">
          {filteredHistory.length} item(s)
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-slate-400">
              Upcoming
            </h3>
            {upcomingHistory.length === 0 ? (
              <p className="mt-2 text-sm text-violet-700 dark:text-slate-400">
                No upcoming matches.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">{upcomingHistory.map(historyRow)}</ul>
            )}
          </div>

          {pastHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-slate-400">
                  Past
                </h3>
                <button
                  type="button"
                  onClick={togglePastHistory}
                  className="text-xs text-brand-600 hover:underline dark:text-brand-400"
                >
                  {pastHidden ? "Show" : "Hide"}
                </button>
              </div>
              {!pastHidden && (
                <>
                  <ul className="mt-2 space-y-2 opacity-90">
                    {pastHistory.slice(0, 40).map(historyRow)}
                  </ul>
                  {pastHistory.length > 40 && (
                    <p className="mt-2 text-xs text-violet-700 dark:text-slate-400">
                      Showing 40 most recent past items — narrow with search.
                    </p>
                  )}
                </>
              )}
              {pastHidden && (
                <p className="mt-2 text-xs text-violet-700 dark:text-slate-400">
                  {pastHistory.length} past item(s) hidden.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

