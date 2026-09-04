import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import QRCode from "qrcode";
import type { AppVariables, Bindings } from "../env";
import { members } from "../db/schema";
import { memberCreateSchema, memberPatchSchema } from "../../shared/schemas";
import { requireAuth, requireRole } from "../middleware/auth";
import { createMemberQrToken } from "../lib/crypto";
import { writeAudit } from "../lib/audit";

export const memberRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

memberRoutes.use("*", requireAuth);

memberRoutes.get("/", requireRole("VIEWER"), async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db
    .select({
      id: members.id,
      memberNo: members.memberNo,
      fullName: members.fullName,
      position: members.position,
      category: members.category,
      phone: members.phone,
      email: members.email,
      status: members.status,
      qrVersion: members.qrVersion,
      createdAt: members.createdAt,
      updatedAt: members.updatedAt
    })
    .from(members)
    .orderBy(desc(members.createdAt));

  return c.json({ members: rows });
});

memberRoutes.post("/", requireRole("ADMIN"), async (c) => {
  const parsed = memberCreateSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, 400);

  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const qr = await createMemberQrToken();
  const memberNo = parsed.data.memberNo || `COLL-${id.slice(0, 8).toUpperCase()}`;

  await db.insert(members).values({
    id,
    memberNo,
    fullName: parsed.data.fullName,
    position: parsed.data.position || null,
    category: parsed.data.category || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    qrTokenHash: qr.hash,
    qrVersion: 1,
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp
  });

  await writeAudit(db, {
    officerId: c.get("authUser").id,
    action: "MEMBER_CREATED",
    entityType: "member",
    entityId: id,
    metadata: { memberNo }
  });

  const qrDataUrl = await QRCode.toDataURL(qr.raw, { errorCorrectionLevel: "M", margin: 2, width: 512 });

  return c.json({
    member: {
      id,
      memberNo,
      fullName: parsed.data.fullName,
      status: "ACTIVE"
    },
    qr: {
      token: qr.raw,
      dataUrl: qrDataUrl,
      warning: "Download or send this permanent QR now. The raw token is not stored and cannot be retrieved later."
    }
  }, 201);
});

memberRoutes.get("/:id", requireRole("VIEWER"), async (c) => {
  const db = drizzle(c.env.DB);
  const row = await db.select().from(members).where(eq(members.id, c.req.param("id"))).limit(1);
  if (!row[0]) return c.json({ error: "MEMBER_NOT_FOUND" }, 404);
  const { qrTokenHash: _secretHash, ...safe } = row[0];
  return c.json({ member: safe });
});

memberRoutes.patch("/:id", requireRole("ADMIN"), async (c) => {
  const parsed = memberPatchSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, 400);

  const db = drizzle(c.env.DB);
  const existing = await db.select().from(members).where(eq(members.id, c.req.param("id"))).limit(1);
  if (!existing[0]) return c.json({ error: "MEMBER_NOT_FOUND" }, 404);

  const updates: Partial<typeof members.$inferInsert> = {
    updatedAt: new Date().toISOString()
  };
  if (parsed.data.memberNo !== undefined) updates.memberNo = parsed.data.memberNo;
  if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
  if (parsed.data.position !== undefined) updates.position = parsed.data.position || null;
  if (parsed.data.category !== undefined) updates.category = parsed.data.category || null;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone || null;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email || null;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  await db.update(members).set(updates).where(eq(members.id, c.req.param("id")));

  await writeAudit(db, {
    officerId: c.get("authUser").id,
    action: "MEMBER_UPDATED",
    entityType: "member",
    entityId: c.req.param("id"),
    metadata: parsed.data
  });

  return c.json({ ok: true });
});

memberRoutes.post("/:id/deactivate", requireRole("ADMIN"), async (c) => {
  const db = drizzle(c.env.DB);
  await db
    .update(members)
    .set({ status: "INACTIVE", updatedAt: new Date().toISOString() })
    .where(eq(members.id, c.req.param("id")));

  await writeAudit(db, {
    officerId: c.get("authUser").id,
    action: "MEMBER_DEACTIVATED",
    entityType: "member",
    entityId: c.req.param("id")
  });

  return c.json({ ok: true });
});

memberRoutes.post("/:id/qr/regenerate", requireRole("ADMIN"), async (c) => {
  const db = drizzle(c.env.DB);
  const existing = await db.select().from(members).where(eq(members.id, c.req.param("id"))).limit(1);
  if (!existing[0]) return c.json({ error: "MEMBER_NOT_FOUND" }, 404);

  const qr = await createMemberQrToken();
  const nextVersion = existing[0].qrVersion + 1;

  await db
    .update(members)
    .set({
      qrTokenHash: qr.hash,
      qrVersion: nextVersion,
      updatedAt: new Date().toISOString()
    })
    .where(eq(members.id, c.req.param("id")));

  await writeAudit(db, {
    officerId: c.get("authUser").id,
    action: "MEMBER_QR_REGENERATED",
    entityType: "member",
    entityId: c.req.param("id"),
    metadata: { qrVersion: nextVersion }
  });

  const dataUrl = await QRCode.toDataURL(qr.raw, { errorCorrectionLevel: "M", margin: 2, width: 512 });
  return c.json({ qr: { token: qr.raw, dataUrl, version: nextVersion } });
});
