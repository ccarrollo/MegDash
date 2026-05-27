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

export function mapProspectingRows(csvRows: CsvRow[]): ProspectingImportRow[] {
  return csvRows
    .map((r) => {
      const facilityName = r["Facility"]?.trim() ?? "";
      const doctorName = r["Doctor Name"]?.trim() ?? "";
      const address = r["Address"]?.trim() ?? "";
      if (!facilityName || !doctorName || !address) return null;

      return {
        facilityName,
        doctorName,
        locationLabel: r["Location"]?.trim() || null,
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
