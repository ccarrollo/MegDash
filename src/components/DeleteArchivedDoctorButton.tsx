"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteArchivedDoctorButton({
  doctorId,
  doctorName,
  compact = false,
}: {
  doctorId: string;
  doctorName: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (
      !confirm(
        `Permanently delete ${doctorName}? This cannot be undone. Visits, notes, and plan history for this doctor will be removed.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      if (compact) {
        router.refresh();
      } else {
        router.push("/doctors");
        router.refresh();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete doctor.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      disabled={deleting}
      onClick={() => void remove()}
      className={
        compact
          ? "text-xs text-red-600 hover:underline disabled:opacity-50"
          : "rounded border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      }
    >
      {deleting ? "Deleting…" : "Delete permanently"}
    </button>
  );
}
