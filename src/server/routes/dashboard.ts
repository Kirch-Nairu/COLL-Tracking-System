import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import type { AppVariables, Bindings } from "../env";
import { attendance, events, members } from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";

export const dashboardRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

dashboardRoutes.use("*", requireAuth);
dashboardRoutes.get("/", requireRole("VIEWER"), async (c) => {
  const db = drizzle(c.env.DB);

  const [memberCount, eventCount, attendanceCount, openEventCount] = await Promise.all([
    db.select({ value: count() }).from(members).where(eq(members.status, "ACTIVE")),
    db.select({ value: count() }).from(events),
    db.select({ value: count() }).from(attendance),
    db.select({ value: count() }).from(events).where(eq(events.attendanceStatus, "OPEN"))
  ]);

  return c.json({
    totals: {
      activeMembers: memberCount[0]?.value ?? 0,
      events: eventCount[0]?.value ?? 0,
      attendanceRecords: attendanceCount[0]?.value ?? 0,
      openEvents: openEventCount[0]?.value ?? 0
    }
  });
});
