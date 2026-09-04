import { describe, expect, it } from 'vitest';
import { classifyAttendance, localDateAndTime } from './time';

describe('attendance time rules', () => {
  it('classifies at threshold as present', () => {
    expect(classifyAttendance('08:15', '08:15')).toBe('PRESENT');
  });

  it('classifies after threshold as late', () => {
    expect(classifyAttendance('08:16', '08:15')).toBe('LATE');
  });

  it('formats UTC time into Asia/Manila event time', () => {
    const local = localDateAndTime(new Date('2026-09-04T00:04:00.000Z'), 'Asia/Manila');
    expect(local).toEqual({ date: '2026-09-04', time: '08:04' });
  });
});
