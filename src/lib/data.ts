import { mergeLunchAnchors } from "./anchors";
import {
  buildYearCommission,
  isAccelStimProduct,
  isPhysioStimProduct,
  type MonthSalesSlice,
} from "./commission";
import { planDateIso } from "./dateUtils";
import { assignStopTimes } from "./schedule";
import { buildDailyPlan, buildScheduledStops } from "./planner";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type {
  DayAnchorRow,
  DayPlanSettings,
  DoctorRow,
  FacilityRow,
  LunchRow,
  LunchWithDoctor,
  NoteRow,
  MonthlyGoalRow,
  ManualPlanStopRow,
  InventoryItemRow,
  MonthlyPerformance,
  OrderRow,
  PlannedStop,
  SaleRecordRow,
  StopTimeOverride,
  TerritoryZone,
  VisitRow,
} from "./types";

/** Avoid console.error during RSC — Next.js treats it as a render error in dev. */
function logQueryError(label: string, error: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  const detail =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: string; code?: string }).message)
      : String(error);
  console.warn(`[meg-field] ${label}:`, detail || "(no message)");
}

const DEFAULT_PROSPECT_COUNT = 6;
const DEFAULT_INVENTORY_IDS = ["5313", "5314", "5315", "5302", "5303"];

/** View may omit photo_path until recreated; always read from doctors table. */
async function mergeDoctorPhotoPaths(
  doctors: DoctorRow[],
): Promise<DoctorRow[]> {
  const supabase = getSupabase();
  if (!supabase || doctors.length === 0) return doctors;

  const ids = doctors.map((d) => d.id);
  const { data, error } = await supabase
    .from("doctors")
    .select("id, photo_path")
    .in("id", ids);

  if (error) {
    logQueryError("mergeDoctorPhotoPaths", error);
    return doctors;
  }

  const byId = new Map(
    (data ?? []).map((row) => [row.id as string, row.photo_path as string | null]),
  );

  return doctors.map((d) => ({
    ...d,
    photo_path: byId.get(d.id) ?? d.photo_path ?? null,
  }));
}

export async function fetchDoctors(): Promise<DoctorRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("doctors_with_last_visit")
    .select("*")
    .order("priority", { ascending: true });

  if (error) {
    logQueryError("fetchDoctors", error);
    return [];
  }

  return mergeDoctorPhotoPaths((data ?? []) as DoctorRow[]);
}

export async function fetchFacilities(): Promise<FacilityRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("facilities")
    .select("id,name,address,city,location_label,zone,office_vibe")
    .order("name");

  if (error) {
    logQueryError("fetchFacilities", error);
    return [];
  }

  return (data ?? []) as FacilityRow[];
}

export async function fetchDoctorById(id: string): Promise<DoctorRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("doctors_with_last_visit")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logQueryError("fetchDoctorById", error);
    return null;
  }

  const doctor = (data as DoctorRow) ?? null;
  if (!doctor) return null;
  const [merged] = await mergeDoctorPhotoPaths([doctor]);
  return merged;
}

export async function fetchDoctorVisits(id: string): Promise<VisitRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("visits")
    .select("*")
    .eq("doctor_id", id)
    .order("visited_at", { ascending: false });
  if (error) {
    logQueryError("fetchDoctorVisits", error);
    return [];
  }
  return (data ?? []) as VisitRow[];
}

export async function fetchDoctorNotes(id: string): Promise<NoteRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("doctor_id", id)
    .order("created_at", { ascending: false });
  if (error) {
    logQueryError("fetchDoctorNotes", error);
    return [];
  }
  return (data ?? []) as NoteRow[];
}

export async function fetchDoctorLunches(id: string): Promise<LunchRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("lunches")
    .select("*")
    .eq("doctor_id", id)
    .order("lunch_date", { ascending: false });
  if (error) {
    logQueryError("fetchDoctorLunches", error);
    return [];
  }
  return (data ?? []) as LunchRow[];
}

export async function fetchDayAnchors(planDate?: string): Promise<DayAnchorRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const date = planDate ?? planDateIso();
  const { data, error } = await supabase
    .from("daily_plan_anchors")
    .select("*")
    .eq("plan_date", date)
    .order("sort_order");

  if (error) {
    logQueryError("fetchDayAnchors", error);
    return [];
  }

  return (data ?? []) as DayAnchorRow[];
}

