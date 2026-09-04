import { asc, desc, eq, gte, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { attendance, events, members } from '../db/schema';
import { localDateAndTime } from '../lib/time';
import { requireAuth, type AppBindings } from '../middleware/auth';

export const dashboardRoutes = new Hono<AppBindings>();
dashboardRoutes.use('*', requireAuth);

dashboardRoutes.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const today = localDateAndTime(new Date(), 'Asia/Manila').date;

  const [{ totalMembers }] = await db.select({ totalMembers: sql<number>`count(*)` }).from(members);
  const [{ activeMembers }] = await db.select({ activeMembers: sql<number>`count(*)` }).from(members).where(eq(members.status, 'ACTIVE'));
  const [{ totalEvents }] = await db.select({ totalEvents: sql<number>`count(*)` }).from(events);
  const [{ openSessions }] = await db.select({ openSessions: sql<number>`count(*)` }).from(events).where(eq(events.attendanceStatus, 'OPEN'));

  const todayAttendance = await db.select({
    id: attendance.id,
    status: attendance.status,
    scannedAt: attendance.scannedAt,
    memberId: members.id,
    memberNo: members.memberNo,
    fullName: members.fullName,
    eventId: events.id,
    eventTitle: events.title
  }).from(attendance)
    .innerJoin(events, eq(attendance.eventId, events.id))
    .innerJoin(members, eq(attendance.memberId, members.id))
    .where(eq(events.eventDate, today))
    .orderBy(desc(attendance.scannedAt));

  const upcomingEvents = await db.select().from(events)
    .where(gte(events.eventDate, today))
    .orderBy(asc(events.eventDate), asc(events.startTime))
    .limit(6);

  const recentAttendance = await db.select({
    id: attendance.id,
    status: attendance.status,
    scannedAt: attendance.scannedAt,
    memberNo: members.memberNo,
    fullName: members.fullName,
    eventTitle: events.title
  }).from(attendance)
    .innerJoin(events, eq(attendance.eventId, events.id))
    .innerJoin(members, eq(attendance.memberId, members.id))
    .orderBy(desc(attendance.scannedAt))
    .limit(10);

  const presentToday = todayAttendance.filter((row) => row.status === 'PRESENT').length;
  const lateToday = todayAttendance.filter((row) => row.status === 'LATE').length;

  return c.json({
    date: today,
    metrics: {
      totalMembers: Number(totalMembers),
      activeMembers: Number(activeMembers),
      totalEvents: Number(totalEvents),
      openSessions: Number(openSessions),
      checkedInToday: todayAttendance.length,
      presentToday,
      lateToday,
      attendancePercentToday: Number(activeMembers) > 0 ? Math.round((todayAttendance.length / Number(activeMembers)) * 10_000) / 100 : 0
    },
    upcomingEvents,
    recentAttendance
  });
});
