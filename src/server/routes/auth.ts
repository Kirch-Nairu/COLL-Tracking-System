import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import type { AppVariables, Bindings } from "../env";
import { officers, sessions } from "../db/schema";
import { bootstrapSchema, loginSchema } from "../../shared/schemas";
import { hashPassword, randomToken, sha256, verifyPassword } from "../lib/crypto";
import { requireAuth } from "../middleware/auth";
import { writeAudit } from "../lib/audit";

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

authRoutes.post("/bootstrap", async (c) => {
  const suppliedSecret = c.req.header("x-bootstrap-secret");
  if (!c.env.BOOTSTRAP_SECRET || suppliedSecret !== c.env.BOOTSTRAP_SECRET) {
    return c.json({ error: "BOOTSTRAP_FORBIDDEN" }, 403);
  }

  const parsed = bootstrapSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, 400);

  const db = drizzle(c.env.DB);
  const existing = await db.select({ id: officers.id }).from(officers).limit(1);
  if (existing.length > 0) return c.json({ error: "BOOTSTRAP_ALREADY_COMPLETED" }, 409);

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const password = await hashPassword(parsed.data.password);

  await db.insert(officers).values({
    id,
    email: parsed.data.email.toLowerCase(),
    passwordHash: password.hash,
    passwordSalt: password.salt,
    fullName: parsed.data.fullName,
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp
  });

  await writeAudit(db, {
    officerId: id,
    action: "OFFICER_BOOTSTRAPPED",
    entityType: "officer",
    entityId: id
  });

  return c.json({ id, email: parsed.data.email.toLowerCase(), role: "SUPER_ADMIN" }, 201);
});

authRoutes.post("/login", async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, 400);

  const db = drizzle(c.env.DB);
  const result = await db
    .select()
    .from(officers)
    .where(and(eq(officers.email, parsed.data.email.toLowerCase()), eq(officers.status, "ACTIVE")))
    .limit(1);

  const officer = result[0];
  if (!officer || !(await verifyPassword(parsed.data.password, officer.passwordSalt, officer.passwordHash))) {
    return c.json({ error: "INVALID_CREDENTIALS" }, 401);
  }

  const rawToken = randomToken(32);
  const tokenHash = await sha256(rawToken);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    officerId: officer.id,
    tokenHash,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  });

  await writeAudit(db, {
    officerId: officer.id,
    action: "LOGIN",
    entityType: "officer",
    entityId: officer.id
  });

  return c.json({
    token: rawToken,
    expiresAt: expiresAt.toISOString(),
    officer: {
      id: officer.id,
      email: officer.email,
      fullName: officer.fullName,
      role: officer.role
    }
  });
});

authRoutes.get("/me", requireAuth, (c) => c.json({ officer: c.get("authUser") }));

authRoutes.post("/logout", requireAuth, async (c) => {
  const rawToken = c.req.header("authorization")!.slice("Bearer ".length).trim();
  const db = drizzle(c.env.DB);
  await db.delete(sessions).where(eq(sessions.tokenHash, await sha256(rawToken)));
  return c.body(null, 204);
});
