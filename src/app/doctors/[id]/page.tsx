import Link from "next/link";
import { notFound } from "next/navigation";
import { DoctorPhoto } from "@/components/DoctorPhoto";
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

function visitCounterLabel(doctor: {
  days_since_visit: number | null;
}) {
  if (doctor.days_since_visit != null) {
    return `${doctor.days_since_visit}d since last visit`;
  }
  return "No visit logged";
}

function contactCounterLabel(doctor: {
  days_since_contact?: number | null;
  days_since_activity?: number | null;
}) {
  if (doctor.days_since_contact != null) {
    return `${doctor.days_since_contact}d since last contact`;
  }
  if (doctor.days_since_activity != null) {
    return `${doctor.days_since_activity}d since last contact`;
  }
  return "No contact logged";
}

export default async function DoctorProfilePage({ params }: Props) {
  const { id } = await params;
  const doctor = await fetchDoctorById(id);
  if (!doctor) return notFound();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.address)}`;

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
        <div className="flex gap-4">
          <DoctorPhoto
            doctorId={doctor.id}
            doctorName={doctor.name}
            photoPath={doctor.photo_path}
            size="lg"
          />
          <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold">{doctor.name}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">{doctor.facility_name}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
        >
          {doctor.address}
        </a>
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
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1">
            {visitCounterLabel(doctor)}
          </span>
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1">
            {contactCounterLabel(doctor)}
          </span>
        </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Tap the photo to open it full screen — helpful for recognizing the office or doctor.
        </p>
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
