import { useEffect, useState } from 'react';
import { api, setToken } from '../api';
import { useNavigate } from 'react-router-dom';

type Member = { id: string; status: string };
type Event = { id: string; title: string; eventDate: string; attendanceStatus: string };

export function DashboardPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  useEffect(() => {
    Promise.all([
      api<{ members: Member[] }>('/api/members'),
      api<{ events: Event[] }>('/api/events')
    ]).then(([m, e]) => { setMembers(m.members); setEvents(e.events); });
  }, []);

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } finally {
      setToken(null);
      navigate('/login');
    }
  }

  const open = events.filter((event) => event.attendanceStatus === 'OPEN');
  return (
    <section>
      <header className="page-header"><div><div className="eyebrow">OPERATIONS</div><h1>Dashboard</h1></div><button onClick={logout}>Logout</button></header>
      <div className="metrics">
        <article><small>Total members</small><strong>{members.length}</strong></article>
        <article><small>Active members</small><strong>{members.filter((m) => m.status === 'ACTIVE').length}</strong></article>
        <article><small>Events</small><strong>{events.length}</strong></article>
        <article><small>Attendance open</small><strong>{open.length}</strong></article>
      </div>
      <div className="panel">
        <h2>Open attendance sessions</h2>
        {open.length === 0 ? <p className="muted">No event is currently accepting attendance.</p> : open.map((event) => (
          <div className="row" key={event.id}><div><strong>{event.title}</strong><small>{event.eventDate}</small></div><button className="primary" onClick={() => navigate(`/events/${event.id}/scan`)}>Open scanner</button></div>
        ))}
      </div>
    </section>
  );
}
