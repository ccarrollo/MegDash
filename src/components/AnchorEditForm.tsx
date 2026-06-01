"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { anchorTimeValue } from "@/lib/anchorEdit";
import {
  findMealAnchorSiblings,
  siblingDbIds,
  siblingDoctorIds,
} from "@/lib/anchorGroup";
import { isMealAnchorType } from "@/lib/mealAnchor";
import type { DayAnchorRow, DoctorRow, FacilityRow } from "@/lib/types";
import { AnchorFacilityDoctorPicker } from "./AnchorFacilityDoctorPicker";
import { AnchorMealFields } from "./AnchorMealFields";

export function AnchorEditForm({
  anchor,
  dayAnchors,
  doctors,
  facilities,
  onClose,
}: {
  anchor: DayAnchorRow;
  dayAnchors: DayAnchorRow[];
  doctors: DoctorRow[];
  facilities: FacilityRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const siblings = useMemo(
    () => findMealAnchorSiblings(dayAnchors, anchor),
    [dayAnchors, anchor],
  );
  const isMeal = isMealAnchorType(anchor.anchor_type);
  const isFitting = anchor.anchor_type === "fitting";
  const isLegacyLunch = Boolean(anchor.lunch_id);
  const isDbMealGroup =
    isMeal && !isLegacyLunch && siblingDbIds(siblings).length > 0;
  const planDate = anchor.plan_date.slice(0, 10);

  const initialFacilityId = useMemo(() => {
    const fromAnchor = anchor.facility_id;
    if (fromAnchor) return fromAnchor;
    const docId = anchor.doctor_id ?? siblingDoctorIds(siblings)[0];
    return doctors.find((d) => d.id === docId)?.facility_id ?? "";
  }, [anchor, doctors, siblings]);

  const [saving, setSaving] = useState(false);
  const [anchorTime, setAnchorTime] = useState(anchorTimeValue(anchor));
  const [label, setLabel] = useState(anchor.label ?? "");
  const [facilityId, setFacilityId] = useState(initialFacilityId);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>(() =>
    siblingDoctorIds(siblings).length > 0
      ? siblingDoctorIds(siblings)
      : anchor.doctor_id
        ? [anchor.doctor_id]
        : [],
  );
  const [restaurant, setRestaurant] = useState(anchor.restaurant ?? "");
  const [headcount, setHeadcount] = useState(
    anchor.headcount != null ? String(anchor.headcount) : "",
  );
  const [totalCost, setTotalCost] = useState(
    anchor.total_cost != null ? String(anchor.total_cost) : "",
  );
  const [foodNotes, setFoodNotes] = useState(anchor.food_notes ?? "");
  const [interactionNotes, setInteractionNotes] = useState(
    anchor.interaction_notes ?? "",
  );
  const [patientName, setPatientName] = useState(anchor.patient_name ?? "");
  const [manualAddress, setManualAddress] = useState(anchor.manual_address ?? "");

  useEffect(() => {
    setAnchorTime(anchorTimeValue(anchor));
    setLabel(anchor.label ?? "");
    setFacilityId(initialFacilityId);
    setSelectedDoctorIds(
      siblingDoctorIds(siblings).length > 0
        ? siblingDoctorIds(siblings)
        : anchor.doctor_id
          ? [anchor.doctor_id]
          : [],
    );
    setRestaurant(anchor.restaurant ?? "");
    setHeadcount(anchor.headcount != null ? String(anchor.headcount) : "");
    setTotalCost(anchor.total_cost != null ? String(anchor.total_cost) : "");
    setFoodNotes(anchor.food_notes ?? "");
    setInteractionNotes(anchor.interaction_notes ?? "");
    setPatientName(anchor.patient_name ?? "");
    setManualAddress(anchor.manual_address ?? "");
  }, [anchor, siblings, initialFacilityId]);

  async function save() {
    if ((isMeal || isLegacyLunch) && (!facilityId || selectedDoctorIds.length === 0)) {
      alert("Pick a facility and at least one doctor.");
      return;
    }
    if (isFitting && !anchor.order_id && selectedDoctorIds.length === 0 && !manualAddress.trim()) {
      alert("Pick a doctor or enter a fitting address.");
      return;
    }

    setSaving(true);
    try {
      if (isLegacyLunch && anchor.lunch_id) {
        const doctorId = selectedDoctorIds[0];
        const res = await fetch(`/api/lunches/${anchor.lunch_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startTime: anchorTime || "12:00",
            doctorId,
            facilityId: facilityId || null,
            restaurant: restaurant.trim() || null,
            lunchOrder: restaurant.trim() || null,
            foodNotes: foodNotes.trim() || null,
            interactionNotes: interactionNotes.trim() || null,
            headcount: headcount ? parseInt(headcount, 10) : null,
            totalCost: totalCost ? parseFloat(totalCost) : null,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Save failed");
      } else if (isFitting && anchor.order_id) {
        const res = await fetch(`/api/orders/${anchor.order_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fittedAt: `${planDate}T${anchorTime || "12:00"}`,
            patientLabel: patientName.trim() || null,
            fittingAddress: manualAddress.trim() || null,
            doctorId: selectedDoctorIds[0] || null,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Save failed");
      } else if (isDbMealGroup || (isMeal && !anchor.id.startsWith("auto-"))) {
        const res = await fetch("/api/day-anchors/sync", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planDate,
            anchorType: anchor.anchor_type,
            facilityId,
            doctorIds: selectedDoctorIds,
            anchorIds: siblingDbIds(siblings),
            anchorTime: anchorTime || null,
            label: label.trim() || null,
            restaurant: restaurant.trim() || null,
            foodNotes: foodNotes.trim() || null,
            interactionNotes: interactionNotes.trim() || null,
            headcount: headcount || null,
            totalCost: totalCost || null,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Save failed");
      } else {
        const res = await fetch(`/api/day-anchors/${anchor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anchorTime: anchorTime || null,
            label: label.trim() || null,
            restaurant: restaurant.trim() || null,
            foodNotes: foodNotes.trim() || null,
            interactionNotes: interactionNotes.trim() || null,
            headcount: headcount || null,
            totalCost: totalCost || null,
            patientName: patientName.trim() || null,
            manualAddress: manualAddress.trim() || null,
            doctorId: selectedDoctorIds[0] || null,
            facilityId: facilityId || null,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Save failed");
      }
      onClose();
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not save anchor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-violet-100 pt-3 dark:border-slate-800">
      <p className="mb-2 text-xs text-violet-700 dark:text-slate-400">
        <span className="font-medium capitalize">{anchor.anchor_type}</span>
        {isDbMealGroup && siblings.length > 1
          ? ` · editing ${siblings.length} doctors at this stop`
          : null}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-violet-700 dark:text-slate-400">
          Time
          <input
            type="time"
            value={anchorTime}
            onChange={(e) => setAnchorTime(e.target.value)}
            className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        {!isFitting && (
          <label className="text-xs text-violet-700 dark:text-slate-400">
            Label
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional"
              className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
            />
          </label>
        )}
      </div>

      {(isMeal || isLegacyLunch || isFitting) && (
        <div className="mt-3">
          <AnchorFacilityDoctorPicker
            facilities={facilities}
            doctors={doctors}
            facilityId={facilityId}
            onFacilityIdChange={setFacilityId}
            selectedDoctorIds={selectedDoctorIds}
            onSelectedDoctorIdsChange={setSelectedDoctorIds}
            singleDoctor={isFitting || isLegacyLunch}
          />
        </div>
      )}

      {isFitting && (
        <div className="mt-2 grid gap-2">
          <label className="text-xs text-violet-700 dark:text-slate-400">
            Patient name
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-violet-700 dark:text-slate-400">
            Fitting address
            <input
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
            />
          </label>
        </div>
      )}

      {(isMeal || isLegacyLunch) && (
        <div className="mt-2">
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
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          className="rounded border border-violet-200 px-3 py-1.5 text-xs dark:border-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
