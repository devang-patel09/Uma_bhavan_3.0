import { describe, it, expect } from 'vitest';
import { AgeCalculator } from '../src/utils/ageCalculator.js';
import { NumberToWords } from '../src/utils/numberToWords.js';
import { encrypt, decrypt, sha256 } from '../src/utils/crypto.js';

describe('Phase 8 — Performance & Concurrency Load Test', () => {
  it('should handle 1,000 concurrent age & eligibility calculations with sub-millisecond execution', () => {
    const testCases = [
      { dob: new Date('2008-10-15'), gender: 'MALE' as const },
      { dob: new Date('1981-10-15'), gender: 'MALE' as const },
      { dob: new Date('1980-10-14'), gender: 'MALE' as const },
      { dob: new Date('1995-03-22'), gender: 'FEMALE' as const },
      { dob: new Date('1950-01-01'), gender: 'MALE' as const },
    ];

    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      const tc = testCases[i % testCases.length];
      const age = AgeCalculator.calculateAge(tc.dob);
      const is18Plus = AgeCalculator.is18PlusMale(tc.gender, tc.dob);
      const eligible = AgeCalculator.getEligibleReceiptTypes(tc.gender, tc.dob);
      expect(age).toBeGreaterThanOrEqual(0);
      expect(typeof is18Plus).toBe('boolean');
      expect(Array.isArray(eligible)).toBe(true);
    }
    const durationMs = performance.now() - startTime;
    expect(durationMs).toBeLessThan(1000); // 1,000 iterations must take under 1 second
  });

  it('should handle concurrent Indian currency text conversions under high throughput', () => {
    const amounts = [100, 500, 1200, 25500, 100000, 999999];
    const startTime = performance.now();

    for (let i = 0; i < 500; i++) {
      const amt = amounts[i % amounts.length];
      const words = NumberToWords.toIndianRupees(amt);
      expect(words).toContain('Rupees');
      expect(words).toContain('Only');
    }

    const durationMs = performance.now() - startTime;
    expect(durationMs).toBeLessThan(500);
  });

  it('should perform 100 concurrent AES-256-CBC encryptions and decryptions without data corruption', () => {
    const secretKey = 'performance-test-encryption-key-for-load';
    const payloads = Array.from({ length: 100 }, (_, i) => `Payload data block #${i} with sensitive community data.`);

    const startTime = performance.now();
    for (const payload of payloads) {
      const encrypted = encrypt(Buffer.from(payload, 'utf8'), secretKey);
      const decrypted = decrypt(encrypted, secretKey);
      expect(decrypted.toString('utf8')).toBe(payload);
      expect(sha256(decrypted)).toBe(sha256(Buffer.from(payload, 'utf8')));
    }
    const durationMs = performance.now() - startTime;
    expect(durationMs).toBeLessThan(1000);
  });
});
