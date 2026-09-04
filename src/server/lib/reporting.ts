export function attendanceRate(attended: number, eligible: number) {
  if (eligible <= 0) return 0;
  return Math.round((attended / eligible) * 10_000) / 100;
}

export function isEligibleEvent(eventDate: string, memberCreatedAt: string, today: string) {
  const joinedDate = memberCreatedAt.slice(0, 10);
  return eventDate >= joinedDate && eventDate <= today;
}

export function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvRow(values: unknown[]) {
  return values.map(csvCell).join(',');
}
