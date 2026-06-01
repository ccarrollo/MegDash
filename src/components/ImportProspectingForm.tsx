"use client";

import { useState } from "react";

type ImportResult = {
  ok: true;
  totalRows?: number;
  facilities: number;
  doctors: number;
  doctorsSkipped?: number;
  lunches: number;
  notes: number;
};

export function ImportProspectingForm() {
  const [relationshipsCsv, setRelationshipsCsv] = useState("");
  const [prospectingCsv, setProspectingCsv] = useState("");
  const [singleCsv, setSingleCsv] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onRelationshipsFile(file: File) {
    const text = await file.text();
    setRelationshipsCsv(text);
    setMessage(`Loaded Relationships: ${file.name}`);
  }

  async function onProspectingFile(file: File) {
    const text = await file.text();
    setProspectingCsv(text);
    setMessage(`Loaded Prospecting: ${file.name}`);
  }

  async function onSingleFile(file: File) {
    const text = await file.text();
    setSingleCsv(text);
    setMessage(`Loaded ${file.name}`);
  }

  const useBothTabs = relationshipsCsv.trim() && prospectingCsv.trim();
  const useSingle = singleCsv.trim() && !useBothTabs;
  const canSubmit = useBothTabs || useSingle;

  async function submit() {
    setLoading(true);
    setMessage("");
    setResult(null);

    const body = useBothTabs
      ? {
          relationshipsCsv,
          prospectingTargetsCsv: prospectingCsv,
          replaceExisting,
          mergeOnly: !replaceExisting,
        }
      : { csv: singleCsv, replaceExisting };

    try {
      const res = await fetch("/api/import/prospecting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    <div className="space-y-6 rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/50">
      <div>
        <h2 className="text-lg font-semibold">Import doctors (both tabs)</h2>
        <p className="text-sm text-violet-700 dark:text-slate-400">
          Export <strong>Relationships</strong> and <strong>Prospecting</strong>{" "}
          from Meg AI Dash as CSV. Upload both — existing doctors are kept; new
          targets from Prospecting are added.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-violet-200 p-3 dark:border-slate-700">
        <p className="text-sm font-medium text-violet-900 dark:text-slate-300">
          Recommended: both tabs
        </p>
        <label className="block text-sm text-violet-800 dark:text-slate-400">
          Relationships tab
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onRelationshipsFile(file);
            }}
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-slate-800"
          />
        </label>
        <label className="block text-sm text-violet-800 dark:text-slate-400">
          Prospecting tab (targets + referrals)
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onProspectingFile(file);
            }}
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-slate-800"
          />
        </label>
      </div>

      <details className="text-sm text-violet-800 dark:text-slate-400">
        <summary className="cursor-pointer font-medium text-violet-900 dark:text-slate-300">
          Or import a single CSV
        </summary>
        <div className="mt-3 space-y-2">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onSingleFile(file);
            }}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-slate-800"
          />
          <textarea
            value={singleCsv}
            onChange={(e) => setSingleCsv(e.target.value)}
            placeholder="Or paste one tab’s CSV here…"
            rows={6}
            className="w-full rounded-lg border border-violet-300 px-3 py-2 text-sm dark:border-slate-600"
          />
        </div>
      </details>

      <label className="flex items-center gap-2 text-sm text-violet-900 dark:text-slate-300">
        <input
          type="checkbox"
          checked={replaceExisting}
          onChange={(e) => setReplaceExisting(e.target.checked)}
        />
        Replace all existing facilities/doctors before import (destructive)
      </label>

      <button
        type="button"
        disabled={loading || !canSubmit}
        onClick={submit}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Importing..." : "Run import"}
      </button>

      {message && (
        <p
          className="text-sm text-violet-800 dark:text-slate-400"
          aria-live="polite"
        >
          {message}
        </p>
      )}

      {result && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {result.totalRows != null && (
            <p>{result.totalRows} rows from sheet.</p>
          )}
          <p>
            {result.doctors} doctors added,{" "}
            {result.doctorsSkipped ?? 0} already in database (skipped),{" "}
            {result.facilities} facilities, {result.lunches} lunches,{" "}
            {result.notes} notes.
          </p>
        </div>
      )}
    </div>
  );
}
