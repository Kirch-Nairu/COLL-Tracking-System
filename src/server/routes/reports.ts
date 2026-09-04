import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { attendance, events, members } from '../db/schema';
import { attendanceRate, csvRow, isEligibleEvent } from '../lib/reporting';
import { localDateAndTime } from '../lib/time';
import { requireAuth, type AppBindings } from '../middleware/auth';

export const reportRoutes = new Hono<AppBindings>();
reportRoutes.use('*', requireAuth);

reportRoutes.get('/event/:eventId', async (c) => {
  const db = drizzle(c.env.DB);
  const eventId = c.req.param('eventId');
  const event = (await db.select().from(events).where(eq(events.id, eventId)).limit(1))[0];
  if (!event) return c.json({ error: 'EVENT_NOT_FOUND' }, 404);

  const rows = await db.select({
    id: attendance.id,
    memberId: members.id,
    memberNo: members.memberNo,
    fullName: members.fullName,
    position: members.position,
    category: members.category,
    status: attendance.status,
    scannedAt: attendance.scannedAt,
    checkInMethod: attendance.checkInMethod
  }).from(attendance)
    .innerJoin(members, eq(attendance.memberId, members.id))
    .where(eq(attendance.eventId, eventId))
    .orderBy(asc(members.fullName));

  const activeMembers = await db.select({
    id: members.id,
    memberNo: members.memberNo,
    fullName: members.fullName,
    position: members.position,
    category: members.category
  }).from(members).where(eq(members.status, 'ACTIVE')).orderBy(asc(members.fullName));

  const attendedIds = new Set(rows.map((row) => row.memberId));
  const absent = activeMembers.filter((member) => !attendedIds.has(member.id));
  const present = rows.filter((row) => row.status === 'PRESENT').length;
  const late = rows.filter((row) => row.status === 'LATE').length;

  return c.json({
    event,
    summary: { eligible: activeMembers.length, checkedIn: rows.length, present, late, absent: absent.length, attendanceRate: attendanceRate(rows.length, activeMembers.length) },
    attendance: rows,
    absent
  });
});

reportRoutes.get('/event/:eventId/csv', async (c) => {
  const db = drizzle(c.env.DB);
  const eventId = c.req.param('eventId');
  const event = (await db.select().from(events).where(eq(events.id, eventId)).limit(1))[0];
  if (!event) return c.json({ error: 'EVENT_NOT_FOUND' }, 404);
  const rows = await db.select({
    memberNo: members.memberNo,
    fullName: members.fullName,
    position: members.position,
    category: members.category,
    status: attendance.status,
    scannedAt: attendance.scannedAt,
    checkInMethod: attendance.checkInMethod
  }).from(attendance)
    .innerJoin(members, eq(attendance.memberId, members.id))
    .where(eq(attendance.eventId, eventId))
    .orderBy(asc(members.fullName));

  const lines = [
    csvRow(['Event', event.title]),
    csvRow(['Date', event.eventDate]),
    csvRow(['Venue', event.venue]),
    '',
    csvRow(['Member No', 'Full Name', 'Position', 'Category', 'Status', 'Scanned At', 'Method']),
    ...rows.map((row) => csvRow([row.memberNo, row.fullName, row.position, row.category, row.status, row.scannedAt, row.checkInMethod]))
  ];
  const filename = `${event.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'event'}-${event.eventDate}.csv`;
  return c.body(lines.join('\r\n'), 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`
  });
});

reportRoutes.get('/daily', async (c) => {
  const db = drizzle(c.env.DB);
  const date = c.req.query('date') || localDateAndTime(new Date(), 'Asia/Manila').date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.json({ error: 'INVALID_DATE' }, 400);

  const eventRows = await db.select().from(events).where(eq(events.eventDate, date)).orderBy(asc(events.startTime));
  const attendanceRows = await db.select({
    id: attendance.id,
    eventId: events.id,
    eventTitle: events.title,
    memberId: members.id,
    memberNo: members.memberNo,
    fullName: members.fullName,
    status: attendance.status,
    scannedAt: attendance.scannedAt
  }).from(attendance)
    .innerJoin(events, eq(attendance.eventId, events.id))
    .innerJoin(members, eq(attendance.memberId, members.id))
    .where(eq(events.eventDate, date))
    .orderBy(desc(attendance.scannedAt));

  return c.json({
    date,
    events: eventRows,
    summary: {
      events: eventRows.length,
      checkIns: attendanceRows.length,
      present: attendanceRows.filter((row) => row.status === 'PRESENT').length,
      late: attendanceRows.filter((row) => row.status === 'LATE').length,
      uniqueMembers: new Set(attendanceRows.map((row) => row.memberId)).size
    },
    attendance: attendanceRows
  });
});

reportRoutes.get('/member/:memberId', async (c) => {
  const db = drizzle(c.env.DB);
  const memberId = c.req.param('memberId');
  const member = (await db.select().from(members).where(eq(members.id, memberId)).limit(1))[0];
  if (!member) return c.json({ error: 'MEMBER_NOT_FOUND' }, 404);
  const today = localDateAndTime(new Date(), 'Asia/Manila').date;
  const allEvents = await db.select().from(events).where(lte(events.eventDate, today)).orderBy(desc(events.eventDate));
  const eligibleEvents = allEvents.filter((event) => isEligibleEvent(event.eventDate, member.createdAt, today));
  const rows = await db.select({
    id: attendance.id,
    eventId: events.id,
    eventTitle: events.title,
    eventDate: events.eventDate,
    venue: events.venue,
    eventType: events.eventType,
    status: attendance.status,
    scannedAt: attendance.scannedAt,
    checkInMethod: attendance.checkInMethod
  }).from(attendance)
    .innerJoin(events, eq(attendance.eventId, events.id))
    .where(and(eq(attendance.memberId, memberId), gte(events.eventDate, member.createdAt.slice(0, 10)), lte(events.eventDate, today)))
    .orderBy(desc(events.eventDate), desc(attendance.scannedAt));

  return c.json({
    member,
    summary: { eligibleEvents: eligibleEvents.length, attended: rows.length, absent: Math.max(eligibleEvents.length - rows.length, 0), attendanceRate: attendanceRate(rows.length, eligibleEvents.length) },
    attendance: rows
  });
});

reportRoutes.get('/overall', async (c) => {
  const db = drizzle(c.env.DB);
  const [{ activeMembers }] = await db.select({ activeMembers: sql<number>`count(*)` }).from(members).where(eq(members.status, 'ACTIVE'));
  const [{ totalMembers }] = await db.select({ totalMembers: sql<number>`count(*)` }).from(members);
  const [{ totalEvents }] = await db.select({ totalEvents: sql<number>`count(*)` }).from(events);
  const [{ totalAttendance }] = await db.select({ totalAttendance: sql<number>`count(*)` }).from(attendance);
  const [{ present }] = await db.select({ present: sql<number>`count(*)` }).from(attendance).where(eq(attendance.status, 'PRESENT'));
  const [{ late }] = await db.select({ late: sql<number>`count(*)` }).from(attendance).where(eq(attendance.status, 'LATE'));
  return c.json({ summary: {
    totalMembers: Number(totalMembers), activeMembers: Number(activeMembers), totalEvents: Number(totalEvents),
    totalAttendance: Number(totalAttendance), present: Number(present), late: Number(late)
  } });
});
