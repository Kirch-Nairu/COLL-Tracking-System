import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createMemberSchema, updateMemberSchema } from '../../shared/schemas';
import { members } from '../db/schema';
import { audit } from '../lib/audit';
import { createMemberQrIdentity, deriveMemberQrToken } from '../lib/crypto';
import { requireAuth, requireRoles, type AppBindings } from '../middleware/auth';

export const memberRoutes = new Hono<AppBindings>();
memberRoutes.use('*', requireAuth);

memberRoutes.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select({
    id: members.id,
    memberNo: members.memberNo,
    fullName: members.fullName,
    position: members.position,
    category: members.category,
    phone: members.phone,
    email: members.email,
    status: members.status,
    createdAt: members.createdAt
  }).from(members).orderBy(desc(members.createdAt));
  return c.json({ members: rows });
});

memberRoutes.post('/', requireRoles('SUPER_ADMIN', 'ADMIN'), zValidator('json', createMemberSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const input = c.req.valid('json');
  const id = crypto.randomUUID();
  const qr = await createMemberQrIdentity(id, c.env.QR_SIGNING_SECRET);
  await db.insert(members).values({
    id,
    memberNo: input.memberNo,
    fullName: input.fullName,
    position: input.position,
    category: input.category,
    phone: input.phone,
    email: input.email,
    qrNonce: qr.nonce,
    qrTokenHash: qr.tokenHash
  });
  const officer = c.get('officer');
  await audit(db, officer.id, 'MEMBER_CREATED', 'MEMBER', id, { memberNo: input.memberNo });
  return c.json({
    member: { id, ...input, status: 'ACTIVE' },
    qrToken: qr.token
  }, 201);
});

memberRoutes.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const member = (await db.select().from(members).where(eq(members.id, c.req.param('id'))).limit(1))[0];
  if (!member) return c.json({ error: 'MEMBER_NOT_FOUND' }, 404);
  const { qrTokenHash: _hash, qrNonce: _nonce, ...safe } = member;
  return c.json({ member: safe });
});

memberRoutes.patch('/:id', requireRoles('SUPER_ADMIN', 'ADMIN'), zValidator('json', updateMemberSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const current = (await db.select().from(members).where(eq(members.id, id)).limit(1))[0];
  if (!current) return c.json({ error: 'MEMBER_NOT_FOUND' }, 404);
  await db.update(members).set({ ...input, updatedAt: new Date().toISOString() }).where(eq(members.id, id));
  await audit(db, c.get('officer').id, 'MEMBER_UPDATED', 'MEMBER', id, { fields: Object.keys(input) });
  return c.json({ ok: true });
});

memberRoutes.post('/:id/deactivate', requireRoles('SUPER_ADMIN', 'ADMIN'), async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  await db.update(members).set({ status: 'INACTIVE', updatedAt: new Date().toISOString() }).where(eq(members.id, id));
  await audit(db, c.get('officer').id, 'MEMBER_DEACTIVATED', 'MEMBER', id);
  return c.json({ ok: true });
});

memberRoutes.get('/:id/qr-token', requireRoles('SUPER_ADMIN', 'ADMIN'), async (c) => {
  const db = drizzle(c.env.DB);
  const member = (await db.select().from(members).where(eq(members.id, c.req.param('id'))).limit(1))[0];
  if (!member) return c.json({ error: 'MEMBER_NOT_FOUND' }, 404);
  const qrToken = await deriveMemberQrToken(member.id, member.qrNonce, c.env.QR_SIGNING_SECRET);
  return c.json({ qrToken });
});

memberRoutes.post('/:id/qr/regenerate', requireRoles('SUPER_ADMIN', 'ADMIN'), async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const member = (await db.select().from(members).where(eq(members.id, id)).limit(1))[0];
  if (!member) return c.json({ error: 'MEMBER_NOT_FOUND' }, 404);
  const qr = await createMemberQrIdentity(id, c.env.QR_SIGNING_SECRET);
  await db.update(members).set({ qrNonce: qr.nonce, qrTokenHash: qr.tokenHash, updatedAt: new Date().toISOString() }).where(eq(members.id, id));
  await audit(db, c.get('officer').id, 'MEMBER_QR_REGENERATED', 'MEMBER', id);
  return c.json({ qrToken: qr.token });
});
