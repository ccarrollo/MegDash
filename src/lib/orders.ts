import type { OrderRow, SaleRecordRow } from "./types";

export const CLOSED_PIPELINE_STAGES = new Set(["paid", "lost", "closed"]);

export function isOrderClosed(order: Pick<OrderRow, "pipeline_stage">): boolean {
  return CLOSED_PIPELINE_STAGES.has(order.pipeline_stage);
}

export function paymentAmount(p: SaleRecordRow): number {
  return Number(p.my_sales_amount ?? p.revenue ?? 0);
}

/** Currency display; negative amounts show as refunds (e.g. −$50). */
export function formatPaymentMoney(n: number): string {
  const abs = Math.abs(n);
  const formatted = `$${abs.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
  if (n < 0) return `−${formatted}`;
  return formatted;
}

export function sumPayments(payments: SaleRecordRow[]): number {
  return payments.reduce((sum, p) => sum + paymentAmount(p), 0);
}

export function sumPaymentsBySource(
  payments: SaleRecordRow[],
  source: "insurance" | "patient",
): number {
  return payments
    .filter((p) => (p.payment_source ?? "") === source)
    .reduce((sum, p) => sum + paymentAmount(p), 0);
}

export function expectedCollectedTotal(order: OrderRow): number {
  const insurance = Number(order.insurance_expected ?? 0);
  const patient = Number(order.patient_responsibility_total ?? 0);
  if (insurance > 0 || patient > 0) return insurance + patient;
  return Number(order.order_total ?? 0);
}
