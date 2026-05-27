export type TerritoryZone =
  | "austin_core"
  | "north_nw"
  | "south_i35"
  | "east"
  | "waco_central"
  | "west_rural"
  | "unknown";

export type DoctorRow = {
  id: string;
  facility_id: string;
  name: string;
  primary_focus: string | null;
  status: string;
  priority: string;
  decision_makers: string | null;
  other_names: string | null;
  lunch_scheduled: boolean;
  lunch_date: string | null;
  follow_up_date: string | null;
  order_history: string | null;
  front_desk_notes: string | null;
  competitor_notes: string | null;
  follow_up_lunch: string | null;
  interaction_notes?: string | null;
  facility_name: string;
  address: string;
  city: string | null;
  location_label: string | null;
  zone: TerritoryZone;
  lat: number | null;
  lng: number | null;
  facility_office_vibe?: string | null;
  last_visit_at: string | null;
  last_activity_at?: string | null;
  is_last_visit_overridden?: boolean;
  manual_last_visit_date?: string | null;
  days_since_visit: number | null;
  days_since_activity?: number | null;
};

export type PlannedStop = {
  doctorId: string;
  doctorName: string;
  facilityName: string;
  address: string;
  zone: TerritoryZone;
  reason: string;
  kind: "lunch" | "visit" | "follow_up" | "coffee" | "office";
  scheduledTime?: string | null;
  suggestedStartTime?: string | null;
  suggestedEndTime?: string | null;
  timeOverrideId?: string;
  anchorId?: string;
  lunchId?: string;
  dayPeriod?: "morning" | "afternoon";
  score: number;
  isManual?: boolean;
};

export type StopTimeOverride = {
  id: string;
  plan_date: string;
  doctor_id: string;
  stop_kind: string;
  start_time: string;
  end_time: string | null;
};

export type MonthlyGoalRow = {
  period_year: number;
  period_month: number;
  unit_goal: number;
  accel_goal: number;
  physio_goal: number;
  revenue_per_unit: number | null;
  notes: string | null;
};

export type SalesChannel = "3pp" | "wholesale";

export type OrderRow = {
  id: string;
  doctor_id: string | null;
  facility_id: string | null;
  visit_id: string | null;
  ordered_at: string;
  product: string | null;
  status: string;
  pipeline_stage: string;
  patient_label: string | null;
  fitted_at: string | null;
  payment_year: number | null;
  payment_month: number | null;
  insurance_notes: string | null;
  counts_as_sale: boolean;
  notes: string | null;
  amount: number | null;
  my_sales_amount: number | null;
  channel: string | null;
  actual_cost: number | null;
  insurance: string | null;
  affected_bone: string | null;
  source: string;
  doctor_name?: string | null;
  facility_name?: string | null;
};

export type SaleRecordRow = {
  id: string;
  order_id: string | null;
  doctor_id: string | null;
  facility_id: string | null;
  patient_label: string | null;
  order_date: string | null;
  fitted_date: string | null;
  payment_year: number;
  payment_month: number;
  revenue: number | null;
  my_sales_amount: number | null;
  channel: SalesChannel | string;
  actual_cost: number | null;
  insurance: string | null;
  affected_bone: string | null;
  product: string | null;
  notes: string | null;
  doctor_name?: string | null;
  facility_name?: string | null;
};

export type MonthlyPerformance = {
  accelGoal: number;
  physioGoal: number;
  goalTotal: number;
  accelSales: number;
  physioSales: number;
  sales3pp: number;
  wholesaleSales: number;
  pctOfGoal: number;
  goalRatio: number;
  commissionRate: number;
  commission3pp: number;
  wholesalePayout: number;
  trueUp: number | null;
  commissionPay: number;
  dollarsToGoal: number;
  /** @deprecated use sales3pp */
  unitActual: number;
  /** @deprecated use goalTotal */
  unitGoal: number;
  /** @deprecated use commission3pp */
  commissionAmount: number | null;
  unitsRemaining: number;
  revenueActual: number | null;
  pctToGoal: number;
};

export type DayAnchorRow = {
  id: string;
  plan_date: string;
  doctor_id: string | null;
  facility_id: string | null;
  anchor_time: string | null;
  anchor_type: string;
  label: string | null;
  sort_order: number;
  is_auto?: boolean;
  lunch_id?: string | null;
  doctor_name?: string | null;
  facility_name?: string | null;
  address?: string | null;
  zone?: TerritoryZone | null;
};

export type FacilityRow = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  location_label: string | null;
  zone: TerritoryZone;
  office_vibe?: string | null;
};

export type VisitRow = {
  id: string;
  doctor_id: string;
  visited_at: string;
  outcome: string;
  note: string | null;
};

export type NoteRow = {
  id: string;
  doctor_id: string;
  body: string;
  category?: string | null;
  created_at: string;
};

export type DayPlanSettings = {
  plan_date: string;
  prospect_count: number;
  auto_suggestions?: boolean;
};

export type ManualPlanStopRow = {
  id: string;
  plan_date: string;
  doctor_id: string;
  kind: string;
  sort_order: number;
  day_period: string | null;
};

export type InventoryItemRow = {
  stim_id: string;
  quantity: number;
  updated_at?: string;
};

export type LunchWithDoctor = LunchRow & {
  doctor_name?: string | null;
  facility_name?: string | null;
};

export type LunchRow = {
  id: string;
  doctor_id: string | null;
  facility_id: string | null;
  lunch_date: string;
  start_time: string | null;
  headcount: number | null;
  food_notes: string | null;
  lunch_order: string | null;
  restaurant: string | null;
  total_cost: number | null;
  cost_per_head: number | null;
  interaction_notes: string | null;
  status: string;
  created_at: string;
};
