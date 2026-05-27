import Link from "next/link";
import { SetupBanner } from "@/components/SetupBanner";
import { fetchAllLunches, fetchDoctors, getSetupStatus } from "@/lib/data";
import { filterDoctors, filterLunches } from "@/lib/search";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const setup = getSetupStatus();
  const { q = "" } = await searchParams;
  const query = q.trim();

  const [doctors, lunches] = await Promise.all([
    fetchDoctors(),
    fetchAllLunches(),
  ]);

  const doctorHits = query ? filterDoctors(doctors, query, {}) : [];
  const lunchHits = query ? filterLunches(lunches, query) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Search</h1>
      {!setup.supabase && <SetupBanner />}

      <form action="/search" method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Doctor, facility, address, notes…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>

      {!query && (
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
          Or use search on the{" "}
          <Link href="/doctors" className="text-brand-600 hover:underline">
            Doctors
          </Link>{" "}
          and{" "}
          <Link href="/lunches" className="text-brand-600 hover:underline">
            Lunches
          </Link>{" "}
          tabs.
        </p>
      )}

      {query && (
        <>
          <section>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Doctors ({doctorHits.length})
            </h2>
            {doctorHits.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">No doctor matches.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {doctorHits.slice(0, 25).map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/doctors/${d.id}`}
                      className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 hover:border-brand-300"
                    >
                      <p className="font-medium">{d.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">{d.facility_name}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Lunches ({lunchHits.length})
            </h2>
            {lunchHits.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">No lunch matches.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {lunchHits.slice(0, 15).map((l) => (
                  <li key={l.id}>
                    <Link
                      href={l.doctor_id ? `/doctors/${l.doctor_id}` : "#"}
                      className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 hover:border-brand-300"
                    >
                      <p className="font-medium">
                        {l.lunch_date} — {l.doctor_name}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">{l.facility_name}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
