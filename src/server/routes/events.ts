import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createEventSchema, updateEventSchema } from '../../shared/schemas';
import { events } from '../db/schema';
import { audit } from '../lib/audit';
import { requireAuth, requireRoles, type AppBindings } from '../middleware/auth';

export const eventRoutes = new Hono<AppBindings>();
eventRoutes.use('*', requireAuth);

eventRoutes.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  return c.json({ events: await db.select().from(events).orderBy(desc(events.eventDate)) });
});

eventRoutes.post('/', requireRoles('SUPER_ADMIN', 'ADMIN'), zValidator('json', createEventSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const input = c.req.valid('json');
  const id = crypto.randomUUID();
  await db.insert(events).values({
    id,
    title: input.title,
    description: input.description,
    eventDate: input.eventDate,
    startTime: input.startTime,
    lateAfter: input.lateAfter,
    timezone: input.timezone,
    venue: input.venue,
    eventType: input.eventType,
    createdBy: c.get('officer').id
  });
  await audit(db, c.get('officer').id, 'EVENT_CREATED', 'EVENT', id);
  return c.json({ id, ...input, attendanceStatus: 'CLOSED' }, 201);
});

eventRoutes.patch('/:id', requireRoles('SUPER_ADMIN', 'ADMIN'), zValidator('json', updateEventSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  await db.update(events).set({ ...c.req.valid('json'), updatedAt: new Date().toISOString() }).where(eq(events.id, id));
  await audit(db, c.get('officer').id, 'EVENT_UPDATED', 'EVENT', id);
  return c.json({ ok: true });
});

eventRoutes.post('/:id/open-attendance', requireRoles('SUPER_ADMIN', 'ADMIN'), async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  await db.update(events).set({ attendanceStatus: 'OPEN', updatedAt: new Date().toISOString() }).where(eq(events.id, id));
  await audit(db, c.get('officer').id, 'EVENT_ATTENDANCE_OPENED', 'EVENT', id);
  return c.json({ ok: true });
});

eventRoutes.post('/:id/close-attendance', requireRoles('SUPER_ADMIN', 'ADMIN'), async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  await db.update(events).set({ attendanceStatus: 'CLOSED', updatedAt: new Date().toISOString() }).where(eq(events.id, id));
  await audit(db, c.get('officer').id, 'EVENT_ATTENDANCE_CLOSED', 'EVENT', id);
  return c.json({ ok: true });
});
