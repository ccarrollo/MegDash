import { mergeLunchAnchors } from "./anchors";
import { resolveFittingFields } from "./fittingAnchor";
import {
  buildYearCommission,
  isAccelStimProduct,
  isPhysioStimProduct,
  type MonthSalesSlice,
} from "./commission";
import { planDateIso } from "./dateUtils";
import { assignStopTimes } from "./schedule";
import { buildScheduledStops, buildSuggestedProspects } from "./planner";
import { isArchivedDoctor } from "./doctorStatus";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type {
  DayAnchorRow,
  DayPlanSettings,
  DoctorDayNoteRow,
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
const DEFAULT_INVENTORY_IDS = [
  "AccelStim",
  "5313",
  "5314",
  "5315",
  "5302",
  "5303",
];

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
    .order("name", { ascending: true });

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

export async function fetchDoctorDayNotes(
  doctorId: string,
): Promise<DoctorDayNoteRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("doctor_day_notes")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("note_date", { ascending: false });
  if (error) {
    logQueryError("fetchDoctorDayNotes", error);
    return [];
  }
  return (data ?? []) as DoctorDayNoteRow[];
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

export async function fetchDoctorOrders(doctorId: string): Promise<OrderRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("ordered_at", { ascending: false });
  if (error) {
    logQueryError("fetchDoctorOrders", error);
    return [];
  }
  return (data ?? []) as OrderRow[];
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

export async function fetchAllDayAnchors(): Promise<DayAnchorRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("daily_plan_anchors")
    .select("*")
    .order("plan_date", { ascending: false })
    .order("sort_order", { ascending: true });
  if (error) {
    logQueryError("fetchAllDayAnchors", error);
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
    const fitting =
      a.anchor_type === "fitting" ? resolveFittingFields(a) : null;
    const patientName = fitting?.patientName ?? a.patient_name ?? null;
    const manualAddress = fitting?.manualAddress ?? a.manual_address ?? null;
    return {
      ...a,
      label: fitting?.label ?? a.label ?? null,
      patient_name: patientName,
      manual_address: manualAddress,
      doctor_name: d?.name ?? a.doctor_name ?? null,
      facility_name:
        d?.facility_name ??
        (a.anchor_type === "fitting" ? "Home fitting" : null),
      address: manualAddress ?? d?.address ?? null,
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
    .neq("is_date_tbd", true)
    .neq("status", "cancelled")
    .order("start_time", { ascending: true });
  if (error) {
    logQueryError("fetchLunchesOnDate", error);
    return [];
  }
  return (data ?? []) as LunchRow[];
}

export async function fetchFittingExclusions(planDate: string): Promise<Set<string>> {
  const supabase = getSupabase();
  if (!supabase) return new Set();
  const { data, error } = await supabase
    .from("plan_fitting_exclusions")
    .select("order_id")
    .eq("plan_date", planDate);
  if (error) {
    logQueryError("fetchFittingExclusions", error);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.order_id as string));
}

export async function fetchFittingsOnDate(
  planDate: string,
  excludedOrderIds?: Set<string>,
) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const fromIso = `${planDate}T00:00:00`;
  const toIso = `${planDate}T23:59:59`;
  const { data, error } = await supabase
    .from("orders")
    .select("id,doctor_id,facility_id,patient_label,fitting_address,fitted_at,pipeline_stage")
    .gte("fitted_at", fromIso)
    .lte("fitted_at", toIso)
    .not("fitted_at", "is", null)
    .neq("pipeline_stage", "lost")
    .order("fitted_at", { ascending: true });
  if (error) {
    logQueryError("fetchFittingsOnDate", error);
    return [];
  }
  const excluded = excludedOrderIds ?? new Set<string>();
  return (data ?? []).filter((row) => row.fitted_at && !excluded.has(row.id)) as {
    id: string;
    doctor_id: string | null;
    facility_id: string | null;
    patient_label: string | null;
    fitting_address: string | null;
    fitted_at: string;
  }[];
}

export async function fetchMonthAnchorSummary(planDate: string): Promise<
  Record<string, Array<"lunch" | "coffee" | "fitting">>
