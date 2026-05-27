import { SetupBanner } from "@/components/SetupBanner";
import { StopCard } from "@/components/StopCard";
import { HOME_ADDRESS } from "@/lib/constants";
import { fetchDoctors, getTodayPlan, getSetupStatus } from "@/lib/data";
import { ZONE_LABELS } from "@/lib/zones";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default async function TodayPage() {
  const setup = getSetupStatus();
  const { anchorZone, stops } = await getTodayPlan();
  const doctors = await fetchDoctors();
  const lunchCount = stops.filter((s) => s.kind === "lunch").length;

  return (
    <div className="space-y-4">
      {!setup.supabase && <SetupBanner />}

      <section className="rounded-xl bg-brand-600 p-4 text-white">
        <p className="text-sm opacity-90">{formatDate(new Date())}</p>
        <h1 className="text-2xl font-bold">Today&apos;s plan</h1>
        <p className="mt-1 text-sm opacity-90">
          Zone: <strong>{ZONE_LABELS[anchorZone]}</strong>
          {lunchCount > 0 && ` · ${lunchCount} lunch${lunchCount > 1 ? "es" : ""}`}
        </p>
        <p className="mt-2 text-xs opacity-75">Start: {HOME_ADDRESS}</p>
      </section>

      {stops.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
          {setup.supabase
            ? "No stops yet. Import doctors from the sheet or add them in Supabase."
            : "Connect Supabase, then import her Prospecting tab."}
        </p>
      ) : (
        <ul className="space-y-3">
          {stops.map((stop) => (
            <li key={`${stop.kind}-${stop.doctorId}`}>
              <StopCard stop={stop} />
            </li>
          ))}
        </ul>
      )}

      {setup.supabase && (
        <p className="text-center text-xs text-slate-400">
          {doctors.length} doctors in database
        </p>
      )}
    </div>
  );
}
