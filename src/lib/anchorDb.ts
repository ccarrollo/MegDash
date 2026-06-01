import { mealFieldsForDb, type MealAnchorInput } from "./mealAnchor";

/** Row shape for daily_plan_anchors insert — omits columns absent on older DBs when unset. */
export function buildAnchorInsertRow(input: {
  planDate: string;
  doctorId?: string | null;
  facilityId?: string | null;
  anchorTime?: string | null;
  anchorType: string;
  label?: string | null;
  orderId?: string | null;
  patientName?: string | null;
  manualAddress?: string | null;
  meal?: MealAnchorInput;
  sortOrder: number;
}): Record<string, string | number | null> {
  const row: Record<string, string | number | null> = {
    plan_date: input.planDate,
    doctor_id: input.doctorId ?? null,
    facility_id: input.facilityId ?? null,
    anchor_time: input.anchorTime ?? null,
    anchor_type: input.anchorType,
    label: input.label ?? null,
    sort_order: input.sortOrder,
  };

  if (input.orderId) row.order_id = input.orderId;
  const patient = input.patientName?.trim();
  if (patient) row.patient_name = patient;
  const address = input.manualAddress?.trim();
  if (address) row.manual_address = address;

  if (input.meal) {
    Object.assign(row, mealFieldsForDb(input.meal));
  }

  return row;
}
