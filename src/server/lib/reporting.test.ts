import { describe, expect, it } from 'vitest';
import { attendanceRate, csvCell, csvRow, isEligibleEvent } from './reporting';

describe('reporting helpers', () => {
  it('calculates a stable percentage', () => {
    expect(attendanceRate(3, 4)).toBe(75);
    expect(attendanceRate(0, 0)).toBe(0);
    expect(attendanceRate(2, 3)).toBe(66.67);
  });

  it('uses member creation date as the current eligibility baseline', () => {
    expect(isEligibleEvent('2026-09-05', '2026-09-01T08:00:00Z', '2026-09-05')).toBe(true);
    expect(isEligibleEvent('2026-08-31', '2026-09-01T08:00:00Z', '2026-09-05')).toBe(false);
    expect(isEligibleEvent('2026-09-06', '2026-09-01T08:00:00Z', '2026-09-05')).toBe(false);
  });

  it('escapes CSV values safely', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('Doe, Juan')).toBe('"Doe, Juan"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvRow(['A', 'B,C'])).toBe('A,"B,C"');
  });
});
