import Link from "next/link";
import {
  expectedCollectedTotal,
  isOrderClosed,
  sumPayments,
} from "@/lib/orders";
import type { OrderRow, SaleRecordRow } from "@/lib/types";

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stageLabel(order: OrderRow) {
  if (order.pipeline_stage === "lost") return "Lost";
  if (isOrderClosed(order)) return "Closed";
  if (order.pipeline_stage === "fitted" || order.fitted_at) return "Fitted";
  return "Open";
}

export function DoctorOrdersSection({
  orders,
  paymentsByOrderId,
}: {
  orders: OrderRow[];
  paymentsByOrderId: Record<string, SaleRecordRow[]>;
}) {
  return (
    <section className="rounded-xl border border-violet-200 bg-fuchsia-50 p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Orders</h2>
          <p className="mt-1 text-xs text-violet-700 dark:text-slate-400">
            Patient orders for this prescriber.
          </p>
        </div>
        <Link
          href="/sales"
          className="shrink-0 text-xs text-brand-600 hover:underline"
        >
          Sales tab →
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-violet-700 dark:text-slate-400">
          No orders yet for this doctor.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {orders.map((order) => {
            const payments = paymentsByOrderId[order.id] ?? [];
            const collected = sumPayments(payments);
            const expected = expectedCollectedTotal(order);
            const remaining = Math.max(0, expected - collected);

            return (
              <li
                key={order.id}
                className="rounded-lg border border-violet-100 bg-white/60 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/sales#order-${order.id}`}
                      className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {order.patient_label ?? "Patient"}
                    </Link>
                    <p className="mt-0.5 text-xs text-violet-700 dark:text-slate-400">
                      {stageLabel(order)} · {order.product ?? "—"} ·{" "}
                      {order.channel === "wholesale" ? "Wholesale" : "3PP"}
                    </p>
                    <p className="mt-1 text-xs text-violet-800 dark:text-slate-300">
                      Entered {dateLabel(order.ordered_at)}
                      {order.fitted_at
                        ? ` · Fitting ${dateLabel(order.fitted_at)}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-violet-800 dark:text-slate-300">
                      Expected {money(expected)} · Collected {money(collected)}
                      {remaining > 0 ? ` · Remaining ${money(remaining)}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/sales#order-${order.id}`}
                    className="shrink-0 text-xs text-brand-600 hover:underline"
                  >
                    Open
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
