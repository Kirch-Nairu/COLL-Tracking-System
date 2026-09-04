PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS officers (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN','SCANNER','VIEWER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  officer_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_officer_idx ON sessions(officer_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY NOT NULL,
  member_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  position TEXT,
  category TEXT,
  phone TEXT,
  email TEXT,
  qr_token_hash TEXT NOT NULL UNIQUE,
  qr_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  late_after TEXT NOT NULL,
  venue TEXT,
  event_type TEXT,
  attendance_status TEXT NOT NULL DEFAULT 'CLOSED' CHECK (attendance_status IN ('OPEN','CLOSED')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES officers(id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  scanned_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PRESENT','LATE')),
  scanned_by TEXT NOT NULL,
  check_in_method TEXT NOT NULL DEFAULT 'QR' CHECK (check_in_method IN ('QR','MANUAL')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (scanned_by) REFERENCES officers(id),
  UNIQUE(event_id, member_id)
);

CREATE INDEX IF NOT EXISTS attendance_event_idx ON attendance(event_id);
CREATE INDEX IF NOT EXISTS attendance_member_idx ON attendance(member_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  officer_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata TEXT,
  FOREIGN KEY (officer_id) REFERENCES officers(id)
);

CREATE INDEX IF NOT EXISTS audit_officer_idx ON audit_logs(officer_id);
CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_logs(entity_type, entity_id);
