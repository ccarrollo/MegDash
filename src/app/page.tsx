import { PlanDateNav } from "@/components/PlanDateNav";
import { PlanDayClient } from "@/components/PlanDayClient";
import { SetupBanner } from "@/components/SetupBanner";
import {
  formatPlanDateLong,
  isTodayPlanDate,
  parsePlanDate,
} from "@/lib/dateUtils";
import { getPlanForDate, getSetupStatus } from "@/lib/data";

type Props = {
  searchParams: Promise<{ date?: string }>;
};

export default async function TodayPage({ searchParams }: Props) {
  const setup = getSetupStatus();
  const { date: dateParam } = await searchParams;
  const planDate = parsePlanDate(dateParam);
  const { stops, doctors, anchors, prospectCount, autoSuggestions } =
    await getPlanForDate(planDate);
  const viewingToday = isTodayPlanDate(planDate);

  return (
    <div className="space-y-4">
      {!setup.supabase && <SetupBanner />}

      <section className="rounded-xl bg-brand-600 p-4 text-white">
        <p className="text-sm opacity-90">
          {viewingToday ? "Today" : "Planning"} · {formatPlanDateLong(planDate)}
        </p>
        <h1 className="text-2xl font-bold">
          {viewingToday ? "Today's plan" : "Day plan"}
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
          anchors={anchors}
          prospectCount={prospectCount}
          autoSuggestions={autoSuggestions}
        />
      )}

      {setup.supabase && (
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
          {doctors.length} doctors · Central (Austin)
        </p>
      )}
    </div>
  );
}
