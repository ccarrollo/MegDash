import type { DayAnchorRow } from "./types";

export function anchorCanEdit(anchor: DayAnchorRow): boolean {
  if (anchor.lunch_id) return true;
  if (anchor.anchor_type === "fitting" && anchor.order_id) return true;
  if (anchor.id && !anchor.id.startsWith("auto-")) return true;
  return false;
}

export function anchorTimeValue(anchor: DayAnchorRow): string {
  if (!anchor.anchor_time) return "12:00";
  return anchor.anchor_time.slice(0, 5);
}
