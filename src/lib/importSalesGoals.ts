import { parseCsv } from "./importProspecting";

type CsvRow = Record<string, string>;

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export function parseMoney(value: string | undefined): number {
  if (!value) return 0;
  const v = value.trim().replace(/[$,]/g, "");
  if (!v || v === "#NAME?") return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function parsePaymentMonth(
  value: string,
  defaultYear: number,
): { year: number; month: number } | null {
  const v = (value || "").trim();
  if (!v) return null;
  const low = v.toLowerCase().slice(0, 3);
  if (MONTHS[low] && v.length <= 4) {
    return { year: defaultYear, month: MONTHS[low] };
  }
  if (v.includes("/")) {
    const parts = v.split("/");
    if (parts.length >= 2) {
      let month = parseInt(parts[0], 10);
      let year = parseInt(parts[1], 10);
      if (year < 100) year += 2000;
      if (month >= 1 && month <= 12 && year > 2000) return { year, month };
    }
  }
  if (/^\d{4}-\d{2}/.test(v)) {
    const [y, m] = v.split("-");
    return { year: parseInt(y, 10), month: parseInt(m, 10) };
  }
  return null;
}

export type GoalImportRow = {
  periodYear: number;
  periodMonth: number;
  accelGoal: number;
  physioGoal: number;
};

export function mapGoalsRows(
  rows: CsvRow[],
  periodYear: number,
): GoalImportRow[] {
  const out: GoalImportRow[] = [];
  for (const row of rows) {
    const monthLabel = (row.Month || row.F || "").trim();
    if (!monthLabel) continue;
    const m = MONTHS[monthLabel.toLowerCase().slice(0, 3)];
    if (!m) continue;

    let accel = parseMoney(row["AS Goal"] || row.G);
    let physio = parseMoney(row["PS Goal"] || row.H);
    if (accel === 0 && physio === 0) {
      const total = parseMoney(row["3PP Goal"] || row.I);
      if (total > 0) accel = total;
    }
    if (accel === 0 && physio === 0) continue;

    out.push({
      periodYear,
      periodMonth: m,
      accelGoal: accel,
      physioGoal: physio,
    });
  }
  return out;
}

export type SaleImportRow = {
  doctorName: string | null;
  patientLabel: string | null;
  paymentYear: number;
  paymentMonth: number;
  mySalesAmount: number;
  product: string | null;
  actualCost: number | null;
  insurance: string | null;
  affectedBone: string | null;
  orderDate: string | null;
  fittedDate: string | null;
  notes: string | null;
};

function isWholesale(row: CsvRow): boolean {
  const raw = (row["3PP or Wholesale"] || row.Channel || "").trim().toLowerCase();
  return raw.startsWith("wholesale");
}

export function mapSalesRows(
  rows: CsvRow[],
  defaultYear: number,
): SaleImportRow[] {
  const out: SaleImportRow[] = [];
  for (const row of rows) {
    const status = (row.Status || row.B || "").trim().toLowerCase();
    if (status && status !== "paid") continue;
    if (isWholesale(row)) continue;

    const pay = parsePaymentMonth(
      row.Month || row.A || row["Payment Date"] || row.E || "",
      defaultYear,
    );
    if (!pay) continue;

    const mySales = parseMoney(
      row["My Sales $"] || row.N || row["My Sales"] || row.Revenue,
    );

    out.push({
      doctorName: (row.Doctor || row.H || row["Doctor Name"] || "").trim() || null,
      patientLabel:
        (row.Name || row.F || row.Patient || row["Patient Name"] || "").trim() ||
        null,
      paymentYear: pay.year,
      paymentMonth: pay.month,
      mySalesAmount: mySales,
      product: (row.Product || row.L || "").trim() || null,
      actualCost: parseMoney(row["Actual Cost"] || row.M) || null,
      insurance: (row.Insurance || row.J || "").trim() || null,
      affectedBone: (row["Affected Bone"] || row.K || "").trim() || null,
      orderDate: (row.Entered || row.C || row["Order Date"] || "").trim() || null,
      fittedDate:
        (row["Fitting Date"] || row.D || row["Fitted Date"] || "").trim() || null,
      notes: (row.Notes || row.S || "").trim() || null,
    });
  }
  return out;
}

export { parseCsv };
