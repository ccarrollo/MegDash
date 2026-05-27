"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogVisitForm({
  doctorId,
  doctorName,
}: {
  doctorId: string;
  doctorName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState(false);

  async function log(outcome: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, outcome, note: note.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      setNote("");
      setExpanded(false);
      router.refresh();
    } catch {
      alert("Could not log visit. Is Supabase connected?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-500">
        Log visit — {doctorName}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => log("visited")}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Visited
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => log("no_contact")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          No contact
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
        >
          + Note
        </button>
      </div>
      {expanded && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Quick note…"
          rows={2}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
