import { SetupBanner } from "@/components/SetupBanner";
import { LunchesListClient } from "@/components/LunchesListClient";
import { fetchAllLunches, getSetupStatus } from "@/lib/data";

export default async function LunchesPage() {
  const setup = getSetupStatus();
  const lunches = await fetchAllLunches();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Lunches</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
        Search and tap a doctor to edit date, restaurant, and cost.
      </p>
      {!setup.supabase && <SetupBanner />}
      {lunches.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No lunches on file.</p>
      ) : (
        <LunchesListClient lunches={lunches} />
      )}
    </div>
  );
}
