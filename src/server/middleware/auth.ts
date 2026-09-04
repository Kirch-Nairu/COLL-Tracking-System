import { and, eq, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { createMiddleware } from 'hono/factory';
import { officerSessions, officers } from '../db/schema';
import { sha256 } from '../lib/crypto';
import type { OfficerRole } from '../../shared/constants';

export type AuthOfficer = {
  id: string;
  email: string;
  fullName: string;
  role: OfficerRole;
};

export type AppBindings = {
  Bindings: Env;
  Variables: { officer: AuthOfficer };
};

export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  const authorization = c.req.header('Authorization');
  if (!authorization?.startsWith('Bearer ')) return c.json({ error: 'UNAUTHORIZED' }, 401);

  const rawToken = authorization.slice('Bearer '.length).trim();
  const tokenHash = await sha256(rawToken);
  const db = drizzle(c.env.DB);

  const rows = await db
    .select({
      id: officers.id,
      email: officers.email,
      fullName: officers.fullName,
      role: officers.role
    })
    .from(officerSessions)
    .innerJoin(officers, eq(officerSessions.officerId, officers.id))
    .where(and(
      eq(officerSessions.tokenHash, tokenHash),
      gt(officerSessions.expiresAt, new Date().toISOString()),
      eq(officers.status, 'ACTIVE')
    ))
    .limit(1);

  if (!rows[0]) return c.json({ error: 'UNAUTHORIZED' }, 401);
  c.set('officer', rows[0] as AuthOfficer);
  await next();
});

export function requireRoles(...roles: OfficerRole[]) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const officer = c.get('officer');
    if (!roles.includes(officer.role)) return c.json({ error: 'FORBIDDEN' }, 403);
    await next();
  });
}
