import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

type Row = { id: string; scannedAt: string; status: string; memberNo: string; fullName: string; position: string; checkInMethod: string };

export function AttendancePage() {
  const { eventId = '' } = useParams();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => { void api<{ attendance: Row[] }>(`/api/events/${eventId}/attendance`).then((r) => setRows(r.attendance)); }, [eventId]);
  return <section><header className="page-header"><div><div className="eyebrow">EVENT RECORDS</div><h1>Attendance</h1></div><Link className="button primary" to={`/events/${eventId}/scan`}>Open scanner</Link></header>
    <div className="metrics"><article><small>Checked in</small><strong>{rows.length}</strong></article><article><small>Present</small><strong>{rows.filter((r) => r.status === 'PRESENT').length}</strong></article><article><small>Late</small><strong>{rows.filter((r) => r.status === 'LATE').length}</strong></article></div>
    <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Member</th><th>Status</th><th>Time</th><th>Method</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.fullName}</strong><small>{row.memberNo} · {row.position}</small></td><td><span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span></td><td>{new Date(row.scannedAt).toLocaleTimeString()}</td><td>{row.checkInMethod}</td></tr>)}</tbody></table></div></div>
  </section>;
}
