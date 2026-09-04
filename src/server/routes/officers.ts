import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createOfficerSchema, updateOfficerSchema } from '../../shared/schemas';
import { officers } from '../db/schema';
import { audit } from '../lib/audit';
import { hashPassword } from '../lib/crypto';
import { requireAuth, requireRoles, type AppBindings } from '../middleware/auth';

export const officerRoutes = new Hono<AppBindings>();
officerRoutes.use('*', requireAuth, requireRoles('SUPER_ADMIN'));

officerRoutes.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select({
    id: officers.id,
    email: officers.email,
    fullName: officers.fullName,
    role: officers.role,
    status: officers.status,
    createdAt: officers.createdAt,
    updatedAt: officers.updatedAt
  }).from(officers).orderBy(asc(officers.fullName));
  return c.json({ officers: rows });
});

officerRoutes.post('/', zValidator('json', createOfficerSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const input = c.req.valid('json');
  const password = await hashPassword(input.password);
  const id = crypto.randomUUID();
  try {
    await db.insert(officers).values({
      id,
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      role: input.role,
      passwordSalt: password.salt,
      passwordHash: password.hash,
      passwordIterations: password.iterations
    });
  } catch {
    return c.json({ error: 'OFFICER_EMAIL_EXISTS' }, 409);
  }
  await audit(db, c.get('officer').id, 'OFFICER_CREATED', 'OFFICER', id, { email: input.email.toLowerCase(), role: input.role });
  return c.json({ officer: { id, email: input.email.toLowerCase(), fullName: input.fullName, role: input.role, status: 'ACTIVE' } }, 201);
});

officerRoutes.patch('/:id', zValidator('json', updateOfficerSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const input = c.req.valid('json');
  if (id === c.get('officer').id && input.status === 'INACTIVE') return c.json({ error: 'CANNOT_DEACTIVATE_SELF' }, 409);
  const existing = (await db.select().from(officers).where(eq(officers.id, id)).limit(1))[0];
  if (!existing) return c.json({ error: 'OFFICER_NOT_FOUND' }, 404);
  await db.update(officers).set({ ...input, updatedAt: new Date().toISOString() }).where(eq(officers.id, id));
  await audit(db, c.get('officer').id, 'OFFICER_UPDATED', 'OFFICER', id, { before: { role: existing.role, status: existing.status }, after: input });
  return c.json({ ok: true });
});
