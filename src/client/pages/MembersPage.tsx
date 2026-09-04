import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";

type Member = {
  id: string;
  memberNo: string;
  fullName: string;
  position: string | null;
  category: string | null;
  status: "ACTIVE" | "INACTIVE";
};

type CreatedMember = {
  member: Member;
  qr: { token: string; dataUrl: string; warning?: string; version?: number };
};

export function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [createdQr, setCreatedQr] = useState<CreatedMember | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api<{ members: Member[] }>("/api/members");
      setMembers(data.members);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const result = await api<CreatedMember>("/api/members", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setCreatedQr(result);
      event.currentTarget.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  async function deactivate(id: string) {
    await api(`/api/members/${id}/deactivate`, { method: "POST", body: "{}" });
    await load();
  }

  async function regenerate(id: string, member: Member) {
    if (!confirm(`Regenerate ${member.fullName}'s QR? The previous QR will stop working.`)) return;
    const result = await api<{ qr: CreatedMember["qr"] }>(`/api/members/${id}/qr/regenerate`, {
      method: "POST",
      body: "{}"
    });
    setCreatedQr({ member, qr: result.qr });
  }

  return (
    <div className="stack">
      <header className="page-head"><h1>Members</h1></header>
      {error && <div className="alert error">{error}</div>}

      {createdQr && (
        <div className="card">
          <h2>Permanent QR ready — {createdQr.member.fullName}</h2>
          <p className="alert warning">{createdQr.qr.warning || "This regenerated QR replaces the previous member QR."}</p>
          <img className="qr-preview" src={createdQr.qr.dataUrl} alt={`QR for ${createdQr.member.fullName}`} />
          <div className="actions" style={{ marginTop: 12 }}>
            <a className="btn" href={createdQr.qr.dataUrl} download={`${createdQr.member.memberNo}-QR.png`}>Download QR PNG</a>
            <button className="btn secondary" onClick={() => setCreatedQr(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        <section className="card">
          <h2>Register member</h2>
          <form className="form-grid" onSubmit={create}>
            <label>Member number <input name="memberNo" placeholder="Optional, e.g. COLL-001" /></label>
            <label>Full name <input name="fullName" required /></label>
            <label>Position / role <input name="position" /></label>
            <label>Category <input name="category" /></label>
            <label>Phone <input name="phone" /></label>
            <label>Email <input name="email" type="email" /></label>
            <button className="btn">Create member + QR</button>
          </form>
        </section>

        <section className="card">
          <h2>Registry</h2>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Member</th><th>Position</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td><strong>{member.fullName}</strong><br/><span className="muted">{member.memberNo}</span></td>
                  <td>{member.position || "—"}</td>
                  <td><span className={`badge ${member.status.toLowerCase()}`}>{member.status}</span></td>
                  <td><div className="actions">
                    <button className="btn secondary" onClick={() => regenerate(member.id, member)}>Regenerate QR</button>
                    {member.status === "ACTIVE" && <button className="btn danger" onClick={() => deactivate(member.id)}>Deactivate</button>}
                  </div></td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
