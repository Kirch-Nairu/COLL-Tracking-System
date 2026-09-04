import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import type { AppVariables, Bindings } from "../env";
import { events } from "../db/schema";
import { eventCreateSchema, eventPatchSchema } from "../../shared/schemas";
import { requireAuth, requireRole } from "../middleware/auth";
import { writeAudit } from "../lib/audit";

export const eventRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

eventRoutes.use("*", requireAuth);

eventRoutes.get("/", requireRole("VIEWER"), async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(events).orderBy(desc(events.eventDate), desc(events.createdAt));
  return c.json({ events: rows });
});

eventRoutes.post("/", requireRole("ADMIN"), async (c) => {
  const parsed = eventCreateSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, 400);

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const db = drizzle(c.env.DB);

  await db.insert(events).values({
    id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    eventDate: parsed.data.eventDate,
    startTime: parsed.data.startTime,
    lateAfter: parsed.data.lateAfter,
    venue: parsed.data.venue || null,
    eventType: parsed.data.eventType || null,
    attendanceStatus: "CLOSED",
    createdBy: c.get("authUser").id,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  await writeAudit(db, {
    officerId: c.get("authUser").id,
    action: "EVENT_CREATED",
    entityType: "event",
    entityId: id
  });

  return c.json({ id }, 201);
});

eventRoutes.patch("/:id", requireRole("ADMIN"), async (c) => {
  const parsed = eventPatchSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, 400);

  const db = drizzle(c.env.DB);
  const updates: Partial<typeof events.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description || null;
  if (parsed.data.eventDate !== undefined) updates.eventDate = parsed.data.eventDate;
  if (parsed.data.startTime !== undefined) updates.startTime = parsed.data.startTime;
  if (parsed.data.lateAfter !== undefined) updates.lateAfter = parsed.data.lateAfter;
  if (parsed.data.venue !== undefined) updates.venue = parsed.data.venue || null;
  if (parsed.data.eventType !== undefined) updates.eventType = parsed.data.eventType || null;

  await db.update(events).set(updates).where(eq(events.id, c.req.param("id")));
  return c.json({ ok: true });
});

for (const [path, nextStatus] of [["open-attendance", "OPEN"], ["close-attendance", "CLOSED"]] as const) {
  eventRoutes.post(`/:id/${path}`, requireRole("ADMIN"), async (c) => {
    const db = drizzle(c.env.DB);
    await db.update(events).set({
      attendanceStatus: nextStatus,
      updatedAt: new Date().toISOString()
    }).where(eq(events.id, c.req.param("id")));

    await writeAudit(db, {
      officerId: c.get("authUser").id,
      action: nextStatus === "OPEN" ? "EVENT_ATTENDANCE_OPENED" : "EVENT_ATTENDANCE_CLOSED",
      entityType: "event",
      entityId: c.req.param("id")
    });

    return c.json({ attendanceStatus: nextStatus });
  });
}
