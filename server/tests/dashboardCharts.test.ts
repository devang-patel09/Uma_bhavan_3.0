import { describe, it, expect } from 'vitest';
import {
  buildAgeGenderBands,
  buildMonthlyCollection,
  buildAreaDistribution,
  buildBloodGroups,
} from '../src/utils/dashboardCharts.js';

const ref = new Date('2026-10-03T00:00:00Z');
const born = (age: number) => new Date(Date.UTC(2026 - age, 9, 3)); // exact birthday on ref date

describe('Dashboard chart aggregates', () => {
  it('places boundary ages 17/18, 45/46 and 60/61 in the right bands', () => {
    const rows = buildAgeGenderBands(
      [
        { dob: born(17), gender: 'MALE' },
        { dob: born(18), gender: 'MALE' },
        { dob: born(45), gender: 'FEMALE' },
        { dob: born(46), gender: 'FEMALE' },
        { dob: born(60), gender: 'MALE' },
        { dob: born(61), gender: 'FEMALE' },
      ],
      ref
    );
    expect(rows).toEqual([
      { band: '0–17', male: 1, female: 0 },
      { band: '18–45', male: 1, female: 1 },
      { band: '46–60', male: 1, female: 1 },
      { band: '60+', male: 0, female: 1 },
    ]);
  });

  it('buckets receipts into the last 12 months, zero-filled, oldest first', () => {
    const rows = buildMonthlyCollection(
      [
        { amount: '500.00', generatedAt: new Date('2026-10-01T10:00:00Z') },
        { amount: 250, generatedAt: new Date('2026-10-02T10:00:00Z') },
        { amount: 100, generatedAt: new Date('2025-11-15T10:00:00Z') },
        { amount: 999, generatedAt: new Date('2025-10-31T10:00:00Z') }, // outside window
      ],
      12,
      ref
    );
    expect(rows).toHaveLength(12);
    expect(rows[0]).toMatchObject({ month: '2025-11', label: 'Nov 25', amount: 100, count: 1 });
    expect(rows[11]).toMatchObject({ month: '2026-10', label: 'Oct 26', amount: 750, count: 2 });
    expect(rows.reduce((s, r) => s + r.count, 0)).toBe(3);
  });

  it('aggregates firms by area and folds the tail into "Other"', () => {
    const firms = Array.from({ length: 10 }, (_, i) => ({ areaName: `Area ${i}`, families: i }));
    firms.push({ areaName: 'Area 9', families: 1 });
    const rows = buildAreaDistribution(firms, 4);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({ area: 'Area 9', firms: 2, families: 10 });
    expect(rows[3].area).toBe('Other (7)');
    expect(rows.reduce((s, r) => s + r.firms, 0)).toBe(11);
  });

  it('returns every blood group in fixed order with zero fill', () => {
    const rows = buildBloodGroups([{ bloodGroup: 'O_POSITIVE', count: 3 }]);
    expect(rows).toHaveLength(9);
    expect(rows[0]).toEqual({ bloodGroup: 'A_POSITIVE', count: 0 });
    expect(rows.find((r) => r.bloodGroup === 'O_POSITIVE')?.count).toBe(3);
  });
});
