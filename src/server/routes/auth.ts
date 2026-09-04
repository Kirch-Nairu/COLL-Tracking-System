import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bootstrapOfficerSchema, loginSchema } from '../../shared/schemas';
import { officers, officerSessions } from '../db/schema';
import { hashPassword, randomToken, sha256, verifyPassword } from '../lib/crypto';
import { audit } from '../lib/audit';
import { requireAuth, type AppBindings } from '../middleware/auth';

export const authRoutes = new Hono<AppBindings>();

authRoutes.post('/bootstrap', zValidator('json', bootstrapOfficerSchema), async (c) => {
  if (!c.env.BOOTSTRAP_SECRET || c.req.header('X-COLL-Bootstrap-Secret') !== c.env.BOOTSTRAP_SECRET) {
    return c.json({ error: 'BOOTSTRAP_FORBIDDEN' }, 403);
  }
  const db = drizzle(c.env.DB);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(officers);
  if (Number(count) > 0) return c.json({ error: 'BOOTSTRAP_ALREADY_COMPLETED' }, 409);

  const input = c.req.valid('json');
  const password = await hashPassword(input.password);
  const id = crypto.randomUUID();
  await db.insert(officers).values({
    id,
    email: input.email.toLowerCase(),
    passwordSalt: password.salt,
    passwordHash: password.hash,
    passwordIterations: password.iterations,
    fullName: input.fullName,
    role: 'SUPER_ADMIN'
  });
  await audit(db, id, 'OFFICER_BOOTSTRAPPED', 'OFFICER', id);
  return c.json({ id, email: input.email.toLowerCase(), role: 'SUPER_ADMIN' }, 201);
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const input = c.req.valid('json');
  const officer = (await db.select().from(officers).where(eq(officers.email, input.email.toLowerCase())).limit(1))[0];
  if (!officer || officer.status !== 'ACTIVE') return c.json({ error: 'INVALID_CREDENTIALS' }, 401);

  const valid = await verifyPassword(input.password, officer.passwordSalt, officer.passwordIterations, officer.passwordHash);
  if (!valid) return c.json({ error: 'INVALID_CREDENTIALS' }, 401);

  const rawToken = randomToken(32);
  const ttlHours = Number(c.env.SESSION_TTL_HOURS || '12');
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  await db.insert(officerSessions).values({
    id: crypto.randomUUID(),
    officerId: officer.id,
    tokenHash: await sha256(rawToken),
    expiresAt
  });
  await audit(db, officer.id, 'OFFICER_LOGIN', 'OFFICER', officer.id);
  return c.json({
    token: rawToken,
    expiresAt,
    officer: { id: officer.id, email: officer.email, fullName: officer.fullName, role: officer.role }
  });
});

authRoutes.post('/logout', requireAuth, async (c) => {
  const authorization = c.req.header('Authorization')!;
  const tokenHash = await sha256(authorization.slice('Bearer '.length).trim());
  const db = drizzle(c.env.DB);
  await db.delete(officerSessions).where(eq(officerSessions.tokenHash, tokenHash));
  return c.json({ ok: true });
});

authRoutes.get('/me', requireAuth, (c) => c.json({ officer: c.get('officer') }));
