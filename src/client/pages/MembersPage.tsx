import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../api';

type Member = {
  id: string; memberNo: string; fullName: string; position: string; category: string;
  phone: string; email: string; status: 'ACTIVE' | 'INACTIVE';
};

const empty = { memberNo: '', fullName: '', position: '', category: '', phone: '', email: '' };

export function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState(empty);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrMember, setQrMember] = useState('');
  const [message, setMessage] = useState('');

  async function load() { setMembers((await api<{ members: Member[] }>('/api/members')).members); }
  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault(); setMessage('');
    const result = await api<{ member: Member; qrToken: string }>('/api/members', { method: 'POST', body: JSON.stringify(form) });
    setForm(empty); await showQr(result.member, result.qrToken); setMessage(`${result.member.fullName} registered. Save or send the permanent QR.`); await load();
  }

  async function showExistingQr(member: Member) { const result = await api<{ qrToken: string }>(`/api/members/${member.id}/qr-token`); await showQr(member, result.qrToken); }
  async function regenerate(member: Member) {
    if (!confirm(`Regenerate ${member.fullName}'s QR? The old QR will stop working immediately.`)) return;
    const result = await api<{ qrToken: string }>(`/api/members/${member.id}/qr/regenerate`, { method: 'POST' });
    await showQr(member, result.qrToken); setMessage('QR regenerated. Previous QR revoked.');
  }
  async function showQr(member: Member, token: string) { setQrMember(`${member.memberNo} — ${member.fullName}`); setQrDataUrl(await QRCode.toDataURL(token, { width: 420, margin: 2, errorCorrectionLevel: 'M' })); }
  async function deactivate(member: Member) { if (!confirm(`Deactivate ${member.fullName}? Their QR will stop checking in.`)) return; await api(`/api/members/${member.id}/deactivate`, { method: 'POST' }); await load(); }

  return <section><header className="page-header"><div><div className="eyebrow">REGISTRY</div><h1>Members</h1></div></header>{message && <div className="alert success">{message}</div>}<div className="split"><div className="panel table-panel"><h2>Member database</h2><div className="table-wrap"><table><thead><tr><th>Member</th><th>Role / category</th><th>Status</th><th>Actions</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><strong>{member.fullName}</strong><small>{member.memberNo}</small></td><td>{member.position || '—'}<small>{member.category || 'Uncategorized'}</small></td><td><span className={`badge ${member.status.toLowerCase()}`}>{member.status}</span></td><td className="actions"><Link className="button" to={`/members/${member.id}/attendance`}>History</Link><button onClick={() => showExistingQr(member)}>QR</button><button onClick={() => regenerate(member)}>Regenerate</button>{member.status === 'ACTIVE' && <button className="danger" onClick={() => deactivate(member)}>Deactivate</button>}</td></tr>)}</tbody></table></div></div><form className="panel form-panel" onSubmit={create}><div className="eyebrow">NEW MEMBER</div><h2>Register member</h2><label>Member number<input value={form.memberNo} onChange={(e) => setForm({ ...form, memberNo: e.target.value })} required placeholder="COLL-001" /></label><label>Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label>Position / role<input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></label><label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label><label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><button className="primary">Register + generate QR</button></form></div>{qrDataUrl && <div className="modal-backdrop" onClick={() => setQrDataUrl('')}><div className="qr-modal" onClick={(e) => e.stopPropagation()}><div className="eyebrow">PERMANENT MEMBER QR</div><h2>{qrMember}</h2><img src={qrDataUrl} alt="Member QR" /><p>Contains an opaque member token only. No name, phone number, or other PII is embedded.</p><a className="button primary" href={qrDataUrl} download={`${qrMember.split(' — ')[0]}.png`}>Download QR</a><button onClick={() => setQrDataUrl('')}>Close</button></div></div>}</section>;
}
