"use client";

import { useState } from "react";

type ImportResult = {
  ok: true;
  facilities: number;
  doctors: number;
  lunches: number;
  notes: number;
};

export function ImportProspectingForm() {
  const [csv, setCsv] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onFile(file: File) {
    const text = await file.text();
    setCsv(text);
    setMessage(`Loaded ${file.name}`);
  }

  async function submit() {
    setLoading(true);
    setMessage("");
    setResult(null);

    try {
      const res = await fetch("/api/import/prospecting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, replaceExisting }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Import failed");
      }

      setResult(data as ImportResult);
      setMessage("Import completed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/50">
      <div>
        <h2 className="text-lg font-semibold">Import Prospecting CSV</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
          Export the Prospecting tab as CSV from Google Sheets, then upload it.
        </p>
      </div>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
        }}
        className="block w-full text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 dark:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-medium"
      />

      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder="Or paste CSV text here…"
        rows={8}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
      />

      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={replaceExisting}
          onChange={(e) => setReplaceExisting(e.target.checked)}
        />
        Replace existing facilities/doctors/lunches/notes before import
      </label>

      <button
        type="button"
        disabled={loading || !csv.trim()}
        onClick={submit}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Importing..." : "Run import"}
      </button>

      {message && (
        <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400" aria-live="polite">
          {message}
        </p>
      )}

      {result && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
          Imported {result.facilities} facilities, {result.doctors} doctors,{" "}
          {result.lunches} lunches, {result.notes} notes.
        </div>
      )}
    </div>
  );
}
