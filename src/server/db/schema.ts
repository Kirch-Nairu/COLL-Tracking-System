import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const officers = sqliteTable(
  "officers",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    fullName: text("full_name").notNull(),
    role: text("role", { enum: ["SUPER_ADMIN", "ADMIN", "SCANNER", "VIEWER"] }).notNull(),
    status: text("status", { enum: ["ACTIVE", "INACTIVE"] }).notNull().default("ACTIVE"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [uniqueIndex("officers_email_uq").on(table.email)]
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    officerId: text("officer_id")
      .notNull()
      .references(() => officers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull()
  },
  (table) => [
    uniqueIndex("sessions_token_uq").on(table.tokenHash),
    index("sessions_officer_idx").on(table.officerId),
    index("sessions_expiry_idx").on(table.expiresAt)
  ]
);

export const members = sqliteTable(
  "members",
  {
    id: text("id").primaryKey(),
    memberNo: text("member_no").notNull(),
    fullName: text("full_name").notNull(),
    position: text("position"),
    category: text("category"),
    phone: text("phone"),
    email: text("email"),
    qrTokenHash: text("qr_token_hash").notNull(),
    qrVersion: integer("qr_version").notNull().default(1),
    status: text("status", { enum: ["ACTIVE", "INACTIVE"] }).notNull().default("ACTIVE"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    uniqueIndex("members_member_no_uq").on(table.memberNo),
    uniqueIndex("members_qr_hash_uq").on(table.qrTokenHash)
  ]
);

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: text("event_date").notNull(),
  startTime: text("start_time").notNull(),
  lateAfter: text("late_after").notNull(),
  venue: text("venue"),
  eventType: text("event_type"),
  attendanceStatus: text("attendance_status", { enum: ["OPEN", "CLOSED"] }).notNull().default("CLOSED"),
  createdBy: text("created_by").notNull().references(() => officers.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const attendance = sqliteTable(
  "attendance",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    memberId: text("member_id").notNull().references(() => members.id),
    scannedAt: text("scanned_at").notNull(),
    status: text("status", { enum: ["PRESENT", "LATE"] }).notNull(),
    scannedBy: text("scanned_by").notNull().references(() => officers.id),
    checkInMethod: text("check_in_method", { enum: ["QR", "MANUAL"] }).notNull().default("QR")
  },
  (table) => [
    uniqueIndex("attendance_event_member_uq").on(table.eventId, table.memberId),
    index("attendance_event_idx").on(table.eventId),
    index("attendance_member_idx").on(table.memberId)
  ]
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    officerId: text("officer_id").notNull().references(() => officers.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    timestamp: text("timestamp").notNull(),
    metadata: text("metadata")
  },
  (table) => [
    index("audit_officer_idx").on(table.officerId),
    index("audit_entity_idx").on(table.entityType, table.entityId)
  ]
);
