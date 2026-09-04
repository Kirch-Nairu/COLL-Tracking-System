PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS officers (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 210000,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN','SCANNER','VIEWER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS officer_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  officer_id TEXT NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY NOT NULL,
  member_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  qr_nonce TEXT NOT NULL,
  qr_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  late_after TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
  venue TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL DEFAULT '',
  attendance_status TEXT NOT NULL DEFAULT 'CLOSED' CHECK (attendance_status IN ('OPEN','CLOSED')),
  created_by TEXT NOT NULL REFERENCES officers(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id),
  scanned_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PRESENT','LATE')),
  scanned_by TEXT NOT NULL REFERENCES officers(id),
  check_in_method TEXT NOT NULL DEFAULT 'QR' CHECK (check_in_method IN ('QR','MANUAL')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, member_id)
);

CREATE INDEX IF NOT EXISTS attendance_event_idx ON attendance(event_id);
CREATE INDEX IF NOT EXISTS attendance_member_idx ON attendance(member_id);
CREATE INDEX IF NOT EXISTS events_date_idx ON events(event_date);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  officer_id TEXT REFERENCES officers(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_logs(entity_type, entity_id);
