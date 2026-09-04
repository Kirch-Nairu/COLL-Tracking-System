import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { authRoutes } from './routes/auth';
import { memberRoutes } from './routes/members';
import { eventRoutes } from './routes/events';
import { attendanceRoutes } from './routes/attendance';
import { dashboardRoutes } from './routes/dashboard';
import { reportRoutes } from './routes/reports';
import { officerRoutes } from './routes/officers';
import { auditLogRoutes } from './routes/audit-log';
import type { AppBindings } from './middleware/auth';

const app = new Hono<AppBindings>();
app.use('*', secureHeaders());
app.use('/api/*', cors({ origin: (origin) => origin, credentials: false }));

app.get('/api/health', (c) => c.json({ ok: true, service: 'coll-attendance-system' }));
app.route('/api/auth', authRoutes);
app.route('/api/members', memberRoutes);
app.route('/api/events', eventRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/officers', officerRoutes);
app.route('/api/audit', auditLogRoutes);
app.route('/api', attendanceRoutes);

app.notFound(async (c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'NOT_FOUND' }, 404);
  return c.env.ASSETS.fetch(c.req.raw);
});

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: 'INTERNAL_ERROR' }, 500);
});

export default app;
