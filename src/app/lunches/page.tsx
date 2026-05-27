import { SetupBanner } from "@/components/SetupBanner";
import { fetchDoctors, getSetupStatus } from "@/lib/data";

function formatLunchDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function LunchesPage() {
  const setup = getSetupStatus();
  const doctors = await fetchDoctors();
  const today = new Date().toISOString().slice(0, 10);

  const withLunch = doctors
    .filter((d) => d.lunch_date)
    .sort((a, b) => (a.lunch_date! > b.lunch_date! ? 1 : -1));

  const upcoming = withLunch.filter((d) => d.lunch_date! >= today);
  const past = withLunch.filter((d) => d.lunch_date! < today).reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Lunches</h1>
      {!setup.supabase && <SetupBanner />}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming lunches on file.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3"
              >
                <p className="font-medium text-emerald-900">
                  {formatLunchDate(d.lunch_date!)}
                </p>
                <p className="text-sm font-semibold">{d.name}</p>
                <p className="text-sm text-slate-600">{d.facility_name}</p>
                <p className="text-xs text-slate-500">{d.address}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Past
          </h2>
          <ul className="space-y-2 opacity-80">
            {past.slice(0, 15).map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
              >
                <span className="text-slate-500">
                  {formatLunchDate(d.lunch_date!)}
                </span>
                {" — "}
                {d.name}, {d.facility_name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
