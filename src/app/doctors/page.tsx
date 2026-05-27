import { SetupBanner } from "@/components/SetupBanner";
import { DoctorsListClient } from "@/components/DoctorsListClient";
import { planDateIso } from "@/lib/dateUtils";
import { fetchDoctors, getSetupStatus, getTodayPlanDoctorIds } from "@/lib/data";

export default async function DoctorsPage() {
  const setup = getSetupStatus();
  const doctors = await fetchDoctors();
  const todayDate = planDateIso();
  const todayPlanDoctorIds = setup.supabase
    ? await getTodayPlanDoctorIds()
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Doctors</h1>
      {!setup.supabase && <SetupBanner />}
      {doctors.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No doctors loaded yet.</p>
      ) : (
        <DoctorsListClient
          doctors={doctors}
          todayDate={todayDate}
          todayPlanDoctorIds={todayPlanDoctorIds}
        />
      )}
    </div>
  );
}
