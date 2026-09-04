# COLL Attendance & Member Management System

Mobile-first, fully serverless attendance and member-management system for COLL.

## Locked product authority

- The permanent QR belongs to the **member**.
- An authenticated **admin/officer scans the member QR** during an event.
- Members do not need accounts or a native mobile app for the primary attendance flow.
- Production remains fully serverless: React + Vite + TypeScript PWA, Hono on Cloudflare Workers, Cloudflare D1 + Drizzle, optional R2, `@zxing/browser`, `qrcode`, Zod, Vitest, and Playwright.
- Duplicate attendance is enforced at the database layer with `UNIQUE(event_id, member_id)`.
- QR payloads use opaque, cryptographically derived tokens; member PII is not embedded in the QR.
- Certificates are post-MVP and must not block attendance delivery.

## Current implementation

The repository now contains the production-shaped foundation and first vertical slice:

- Cloudflare Worker + Hono API
- D1 schema + reproducible migration + Drizzle schema
- Officer bootstrap/login/logout session foundation with PBKDF2 password hashing
- RBAC middleware for `SUPER_ADMIN`, `ADMIN`, `SCANNER`, and `VIEWER`
- Member registration, deactivate, permanent QR display, and QR regeneration
- Event creation and open/close attendance
- Browser-camera scanner using `@zxing/browser`
- Backend-authoritative QR validation and Present/Late calculation
- Race-safe duplicate protection through `UNIQUE(event_id, member_id)`
- Attendance records and basic operational dashboard
- Audit logging for privileged operations
- Vitest unit coverage and Playwright shell acceptance harness

## Local setup

Requirements: Node.js 20+ and a Cloudflare account for deployed D1.

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
```

Set strong values in `.dev.vars` for `QR_SIGNING_SECRET` and `BOOTSTRAP_SECRET`.

Create the local D1 schema:

```powershell
npm run db:migrate:local
```

Run the Worker API in terminal 1:

```powershell
npm run dev:worker
```

Run the Vite PWA in terminal 2:

```powershell
npm run dev
```

Open `http://127.0.0.1:5173`.

## First officer bootstrap

Bootstrap is intentionally allowed only while the officers table is empty and requires the separate bootstrap secret.

```powershell
$body = @{
  email = "admin@example.org"
  password = "replace-with-a-long-password"
  fullName = "COLL Super Admin"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8787/api/auth/bootstrap" `
  -Headers @{ "X-COLL-Bootstrap-Secret" = "YOUR_BOOTSTRAP_SECRET" } `
  -ContentType "application/json" `
  -Body $body
```

Then use those officer credentials on the web login screen.

## Cloudflare deployment preparation

1. Create D1 database `coll-attendance`.
2. Replace the placeholder `database_id` in `wrangler.toml`.
3. Configure Worker secrets:

```powershell
npx wrangler secret put QR_SIGNING_SECRET
npx wrangler secret put BOOTSTRAP_SECRET
```

4. Apply migrations and deploy:

```powershell
npm run db:migrate:remote
npm run deploy
```

## Verification

```powershell
npm run typecheck
npm test
npm run test:e2e
```

The core acceptance target remains: create member → permanent QR → create/open event → officer scans member QR → exactly one Present/Late attendance row → duplicate returns the original recorded attendance instead of inserting another row.