> {
  const supabase = getSupabase();
  if (!supabase) return {};
  const [y, m] = planDate.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(y, m, 0));
  const end = `${y}-${String(m).padStart(2, "0")}-${String(
    endDate.getUTCDate(),
  ).padStart(2, "0")}`;

  const out = new Map<string, Set<"lunch" | "coffee" | "fitting">>();
  const add = (date: string, kind: "lunch" | "coffee" | "fitting") => {
    if (!out.has(date)) out.set(date, new Set());
    out.get(date)!.add(kind);
  };

  const { data: anchors } = await supabase
    .from("daily_plan_anchors")
    .select("plan_date,anchor_type")
    .gte("plan_date", start)
    .lte("plan_date", end);
  for (const a of anchors ?? []) {
    const kind =
      a.anchor_type === "coffee"
        ? "coffee"
        : a.anchor_type === "fitting"
          ? "fitting"
          : a.anchor_type === "lunch"
            ? "lunch"
            : null;
    if (kind) add(String(a.plan_date).slice(0, 10), kind);
  }

  const { data: lunches } = await supabase
    .from("lunches")
    .select("lunch_date,status,is_date_tbd")
    .gte("lunch_date", start)
    .lte("lunch_date", end)
    .neq("status", "cancelled")
    .neq("is_date_tbd", true);
  for (const l of lunches ?? []) add(String(l.lunch_date).slice(0, 10), "lunch");

  const { data: fittings } = await supabase
    .from("orders")
    .select("fitted_at,pipeline_stage")
    .gte("fitted_at", `${start}T00:00:00`)
    .lte("fitted_at", `${end}T23:59:59`)
    .not("fitted_at", "is", null)
    .neq("pipeline_stage", "lost");
  for (const f of fittings ?? []) {
    if (!f.fitted_at) continue;
    add(String(f.fitted_at).slice(0, 10), "fitting");
  }

  return Object.fromEntries(
    Array.from(out.entries()).map(([date, kinds]) => [date, Array.from(kinds)]),
  ) as Record<string, Array<"lunch" | "coffee" | "fitting">>;
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
  const [doctors, rawAnchors, lunchesOnDate, fittingExclusions, overrides, settings] =
    await Promise.all([
      fetchDoctors(),
      fetchDayAnchors(date),
      fetchLunchesOnDate(date),
      fetchFittingExclusions(date),
      fetchStopTimeOverrides(date),
      fetchPlanSettings(date),
    ]);
  const fittingsOnDate = await fetchFittingsOnDate(date, fittingExclusions);

  const mergedAnchors = mergeLunchAnchors(
    rawAnchors,
    lunchesOnDate,
    fittingsOnDate,
    doctors,
    date,
    fittingExclusions,
  );
  const anchors = enrichAnchors(mergedAnchors, doctors);
  const count = prospectCount ?? settings.prospect_count ?? DEFAULT_PROSPECT_COUNT;
  const suggestionEligibleDoctors = doctors.filter(
    (d) => !d.daily_queue_hidden && !isArchivedDoctor(d.status),
  );

  const manualRows = await fetchManualPlanStops(date);
  const scheduled = buildScheduledStops(doctors, anchors, {
    planDate: date,
    lunchesOnDate,
  });
  const anchorZone = scheduled.anchorZone;
  const scheduledIds = new Set(scheduled.stops.map((s) => s.doctorId));
  const manualStops = manualStopsToPlanned(manualRows, doctors, date).filter(
    (s) => !scheduledIds.has(s.doctorId),
  );
  const stops = [...scheduled.stops, ...manualStops];

  const planDoctorIds = new Set(stops.map((s) => s.doctorId));
  const { suggestions } = buildSuggestedProspects(
    suggestionEligibleDoctors,
    anchors,
    {
      planDate: date,
      lunchesOnDate,
      prospectCount: count,
      excludeDoctorIds: planDoctorIds,
    },
  );

  const timedStops = assignStopTimes(stops, overrides);
  return {
    anchorZone,
    planDate: date,
    stops: timedStops,
    suggestions,
    doctors,
    anchors,
    prospectCount: count,
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
    .order("payment_month", { ascending: false })
    .order("fitted_date", { ascending: false });
  if (error) {
    logQueryError("fetchSalesForYear", error);
    return [];
  }
  return (data ?? []) as SaleRecordRow[];
}

export async function fetchAllSales(limit = 500): Promise<SaleRecordRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sales_records")
    .select("*")
    .order("payment_year", { ascending: false })
    .order("payment_month", { ascending: false })
    .order("fitted_date", { ascending: false })
    .limit(limit);
  if (error) {
    logQueryError("fetchAllSales", error);
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
  const wholesale = Number(row.wholesale_sales ?? 0);
  return { ...row, accel_goal: accel, physio_goal: physio, wholesale_sales: wholesale };
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
    const wholesaleSalesFromRecords = wholesale.reduce(
      (sum, s) => sum + saleMySalesAmount(s),
      0,
    );
    const wholesaleManual = Number(goal?.wholesale_sales ?? 0);
    const wholesaleSales = wholesaleSalesFromRecords + wholesaleManual;

    slices.push({
      month: m,
      accelGoal,
      physioGoal,
      accelSales,
      physioSales,
      sales3pp,
      wholesaleSales,
      wholesaleFromRecords: wholesaleSalesFromRecords,
      wholesaleManual,
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
    wholesaleFromRecords: slice.wholesaleFromRecords ?? 0,
    wholesaleManual: slice.wholesaleManual ?? 0,
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

export async function fetchPaymentsForOrders(
  orderIds: string[],
): Promise<Map<string, SaleRecordRow[]>> {
  const map = new Map<string, SaleRecordRow[]>();
  const supabase = getSupabase();
  if (!supabase || orderIds.length === 0) return map;

  const { data, error } = await supabase
    .from("sales_records")
    .select("*")
    .in("order_id", orderIds)
    .order("payment_year", { ascending: true })
    .order("payment_month", { ascending: true });

  if (error) {
    logQueryError("fetchPaymentsForOrders", error);
    return map;
  }

  for (const row of (data ?? []) as SaleRecordRow[]) {
    if (!row.order_id) continue;
    const list = map.get(row.order_id) ?? [];
    list.push(row);
    map.set(row.order_id, list);
  }
  return map;
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
