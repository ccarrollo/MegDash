import { SetupBanner } from "@/components/SetupBanner";
import { LogVisitForm } from "@/components/LogVisitForm";
import { fetchDoctors, getSetupStatus } from "@/lib/data";
import { ZONE_LABELS } from "@/lib/zones";

export default async function DoctorsPage() {
  const setup = getSetupStatus();
  const doctors = await fetchDoctors();

  const sorted = [...doctors].sort((a, b) => {
    const daysA = a.days_since_visit ?? 999;
    const daysB = b.days_since_visit ?? 999;
    return daysB - daysA;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Doctors</h1>
      <p className="text-sm text-slate-500">Sorted by days since last visit</p>

      {!setup.supabase && <SetupBanner />}

      {sorted.length === 0 ? (
        <p className="text-slate-500">No doctors loaded yet.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{d.name}</h2>
                  <p className="text-sm text-slate-600">{d.facility_name}</p>
                  <p className="text-xs text-slate-400">{d.address}</p>
                </div>
                <div className="text-right text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      d.priority === "High"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {d.priority}
                  </span>
                  <p className="mt-1 text-slate-500">{ZONE_LABELS[d.zone]}</p>
                  <p className="font-medium text-slate-700">
                    {d.days_since_visit != null
                      ? `${d.days_since_visit}d ago`
                      : "No visit"}
                  </p>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">{d.status}</p>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <LogVisitForm doctorId={d.id} doctorName={d.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
