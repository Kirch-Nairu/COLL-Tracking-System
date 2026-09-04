import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type EventInfo = { title: string; eventDate: string; startTime: string; venue: string; eventType: string };
type Summary = { eligible: number; checkedIn: number; present: number; late: number; absent: number; attendanceRate: number };
type AttendanceRow = { memberNo: string; fullName: string; position: string; status: string; scannedAt: string; checkInMethod: string };
type AbsentRow = { memberNo: string; fullName: string; position: string };

function safePdfText(value: unknown) {
  return String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '?');
}

export async function createEventAttendancePdf(event: EventInfo, summary: Summary, rows: AttendanceRow[], absent: AbsentRow[]) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 44;
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;

  const addPage = () => { page = pdf.addPage(pageSize); y = pageSize[1] - margin; };
  const line = (text: string, size = 10, strong = false, gap = 16) => {
    if (y < 56) addPage();
    page.drawText(safePdfText(text), { x: margin, y, size, font: strong ? bold : regular, color: rgb(0.08, 0.12, 0.2) });
    y -= gap;
  };

  line('COLL Attendance Report', 18, true, 24);
  line(event.title, 15, true, 20);
  line(`Date: ${event.eventDate}  Start: ${event.startTime}`);
  line(`Venue: ${event.venue || '-'}  Type: ${event.eventType || '-'}`, 10, false, 22);
  line(`Eligible: ${summary.eligible}  Checked in: ${summary.checkedIn}  Present: ${summary.present}  Late: ${summary.late}  Absent: ${summary.absent}`, 10, true);
  line(`Attendance rate: ${summary.attendanceRate}%`, 10, true, 26);

  line('Attendance', 13, true, 20);
  if (rows.length === 0) line('No attendance records.', 10, false, 18);
  for (const row of rows) {
    line(`${row.memberNo} | ${row.fullName} | ${row.position || '-'} | ${row.status} | ${new Date(row.scannedAt).toLocaleString('en-US')} | ${row.checkInMethod}`, 8, false, 13);
  }

  y -= 8;
  line('Derived absent members', 13, true, 20);
  if (absent.length === 0) line('None.', 10, false, 18);
  for (const member of absent) line(`${member.memberNo} | ${member.fullName} | ${member.position || '-'}`, 8, false, 13);

  y -= 10;
  line('Generated from COLL server-side attendance records. ABSENT entries are derived and are not stored as attendance rows.', 8, false, 12);
  return pdf.save();
}
