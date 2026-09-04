# KURT Massive Sprint — MVP Operations Wave

Branch: `KURT-MASSIVE-SPRINT-MVP-V1`

## Scope delivered in this sprint

- Server-backed dashboard metrics and recent check-ins
- Event attendance summary with derived ABSENT members
- Manual admin check-in fallback for unreadable/damaged QR
- Privileged attendance status correction with mandatory reason + audit log
- Individual member attendance history and attendance-rate baseline
- Daily, per-event, and overall reports
- Authenticated event CSV export
- SUPER_ADMIN officer account management
- ADMIN/SUPER_ADMIN audit log view
- QR regeneration controls with explicit old-token revocation UX
- CI branch coverage for all `KURT-*` workstreams

## Preserved invariants

- Permanent QR belongs to the member.
- QR contains opaque identity only; no member PII.
- Officer/admin scans the member QR.
- D1 remains authoritative for duplicate protection via `UNIQUE(event_id, member_id)`.
- ABSENT is derived; no eager absence rows are inserted.
- Attendance corrections are privileged and audited.
- Production architecture remains React/Vite PWA + Hono Worker + D1/Drizzle.

## Current attendance-rate eligibility baseline

Until COLL defines a more specific eligibility policy, an event is eligible for a member when its event date is on or after that member's registration date and not in the future. This rule is centralized and unit-tested so it can be replaced without rewriting reports.

## Still outside this sprint

- PDF report export
- native XLSX export (CSV is Excel-compatible)
- production Cloudflare D1 provisioning/credentials
- real Android + iPhone device acceptance
- optional certificates/R2
