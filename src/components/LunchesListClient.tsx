"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { filterLunches } from "@/lib/search";
import type { LunchWithDoctor } from "@/lib/types";
import { planDateIso } from "@/lib/dateUtils";
import { ListSearchBar } from "./ListSearchBar";

function formatLunchDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function LunchesListClient({ lunches }: { lunches: LunchWithDoctor[] }) {
  const [query, setQuery] = useState("");
  const today = planDateIso();

  const filtered = useMemo(
    () => filterLunches(lunches, query),
    [lunches, query],
  );

  const upcoming = filtered
    .filter((l) => l.is_date_tbd || l.lunch_date >= today)
    .sort((a, b) => a.lunch_date.localeCompare(b.lunch_date));
  const past = filtered
    .filter((l) => !l.is_date_tbd && l.lunch_date < today)
    .sort((a, b) => b.lunch_date.localeCompare(a.lunch_date));

  return (
    <div className="space-y-4">
      <ListSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search doctor, facility, restaurant, notes…"
      />
      <p className="text-xs text-violet-700 dark:text-slate-400">{filtered.length} lunches</p>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-slate-400">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-violet-700 dark:text-slate-400">No upcoming lunches match.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((l) => (
              <li key={l.id}>
                <Link
                  href={l.doctor_id ? `/doctors/${l.doctor_id}` : "#"}
                  className="block rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 hover:border-emerald-300"
                >
                  <p className="font-medium text-emerald-900">
                    {l.is_date_tbd ? "TBD" : formatLunchDate(l.lunch_date)}
                    {l.start_time && (
                      <span className="ml-2 font-normal text-emerald-800">
                        {l.start_time.slice(0, 5)}
                      </span>
                    )}
                  </p>
                  <p className="text-sm font-semibold">
                    {l.doctor_name ?? "Doctor"}
                  </p>
                  <p className="text-sm text-violet-800 dark:text-slate-400">{l.facility_name}</p>
                  {l.restaurant && (
                    <p className="mt-1 text-xs text-violet-800 dark:text-slate-400">{l.restaurant}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-slate-400">
            Past
          </h2>
          <ul className="space-y-2 opacity-80">
            {past.slice(0, 20).map((l) => (
              <li key={l.id}>
                <Link
                  href={l.doctor_id ? `/doctors/${l.doctor_id}` : "#"}
                  className="block rounded-lg border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 p-3 text-sm hover:border-violet-300 dark:border-slate-600"
                >
                  {formatLunchDate(l.lunch_date)} — {l.doctor_name},{" "}
                  {l.facility_name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
