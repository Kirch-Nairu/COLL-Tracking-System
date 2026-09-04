import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { checkInSchema } from '../../shared/schemas';
import { attendance, events, members } from '../db/schema';
import { audit } from '../lib/audit';
import { sha256 } from '../lib/crypto';
import { classifyAttendance, localDateAndTime } from '../lib/time';
import { requireAuth, requireRoles, type AppBindings } from '../middleware/auth';

export const attendanceRoutes = new Hono<AppBindings>();
attendanceRoutes.use('*', requireAuth);

attendanceRoutes.post('/events/:eventId/check-in', requireRoles('SUPER_ADMIN', 'ADMIN', 'SCANNER'), zValidator('json', checkInSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const eventId = c.req.param('eventId');
  const input = c.req.valid('json');
  const event = (await db.select().from(events).where(eq(events.id, eventId)).limit(1))[0];
  if (!event) return c.json({ error: 'EVENT_NOT_FOUND' }, 404);
  if (event.attendanceStatus !== 'OPEN') return c.json({ error: 'ATTENDANCE_CLOSED' }, 409);

  const tokenHash = await sha256(input.qrToken);
  const member = (await db.select().from(members).where(eq(members.qrTokenHash, tokenHash)).limit(1))[0];
  if (!member) return c.json({ error: 'INVALID_QR' }, 404);
  if (member.status !== 'ACTIVE') return c.json({ error: 'MEMBER_INACTIVE' }, 409);

  const scanTime = new Date();
  const local = localDateAndTime(scanTime, event.timezone);
  if (local.date !== event.eventDate) return c.json({ error: 'EVENT_NOT_TODAY', eventDate: event.eventDate }, 409);
  const status = classifyAttendance(local.time, event.lateAfter);
  const officer = c.get('officer');
  const attendanceId = crypto.randomUUID();

  try {
    await db.insert(attendance).values({
      id: attendanceId,
      eventId,
      memberId: member.id,
      scannedAt: scanTime.toISOString(),
      status,
      scannedBy: officer.id,
      checkInMethod: input.checkInMethod
    });
  } catch (error) {
    const existing = (await db.select().from(attendance).where(and(eq(attendance.eventId, eventId), eq(attendance.memberId, member.id))).limit(1))[0];
    if (existing) {
      return c.json({
        result: 'ALREADY_RECORDED',
        attendance: existing,
        member: { id: member.id, memberNo: member.memberNo, fullName: member.fullName, position: member.position }
      }, 409);
    }
    throw error;
  }

  await audit(db, officer.id, 'ATTENDANCE_RECORDED', 'ATTENDANCE', attendanceId, { eventId, memberId: member.id, status });
  return c.json({
    result: 'RECORDED',
    attendance: { id: attendanceId, eventId, memberId: member.id, scannedAt: scanTime.toISOString(), status },
    member: { id: member.id, memberNo: member.memberNo, fullName: member.fullName, position: member.position }
  }, 201);
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
    position: members.position
  }).from(attendance)
    .innerJoin(members, eq(attendance.memberId, members.id))
    .where(eq(attendance.eventId, c.req.param('eventId')))
    .orderBy(desc(attendance.scannedAt));
  return c.json({ attendance: rows });
});
