import { and, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { Context, Next } from "hono";
import type { AppVariables, Bindings } from "../env";
import { officers, sessions } from "../db/schema";
import { sha256 } from "../lib/crypto";
import type { OfficerRole } from "../../shared/constants";

type AppContext = Context<{ Bindings: Bindings; Variables: AppVariables }>;

export async function requireAuth(c: AppContext, next: Next) {
  const authorization = c.req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return c.json({ error: "AUTH_REQUIRED" }, 401);
  }

  const rawToken = authorization.slice("Bearer ".length).trim();
  const tokenHash = await sha256(rawToken);
  const db = drizzle(c.env.DB);

  const row = await db
    .select({
      id: officers.id,
      email: officers.email,
      fullName: officers.fullName,
      role: officers.role,
      status: officers.status
    })
    .from(sessions)
    .innerJoin(officers, eq(officers.id, sessions.officerId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date().toISOString())))
    .limit(1);

  const user = row[0];
  if (!user || user.status !== "ACTIVE") {
    return c.json({ error: "SESSION_INVALID" }, 401);
  }

  c.set("authUser", {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role
  });

  await next();
}

const roleRank: Record<OfficerRole, number> = {
  VIEWER: 1,
  SCANNER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4
};

export function requireRole(minimum: OfficerRole) {
  return async (c: AppContext, next: Next) => {
    const user = c.get("authUser");
    if (!user || roleRank[user.role] < roleRank[minimum]) {
      return c.json({ error: "FORBIDDEN" }, 403);
    }
    await next();
  };
}
