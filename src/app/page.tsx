import { PlanDateNav } from "@/components/PlanDateNav";
import { PlanDayClient } from "@/components/PlanDayClient";
import { MonthAnchorCalendar } from "@/components/MonthAnchorCalendar";
import { SetupBanner } from "@/components/SetupBanner";
import {
  formatPlanDateLong,
  isTodayPlanDate,
  parsePlanDate,
} from "@/lib/dateUtils";
import {
  fetchFacilities,
  fetchMonthAnchorSummary,
  getPlanForDate,
  getSetupStatus,
} from "@/lib/data";

type Props = {
  searchParams: Promise<{ date?: string }>;
};

export default async function TodayPage({ searchParams }: Props) {
  const setup = getSetupStatus();
  const { date: dateParam } = await searchParams;
  const planDate = parsePlanDate(dateParam);
  const { stops, doctors, anchors, prospectCount, autoSuggestions } =
    await getPlanForDate(planDate);
  const facilities = setup.supabase ? await fetchFacilities() : [];
  const monthSummary = setup.supabase
    ? await fetchMonthAnchorSummary(planDate)
    : {};
  const viewingToday = isTodayPlanDate(planDate);

  return (
    <div className="space-y-4">
      {!setup.supabase && <SetupBanner />}

      <section className="rounded-xl bg-brand-600 p-4 text-white">
        <p className="text-sm opacity-90">
          {viewingToday ? "Plan" : "Planning"} · {formatPlanDateLong(planDate)}
        </p>
        <h1 className="text-2xl font-bold">
          {viewingToday ? "Plan" : "Day plan"}
        </h1>
        <div className="mt-3">
          <PlanDateNav planDate={planDate} />
        </div>
      </section>

      {setup.supabase && (
        <PlanDayClient
          planDate={planDate}
          stops={stops}
          doctors={doctors}
          facilities={facilities}
          anchors={anchors}
          prospectCount={prospectCount}
          autoSuggestions={autoSuggestions}
        />
      )}

      {setup.supabase && (
        <MonthAnchorCalendar planDate={planDate} summary={monthSummary} />
      )}

      {setup.supabase && (
        <p className="text-center text-xs text-violet-600 dark:text-slate-400">
          {doctors.length} doctors · Central (Austin)
        </p>
      )}
    </div>
  );
}
