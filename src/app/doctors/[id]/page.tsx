import Link from "next/link";
import { notFound } from "next/navigation";
import { DoctorProfileEditor } from "@/components/DoctorProfileEditor";
import { EditableDoctorNotes } from "@/components/EditableDoctorNotes";
import {
  fetchDoctorById,
  fetchDoctorLunches,
  fetchDoctorNotes,
  fetchDoctorVisits,
} from "@/lib/data";
import { ZONE_LABELS } from "@/lib/zones";

type Props = {
  params: Promise<{ id: string }>;
};

function visitLabel(doctor: {
  days_since_visit: number | null;
  days_since_activity?: number | null;
}) {
  if (doctor.days_since_visit != null) {
    return `${doctor.days_since_visit}d since last visit`;
  }
  if (doctor.days_since_activity != null) {
    return `${doctor.days_since_activity}d since activity`;
  }
  return "No visit logged";
}

export default async function DoctorProfilePage({ params }: Props) {
  const { id } = await params;
  const doctor = await fetchDoctorById(id);
  if (!doctor) return notFound();

  const [visits, notes, lunches] = await Promise.all([
    fetchDoctorVisits(id),
    fetchDoctorNotes(id),
    fetchDoctorLunches(id),
  ]);

  return (
    <div className="space-y-4">
      <Link href="/doctors" className="text-sm text-brand-600 hover:underline">
        ← Back to doctors
      </Link>
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h1 className="text-xl font-bold">{doctor.name}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">{doctor.facility_name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{doctor.address}</p>
        {doctor.lunch_date && (
          <p className="mt-2 text-sm text-emerald-700">
            Lunch scheduled: {doctor.lunch_date}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1">{doctor.priority}</span>
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1">{doctor.status}</span>
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1">
            {ZONE_LABELS[doctor.zone]}
          </span>
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1">{visitLabel(doctor)}</span>
        </div>
      </section>

      <EditableDoctorNotes doctor={doctor} notes={notes} />

      <DoctorProfileEditor
        doctor={doctor}
        visits={visits}
        lunches={lunches}
      />
    </div>
  );
}
