import { ManualAddForms } from "@/components/ManualAddForms";
import { SetupBanner } from "@/components/SetupBanner";
import { fetchDoctors, fetchFacilities, getSetupStatus } from "@/lib/data";

export default async function AddPage() {
  const setup = getSetupStatus();
  const facilities = await fetchFacilities();
  const doctors = await fetchDoctors();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Manual Add</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
        Add facilities, doctors, and lunches directly in-app.
      </p>
      {!setup.supabase && <SetupBanner />}
      <ManualAddForms facilities={facilities} doctors={doctors} />
    </div>
  );
}
