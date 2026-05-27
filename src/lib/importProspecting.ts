import { inferZone } from "./zones";

type CsvRow = Record<string, string>;

export type ProspectingImportRow = {
  facilityName: string;
  doctorName: string;
  locationLabel: string | null;
  address: string;
  primaryFocus: string | null;
  decisionMakers: string | null;
  otherNames: string | null;
  status: string;
  lunchScheduled: boolean;
  lunchDate: string | null;
  priority: string;
  frontDeskIn: boolean | null;
  marketingKit: boolean | null;
  followUpDate: string | null;
  history: string | null;
  officeVibe: string | null;
  frontDeskNotes: string | null;
  interactionNotes: string | null;
  competitorNotes: string | null;
  otherNotes: string | null;
  lunchNotes: string | null;
  lunchOrder: string | null;
  followUpLunch: string | null;
  city: string | null;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current.trim());
  return out;
}

export function parseCsv(csvText: string): CsvRow[] {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = (cells[j] ?? "").trim();
    }
    rows.push(row);
  }

  return rows;
}

function parseBool(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (["yes", "y", "true", "1"].includes(v)) return true;
  if (["no", "n", "false", "0"].includes(v)) return false;
  return null;
}

function toIsoDate(value: string): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();

  const direct = new Date(v);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString().slice(0, 10);
  }

  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(v);
  if (!m) return null;

  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function cityFromAddress(address: string): string | null {
  if (!address) return null;
  const match = /,\s*([A-Za-z .'-]+)\s*(?:TX|Texas)?\s*\d{5}?/i.exec(address);
  if (match?.[1]) return match[1].trim();
  return null;
}

export type DoctorCsvFormat = "relationships" | "prospecting_targets";

export function parseCsvRawRows(csvText: string): string[][] {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  return lines.map((line) => parseCsvLine(line));
}

export function detectDoctorCsvFormat(csvText: string): DoctorCsvFormat {
  const rows = parseCsvRawRows(csvText);
  const header = rows[0]?.map((c) => c.trim().toLowerCase()) ?? [];
  if (header.includes("facility") && header.includes("doctor name")) {
    return "relationships";
  }
  return "prospecting_targets";
}

function looksLikeStreetAddress(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/\d{5}/.test(v)) return true;
  if (/\b(st|ste|suite|rd|dr|blvd|ave|hwy|parkway)\b/i.test(v)) return true;
  if (/\d+\s+\w/.test(v)) return true;
  return false;
}

function locationToCity(location: string): string | null {
  const m = /^(.+?)\s*\(/.exec(location);
  if (m?.[1]) return m[1].trim();
  return location.trim() || null;
}

/** Prospecting tab (targets / referrals) — no header row, different columns. */
export function mapProspectingTargetTabRows(
  rawRows: string[][],
): ProspectingImportRow[] {
  const out: ProspectingImportRow[] = [];

  for (const row of rawRows) {
    const cells = row.map((c) => c.trim());
    if (!cells.some(Boolean)) continue;

    const c0 = cells[0] ?? "";
    const c1 = cells[1] ?? "";
    const c2 = cells[2] ?? "";
    const c4 = cells[4] ?? "";
    const status = cells[7] ?? "";

    const isTargetRow = status.includes("8. Target");
    const isReferralRow =
      c0.startsWith("Dr.") ||
      c0 === "Smedley" ||
      c0 === "Halloran again";

    if (!isTargetRow && !isReferralRow) continue;
    if (c0.toLowerCase().includes("if i don't")) continue;

    let facilityName: string;
    let doctorName: string;
    let locationLabel: string | null = null;
    let address: string;
    let primaryFocus: string | null = null;
    let rowStatus = "8. Target";
    let interactionNotes: string | null = null;

    if (isTargetRow) {
      facilityName = c0;
      doctorName = c1;
      locationLabel = c2 || null;
      primaryFocus = c4 || null;
      rowStatus = status || "8. Target";
      if (looksLikeStreetAddress(c4)) {
        address = c4;
        primaryFocus = cells[3] || null;
      } else if (locationLabel) {
        address = `${facilityName}, ${locationLabel}, TX`;
      } else {
        address = `${facilityName}, TX`;
      }
    } else {
      doctorName = c0;
      facilityName = "Unknown facility";
      interactionNotes = c1 || null;
      if (looksLikeStreetAddress(c4)) {
        address = c4;
      } else if (c4) {
        address = c4;
        interactionNotes = [c1, c4].filter(Boolean).join(" · ");
      } else {
        address = "Address needed — update on doctor profile";
      }
      rowStatus = "8. Target";
    }

    if (!doctorName) continue;

    const city =
      cityFromAddress(address) ??
      (locationLabel ? locationToCity(locationLabel) : null);

    out.push({
      facilityName,
      doctorName,
      locationLabel,
      address,
      primaryFocus,
      decisionMakers: null,
      otherNames: null,
      status: rowStatus,
      lunchScheduled: false,
      lunchDate: null,
      priority: "Medium",
      frontDeskIn: null,
      marketingKit: null,
      followUpDate: null,
      history: null,
      officeVibe: null,
      frontDeskNotes: null,
      interactionNotes,
      competitorNotes: null,
      otherNotes: null,
      lunchNotes: null,
      lunchOrder: null,
      followUpLunch: null,
      city,
    });
  }

  return out;
}

export function mapDoctorCsv(csvText: string): ProspectingImportRow[] {
  const format = detectDoctorCsvFormat(csvText);
  if (format === "relationships") {
    return mapProspectingRows(parseCsv(csvText));
  }
  return mapProspectingTargetTabRows(parseCsvRawRows(csvText));
}

export function mapProspectingRows(csvRows: CsvRow[]): ProspectingImportRow[] {
  return csvRows
    .map((r, index) => {
      const rowHasAnyContent = Object.values(r).some((v) => v?.trim());
      if (!rowHasAnyContent) return null;

      const facilityName = r["Facility"]?.trim() || "Unknown facility";
      const doctorName = r["Doctor Name"]?.trim() || `Unknown doctor ${index + 1}`;
      const rawAddress = r["Address"]?.trim() || "";
      const locationLabel = r["Location"]?.trim() || null;
      const address =
        rawAddress ||
        (locationLabel
          ? `${facilityName}, ${locationLabel}, TX`
          : `${facilityName}, TX`);

      return {
        facilityName,
        doctorName,
        locationLabel,
        address,
        primaryFocus: r["Primary Focus"]?.trim() || null,
        decisionMakers: r["Decision Makers"]?.trim() || null,
        otherNames: r["Other Names To Know"]?.trim() || null,
        status: r["Status"]?.trim() || "2. Introduced",
        lunchScheduled: parseBool(r["Lunch?"] ?? "") ?? false,
        lunchDate: toIsoDate(r["Lunch Date"] ?? ""),
        priority: r["Priority"]?.trim() || "Medium",
        frontDeskIn: parseBool(r["Front Desk In?"] ?? ""),
        marketingKit: parseBool(r["Office Marketing Kit?"] ?? ""),
        followUpDate: toIsoDate(r["Follow-up Date"] ?? ""),
        history: r["History"]?.trim() || null,
        officeVibe: r['Office "Vibe"']?.trim() || null,
        frontDeskNotes: r["Front Desk Notes"]?.trim() || null,
        interactionNotes: r["Interaction Notes"]?.trim() || null,
        competitorNotes: r["Competitor Notes"]?.trim() || null,
        otherNotes: r["Other Notes"]?.trim() || null,
        lunchNotes: r["Lunch Notes"]?.trim() || null,
        lunchOrder: r["Lunch Order"]?.trim() || null,
        followUpLunch: r["Follow Up Lunch?"]?.trim() || null,
        city: cityFromAddress(address),
      };
    })
    .filter((v): v is ProspectingImportRow => Boolean(v));
}

export function zoneForRow(row: ProspectingImportRow) {
  return inferZone(row.city, `${row.locationLabel ?? ""} ${row.address}`.trim());
}

export function dedupeImportRows(
  rows: ProspectingImportRow[],
): ProspectingImportRow[] {
  const seen = new Set<string>();
  const out: ProspectingImportRow[] = [];
  for (const row of rows) {
    const key = `${row.facilityName.toLowerCase()}::${row.doctorName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function mergeDoctorImportCsv(
  relationshipsCsv: string,
  prospectingTargetsCsv: string,
): ProspectingImportRow[] {
  const rel = mapProspectingRows(parseCsv(relationshipsCsv));
  const targets = mapProspectingTargetTabRows(parseCsvRawRows(prospectingTargetsCsv));
  return dedupeImportRows([...rel, ...targets]);
}
