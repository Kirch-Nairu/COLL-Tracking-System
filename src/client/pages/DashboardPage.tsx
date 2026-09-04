import { useEffect, useState } from 'react';
import { api, setToken } from '../api';
import { useNavigate } from 'react-router-dom';

type Dashboard = {
  date: string;
  metrics: { totalMembers: number; activeMembers: number; totalEvents: number; openSessions: number; checkedInToday: number; presentToday: number; lateToday: number; attendancePercentToday: number };
  upcomingEvents: { id: string; title: string; eventDate: string; startTime: string; venue: string; attendanceStatus: string }[];
  recentAttendance: { id: string; status: string; scannedAt: string; memberNo: string; fullName: string; eventTitle: string }[];
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { void api<Dashboard>('/api/dashboard').then(setData).catch(() => setError('Dashboard data could not be loaded.')); }, []);

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } finally {
      setToken(null);
      navigate('/login');
    }
  }

  return (
    <section>
      <header className="page-header"><div><div className="eyebrow">OPERATIONS</div><h1>Dashboard</h1><p className="muted">{data?.date || 'Loading operational date…'}</p></div><button onClick={logout}>Logout</button></header>
      {error && <div className="alert error">{error}</div>}
      <div className="metrics">
        <article><small>Active members</small><strong>{data?.metrics.activeMembers ?? '—'}</strong><small>{data?.metrics.totalMembers ?? 0} total registry</small></article>
        <article><small>Checked in today</small><strong>{data?.metrics.checkedInToday ?? '—'}</strong><small>{data?.metrics.attendancePercentToday ?? 0}% of active members</small></article>
        <article><small>Present / Late</small><strong>{data ? `${data.metrics.presentToday} / ${data.metrics.lateToday}` : '—'}</strong></article>
        <article><small>Open sessions</small><strong>{data?.metrics.openSessions ?? '—'}</strong><small>{data?.metrics.totalEvents ?? 0} events total</small></article>
      </div>
      <div className="split">
        <div className="panel">
          <h2>Upcoming & active events</h2>
          {data?.upcomingEvents.length === 0 && <p className="muted">No upcoming events.</p>}
          {data?.upcomingEvents.map((event) => (
            <div className="row" key={event.id}>
              <div><strong>{event.title}</strong><small>{event.eventDate} · {event.startTime} · {event.venue || 'Venue not set'}</small></div>
              <div className="actions">
                <button onClick={() => navigate(`/events/${event.id}/attendance`)}>Records</button>
                {event.attendanceStatus === 'OPEN' && <button className="primary" onClick={() => navigate(`/events/${event.id}/scan`)}>Scan</button>}
              </div>
            </div>
          ))}
        </div>
        <div className="panel table-panel">
          <h2>Recent check-ins</h2>
          <div className="table-wrap"><table><thead><tr><th>Member</th><th>Event</th><th>Status</th><th>Time</th></tr></thead><tbody>
            {data?.recentAttendance.map((row) => <tr key={row.id}><td><strong>{row.fullName}</strong><small>{row.memberNo}</small></td><td>{row.eventTitle}</td><td><span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span></td><td>{new Date(row.scannedAt).toLocaleString()}</td></tr>)}
          </tbody></table></div>
        </div>
      </div>
    </section>
  );
}
