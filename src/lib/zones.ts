import type { TerritoryZone } from "./types";

/** Infer drive zone from city / address text (refine after geocoding). */
export function inferZone(city?: string | null, address?: string | null): TerritoryZone {
  const text = `${city ?? ""} ${address ?? ""}`.toLowerCase();

  if (
    /\bwaco\b|\btemple\b|\bkilleen\b|\bharker heights\b|\bclifton\b|\bhamilton\b|\bgatesville\b|\bheights\b.*765/.test(
      text,
    )
  ) {
    return "waco_central";
  }

  if (/\bcuero\b|\bfredericksburg\b|\bkerrville\b|\bllano\b|\bmarble falls\b/.test(text)) {
    return "west_rural";
  }

  if (/\bbastrop\b|\blockhart\b|\bbertram\b|\bcuero\b/.test(text)) {
    return "east";
  }

  if (
    /\bsan marcos\b|\bkyle\b|\bnew braunfels\b|\bwimberley\b|\bbuda\b/.test(text)
  ) {
    return "south_i35";
  }

  if (
    /\bcedar park\b|\bround rock\b|\bgeorgetown\b|\bleander\b|\bdripping springs\b|\bbee cave\b|\bspicewood\b|\bpflugerville\b/.test(
      text,
    )
  ) {
    return "north_nw";
  }

  if (/\baustin\b|\bbee caves\b/.test(text)) {
    return "austin_core";
  }

  return "unknown";
}

export const ZONE_LABELS: Record<TerritoryZone, string> = {
  austin_core: "Austin",
  north_nw: "North / NW",
  south_i35: "South (I-35)",
  east: "East",
  waco_central: "Waco / Central",
  west_rural: "West / Rural",
  unknown: "Other",
};

/** Zones reasonable for a single day from South Congress home base. */
export const SAME_DAY_ZONES_FROM_AUSTIN: TerritoryZone[] = [
  "austin_core",
  "north_nw",
  "south_i35",
  "east",
];

export function isRoadTripZone(zone: TerritoryZone): boolean {
  return zone === "waco_central" || zone === "west_rural";
}
