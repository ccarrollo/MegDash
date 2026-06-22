/** 3PP commission tiers by ratio of actual sales to goal. */
export const COMMISSION_TIERS = [
  { minRatio: 1.1, rate: 14 },
  { minRatio: 1.0, rate: 12 },
  { minRatio: 0.95, rate: 10 },
  { minRatio: 0, rate: 8 },
] as const;

/** Wholesale commission rate — not tied to 3PP goal tiers. */
export const WHOLESALE_PAYOUT_RATE = 0.1;
export const WHOLESALE_COMMISSION_PCT = 10;

export function commissionRateForRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 8;
  if (ratio >= 1.1) return 14;
  if (ratio >= 1.0) return 12;
  if (ratio >= 0.95) return 10;
  return 8;
}

export function goalRatio(actual: number, goal: number): number {
  if (goal <= 0) return 0;
  return actual / goal;
}

/** Monthly 3PP commission = My Sales $ × tier rate for that month. */
export function monthly3ppCommission(salesAmount: number, ratio: number): number {
  if (salesAmount <= 0) return 0;
  const rate = commissionRateForRatio(ratio);
  return roundMoney(salesAmount * (rate / 100));
}

export function wholesalePayout(wholesaleSales: number): number {
  return roundMoney(wholesaleSales * WHOLESALE_PAYOUT_RATE);
}

/** Quarter-end true-up (Mar / Jun / Sep). */
export function quarterTrueUp(
  monthlyQs: [number, number, number],
  qtdSales: number,
  qtdGoal: number,
): number {
  const lastQ = monthlyQs[2];
  if (lastQ === 0 && qtdSales === 0) return 0;
  const qtdRatio = goalRatio(qtdSales, qtdGoal);
  const shouldPay = roundMoney(qtdSales * (commissionRateForRatio(qtdRatio) / 100));
  const paid = monthlyQs[0] + monthlyQs[1] + monthlyQs[2];
  return roundMoney(shouldPay - paid);
}

/** Year-end true-up (December). */
export function yearTrueUp(
  monthlyQs: number[],
  priorTrueUps: number[],
  ytdSales: number,
  ytdGoal: number,
): number {
  const lastQ = monthlyQs[monthlyQs.length - 1] ?? 0;
  if (lastQ === 0 && ytdSales === 0) return 0;
  const ytdRatio = goalRatio(ytdSales, ytdGoal);
  const shouldPay = roundMoney(ytdSales * (commissionRateForRatio(ytdRatio) / 100));
  const paidQ = monthlyQs.reduce((s, n) => s + n, 0);
  const paidR = priorTrueUps.reduce((s, n) => s + n, 0);
  return roundMoney(shouldPay - paidQ - paidR);
}

export function isQuarterEndMonth(month: number): boolean {
  return month % 3 === 0;
}

export function isAccelStimProduct(product: string | null | undefined): boolean {
  return /accel/i.test(product ?? "");
}

export function isPhysioStimProduct(product: string | null | undefined): boolean {
  return /physio/i.test(product ?? "");
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export type MonthSalesSlice = {
  month: number;
  accelGoal: number;
  physioGoal: number;
  accelSales: number;
  physioSales: number;
  sales3pp: number;
  wholesaleSales: number;
  wholesaleFromRecords?: number;
  wholesaleManual?: number;
};

export type MonthCommissionBreakdown = {
  goalTotal: number;
  goalRatio: number;
  pctOfGoal: number;
  commissionRate: number;
  commission3pp: number;
  wholesalePayout: number;
  trueUp: number | null;
  commissionPay: number;
};

export function breakdownForMonth(
  slice: MonthSalesSlice,
  monthlyQ: number,
  trueUp: number | null,
): MonthCommissionBreakdown {
  const goalTotal = slice.accelGoal + slice.physioGoal;
  const ratio = goalRatio(slice.sales3pp, goalTotal);
  const commission3pp = monthlyQ;
  const wholesale = wholesalePayout(slice.wholesaleSales);
  const trueUpAmt = trueUp ?? 0;
  return {
    goalTotal,
    goalRatio: ratio,
    pctOfGoal: Math.round(ratio * 1000) / 10,
    commissionRate: commissionRateForRatio(ratio),
    commission3pp,
    wholesalePayout: wholesale,
    trueUp,
    commissionPay: roundMoney(commission3pp + trueUpAmt + wholesale),
  };
}

/** Build Q and R for each month in a calendar year from paid sales slices. */
export function buildYearCommission(
  slices: MonthSalesSlice[],
): Map<number, MonthCommissionBreakdown> {
  const byMonth = new Map(slices.map((s) => [s.month, s]));
  const monthlyQ = new Map<number, number>();
  const trueUps = new Map<number, number>();

  for (let m = 1; m <= 12; m++) {
    const slice = byMonth.get(m) ?? {
      month: m,
      accelGoal: 0,
      physioGoal: 0,
      accelSales: 0,
      physioSales: 0,
      sales3pp: 0,
      wholesaleSales: 0,
    };
    const goalTotal = slice.accelGoal + slice.physioGoal;
    const ratio = goalRatio(slice.sales3pp, goalTotal);
    monthlyQ.set(m, monthly3ppCommission(slice.sales3pp, ratio));
  }

  for (let m = 1; m <= 12; m++) {
    if (!isQuarterEndMonth(m) || m === 12) continue;
    const qStart = m - 2;
    const qs: [number, number, number] = [
      monthlyQ.get(qStart) ?? 0,
      monthlyQ.get(qStart + 1) ?? 0,
      monthlyQ.get(m) ?? 0,
    ];
    let qtdSales = 0;
    let qtdGoal = 0;
    for (let i = qStart; i <= m; i++) {
      const s = byMonth.get(i);
      if (s) {
        qtdSales += s.sales3pp;
        qtdGoal += s.accelGoal + s.physioGoal;
      }
    }
    trueUps.set(m, quarterTrueUp(qs, qtdSales, qtdGoal));
  }

  const ytdSales = slices.reduce((s, x) => s + x.sales3pp, 0);
  const ytdGoal = slices.reduce((s, x) => s + x.accelGoal + x.physioGoal, 0);
  const allQ = Array.from({ length: 12 }, (_, i) => monthlyQ.get(i + 1) ?? 0);
  const priorR = [3, 6, 9].map((m) => trueUps.get(m) ?? 0);
  trueUps.set(12, yearTrueUp(allQ, priorR, ytdSales, ytdGoal));

  const result = new Map<number, MonthCommissionBreakdown>();
  for (let m = 1; m <= 12; m++) {
    const slice = byMonth.get(m) ?? {
      month: m,
      accelGoal: 0,
      physioGoal: 0,
      accelSales: 0,
      physioSales: 0,
      sales3pp: 0,
      wholesaleSales: 0,
    };
    result.set(
      m,
      breakdownForMonth(slice, monthlyQ.get(m) ?? 0, trueUps.get(m) ?? null),
    );
  }
  return result;
}

/** @deprecated Use commissionRateForRatio + goalRatio */
export function commissionRateForGoalPct(pctToGoal: number): number {
  return commissionRateForRatio(pctToGoal / 100);
}
