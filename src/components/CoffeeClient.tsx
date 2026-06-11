"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isArchivedDoctor } from "@/lib/doctorStatus";
import type { CoffeeDoctorMonth } from "@/lib/types";

function formatDeliveryDate(iso: string) {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  return `${m}/${d}`;
}

function progressTone(actual: number, goal: number) {
  if (goal <= 0) return "bg-violet-300 dark:bg-slate-600";
  if (actual >= goal) return "bg-emerald-500";
  if (actual > 0) return "bg-orange-400";
  return "bg-violet-200 dark:bg-slate-700";
}

export function CoffeeClient({
  entries,
  doctors,
  year,
  month,
  isCurrentMonth,
}: {
  entries: CoffeeDoctorMonth[];
  doctors: { id: string; name: string; facility_name?: string | null; status?: string }[];
  year: number;
  month: number;
  isCurrentMonth: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState(false);
  const [doctorQuery, setDoctorQuery] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [newGoal, setNewGoal] = useState("1");
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const rosterDoctorIds = useMemo(
    () => new Set(entries.filter((e) => e.onRoster).map((e) => e.doctorId)),
    [entries],
  );

  const addableDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    return doctors
      .filter((d) => !isArchivedDoctor(d.status ?? ""))
      .filter((d) => !rosterDoctorIds.has(d.id))
      .filter((d) =>
        q
          ? `${d.name} ${d.facility_name ?? ""}`.toLowerCase().includes(q)
          : true,
      )
      .slice(0, 40);
  }, [doctors, doctorQuery, rosterDoctorIds]);

  const summary = useMemo(() => {
    const rosterEntries = entries.filter((e) => e.onRoster);
    const totalGoal = rosterEntries.reduce((s, e) => s + e.monthGoal, 0);
    const totalActual = rosterEntries.reduce((s, e) => s + e.actual, 0);
    const behind = rosterEntries.filter((e) => e.actual < e.monthGoal).length;
    return { totalGoal, totalActual, behind, rosterCount: rosterEntries.length };
  }, [entries]);

  async function withPending(key: string, fn: () => Promise<void>) {
    setPending((p) => ({ ...p, [key]: true }));
    try {
      await fn();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending((p) => ({ ...p, [key]: false }));
    }
  }

  async function logCoffee(doctorId: string) {
    await withPending(`coffee-${doctorId}`, async () => {
      const res = await fetch("/api/coffee/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not log coffee");
    });
  }

  async function undoDelivery(deliveryId: string) {
    await withPending(`undo-${deliveryId}`, async () => {
      const res = await fetch(`/api/coffee/deliveries/${deliveryId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not undo");
    });
  }

  async function updateGoal(doctorId: string, goal: number) {
    await withPending(`goal-${doctorId}`, async () => {
      const res = await fetch("/api/coffee/month-goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          periodYear: year,
          periodMonth: month,
          goal,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update goal");
    });
  }

  async function addDoctor() {
    if (!selectedDoctorId) {
      alert("Pick a doctor.");
      return;
    }
    const goal = Math.max(0, parseInt(newGoal, 10) || 1);
    await withPending("add-doctor", async () => {
      const res = await fetch("/api/coffee/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          monthlyGoal: goal,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not add doctor");
      setAdding(false);
      setDoctorQuery("");
      setSelectedDoctorId("");
      setNewGoal("1");
    });
  }

  async function removeFromRoster(rosterId: string, doctorName: string) {
    if (
      !confirm(
        `Remove ${doctorName} from the coffee list? Past deliveries stay in history.`,
      )
    ) {
      return;
    }
    await withPending(`remove-${rosterId}`, async () => {
      const res = await fetch(`/api/coffee/roster/${rosterId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not remove");
    });
  }

  function toggleExpanded(doctorId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(doctorId)) next.delete(doctorId);
      else next.add(doctorId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-violet-200 bg-brand-50/40 p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs uppercase tracking-wide text-violet-700 dark:text-slate-400">
          This month
        </p>
        <p className="mt-1 text-2xl font-bold">
          {summary.totalActual}
          <span className="text-lg font-normal text-violet-700 dark:text-slate-400">
            {" "}
            / {summary.totalGoal} coffees
          </span>
        </p>
        <p className="mt-1 text-sm text-violet-700 dark:text-slate-400">
          {summary.rosterCount} doctors tracked
          {summary.behind > 0 && isCurrentMonth
            ? ` · ${summary.behind} still need coffee`
            : ""}
        </p>
      </section>

      {entries.length === 0 && (
        <p className="rounded-lg border border-dashed border-violet-300 px-4 py-6 text-center text-sm text-violet-700 dark:border-slate-600 dark:text-slate-400">
          No doctors on the coffee list yet. Add one below to start tracking.
        </p>
      )}

      <ul className="space-y-3">
        {entries.map((entry) => {
          const pct =
            entry.monthGoal > 0
              ? Math.min(100, (entry.actual / entry.monthGoal) * 100)
              : entry.actual > 0
                ? 100
                : 0;
          const isExpanded = expanded.has(entry.doctorId);
          const busy = Boolean(pending[`coffee-${entry.doctorId}`]);

          return (
            <li
              key={entry.doctorId}
              className="rounded-xl border border-violet-200 bg-fuchsia-50 p-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/doctors/${entry.doctorId}`}
                    className="font-semibold text-brand-700 hover:underline dark:text-brand-400"
                  >
                    {entry.doctorName}
                  </Link>
                  {entry.facilityName && (
                    <p className="truncate text-xs text-violet-700 dark:text-slate-400">
                      {entry.facilityName}
                    </p>
                  )}
                  {!entry.onRoster && (
                    <p className="text-xs text-violet-600 dark:text-slate-500">
                      Removed from list · history only
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums">
                    {entry.actual}
                    <span className="text-sm font-normal text-violet-700 dark:text-slate-400">
                      {" "}
                      / {entry.monthGoal}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${progressTone(entry.actual, entry.monthGoal)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {isCurrentMonth && entry.onRoster && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void logCoffee(entry.doctorId)}
                    className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {busy ? "…" : "+ Coffee"}
                  </button>
                )}

                {entry.onRoster && (
                  <label className="flex items-center gap-1 text-xs text-violet-700 dark:text-slate-400">
                    Goal
                    <input
                      type="number"
                      min={0}
                      defaultValue={entry.monthGoal}
                      key={`${entry.doctorId}-${year}-${month}-${entry.monthGoal}`}
                      onBlur={(e) => {
                        const next = Math.max(0, parseInt(e.target.value, 10) || 0);
                        if (next !== entry.monthGoal) {
                          void updateGoal(entry.doctorId, next);
                        }
                      }}
                      className="w-12 rounded border px-1 py-1 text-center text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                    / mo
                  </label>
                )}

                {entry.deliveries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(entry.doctorId)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    {isExpanded ? "Hide" : "Show"} deliveries
                  </button>
                )}

                {isCurrentMonth && entry.rosterId && (
                  <button
                    type="button"
                    disabled={Boolean(pending[`remove-${entry.rosterId}`])}
                    onClick={() =>
                      void removeFromRoster(entry.rosterId!, entry.doctorName)
                    }
                    className="ml-auto text-xs text-violet-600 hover:underline dark:text-slate-500"
                  >
                    Remove
                  </button>
                )}
              </div>

              {isExpanded && entry.deliveries.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-violet-200 pt-2 dark:border-slate-700">
                  {entry.deliveries.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span>{formatDeliveryDate(d.deliveredOn)}</span>
                      {isCurrentMonth && (
                        <button
                          type="button"
                          disabled={Boolean(pending[`undo-${d.id}`])}
                          onClick={() => void undoDelivery(d.id)}
                          className="text-violet-600 hover:underline dark:text-slate-400"
                        >
                          Undo
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {isCurrentMonth && (
        <section className="rounded-xl border border-dashed border-brand-300 p-3 dark:border-brand-800">
          {!adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="w-full py-2 text-sm font-medium text-brand-700 dark:text-brand-400"
            >
              + Add doctor to coffee list
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Add to coffee list</p>
              <input
                value={doctorQuery}
                onChange={(e) => setDoctorQuery(e.target.value)}
                placeholder="Search doctors…"
                className="w-full rounded border px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full rounded border px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
              >
                <option value="">Select doctor…</option>
                {addableDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.facility_name ? ` · ${d.facility_name}` : ""}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                Monthly goal
                <input
                  type="number"
                  min={0}
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  className="w-16 rounded border px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={Boolean(pending["add-doctor"])}
                  onClick={() => void addDoctor()}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
