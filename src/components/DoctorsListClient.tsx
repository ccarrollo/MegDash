"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type DoctorSortKey,
  filterDoctors,
  sortDoctors,
} from "@/lib/search";
import type { DoctorRow, TerritoryZone } from "@/lib/types";
import { ZONE_LABELS } from "@/lib/zones";
import { AddToTodayPlanButton } from "./AddToTodayPlanButton";
import { DoctorPhoto } from "./DoctorPhoto";
import { LogVisitForm } from "./LogVisitForm";
import { ListSearchBar } from "./ListSearchBar";
import { OverrideVisitDateForm } from "./OverrideVisitDateForm";

function notePreview(doctor: DoctorRow) {
  const text =
    doctor.follow_up_lunch?.trim() ||
    doctor.interaction_notes?.trim() ||
    doctor.front_desk_notes?.trim() ||
    doctor.competitor_notes?.trim();
  if (!text) return null;
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

export function DoctorsListClient({
  doctors,
  todayDate,
  todayPlanDoctorIds,
}: {
  doctors: DoctorRow[];
  todayDate: string;
  todayPlanDoctorIds: string[];
}) {
  const onPlanSet = useMemo(
    () => new Set(todayPlanDoctorIds),
    [todayPlanDoctorIds],
  );
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<DoctorSortKey>("visit_desc");
  const [zone, setZone] = useState("");
  const [priority, setPriority] = useState("");
  const [hasLunchOnly, setHasLunchOnly] = useState(false);
  const [queueVisibility, setQueueVisibility] = useState<
    "all" | "in_queue" | "excluded"
  >("all");

  const filtered = useMemo(() => {
    const list = filterDoctors(doctors, query, {
      zone: zone || undefined,
      priority: priority || undefined,
      hasLunch: hasLunchOnly,
      queueVisibility,
    });
    return sortDoctors(list, sortKey);
  }, [doctors, query, sortKey, zone, priority, hasLunchOnly, queueVisibility]);

  const zones = useMemo(() => {
    const set = new Set(doctors.map((d) => d.zone));
    return [...set].sort();
  }, [doctors]);

  return (
    <div className="space-y-3">
      <ListSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search name, facility, address, notes…"
      />
      <div className="flex flex-wrap gap-2">
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as DoctorSortKey)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm"
        >
          <option value="visit_desc">Days since visit ↓</option>
          <option value="visit_asc">Days since visit ↑</option>
          <option value="name">Name A–Z</option>
          <option value="priority">Priority</option>
          <option value="lunch_date">Lunch date</option>
        </select>
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm"
        >
          <option value="">All zones</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {ZONE_LABELS[z as TerritoryZone]}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm"
        >
          <option value="">All priorities</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">
          <input
            type="checkbox"
            checked={hasLunchOnly}
            onChange={(e) => setHasLunchOnly(e.target.checked)}
          />
          Has lunch date
        </label>
        <select
          value={queueVisibility}
          onChange={(e) =>
            setQueueVisibility(
              e.target.value as "all" | "in_queue" | "excluded",
            )
          }
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm"
        >
          <option value="all">All queue visibility</option>
          <option value="in_queue">In daily queue</option>
          <option value="excluded">Excluded from daily queue</option>
        </select>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
        {filtered.length} of {doctors.length} doctors
      </p>

      {filtered.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No matches.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((d) => {
            const preview = notePreview(d);
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address)}`;
            return (
              <li
                key={d.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/50"
              >
                <div className="flex justify-between gap-2">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <DoctorPhoto
                      doctorId={d.id}
                      doctorName={d.name}
                      photoPath={d.photo_path}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                    <Link
                      href={`/doctors/${d.id}`}
                      className="font-semibold text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {d.name}
                    </Link>
                    <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">{d.facility_name}</p>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                    >
                      {d.address}
                    </a>
                    {preview && (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400">
                        {preview}
                      </p>
                    )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 text-xs">
                    <AddToTodayPlanButton
                      doctorId={d.id}
                      todayDate={todayDate}
                      onPlan={onPlanSet.has(d.id)}
                    />
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${
                        d.priority === "High"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-400"
                      }`}
                    >
                      {d.priority}
                    </span>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 dark:text-slate-400">
                      {ZONE_LABELS[d.zone]}
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {d.days_since_visit != null
                        ? `${d.days_since_visit}d visit`
                        : "No visit"}
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {d.days_since_contact != null
                        ? `${d.days_since_contact}d contact`
                        : d.days_since_activity != null
                          ? `${d.days_since_activity}d contact`
                          : "No contact"}
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{d.status}</p>
                <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <LogVisitForm doctorId={d.id} />
                  <OverrideVisitDateForm
                    doctorId={d.id}
                    doctorName={d.name}
                    currentDate={
                      d.manual_last_visit_date ?? d.last_visit_at
                    }
                    isOverridden={d.is_last_visit_overridden}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
