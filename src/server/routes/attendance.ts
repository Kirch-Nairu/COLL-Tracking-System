import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import type { AppVariables, Bindings } from "../env";
import { attendance, events, members } from "../db/schema";
import { checkInSchema, manualCheckInSchema } from "../../shared/schemas";
import { requireAuth, requireRole } from "../middleware/auth";
import { sha256 } from "../lib/crypto";
import { classifyAttendance, localDateAndTime } from "../lib/time";
import { DEFAULT_TIME_ZONE } from "../../shared/constants";
import { writeAudit } from "../lib/audit";

export const attendanceRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

attendanceRoutes.use("*", requireAuth);

attendanceRoutes.get("/:eventId/attendance", requireRole("VIEWER"), async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db
    .select({
      id: attendance.id,
      scannedAt: attendance.scannedAt,
      status: attendance.status,
      checkInMethod: attendance.checkInMethod,
      memberId: members.id,
      memberNo: members.memberNo,
      fullName: members.fullName,
      position: members.position,
      category: members.category
    })
    .from(attendance)
    .innerJoin(members, eq(members.id, attendance.memberId))
    .where(eq(attendance.eventId, c.req.param("eventId")))
    .orderBy(desc(attendance.scannedAt));

  return c.json({ attendance: rows });
});

attendanceRoutes.post("/:eventId/check-in", requireRole("SCANNER"), async (c) => {
  const parsed = checkInSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, 400);

  const db = drizzle(c.env.DB);
  const eventId = c.req.param("eventId");
  const eventRows = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  const event = eventRows[0];

  if (!event) return c.json({ error: "EVENT_NOT_FOUND" }, 404);
  if (event.attendanceStatus !== "OPEN") return c.json({ error: "ATTENDANCE_CLOSED" }, 409);

  const qrHash = await sha256(parsed.data.qrToken);
  const memberRows = await db.select().from(members).where(eq(members.qrTokenHash, qrHash)).limit(1);
  const member = memberRows[0];

  if (!member) return c.json({ error: "QR_INVALID_OR_REVOKED" }, 404);
  if (member.status !== "ACTIVE") return c.json({ error: "MEMBER_INACTIVE" }, 409);

  const now = new Date();
  const timeZone = c.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE;
  const local = localDateAndTime(now, timeZone);
  if (local.date !== event.eventDate) {
    return c.json({ error: "EVENT_NOT_ACTIVE_TODAY", eventDate: event.eventDate, localDate: local.date }, 409);
  }

  const status = classifyAttendance(local.time, event.lateAfter);
  const id = crypto.randomUUID();

  try {
    await db.insert(attendance).values({
      id,
      eventId,
      memberId: member.id,
      scannedAt: now.toISOString(),
      status,
      scannedBy: c.get("authUser").id,
      checkInMethod: "QR"
    });
  } catch (error) {
    const existing = await db
      .select({
        id: attendance.id,
        scannedAt: attendance.scannedAt,
        status: attendance.status
      })
      .from(attendance)
      .where(and(eq(attendance.eventId, eventId), eq(attendance.memberId, member.id)))
      .limit(1);

    if (existing[0]) {
      return c.json({
        error: "ALREADY_RECORDED",
        member: {
          id: member.id,
          memberNo: member.memberNo,
          fullName: member.fullName,
          position: member.position
        },
        attendance: existing[0]
      }, 409);
    }

    throw error;
  }

  await writeAudit(db, {
    officerId: c.get("authUser").id,
    action: "ATTENDANCE_RECORDED",
    entityType: "attendance",
    entityId: id,
    metadata: { eventId, memberId: member.id, status, method: "QR" }
  });

  return c.json({
    member: {
      id: member.id,
      memberNo: member.memberNo,
      fullName: member.fullName,
      position: member.position
    },
    attendance: {
      id,
      scannedAt: now.toISOString(),
      status
    }
  }, 201);
});

attendanceRoutes.post("/:eventId/manual-check-in", requireRole("ADMIN"), async (c) => {
  const parsed = manualCheckInSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, 400);

  const db = drizzle(c.env.DB);
  const eventId = c.req.param("eventId");
  const eventRows = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  const event = eventRows[0];
  if (!event) return c.json({ error: "EVENT_NOT_FOUND" }, 404);
  if (event.attendanceStatus !== "OPEN") return c.json({ error: "ATTENDANCE_CLOSED" }, 409);

  const memberRows = await db.select().from(members).where(eq(members.id, parsed.data.memberId)).limit(1);
  const member = memberRows[0];
  if (!member || member.status !== "ACTIVE") return c.json({ error: "MEMBER_NOT_ACTIVE" }, 409);

  const timestamp = new Date();
  const local = localDateAndTime(timestamp, c.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE);
  const status = classifyAttendance(local.time, event.lateAfter);
  const id = crypto.randomUUID();

  try {
    await db.insert(attendance).values({
      id,
      eventId,
      memberId: member.id,
      scannedAt: timestamp.toISOString(),
      status,
      scannedBy: c.get("authUser").id,
      checkInMethod: "MANUAL"
    });
  } catch {
    const existing = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.eventId, eventId), eq(attendance.memberId, member.id)))
      .limit(1);
    if (existing[0]) return c.json({ error: "ALREADY_RECORDED", attendance: existing[0] }, 409);
    throw new Error("Attendance insert failed");
  }

  await writeAudit(db, {
    officerId: c.get("authUser").id,
    action: "ATTENDANCE_MANUAL_CHECK_IN",
    entityType: "attendance",
    entityId: id,
    metadata: { eventId, memberId: member.id, status }
  });

  return c.json({ attendance: { id, scannedAt: timestamp.toISOString(), status }, member }, 201);
});
