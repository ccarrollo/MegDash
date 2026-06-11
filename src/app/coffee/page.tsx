import Link from "next/link";
import { CoffeeClient } from "@/components/CoffeeClient";
import { CoffeeMonthNav } from "@/components/CoffeeMonthNav";
import { SetupBanner } from "@/components/SetupBanner";
import { fetchCoffeeMonth, isCurrentCalendarMonth } from "@/lib/coffee";
import { fetchDoctors, getSetupStatus } from "@/lib/data";
import { planDateIso } from "@/lib/dateUtils";

type SearchParams = Promise<{ year?: string; month?: string }>;

export default async function CoffeePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const setup = getSetupStatus();
  const sp = await searchParams;
  const now = new Date();
  const year = sp.year ? parseInt(sp.year, 10) : now.getFullYear();
  const month = sp.month ? parseInt(sp.month, 10) : now.getMonth() + 1;
  const safeYear = Number.isFinite(year) ? year : now.getFullYear();
  const safeMonth =
    Number.isFinite(month) && month >= 1 && month <= 12
      ? month
      : now.getMonth() + 1;

  const doctors = setup.supabase ? await fetchDoctors() : [];
  const entries = setup.supabase
    ? await fetchCoffeeMonth(safeYear, safeMonth, doctors)
    : [];
  const isCurrentMonth = isCurrentCalendarMonth(safeYear, safeMonth);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Coffee</h1>
        <p className="mt-1 text-sm text-violet-700 dark:text-slate-400">
          Track monthly coffee drop-offs by doctor
        </p>
      </div>

      {!setup.supabase && <SetupBanner />}

      <CoffeeMonthNav year={safeYear} month={safeMonth} />

      {!isCurrentMonth && (
        <p className="text-xs text-violet-600 dark:text-slate-400">
          Viewing history — use + Coffee on the current month to log new
          deliveries.
        </p>
      )}

      <CoffeeClient
        key={`${safeYear}-${safeMonth}`}
        entries={entries}
        doctors={doctors.map((d) => ({
          id: d.id,
          name: d.name,
          facility_name: d.facility_name,
          status: d.status,
        }))}
        year={safeYear}
        month={safeMonth}
        isCurrentMonth={isCurrentMonth}
      />

      <p className="text-center text-xs text-violet-600 dark:text-slate-400">
        <Link href="/" className="text-brand-600 hover:underline">
          ← Day plan
        </Link>
        {" · "}
        Today: {planDateIso()}
      </p>
    </div>
  );
}
