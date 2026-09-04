import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { checkInSchema, correctionSchema, manualCheckInSchema } from '../../shared/schemas';
import { attendance, events, members, officers } from '../db/schema';
import { audit } from '../lib/audit';
import { sha256 } from '../lib/crypto';
import { classifyAttendance, localDateAndTime } from '../lib/time';
import { requireAuth, requireRoles, type AppBindings } from '../middleware/auth';

type MemberRow = typeof members.$inferSelect;

export const attendanceRoutes = new Hono<AppBindings>();
attendanceRoutes.use('*', requireAuth);

async function recordAttendance(c: Context<AppBindings>, eventId: string, member: MemberRow, checkInMethod: 'QR' | 'MANUAL') {
  const db = drizzle(c.env.DB);
  const event = (await db.select().from(events).where(eq(events.id, eventId)).limit(1))[0];
  if (!event) return c.json({ error: 'EVENT_NOT_FOUND' }, 404);
  if (event.attendanceStatus !== 'OPEN') return c.json({ error: 'ATTENDANCE_CLOSED' }, 409);
  if (member.status !== 'ACTIVE') return c.json({ error: 'MEMBER_INACTIVE' }, 409);

  const scanTime = new Date();
  const local = localDateAndTime(scanTime, event.timezone);
  if (local.date !== event.eventDate) return c.json({ error: 'EVENT_NOT_TODAY', eventDate: event.eventDate }, 409);
  const status = classifyAttendance(local.time, event.lateAfter);
  const officer = c.get('officer');
  const attendanceId = crypto.randomUUID();

  try {
    await db.insert(attendance).values({ id: attendanceId, eventId, memberId: member.id, scannedAt: scanTime.toISOString(), status, scannedBy: officer.id, checkInMethod });
  } catch (error) {
    const existing = (await db.select().from(attendance).where(and(eq(attendance.eventId, eventId), eq(attendance.memberId, member.id))).limit(1))[0];
    if (existing) {
      return c.json({ result: 'ALREADY_RECORDED', attendance: existing, member: { id: member.id, memberNo: member.memberNo, fullName: member.fullName, position: member.position } }, 409);
    }
    throw error;
  }

  await audit(db, officer.id, 'ATTENDANCE_RECORDED', 'ATTENDANCE', attendanceId, { eventId, memberId: member.id, status, checkInMethod });
  return c.json({ result: 'RECORDED', attendance: { id: attendanceId, eventId, memberId: member.id, scannedAt: scanTime.toISOString(), status, checkInMethod }, member: { id: member.id, memberNo: member.memberNo, fullName: member.fullName, position: member.position } }, 201);
}

attendanceRoutes.post('/events/:eventId/check-in', requireRoles('SUPER_ADMIN', 'ADMIN', 'SCANNER'), zValidator('json', checkInSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const tokenHash = await sha256(c.req.valid('json').qrToken);
  const member = (await db.select().from(members).where(eq(members.qrTokenHash, tokenHash)).limit(1))[0];
  if (!member) return c.json({ error: 'INVALID_QR' }, 404);
  return recordAttendance(c, c.req.param('eventId'), member, 'QR');
});

attendanceRoutes.post('/events/:eventId/manual-check-in', requireRoles('SUPER_ADMIN', 'ADMIN'), zValidator('json', manualCheckInSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const input = c.req.valid('json');
  const member = input.memberId
    ? (await db.select().from(members).where(eq(members.id, input.memberId)).limit(1))[0]
    : (await db.select().from(members).where(eq(members.memberNo, input.memberNo!)).limit(1))[0];
  if (!member) return c.json({ error: 'MEMBER_NOT_FOUND' }, 404);
  return recordAttendance(c, c.req.param('eventId'), member, 'MANUAL');
});

attendanceRoutes.get('/events/:eventId/attendance', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select({
    id: attendance.id,
    scannedAt: attendance.scannedAt,
    status: attendance.status,
    checkInMethod: attendance.checkInMethod,
    memberId: members.id,
    memberNo: members.memberNo,
    fullName: members.fullName,
    position: members.position,
    scannedById: officers.id,
    scannedByName: officers.fullName
  }).from(attendance)
    .innerJoin(members, eq(attendance.memberId, members.id))
    .innerJoin(officers, eq(attendance.scannedBy, officers.id))
    .where(eq(attendance.eventId, c.req.param('eventId')))
    .orderBy(desc(attendance.scannedAt));
  return c.json({ attendance: rows });
});

attendanceRoutes.patch('/attendance/:attendanceId', requireRoles('SUPER_ADMIN', 'ADMIN'), zValidator('json', correctionSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const attendanceId = c.req.param('attendanceId');
  const input = c.req.valid('json');
  const existing = (await db.select().from(attendance).where(eq(attendance.id, attendanceId)).limit(1))[0];
  if (!existing) return c.json({ error: 'ATTENDANCE_NOT_FOUND' }, 404);
  await db.update(attendance).set({ status: input.status }).where(eq(attendance.id, attendanceId));
  await audit(db, c.get('officer').id, 'ATTENDANCE_CORRECTED', 'ATTENDANCE', attendanceId, { eventId: existing.eventId, memberId: existing.memberId, from: existing.status, to: input.status, reason: input.reason });
  return c.json({ ok: true, status: input.status });
});

attendanceRoutes.get('/members/:memberId/attendance', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select({
    id: attendance.id,
    eventId: events.id,
    eventTitle: events.title,
    eventDate: events.eventDate,
    venue: events.venue,
    status: attendance.status,
    scannedAt: attendance.scannedAt,
    checkInMethod: attendance.checkInMethod
  }).from(attendance)
    .innerJoin(events, eq(attendance.eventId, events.id))
    .where(eq(attendance.memberId, c.req.param('memberId')))
    .orderBy(desc(events.eventDate), desc(attendance.scannedAt));
  return c.json({ attendance: rows });
});
