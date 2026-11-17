import { AgeCalculator } from './ageCalculator.js';

/** Age brackets used across the app (matches the Age-Wise demographics brackets). */
export const AGE_BANDS = [
  { label: '0–17', min: 0, max: 17 },
  { label: '18–45', min: 18, max: 45 },
  { label: '46–60', min: 46, max: 60 },
  { label: '60+', min: 61, max: Infinity },
] as const;

export interface AgeGenderRow {
  band: string;
  male: number;
  female: number;
}

export function buildAgeGenderBands(
  members: Array<{ dob: Date; gender: string }>,
  refDate: Date = new Date()
): AgeGenderRow[] {
  const rows: AgeGenderRow[] = AGE_BANDS.map((b) => ({ band: b.label, male: 0, female: 0 }));
  for (const m of members) {
    const age = AgeCalculator.calculateAge(m.dob, refDate);
    const idx = AGE_BANDS.findIndex((b) => age >= b.min && age <= b.max);
    if (idx === -1) continue;
    if (m.gender === 'MALE') rows[idx].male++;
    else if (m.gender === 'FEMALE') rows[idx].female++;
  }
  return rows;
}

export interface MonthlyCollectionRow {
  month: string; // YYYY-MM
  label: string; // "Jan 26"
  amount: number;
  count: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Start of the window: first day of the month `months - 1` months before refDate (UTC). */
export function monthlyWindowStart(months: number, refDate: Date = new Date()): Date {
  return new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth() - (months - 1), 1));
}

/** Buckets receipts into the last `months` calendar months (UTC), oldest first, zero-filled. */
export function buildMonthlyCollection(
  receipts: Array<{ amount: unknown; generatedAt: Date }>,
  months = 12,
  refDate: Date = new Date()
): MonthlyCollectionRow[] {
  const start = monthlyWindowStart(months, refDate);
  const rows: MonthlyCollectionRow[] = [];
  const index = new Map<string, MonthlyCollectionRow>();
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const row = {
      month: key,
      label: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
      amount: 0,
      count: 0,
    };
    rows.push(row);
    index.set(key, row);
  }
  for (const r of receipts) {
    const d = r.generatedAt;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const row = index.get(key);
    if (!row) continue;
    row.amount += Number(r.amount) || 0;
    row.count++;
  }
  for (const row of rows) row.amount = Math.round(row.amount * 100) / 100;
  return rows;
}

export interface AreaRow {
  area: string;
  firms: number;
  families: number;
}

/** Aggregates firms by area; keeps the top `limit` by families and folds the rest into "Other". */
export function buildAreaDistribution(
  firms: Array<{ areaName: string; families: number }>,
  limit = 8
): AreaRow[] {
  const byArea = new Map<string, AreaRow>();
  for (const f of firms) {
    const row = byArea.get(f.areaName) ?? { area: f.areaName, firms: 0, families: 0 };
    row.firms++;
    row.families += f.families;
    byArea.set(f.areaName, row);
  }
  const sorted = [...byArea.values()].sort(
    (a, b) => b.families - a.families || b.firms - a.firms || a.area.localeCompare(b.area)
  );
  if (sorted.length <= limit) return sorted;
  const top = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1);
  top.push({
    area: `Other (${rest.length})`,
    firms: rest.reduce((s, r) => s + r.firms, 0),
    families: rest.reduce((s, r) => s + r.families, 0),
  });
  return top;
}

export const BLOOD_GROUP_ORDER = [
  'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
  'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN',
] as const;

export function buildBloodGroups(
  groups: Array<{ bloodGroup: string; count: number }>
): Array<{ bloodGroup: string; count: number }> {
  const map = new Map(groups.map((g) => [g.bloodGroup, g.count]));
  return BLOOD_GROUP_ORDER.map((bg) => ({ bloodGroup: bg, count: map.get(bg) ?? 0 }));
}
