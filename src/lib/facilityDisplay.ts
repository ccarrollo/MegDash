const PLACEHOLDER_NAMES = new Set(["unknown facility", ""]);

export function isPlaceholderFacilityName(name: string | null | undefined): boolean {
  return PLACEHOLDER_NAMES.has((name ?? "").trim().toLowerCase());
}

/** Friendly label when import left the facility name blank. */
export function formatFacilityDisplayName(input: {
  name: string;
  address?: string | null;
  city?: string | null;
  location_label?: string | null;
}): string {
  if (!isPlaceholderFacilityName(input.name)) return input.name.trim();

  if (input.location_label?.trim()) return input.location_label.trim();
  if (input.city?.trim()) return `${input.city.trim()} office`;

  const addr = input.address?.trim() ?? "";
  if (addr && !addr.toLowerCase().includes("address needed")) {
    const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1].replace(/\bTX\b.*$/i, "").trim();
      if (last && last.length <= 40 && !/^\d/.test(last)) {
        return `${last} office`;
      }
    }
    return addr.length > 48 ? `${addr.slice(0, 48)}…` : addr;
  }

  return "Office name needed";
}

/** Use on doctor rows — maps facility_name, not doctor name. */
export function formatDoctorFacilityName(doctor: {
  facility_name: string;
  address?: string | null;
  city?: string | null;
  location_label?: string | null;
}): string {
  return formatFacilityDisplayName({
    name: doctor.facility_name,
    address: doctor.address,
    city: doctor.city,
    location_label: doctor.location_label,
  });
}

export function formatFacilityOptionLabel(f: {
  name: string;
  address: string;
  city?: string | null;
  location_label?: string | null;
}): string {
  const label = formatFacilityDisplayName(f);
  if (label === f.name.trim()) return `${f.name} — ${f.address}`;
  return `${label} — ${f.address}`;
}
