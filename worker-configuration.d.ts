interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  SESSION_TTL_HOURS: string;
  QR_SIGNING_SECRET: string;
  BOOTSTRAP_SECRET: string;
}
