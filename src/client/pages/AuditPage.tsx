import { useEffect, useState } from 'react';
import { api } from '../api';

type AuditRow = { id: string; action: string; entityType: string; entityId: string; timestamp: string; officerName: string | null; officerEmail: string | null; metadata: unknown };

export function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { void api<{ audit: AuditRow[] }>('/api/audit?limit=250').then((result) => setRows(result.audit)).catch(() => setError('Audit log is restricted to authorized administrators.')); }, []);
  return <section><header className="page-header"><div><div className="eyebrow">SECURITY & TRACEABILITY</div><h1>Audit log</h1><p className="muted">Privileged changes, attendance corrections, QR regeneration and operational actions.</p></div></header>{error && <div className="alert error">{error}</div>}<div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Timestamp</th><th>Officer</th><th>Action</th><th>Entity</th><th>Metadata</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{new Date(row.timestamp).toLocaleString()}</td><td><strong>{row.officerName || 'System'}</strong><small>{row.officerEmail || ''}</small></td><td>{row.action}</td><td>{row.entityType}<small>{row.entityId}</small></td><td><code>{JSON.stringify(row.metadata)}</code></td></tr>)}</tbody></table></div></div></section>;
}
