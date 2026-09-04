# COLL Attendance & Member Management System

Mobile-first, fully serverless attendance and member-management system for COLL.

## Locked product authority

- The permanent QR belongs to the **member**.
- An authenticated **admin/officer scans the member QR** during an event.
- Members do not need accounts or a native mobile app for the primary attendance flow.
- Production remains fully serverless: React + Vite + TypeScript PWA, Hono on Cloudflare Workers, Cloudflare D1 + Drizzle, optional R2, `@zxing/browser`, `qrcode`, Zod, Vitest, and Playwright.
- Duplicate attendance is enforced at the database layer with `UNIQUE(event_id, member_id)`.
- QR payloads use opaque cryptographically secure tokens; member PII is not encoded in the QR.
- Certificates are post-MVP and do not block attendance delivery.

## Current implementation wave

Branch: `KIRCH-COLL-W0-FOUNDATION-V1`

Implemented foundation and vertical slice:

1. Cloudflare Worker + Hono API.
2. Cloudflare D1 schema/migration with Drizzle.
3. Officer bootstrap/login/session foundation with role enforcement.
4. Member creation, permanent QR issuance, deactivation, and QR regeneration.
5. Event creation and attendance open/close.
6. Mobile browser QR scanner using `@zxing/browser`.
7. Server-authoritative Present/Late classification.
8. Database-authoritative duplicate protection with `UNIQUE(event_id, member_id)`.
9. Duplicate responses return the existing check-in timestamp when available.
10. Audit records for bootstrap, login, member lifecycle, event attendance state, and check-in.
11. React/Vite/PWA operations shell.
12. Vitest unit coverage and Playwright shell acceptance test.

## Local setup

Prerequisites: Node.js 22+, npm, Cloudflare account/Wrangler authentication for remote D1.

```powershell
git clone https://github.com/Kirch-Nairu/COLL-Tracking-System.git
cd COLL-Tracking-System
git switch KIRCH-COLL-W0-FOUNDATION-V1
npm install
Copy-Item .dev.vars.example .dev.vars
```

Set a long random local bootstrap secret in `.dev.vars`.

Create the D1 database once:

```powershell
npx wrangler d1 create coll-tracking
```

Copy the returned database ID into `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`.

Apply the local migration:

```powershell
npm run db:migrate:local
```

Start development:

```powershell
npm run dev
```

The first officer is created exactly once through the bootstrap API:

```powershell
$body = @{
  email = "admin@example.com"
  fullName = "COLL Super Admin"
  password = "replace-with-a-strong-password"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:5173/api/auth/bootstrap" `
  -Headers @{ "x-bootstrap-secret" = "YOUR_LOCAL_BOOTSTRAP_SECRET" } `
  -ContentType "application/json" `
  -Body $body
```

After bootstrap, use the browser login page.

## Remote deployment preparation

Create the remote D1 database, place its ID in `wrangler.jsonc`, then configure the bootstrap secret as a Worker secret rather than a committed variable:

```powershell
npx wrangler secret put BOOTSTRAP_SECRET
npm run db:migrate:remote
npm run deploy
```

## Verification

```powershell
npm run typecheck
npm test
npm run build
```

Playwright:

```powershell
npx playwright install chromium
npm run dev
# separate terminal:
npm run test:e2e
```

## Security notes

The browser is not authoritative for attendance status or duplicate checks. The Worker validates the authenticated officer, event state, active member, opaque QR token, event date, Present/Late rule, and database uniqueness before returning success.

The raw QR token is only returned when a member QR is created or regenerated. D1 stores its SHA-256 hash, not the raw token. Administrators must download/send the QR immediately. Regenerating a QR invalidates the previous token.

## Next wave

Wave 1/2 completion work should deepen member CRUD and event/scanner acceptance before reports, corrections, and hardening. Certificates remain parked until MVP is stable.
