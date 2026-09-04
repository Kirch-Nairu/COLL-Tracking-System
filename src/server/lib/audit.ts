import type { DrizzleD1Database } from "drizzle-orm/d1";
import { auditLogs } from "../db/schema";

export async function writeAudit(
  db: DrizzleD1Database,
  input: {
    officerId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: unknown;
  }
) {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    officerId: input.officerId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    timestamp: new Date().toISOString(),
    metadata: input.metadata === undefined ? null : JSON.stringify(input.metadata)
  });
}
