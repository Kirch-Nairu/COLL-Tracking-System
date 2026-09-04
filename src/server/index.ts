import { Hono } from "hono";
import type { AppVariables, Bindings } from "./env";
import { authRoutes } from "./routes/auth";
import { memberRoutes } from "./routes/members";
import { eventRoutes } from "./routes/events";
import { attendanceRoutes } from "./routes/attendance";
import { dashboardRoutes } from "./routes/dashboard";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

app.get("/api/health", (c) => c.json({ ok: true, service: "coll-tracking-system" }));
app.route("/api/auth", authRoutes);
app.route("/api/members", memberRoutes);
app.route("/api/events", eventRoutes);
app.route("/api/events", attendanceRoutes);
app.route("/api/dashboard", dashboardRoutes);

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) return c.json({ error: "NOT_FOUND" }, 404);
  return c.env.ASSETS.fetch(c.req.raw);
});

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "INTERNAL_SERVER_ERROR" }, 500);
});

export default app;
