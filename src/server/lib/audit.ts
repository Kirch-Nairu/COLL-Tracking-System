import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { auditLogs } from '../db/schema';

export async function audit(
  db: DrizzleD1Database,
  officerId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
) {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    officerId,
    action,
    entityType,
    entityId,
    metadata: JSON.stringify(metadata)
  });
}
