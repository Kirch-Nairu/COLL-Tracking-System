import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

type History = { member: { id: string; memberNo: string; fullName: string; position: string; category: string; status: string }; summary: { eligibleEvents: number; attended: number; absent: number; attendanceRate: number }; attendance: { id: string; eventId: string; eventTitle: string; eventDate: string; venue: string; eventType: string; status: string; scannedAt: string; checkInMethod: string }[] };

export function MemberHistoryPage() {
  const { memberId = '' } = useParams();
  const [data, setData] = useState<History | null>(null);
  useEffect(() => { void api<History>(`/api/reports/member/${memberId}`).then(setData); }, [memberId]);
  return <section><header className="page-header"><div><div className="eyebrow">MEMBER HISTORY</div><h1>{data?.member.fullName || 'Attendance history'}</h1><p className="muted">{data?.member.memberNo} · {data?.member.position}</p></div><Link className="button" to="/members">Back to members</Link></header><div className="metrics"><article><small>Eligible events</small><strong>{data?.summary.eligibleEvents ?? '—'}</strong></article><article><small>Attended</small><strong>{data?.summary.attended ?? '—'}</strong></article><article><small>Absent</small><strong>{data?.summary.absent ?? '—'}</strong></article><article><small>Attendance rate</small><strong>{data?.summary.attendanceRate ?? 0}%</strong></article></div><div className="panel table-panel"><p className="muted">Current eligibility baseline: events on or after the member registration date through today.</p><div className="table-wrap"><table><thead><tr><th>Event</th><th>Date</th><th>Status</th><th>Check-in</th></tr></thead><tbody>{data?.attendance.map((row) => <tr key={row.id}><td><strong>{row.eventTitle}</strong><small>{row.venue || row.eventType || '—'}</small></td><td>{row.eventDate}</td><td><span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span></td><td>{new Date(row.scannedAt).toLocaleString()}<small>{row.checkInMethod}</small></td></tr>)}</tbody></table></div></div></section>;
}
