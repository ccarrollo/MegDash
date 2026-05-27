import Link from "next/link";
import { SetupBanner } from "@/components/SetupBanner";
import { SalesMonthNav } from "@/components/SalesMonthNav";
import { SalesOrdersClient } from "@/components/SalesOrdersClient";
import {
  fetchDoctors,
  fetchMonthlyGoal,
  fetchRecentOrders,
  fetchSalesForMonth,
  getMonthlyPerformance,
  getSetupStatus,
} from "@/lib/data";
import { planDateIso } from "@/lib/dateUtils";

type SearchParams = Promise<{ year?: string; month?: string }>;

export default async function SalesPage({
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

  const [performance, goal, sales, orders, doctors] = await Promise.all([
    getMonthlyPerformance(safeYear, safeMonth),
    fetchMonthlyGoal(safeYear, safeMonth),
    fetchSalesForMonth(safeYear, safeMonth),
    fetchRecentOrders(50),
    fetchDoctors(),
  ]);

  const doctorMap = new Map(doctors.map((d) => [d.id, d]));
  const salesEnriched = sales.map((s) => {
    const d = s.doctor_id ? doctorMap.get(s.doctor_id) : null;
    return {
      ...s,
      doctor_name: d?.name ?? null,
      facility_name: d?.facility_name ?? null,
    };
  });
  const ordersEnriched = orders.map((o) => {
    const d = o.doctor_id ? doctorMap.get(o.doctor_id) : null;
    return {
      ...o,
      pipeline_stage: o.pipeline_stage ?? "order_received",
      counts_as_sale: o.counts_as_sale ?? false,
      doctor_name: d?.name ?? null,
      facility_name: d?.facility_name ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Sales & Orders</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
          3PP goals, My Sales $ per order, commission tiers, and order pipeline
        </p>
        <p className="mt-2 text-sm">
          <Link href="/import" className="text-brand-600 hover:underline">
            Import Goals & Sales from sheet →
          </Link>
        </p>
      </div>

      {!setup.supabase && <SetupBanner />}

      <SalesMonthNav year={safeYear} month={safeMonth} />

      <SalesOrdersClient
        key={`${safeYear}-${safeMonth}`}
        performance={performance}
        goal={goal}
        sales={salesEnriched}
        orders={ordersEnriched}
        doctors={doctors.map((d) => ({
          id: d.id,
          name: d.name,
          facility_name: d.facility_name,
        }))}
        year={safeYear}
        month={safeMonth}
      />

      <p className="text-center text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
        <Link href="/" className="text-brand-600 hover:underline">
          ← Day plan
        </Link>
        {" · "}
        Today: {planDateIso()}
      </p>
    </div>
  );
}
