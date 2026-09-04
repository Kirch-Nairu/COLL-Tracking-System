import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const officers = sqliteTable('officers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordSalt: text('password_salt').notNull(),
  passwordHash: text('password_hash').notNull(),
  passwordIterations: integer('password_iterations').notNull().default(210_000),
  fullName: text('full_name').notNull(),
  role: text('role', { enum: ['SUPER_ADMIN', 'ADMIN', 'SCANNER', 'VIEWER'] }).notNull(),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull().default('ACTIVE'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const officerSessions = sqliteTable('officer_sessions', {
  id: text('id').primaryKey(),
  officerId: text('officer_id').notNull().references(() => officers.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  memberNo: text('member_no').notNull().unique(),
  fullName: text('full_name').notNull(),
  position: text('position').notNull().default(''),
  category: text('category').notNull().default(''),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  qrNonce: text('qr_nonce').notNull(),
  qrTokenHash: text('qr_token_hash').notNull().unique(),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull().default('ACTIVE'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  eventDate: text('event_date').notNull(),
  startTime: text('start_time').notNull(),
  lateAfter: text('late_after').notNull(),
  timezone: text('timezone').notNull().default('Asia/Manila'),
  venue: text('venue').notNull().default(''),
  eventType: text('event_type').notNull().default(''),
  attendanceStatus: text('attendance_status', { enum: ['OPEN', 'CLOSED'] }).notNull().default('CLOSED'),
  createdBy: text('created_by').notNull().references(() => officers.id),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const attendance = sqliteTable('attendance', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  memberId: text('member_id').notNull().references(() => members.id),
  scannedAt: text('scanned_at').notNull(),
  status: text('status', { enum: ['PRESENT', 'LATE'] }).notNull(),
  scannedBy: text('scanned_by').notNull().references(() => officers.id),
  checkInMethod: text('check_in_method', { enum: ['QR', 'MANUAL'] }).notNull().default('QR'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => [
  uniqueIndex('attendance_event_member_unique').on(table.eventId, table.memberId)
]);

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  officerId: text('officer_id').references(() => officers.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  timestamp: text('timestamp').notNull().default(sql`CURRENT_TIMESTAMP`),
  metadata: text('metadata').notNull().default('{}')
});
