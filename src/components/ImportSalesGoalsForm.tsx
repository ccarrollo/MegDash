"use client";

import { useState } from "react";

type GoalsResult = { ok: true; upserted: number; periodYear: number };
type SalesResult = {
  ok: true;
  inserted: number;
  unmatchedDoctors: number;
  defaultYear: number;
};

function CsvImportBlock({
  title,
  hint,
  year,
  onYearChange,
  replaceLabel,
  replaceExisting,
  onReplaceChange,
  loading,
  onFile,
  csv,
  onCsvChange,
  onSubmit,
  message,
  resultText,
}: {
  title: string;
  hint: string;
  year: string;
  onYearChange: (v: string) => void;
  replaceLabel: string;
  replaceExisting: boolean;
  onReplaceChange: (v: boolean) => void;
  loading: boolean;
  onFile: (file: File) => void;
  csv: string;
  onCsvChange: (v: string) => void;
  onSubmit: () => void;
  message: string;
  resultText: string | null;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/50">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{hint}</p>
      </div>

      <label className="block text-sm">
        <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Calendar year for this tab</span>
        <input
          type="number"
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          className="mt-1 w-28 rounded border px-2 py-1"
        />
      </label>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
        className="block w-full text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 dark:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-medium"
      />

      <textarea
        value={csv}
        onChange={(e) => onCsvChange(e.target.value)}
        placeholder="Or paste CSV here…"
        rows={6}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-mono"
      />

      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={replaceExisting}
          onChange={(e) => onReplaceChange(e.target.checked)}
        />
        {replaceLabel}
      </label>

      <button
        type="button"
        disabled={loading || !csv.trim()}
        onClick={onSubmit}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Importing…" : "Import"}
      </button>

      {message && (
        <p className={`text-sm ${message.includes("failed") || message.includes("No ") ? "text-red-600" : "text-slate-600 dark:text-slate-400 dark:text-slate-400"}`}>
          {message}
        </p>
      )}
      {resultText && <p className="text-sm font-medium text-emerald-700">{resultText}</p>}
    </div>
  );
}

export function ImportSalesGoalsForm() {
  const currentYear = String(new Date().getFullYear());

  const [goalsCsv, setGoalsCsv] = useState("");
  const [salesCsv, setSalesCsv] = useState("");
  const [goalsYear, setGoalsYear] = useState(currentYear);
  const [salesYear, setSalesYear] = useState(currentYear);
  const [replaceGoals, setReplaceGoals] = useState(true);
  const [replaceSales, setReplaceSales] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [goalsMsg, setGoalsMsg] = useState("");
  const [salesMsg, setSalesMsg] = useState("");
  const [goalsResult, setGoalsResult] = useState<string | null>(null);
  const [salesResult, setSalesResult] = useState<string | null>(null);

  async function importGoals() {
    setLoadingGoals(true);
    setGoalsMsg("");
    setGoalsResult(null);
    try {
      const res = await fetch("/api/import/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: goalsCsv,
          periodYear: parseInt(goalsYear, 10),
          replaceExisting: replaceGoals,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Import failed");
      const r = data as GoalsResult;
      setGoalsResult(`Imported ${r.upserted} months of goals for ${r.periodYear}.`);
      setGoalsMsg("Done — check the Sales tab.");
    } catch (err) {
      setGoalsMsg(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoadingGoals(false);
    }
  }

  async function importSales() {
    setLoadingSales(true);
    setSalesMsg("");
    setSalesResult(null);
    try {
      const res = await fetch("/api/import/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: salesCsv,
          periodYear: parseInt(salesYear, 10),
          replaceExisting: replaceSales,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Import failed");
      const r = data as SalesResult;
      setSalesResult(
        `Imported ${r.inserted} paid sales` +
          (r.unmatchedDoctors
            ? ` (${r.unmatchedDoctors} rows had doctor names not in the app)`
            : "") +
          ".",
      );
      setSalesMsg("Done — check the Sales tab.");
    } catch (err) {
      setSalesMsg(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoadingSales(false);
    }
  }

  return (
    <div className="space-y-6">
      <CsvImportBlock
        title="Import Goals tab"
        hint="Meg AI Dash → Goals tab → File → Download → CSV. Same idea as Prospecting import."
        year={goalsYear}
        onYearChange={setGoalsYear}
        replaceLabel={`Replace all goals for ${goalsYear} before import`}
        replaceExisting={replaceGoals}
        onReplaceChange={setReplaceGoals}
        loading={loadingGoals}
        onFile={async (f) => {
          setGoalsCsv(await f.text());
          setGoalsMsg(`Loaded ${f.name}`);
        }}
        csv={goalsCsv}
        onCsvChange={setGoalsCsv}
        onSubmit={() => void importGoals()}
        message={goalsMsg}
        resultText={goalsResult}
      />

      <CsvImportBlock
        title="Import Sales tab"
        hint="Sales tab → CSV. Imports Paid 3PP rows only (My Sales $). Wholesale skipped."
        year={salesYear}
        onYearChange={setSalesYear}
        replaceLabel={`Replace all sales for ${salesYear} before import`}
        replaceExisting={replaceSales}
        onReplaceChange={setReplaceSales}
        loading={loadingSales}
        onFile={async (f) => {
          setSalesCsv(await f.text());
          setSalesMsg(`Loaded ${f.name}`);
        }}
        csv={salesCsv}
        onCsvChange={setSalesCsv}
        onSubmit={() => void importSales()}
        message={salesMsg}
        resultText={salesResult}
      />
    </div>
  );
}
