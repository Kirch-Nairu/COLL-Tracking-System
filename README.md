# COLL Attendance & Member Management System

Mobile-first, fully serverless attendance and member-management system for COLL.

## Locked product authority

- The permanent QR belongs to the **member**.
- An authenticated **admin/officer scans the member QR** during an event.
- Members do not need accounts or a native mobile app for the primary attendance flow.
- Production remains fully serverless: React + Vite + TypeScript PWA, Hono on Cloudflare Workers, Cloudflare D1 + Drizzle, optional R2, `@zxing/browser`, `qrcode`, Zod, Vitest, and Playwright.
- Duplicate attendance is enforced at the database layer with `UNIQUE(event_id, member_id)`.
- QR payloads must use opaque unguessable tokens; do not place member PII in the QR.
- Certificates are post-MVP and must not block attendance delivery.

Implementation proceeds in waves, beginning with the Cloudflare/D1 foundation and a thin vertical slice proving member creation -> permanent QR -> event creation/open -> officer scan -> exactly one Present/Late attendance row -> duplicate rejection.
