import { useEffect, useState } from 'react';
import { api, downloadApiFile } from '../api';

type Event = { id: string; title: string; eventDate: string };
type Daily = { date: string; summary: { events: number; checkIns: number; present: number; late: number; uniqueMembers: number }; attendance: { id: string; eventTitle: string; fullName: string; memberNo: string; status: string; scannedAt: string }[] };
type EventReport = { event: Event; summary: { eligible: number; checkedIn: number; present: number; late: number; absent: number; attendanceRate: number } };
type Overall = { summary: { totalMembers: number; activeMembers: number; totalEvents: number; totalAttendance: number; present: number; late: number } };

export function ReportsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState('');
  const [eventReport, setEventReport] = useState<EventReport | null>(null);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [daily, setDaily] = useState<Daily | null>(null);
  const [overall, setOverall] = useState<Overall | null>(null);

  useEffect(() => {
    void Promise.all([api<{ events: Event[] }>('/api/events'), api<Overall>('/api/reports/overall')]).then(([eventData, overallData]) => {
      setEvents(eventData.events); setOverall(overallData); if (eventData.events[0]) setEventId(eventData.events[0].id);
    });
    void loadDaily(date);
  }, []);

  async function loadDaily(value: string) { setDaily(await api<Daily>(`/api/reports/daily?date=${encodeURIComponent(value)}`)); }
  async function loadEvent() { if (eventId) setEventReport(await api<EventReport>(`/api/reports/event/${eventId}`)); }
  async function exportEvent() {
    if (!eventId) return;
    const selected = events.find((event) => event.id === eventId);
    await downloadApiFile(`/api/reports/event/${eventId}/csv`, `${selected?.title || 'event'}-${selected?.eventDate || ''}.csv`);
  }

  return <section>
    <header className="page-header"><div><div className="eyebrow">ANALYTICS & EXPORT</div><h1>Reports</h1><p className="muted">Daily, event, member-history and overall operational reporting.</p></div></header>
    <div className="metrics"><article><small>Total members</small><strong>{overall?.summary.totalMembers ?? '—'}</strong><small>{overall?.summary.activeMembers ?? 0} active</small></article><article><small>Total events</small><strong>{overall?.summary.totalEvents ?? '—'}</strong></article><article><small>Total check-ins</small><strong>{overall?.summary.totalAttendance ?? '—'}</strong></article><article><small>Present / Late</small><strong>{overall ? `${overall.summary.present} / ${overall.summary.late}` : '—'}</strong></article></div>
    <div className="split">
      <div className="panel form-panel"><div className="eyebrow">DAILY</div><h2>Daily attendance</h2><label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><button className="primary" onClick={() => loadDaily(date)}>Load day</button>{daily && <div className="metrics"><article><small>Events</small><strong>{daily.summary.events}</strong></article><article><small>Check-ins</small><strong>{daily.summary.checkIns}</strong></article><article><small>Present</small><strong>{daily.summary.present}</strong></article><article><small>Late</small><strong>{daily.summary.late}</strong></article></div>}</div>
      <div className="panel form-panel"><div className="eyebrow">EVENT</div><h2>Per-event report</h2><label>Event<select value={eventId} onChange={(e) => setEventId(e.target.value)}><option value="">Select event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.eventDate} — {event.title}</option>)}</select></label><div className="actions"><button className="primary" onClick={loadEvent}>Load report</button><button onClick={exportEvent}>Export CSV</button></div>{eventReport && <div className="metrics"><article><small>Eligible</small><strong>{eventReport.summary.eligible}</strong></article><article><small>Checked in</small><strong>{eventReport.summary.checkedIn}</strong><small>{eventReport.summary.attendanceRate}%</small></article><article><small>Present</small><strong>{eventReport.summary.present}</strong></article><article><small>Late / Absent</small><strong>{eventReport.summary.late} / {eventReport.summary.absent}</strong></article></div>}</div>
    </div>
    <div className="panel table-panel"><h2>Daily detail</h2><div className="table-wrap"><table><thead><tr><th>Event</th><th>Member</th><th>Status</th><th>Time</th></tr></thead><tbody>{daily?.attendance.map((row) => <tr key={row.id}><td>{row.eventTitle}</td><td><strong>{row.fullName}</strong><small>{row.memberNo}</small></td><td><span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span></td><td>{new Date(row.scannedAt).toLocaleTimeString()}</td></tr>)}</tbody></table></div></div>
  </section>;
}
