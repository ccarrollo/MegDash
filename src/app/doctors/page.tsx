import { DoctorsHeaderActions } from "@/components/DoctorsHeaderActions";
import { SetupBanner } from "@/components/SetupBanner";
import { DoctorsListClient } from "@/components/DoctorsListClient";
import { planDateIso } from "@/lib/dateUtils";
import {
  fetchDoctors,
  fetchFacilities,
  getSetupStatus,
  getTodayPlanDoctorIds,
} from "@/lib/data";

export default async function DoctorsPage() {
  const setup = getSetupStatus();
  const [doctors, facilities] = await Promise.all([
    fetchDoctors(),
    fetchFacilities(),
  ]);
  const todayDate = planDateIso();
  const todayPlanDoctorIds = setup.supabase
    ? await getTodayPlanDoctorIds()
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Doctors</h1>
      <DoctorsHeaderActions facilities={facilities} />
      {!setup.supabase && <SetupBanner />}
      {doctors.length === 0 ? (
        <p className="text-violet-700 dark:text-slate-400">No doctors loaded yet.</p>
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
