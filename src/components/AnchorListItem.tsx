"use client";

import { useMemo, useState } from "react";
import { anchorCanEdit } from "@/lib/anchorEdit";
import {
  findMealAnchorSiblings,
  formatDoctorNames,
} from "@/lib/anchorGroup";
import { isMealAnchorType } from "@/lib/mealAnchor";
import { formatTime12 } from "@/lib/schedule";
import type { DayAnchorRow, DoctorRow, FacilityRow } from "@/lib/types";
import { AnchorEditForm } from "./AnchorEditForm";
import { AnchorMealSummary } from "./AnchorMealSummary";

export function AnchorListItem({
  anchor,
  dayAnchors,
  doctors,
  facilities,
  onRemove,
  removing,
  children,
  className,
}: {
  anchor: DayAnchorRow;
  dayAnchors: DayAnchorRow[];
  doctors: DoctorRow[];
  facilities: FacilityRow[];
  onRemove: () => void;
  removing?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const canEdit = anchorCanEdit(anchor);

  const siblings = useMemo(
    () => findMealAnchorSiblings(dayAnchors, anchor),
    [dayAnchors, anchor],
  );
  const doctorLine = formatDoctorNames(siblings, doctors);
  const facilityLine =
    anchor.facility_name ??
    facilities.find((f) => f.id === anchor.facility_id)?.name ??
    null;

  return (
    <li
      className={
        className ??
        "rounded border border-violet-100 bg-white/70 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/40"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium capitalize">
            {anchor.anchor_type} · {formatTime12(anchor.anchor_time)}
          </p>
          <p className="text-xs text-violet-700 dark:text-slate-400">
            {doctorLine}
            {facilityLine ? ` · ${facilityLine}` : ""}
          </p>
          {anchor.is_auto && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {anchor.lunch_id
                ? "From lunch schedule"
                : anchor.order_id
                  ? "From order fitting"
                  : "On plan"}
            </p>
          )}
          {anchor.patient_name && (
            <p className="text-xs text-violet-700 dark:text-slate-400">
              Patient: {anchor.patient_name}
            </p>
          )}
          {anchor.manual_address && anchor.anchor_type === "fitting" && (
            <p className="text-xs text-violet-700 dark:text-slate-400">
              {anchor.manual_address}
            </p>
          )}
          {isMealAnchorType(anchor.anchor_type) && (
            <AnchorMealSummary meal={anchor} />
          )}
          {children}
        </div>
        <div className="flex shrink-0 gap-3">
          {canEdit && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-brand-600 hover:underline dark:text-brand-400"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            disabled={removing}
            onClick={onRemove}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
      {editing && (
        <AnchorEditForm
          anchor={anchor}
          dayAnchors={dayAnchors}
          doctors={doctors}
          facilities={facilities}
          onClose={() => setEditing(false)}
        />
      )}
    </li>
  );
}
