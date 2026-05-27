import type { PlannedStop } from "@/lib/types";
import { ZONE_LABELS } from "@/lib/zones";
import { LogVisitForm } from "./LogVisitForm";

const kindStyles: Record<PlannedStop["kind"], string> = {
  lunch: "bg-emerald-100 text-emerald-800",
  visit: "bg-brand-100 text-brand-700",
  follow_up: "bg-orange-100 text-orange-800",
};

export function StopCard({ stop }: { stop: PlannedStop }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${kindStyles[stop.kind]}`}
          >
            {stop.kind === "lunch"
              ? "Lunch"
              : stop.kind === "follow_up"
                ? "Follow-up"
                : "Visit"}
          </span>
          <h2 className="mt-1 text-lg font-semibold">{stop.doctorName}</h2>
          <p className="text-sm text-slate-600">{stop.facilityName}</p>
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {ZONE_LABELS[stop.zone]}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-500">{stop.reason}</p>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block text-sm font-medium text-brand-600 underline-offset-2 hover:underline"
      >
        {stop.address}
      </a>

      {stop.kind !== "lunch" && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <LogVisitForm doctorId={stop.doctorId} doctorName={stop.doctorName} />
        </div>
      )}
    </article>
  );
}
