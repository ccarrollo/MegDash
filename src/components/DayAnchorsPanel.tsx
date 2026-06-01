"use client";

import { ANCHOR_TYPES } from "@/lib/constants";
import { isMealAnchorType } from "@/lib/mealAnchor";
import type { DayAnchorRow, DoctorRow, FacilityRow } from "@/lib/types";
import { AnchorListItem } from "./AnchorListItem";
import { AnchorMealFields } from "./AnchorMealFields";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function DayAnchorsPanel({
  anchors,
  doctors,
  facilities,
  planDate,
}: {
  anchors: DayAnchorRow[];
  doctors: DoctorRow[];
  facilities: FacilityRow[];
  planDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [doctorQuery, setDoctorQuery] = useState("");
  const [anchorTime, setAnchorTime] = useState("08:00");
  const [anchorType, setAnchorType] = useState("coffee");
  const [label, setLabel] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [foodNotes, setFoodNotes] = useState("");
  const [interactionNotes, setInteractionNotes] = useState("");
  const [patientName, setPatientName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const manualAnchors = anchors.filter((a) => !a.is_auto);
  const autoAnchors = anchors.filter((a) => a.is_auto);
  const filteredDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) =>
      `${d.name} ${d.facility_name}`.toLowerCase().includes(q),
    );
  }, [doctorQuery, doctors]);

  async function addAnchor() {
    if (!doctorId && !(anchorType === "fitting" && manualAddress.trim())) {
      alert("Pick a doctor, or enter a manual fitting address.");
      return;
    }
    const doctor = doctors.find((d) => d.id === doctorId);
    setLoading(true);
    try {
      const res = await fetch("/api/day-anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDate,
          doctorId: doctorId || null,
          facilityId: doctor?.facility_id ?? null,
          anchorTime: anchorTime || null,
          anchorType,
          label: label.trim() || null,
          patientName: patientName.trim() || null,
          manualAddress: manualAddress.trim() || null,
          restaurant: restaurant.trim() || null,
          foodNotes: foodNotes.trim() || null,
          interactionNotes: interactionNotes.trim() || null,
          headcount: headcount || null,
          totalCost: totalCost || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setDoctorId("");
      setLabel("");
      setRestaurant("");
      setHeadcount("");
      setTotalCost("");
      setFoodNotes("");
      setInteractionNotes("");
      setPatientName("");
      setManualAddress("");
      setOpen(false);
      router.refresh();
    } catch {
      alert("Could not add anchor.");
    } finally {
      setLoading(false);
    }
  }

  async function removeAnchorRow(anchor: DayAnchorRow) {
    if (!window.confirm("Remove this anchor from the plan?")) return;
    setLoading(true);
    try {
      if (anchor.lunch_id || (anchor.anchor_type === "lunch" && anchor.doctor_id)) {
        const res = await fetch("/api/plan/lunches", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planDate,
            doctorId: anchor.doctor_id ?? undefined,
            lunchId: anchor.lunch_id ?? undefined,
          }),
        });
        if (!res.ok) throw new Error("Failed");
      } else if (anchor.order_id && anchor.is_auto) {
        const res = await fetch("/api/plan/fittings", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planDate,
            orderId: anchor.order_id,
            anchorId: anchor.id.startsWith("auto-") ? undefined : anchor.id,
          }),
        });
        if (!res.ok) throw new Error("Failed");
      } else if (!anchor.id.startsWith("auto-")) {
        const res = await fetch(`/api/day-anchors/${anchor.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed");
      } else {
        throw new Error("Failed");
      }
      router.refresh();
    } catch {
      alert("Could not remove anchor.");
    } finally {
      setLoading(false);
    }
  }

  async function removeFittingFromPlan(anchor: DayAnchorRow) {
    if (!window.confirm("Remove this fitting from the day plan?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/plan/fittings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDate,
          orderId: anchor.order_id ?? undefined,
          anchorId: anchor.id,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      alert("Could not remove fitting from plan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">Day anchors</h2>
          <p className="mt-1 text-xs text-violet-700 dark:text-slate-400">
            Lunches on this date appear here automatically. Add coffee or extra
            office stops manually.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="shrink-0 rounded-lg border border-violet-300 dark:border-slate-600 px-3 py-1.5 text-sm text-violet-900 dark:text-slate-300"
        >
          {open ? "Cancel" : "+ Anchor"}
        </button>
      </div>

      {autoAnchors.length > 0 && (
        <ul className="mt-3 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-300">
            From schedule
          </p>
          {autoAnchors.map((a) => (
            <AnchorListItem
              key={a.id}
              anchor={a}
              dayAnchors={anchors}
              doctors={doctors}
              facilities={facilities}
              className="rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/80"
              removing={loading}
              onRemove={() => void removeAnchorRow(a)}
            />
          ))}
        </ul>
      )}

      {manualAnchors.length > 0 && (
        <ul className="mt-3 space-y-2">
          {manualAnchors.length > 0 && autoAnchors.length > 0 && (
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-slate-400">
              Manual
            </p>
          )}
          {manualAnchors.map((a) => (
            <AnchorListItem
              key={a.id}
              anchor={a}
              dayAnchors={anchors}
              doctors={doctors}
              facilities={facilities}
              className="rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-800"
              removing={loading}
              onRemove={() =>
                a.anchor_type === "fitting" && a.order_id
                  ? void removeFittingFromPlan(a)
                  : void removeAnchorRow(a)
              }
            />
          ))}
        </ul>
      )}

      {anchors.length === 0 && (
        <p className="mt-2 text-sm text-violet-700 dark:text-slate-400">
          No anchors — schedule a lunch on a doctor profile for this date.
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-2 border-t border-violet-100 dark:border-slate-800 pt-4">
          <input
            value={doctorQuery}
            onChange={(e) => setDoctorQuery(e.target.value)}
            placeholder="Search doctors…"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Select doctor…</option>
            {filteredDoctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.facility_name}
              </option>
            ))}
          </select>
          {anchorType === "fitting" && (
            <>
              <input
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Patient name (optional)"
                className="w-full rounded border px-3 py-2 text-sm"
              />
              <input
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Manual fitting address (required if no doctor)"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={anchorType}
              onChange={(e) => setAnchorType(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            >
              {ANCHOR_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={anchorTime}
              onChange={(e) => setAnchorTime(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            />
          </div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Optional label"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          {isMealAnchorType(anchorType) && (
            <AnchorMealFields
              restaurant={restaurant}
              onRestaurantChange={setRestaurant}
              headcount={headcount}
              onHeadcountChange={setHeadcount}
              totalCost={totalCost}
              onTotalCostChange={setTotalCost}
              foodNotes={foodNotes}
              onFoodNotesChange={setFoodNotes}
              interactionNotes={interactionNotes}
              onInteractionNotesChange={setInteractionNotes}
            />
          )}
          <button
            type="button"
            disabled={loading}
            onClick={addAnchor}
            className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Add anchor
          </button>
        </div>
      )}
    </section>
  );
}