export function enrichAnchors(
  anchors: DayAnchorRow[],
  doctors: DoctorRow[],
): DayAnchorRow[] {
  return anchors.map((a) => {
    const d = a.doctor_id ? doctors.find((doc) => doc.id === a.doctor_id) : null;
    return {
      ...a,
      doctor_name: d?.name ?? null,
      facility_name: d?.facility_name ?? null,
      address: d?.address ?? null,
      zone: d?.zone ?? null,
    };
  });
}

export async function fetchLunchesOnDate(planDate: string): Promise<LunchRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("lunches")
    .select("*")
    .eq("lunch_date", planDate)
    .neq("status", "cancelled")
    .order("start_time", { ascending: true });
  if (error) {
    logQueryError("fetchLunchesOnDate", error);
    return [];
  }
  return (data ?? []) as LunchRow[];
}

export async function fetchStopTimeOverrides(
  planDate: string,
): Promise<StopTimeOverride[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("daily_plan_stop_times")
    .select("*")
    .eq("plan_date", planDate);
  if (error) {
    logQueryError("fetchStopTimeOverrides", error);
    return [];
  }
  return (data ?? []) as StopTimeOverride[];
}

export async function fetchPlanSettings(
  planDate: string,
): Promise<DayPlanSettings> {
  const supabase = getSupabase();
  if (!supabase) {
    return { plan_date: planDate, prospect_count: DEFAULT_PROSPECT_COUNT };
  }
  const { data, error } = await supabase
    .from("daily_plan_settings")
    .select("*")
    .eq("plan_date", planDate)
    .maybeSingle();
  if (error) {
    logQueryError("fetchPlanSettings", error);
    return {
      plan_date: planDate,
      prospect_count: DEFAULT_PROSPECT_COUNT,
      auto_suggestions: true,
    };
  }
  return (
    (data as DayPlanSettings) ?? {
      plan_date: planDate,
      prospect_count: DEFAULT_PROSPECT_COUNT,
      auto_suggestions: true,
    }
  );
}

export async function fetchManualPlanStops(
  planDate: string,
): Promise<ManualPlanStopRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("daily_plan_manual_stops")
    .select("*")
    .eq("plan_date", planDate)
    .order("sort_order", { ascending: true });
  if (error) {
    logQueryError("fetchManualPlanStops", error);
    return [];
  }
  return (data ?? []) as ManualPlanStopRow[];
}

function manualStopsToPlanned(
  rows: ManualPlanStopRow[],
  doctors: DoctorRow[],
  planDate: string,
): PlannedStop[] {
  return rows
    .map((row) => {
      const d = doctors.find((doc) => doc.id === row.doctor_id);
      if (!d) return null;
      const followUpDue =
        d.follow_up_date != null && d.follow_up_date <= planDate;
      let kind: PlannedStop["kind"] = "visit";
      if (row.kind === "follow_up" || (row.kind === "visit" && followUpDue)) {
        kind = "follow_up";
      }
      const stop: PlannedStop = {
        doctorId: d.id,
        doctorName: d.name,
        facilityName: d.facility_name,
        address: d.address,
        zone: d.zone,
        kind,
        reason: "Added to plan",
        score: 50,
        isManual: true,
      };
      if (row.day_period === "morning" || row.day_period === "afternoon") {
        stop.dayPeriod = row.day_period;
      }
      return stop;
    })
    .filter((s): s is PlannedStop => s !== null);
}

