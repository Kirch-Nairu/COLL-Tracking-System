import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

type EventRow = {
  id: string; title: string; description: string; eventDate: string; startTime: string; lateAfter: string;
  timezone: string; venue: string; eventType: string; attendanceStatus: 'OPEN' | 'CLOSED';
};

const today = new Date().toISOString().slice(0, 10);
const empty = { title: '', description: '', eventDate: today, startTime: '08:00', lateAfter: '08:15', timezone: 'Asia/Manila', venue: '', eventType: '' };

export function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [form, setForm] = useState(empty);
  async function load() { setEvents((await api<{ events: EventRow[] }>('/api/events')).events); }
  useEffect(() => { void load(); }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    await api('/api/events', { method: 'POST', body: JSON.stringify(form) });
    setForm(empty); await load();
  }
  async function toggle(event: EventRow) {
    const action = event.attendanceStatus === 'OPEN' ? 'close-attendance' : 'open-attendance';
    await api(`/api/events/${event.id}/${action}`, { method: 'POST' });
    await load();
  }

  return <section>
    <header className="page-header"><div><div className="eyebrow">ACTIVITIES</div><h1>Events</h1></div></header>
    <div className="split">
      <div className="panel table-panel"><h2>Event sessions</h2><div className="event-list">
        {events.map((event) => <article className="event-card" key={event.id}>
          <div><div className="event-title"><strong>{event.title}</strong><span className={`badge ${event.attendanceStatus.toLowerCase()}`}>{event.attendanceStatus}</span></div><p>{event.eventDate} · {event.startTime} · late after {event.lateAfter}</p><small>{event.venue || 'No venue set'}</small></div>
          <div className="actions"><button className={event.attendanceStatus === 'OPEN' ? 'danger' : 'primary'} onClick={() => toggle(event)}>{event.attendanceStatus === 'OPEN' ? 'Close attendance' : 'Open attendance'}</button>{event.attendanceStatus === 'OPEN' && <Link className="button primary" to={`/events/${event.id}/scan`}>Scan</Link>}<Link className="button" to={`/events/${event.id}/attendance`}>Records</Link></div>
        </article>)}
      </div></div>
      <form className="panel form-panel" onSubmit={create}><div className="eyebrow">NEW EVENT</div><h2>Create activity</h2>
        <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
        <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>Date<input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required /></label>
        <div className="two"><label>Start<input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></label><label>Late after<input type="time" value={form.lateAfter} onChange={(e) => setForm({ ...form, lateAfter: e.target.value })} required /></label></div>
        <label>Venue<input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></label>
        <label>Activity type<input value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} /></label>
        <button className="primary">Create event</button>
      </form>
    </div>
  </section>;
}
