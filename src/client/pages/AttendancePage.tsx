import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api } from '../api';

type Row = { id: string; scannedAt: string; status: 'PRESENT' | 'LATE'; memberId: string; memberNo: string; fullName: string; position: string; checkInMethod: string };
type Absent = { id: string; memberNo: string; fullName: string; position: string; category: string };
type Report = { event: { id: string; title: string; eventDate: string; attendanceStatus: string }; summary: { eligible: number; checkedIn: number; present: number; late: number; absent: number; attendanceRate: number }; attendance: Row[]; absent: Absent[] };

export function AttendancePage() {
  const { eventId = '' } = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ABSENT'>('ALL');
  const [memberNo, setMemberNo] = useState('');
  const [message, setMessage] = useState('');

  async function load() { setReport(await api<Report>(`/api/reports/event/${eventId}`)); }
  useEffect(() => { void load(); }, [eventId]);

  const rows = useMemo(() => {
    if (!report) return [];
    if (filter === 'PRESENT' || filter === 'LATE') return report.attendance.filter((row) => row.status === filter);
    return report.attendance;
  }, [filter, report]);

  async function manualCheckIn(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      await api(`/api/events/${eventId}/manual-check-in`, { method: 'POST', body: JSON.stringify({ memberNo }) });
      setMemberNo('');
      setMessage('Manual check-in recorded and audited.');
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : 'Manual check-in failed.');
    }
  }

  async function correct(row: Row) {
    const next = row.status === 'PRESENT' ? 'LATE' : 'PRESENT';
    const reason = prompt(`Reason for changing ${row.fullName} from ${row.status} to ${next}:`);
    if (!reason) return;
    try {
      await api(`/api/attendance/${row.id}`, { method: 'PATCH', body: JSON.stringify({ status: next, reason }) });
      setMessage(`Attendance corrected to ${next}.`);
      await load();
    } catch (error) { setMessage(error instanceof ApiError ? error.code : 'Correction failed.'); }
  }

  return <section>
    <header className="page-header"><div><div className="eyebrow">EVENT RECORDS</div><h1>{report?.event.title || 'Attendance'}</h1><p className="muted">{report?.event.eventDate}</p></div><div className="actions"><Link className="button" to="/reports">Reports</Link><Link className="button primary" to={`/events/${eventId}/scan`}>Open scanner</Link></div></header>
    {message && <div className="alert success">{message}</div>}
    <div className="metrics"><article><small>Eligible</small><strong>{report?.summary.eligible ?? '—'}</strong></article><article><small>Checked in</small><strong>{report?.summary.checkedIn ?? '—'}</strong><small>{report?.summary.attendanceRate ?? 0}%</small></article><article><small>Present</small><strong>{report?.summary.present ?? '—'}</strong></article><article><small>Late / Absent</small><strong>{report ? `${report.summary.late} / ${report.summary.absent}` : '—'}</strong></article></div>
    <div className="panel"><div className="actions"><button onClick={() => setFilter('ALL')}>All</button><button onClick={() => setFilter('PRESENT')}>Present</button><button onClick={() => setFilter('LATE')}>Late</button><button onClick={() => setFilter('ABSENT')}>Absent</button></div></div>
    {filter === 'ABSENT' ? <div className="panel table-panel"><h2>Derived absent members</h2><p className="muted">No ABSENT rows are stored. This list is derived from active eligible members with no attendance row.</p><div className="table-wrap"><table><thead><tr><th>Member</th><th>Position</th><th>Category</th></tr></thead><tbody>{report?.absent.map((member) => <tr key={member.id}><td><strong>{member.fullName}</strong><small>{member.memberNo}</small></td><td>{member.position || '—'}</td><td>{member.category || '—'}</td></tr>)}</tbody></table></div></div> : <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Member</th><th>Status</th><th>Time</th><th>Method</th><th>Correction</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.fullName}</strong><small>{row.memberNo} · {row.position}</small></td><td><span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span></td><td>{new Date(row.scannedAt).toLocaleTimeString()}</td><td>{row.checkInMethod}</td><td><button onClick={() => correct(row)}>Change status</button></td></tr>)}</tbody></table></div></div>}
    <form className="panel form-panel" onSubmit={manualCheckIn}><div className="eyebrow">FALLBACK</div><h2>Manual member check-in</h2><p className="muted">Admin-only fallback for damaged or unreadable QR codes. The action is audited.</p><label>Member number<input value={memberNo} onChange={(e) => setMemberNo(e.target.value)} placeholder="COLL-001" required /></label><button className="primary">Record manual check-in</button></form>
  </section>;
}