export async function getPlanForDate(
  planDate?: string,
  prospectCount?: number,
) {
  const date = planDate ?? planDateIso();
  const [doctors, rawAnchors, lunchesOnDate, overrides, settings] =
    await Promise.all([
      fetchDoctors(),
      fetchDayAnchors(date),
      fetchLunchesOnDate(date),
      fetchStopTimeOverrides(date),
      fetchPlanSettings(date),
    ]);

  const mergedAnchors = mergeLunchAnchors(
    rawAnchors,
    lunchesOnDate,
    doctors,
    date,
  );
  const anchors = enrichAnchors(mergedAnchors, doctors);
  const count = prospectCount ?? settings.prospect_count ?? DEFAULT_PROSPECT_COUNT;
  const autoSuggestions = settings.auto_suggestions !== false;
  const queueEligibleDoctors = doctors.filter((d) => !d.daily_queue_hidden);

  let anchorZone: TerritoryZone;
  let stops: PlannedStop[];

  if (autoSuggestions) {
    const built = buildDailyPlan(queueEligibleDoctors, anchors, {
      planDate: date,
      lunchesOnDate,
      prospectCount: count,
    });
    anchorZone = built.anchorZone;
    stops = built.stops;
  } else {
    const manualRows = await fetchManualPlanStops(date);
    const scheduled = buildScheduledStops(doctors, anchors, {
      planDate: date,
      lunchesOnDate,
    });
    anchorZone = scheduled.anchorZone;
    const scheduledIds = new Set(scheduled.stops.map((s) => s.doctorId));
    const manualStops = manualStopsToPlanned(manualRows, doctors, date).filter(
      (s) => !scheduledIds.has(s.doctorId),
    );
    stops = [...scheduled.stops, ...manualStops];
  }

  const timedStops = assignStopTimes(stops, overrides);
  return {
    anchorZone,
    planDate: date,
    stops: timedStops,
    doctors,
    anchors,
    prospectCount: count,
    autoSuggestions,
  };
}

export async function getTodayPlanDoctorIds(): Promise<string[]> {
  const { stops } = await getPlanForDate(planDateIso());
  return stops.map((s) => s.doctorId);
}

export async function getTodayPlan() {
  return getPlanForDate(planDateIso());
}

export async function fetchAllLunches(): Promise<LunchWithDoctor[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("lunches")
    .select("*")
    .neq("status", "cancelled")
    .order("lunch_date", { ascending: false });
  if (error) {
    logQueryError("fetchAllLunches", error);
    return [];
  }
  const lunches = (data ?? []) as LunchRow[];
  const doctors = await fetchDoctors();
  const docMap = new Map(doctors.map((d) => [d.id, d]));
  return lunches.map((l) => {
    const d = l.doctor_id ? docMap.get(l.doctor_id) : null;
    return {
      ...l,
      doctor_name: d?.name ?? null,
      facility_name: d?.facility_name ?? null,
    };
  });
}

export async function fetchMonthlyGoal(
  year: number,
  month: number,
): Promise<MonthlyGoalRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("monthly_goals")
    .select("*")
    .eq("period_year", year)
    .eq("period_month", month)
    .maybeSingle();
  if (error) {
    logQueryError("fetchMonthlyGoal", error);
    return null;
  }
  return data ? normalizeMonthlyGoal(data as MonthlyGoalRow) : null;
}

export function saleMySalesAmount(s: SaleRecordRow): number {
  const v = s.my_sales_amount ?? s.revenue;
  return v != null ? Number(v) : 0;
}

export async function fetchSalesForMonth(
  year: number,
  month: number,
): Promise<SaleRecordRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sales_records")
    .select("*")
    .eq("payment_year", year)
    .eq("payment_month", month)
    .order("fitted_date", { ascending: false });
  if (error) {
    logQueryError("fetchSalesForMonth", error);
    return [];
  }
  return (data ?? []) as SaleRecordRow[];
}

export async function fetchSalesForYear(year: number): Promise<SaleRecordRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sales_records")
    .select("*")
    .eq("payment_year", year)
    .order("payment_month")
    .order("fitted_date", { ascending: false });
  if (error) {
    logQueryError("fetchSalesForYear", error);
    return [];
  }
  return (data ?? []) as SaleRecordRow[];
}

export async function fetchMonthlyGoalsForYear(
  year: number,
): Promise<Map<number, MonthlyGoalRow>> {
  const supabase = getSupabase();
  const map = new Map<number, MonthlyGoalRow>();
  if (!supabase) return map;
  const { data, error } = await supabase
    .from("monthly_goals")
    .select("*")
    .eq("period_year", year);
  if (error) {
    logQueryError("fetchMonthlyGoalsForYear", error);
    return map;
  }
  for (const row of (data ?? []) as MonthlyGoalRow[]) {
    map.set(row.period_month, normalizeMonthlyGoal(row));
  }
  return map;
}

function normalizeMonthlyGoal(row: MonthlyGoalRow): MonthlyGoalRow {
  const accel = Number(row.accel_goal ?? 0);
  const physio = Number(row.physio_goal ?? 0);
  return { ...row, accel_goal: accel, physio_goal: physio };
}

