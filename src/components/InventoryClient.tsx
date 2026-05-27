"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryItemRow } from "@/lib/types";

type PendingMap = Record<string, boolean>;

export function InventoryClient({ items }: { items: InventoryItemRow[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(items.map((item) => [item.stim_id, String(item.quantity)])),
  );
  const [saving, setSaving] = useState<PendingMap>({});

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.stim_id.localeCompare(b.stim_id)),
    [items],
  );

  async function saveQuantity(stimId: string, next: number) {
    setSaving((prev) => ({ ...prev, [stimId]: true }));
    try {
      const res = await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stimId, quantity: next }),
      });
      if (!res.ok) throw new Error("failed");
      setValues((prev) => ({ ...prev, [stimId]: String(next) }));
      router.refresh();
    } catch {
      alert("Could not update inventory.");
    } finally {
      setSaving((prev) => ({ ...prev, [stimId]: false }));
    }
  }

  function parseOrZero(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  }

  return (
    <div className="space-y-3">
      {sorted.map((item) => {
        const stimId = item.stim_id;
        const current = parseOrZero(values[stimId] ?? String(item.quantity));
        const isSaving = Boolean(saving[stimId]);
        return (
          <div
            key={stimId}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bone stim ID</p>
                <p className="text-lg font-semibold">{stimId}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving || current <= 0}
                  onClick={() => void saveQuantity(stimId, Math.max(0, current - 1))}
                  className="h-9 w-9 rounded-lg border border-slate-300 text-lg disabled:opacity-50 dark:border-slate-600"
                >
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  value={values[stimId] ?? "0"}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [stimId]: e.target.value }))
                  }
                  onBlur={() => void saveQuantity(stimId, parseOrZero(values[stimId] ?? "0"))}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-base font-medium dark:border-slate-600 dark:bg-slate-800"
                />
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void saveQuantity(stimId, current + 1)}
                  className="h-9 w-9 rounded-lg border border-slate-300 text-lg disabled:opacity-50 dark:border-slate-600"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
