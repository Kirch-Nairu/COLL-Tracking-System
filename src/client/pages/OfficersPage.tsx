import { FormEvent, useEffect, useState } from 'react';
import { ApiError, api } from '../api';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SCANNER' | 'VIEWER';
type Officer = { id: string; email: string; fullName: string; role: Role; status: 'ACTIVE' | 'INACTIVE'; createdAt: string };

export function OfficersPage() {
  const [rows, setRows] = useState<Officer[]>([]);
  const [form, setForm] = useState<{ email: string; password: string; fullName: string; role: Role }>({ email: '', password: '', fullName: '', role: 'SCANNER' });
  const [message, setMessage] = useState('');
  async function load() { setRows((await api<{ officers: Officer[] }>('/api/officers')).officers); }
  useEffect(() => { void load().catch(() => setMessage('SUPER_ADMIN access is required.')); }, []);

  async function create(event: FormEvent) {
    event.preventDefault(); setMessage('');
    try { await api('/api/officers', { method: 'POST', body: JSON.stringify(form) }); setForm({ email: '', password: '', fullName: '', role: 'SCANNER' }); setMessage('Officer created.'); await load(); }
    catch (error) { setMessage(error instanceof ApiError ? error.code : 'Officer creation failed.'); }
  }

  async function update(row: Officer, patch: Partial<Pick<Officer, 'role' | 'status'>>) {
    try { await api(`/api/officers/${row.id}`, { method: 'PATCH', body: JSON.stringify(patch) }); await load(); }
    catch (error) { setMessage(error instanceof ApiError ? error.code : 'Officer update failed.'); }
  }

  return <section><header className="page-header"><div><div className="eyebrow">ACCESS CONTROL</div><h1>Officers</h1><p className="muted">Only SUPER_ADMIN can create or change officer accounts.</p></div></header>{message && <div className="alert success">{message}</div>}<div className="split"><div className="panel table-panel"><h2>Officer accounts</h2><div className="table-wrap"><table><thead><tr><th>Officer</th><th>Role</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.fullName}</strong><small>{row.email}</small></td><td><select value={row.role} onChange={(e) => update(row, { role: e.target.value as Role })}><option>SUPER_ADMIN</option><option>ADMIN</option><option>SCANNER</option><option>VIEWER</option></select></td><td><select value={row.status} onChange={(e) => update(row, { status: e.target.value as Officer['status'] })}><option>ACTIVE</option><option>INACTIVE</option></select></td></tr>)}</tbody></table></div></div><form className="panel form-panel" onSubmit={create}><div className="eyebrow">NEW OFFICER</div><h2>Create account</h2><label>Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>Temporary password<input type="password" minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label><label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}><option>SCANNER</option><option>VIEWER</option><option>ADMIN</option><option>SUPER_ADMIN</option></select></label><button className="primary">Create officer</button></form></div></section>;
}
