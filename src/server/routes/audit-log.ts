import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { auditLogs, officers } from '../db/schema';
import { requireAuth, requireRoles, type AppBindings } from '../middleware/auth';

export const auditLogRoutes = new Hono<AppBindings>();
auditLogRoutes.use('*', requireAuth, requireRoles('SUPER_ADMIN', 'ADMIN'));

auditLogRoutes.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const limitRaw = Number(c.req.query('limit') || '100');
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 500);
  const rows = await db.select({
    id: auditLogs.id,
    action: auditLogs.action,
    entityType: auditLogs.entityType,
    entityId: auditLogs.entityId,
    timestamp: auditLogs.timestamp,
    metadata: auditLogs.metadata,
    officerId: auditLogs.officerId,
    officerName: officers.fullName,
    officerEmail: officers.email
  }).from(auditLogs)
    .leftJoin(officers, eq(auditLogs.officerId, officers.id))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);

  return c.json({ audit: rows.map((row) => ({ ...row, metadata: safeParse(row.metadata) })) });
});

function safeParse(value: string) {
  try { return JSON.parse(value) as unknown; } catch { return {}; }
}