function buildMonthSlices(
  goalsMap: Map<number, MonthlyGoalRow>,
  salesYear: SaleRecordRow[],
): MonthSalesSlice[] {
  const slices: MonthSalesSlice[] = [];
  for (let m = 1; m <= 12; m++) {
    const goal = goalsMap.get(m);
    const accelGoal = goal?.accel_goal ?? 0;
    const physioGoal = goal?.physio_goal ?? 0;
    const monthSales = salesYear.filter((s) => s.payment_month === m);
    const channel3pp = monthSales.filter(
      (s) => (s.channel ?? "3pp") !== "wholesale",
    );
    const wholesale = monthSales.filter((s) => s.channel === "wholesale");

    let accelSales = 0;
    let physioSales = 0;
    for (const s of channel3pp) {
      const amt = saleMySalesAmount(s);
      if (isAccelStimProduct(s.product)) accelSales += amt;
      else if (isPhysioStimProduct(s.product)) physioSales += amt;
    }
    const sales3pp = channel3pp.reduce((sum, s) => sum + saleMySalesAmount(s), 0);
    const wholesaleSales = wholesale.reduce(
      (sum, s) => sum + saleMySalesAmount(s),
      0,
    );

    slices.push({
      month: m,
      accelGoal,
      physioGoal,
      accelSales,
      physioSales,
      sales3pp,
      wholesaleSales,
    });
  }
  return slices;
}

export async function getMonthlyPerformance(
  year: number,
  month: number,
): Promise<MonthlyPerformance> {
  const [goalsMap, salesYear] = await Promise.all([
    fetchMonthlyGoalsForYear(year),
    fetchSalesForYear(year),
  ]);
  const slices = buildMonthSlices(goalsMap, salesYear);
  const slice = slices[month - 1] ?? slices[0];
  const breakdown = buildYearCommission(slices).get(month);

  const goalTotal = slice.accelGoal + slice.physioGoal;
  const sales3pp = slice.sales3pp;
  const bd = breakdown ?? {
    goalTotal,
    goalRatio: 0,
    pctOfGoal: 0,
    commissionRate: 8,
    commission3pp: 0,
    wholesalePayout: 0,
    trueUp: null,
    commissionPay: 0,
  };

  return {
    accelGoal: slice.accelGoal,
    physioGoal: slice.physioGoal,
    goalTotal,
    accelSales: slice.accelSales,
    physioSales: slice.physioSales,
    sales3pp,
    wholesaleSales: slice.wholesaleSales,
    pctOfGoal: bd.pctOfGoal,
    goalRatio: bd.goalRatio,
    commissionRate: bd.commissionRate,
    commission3pp: bd.commission3pp,
    wholesalePayout: bd.wholesalePayout,
    trueUp: bd.trueUp,
    commissionPay: bd.commissionPay,
    dollarsToGoal: Math.max(0, goalTotal - sales3pp),
    unitGoal: goalTotal,
    unitActual: sales3pp,
    commissionAmount: bd.commission3pp,
    unitsRemaining: Math.max(0, goalTotal - sales3pp),
    revenueActual: sales3pp > 0 ? sales3pp : null,
    pctToGoal: bd.pctOfGoal,
  };
}

export async function fetchRecentOrders(limit = 30): Promise<OrderRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("ordered_at", { ascending: false })
    .limit(limit);
  if (error) {
    logQueryError("fetchRecentOrders", error);
    return [];
  }
  return (data ?? []) as OrderRow[];
}

export function getSetupStatus() {
  return {
    supabase: isSupabaseConfigured(),
  };
}

export async function fetchInventoryItems(): Promise<InventoryItemRow[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return DEFAULT_INVENTORY_IDS.map((stimId) => ({
      stim_id: stimId,
      quantity: 0,
    }));
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("stim_id");

  if (error) {
    logQueryError("fetchInventoryItems", error);
    return DEFAULT_INVENTORY_IDS.map((stimId) => ({
      stim_id: stimId,
      quantity: 0,
    }));
  }

  const existing = (data ?? []) as InventoryItemRow[];
  const byId = new Map(existing.map((item) => [item.stim_id, item]));

  return DEFAULT_INVENTORY_IDS.map((stimId) => {
    const row = byId.get(stimId);
    return {
      stim_id: stimId,
      quantity: row?.quantity ?? 0,
      updated_at: row?.updated_at,
    };
  });
}
