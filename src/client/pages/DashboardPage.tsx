import { useEffect, useState } from "react";
import { api } from "../api";

type Dashboard = {
  totals: {
    activeMembers: number;
    events: number;
    attendanceRecords: number;
    openEvents: number;
  };
};

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Dashboard>("/api/dashboard").then(setData).catch((reason) => setError(String(reason)));
  }, []);

  return (
    <div className="stack">
      <header className="page-head"><h1>Dashboard</h1></header>
      {error && <div className="alert error">{error}</div>}
      <div className="grid grid-4">
        <div className="card"><div className="stat-label">Active members</div><div className="stat-value">{data?.totals.activeMembers ?? "—"}</div></div>
        <div className="card"><div className="stat-label">Events</div><div className="stat-value">{data?.totals.events ?? "—"}</div></div>
        <div className="card"><div className="stat-label">Attendance records</div><div className="stat-value">{data?.totals.attendanceRecords ?? "—"}</div></div>
        <div className="card"><div className="stat-label">Open attendance sessions</div><div className="stat-value">{data?.totals.openEvents ?? "—"}</div></div>
      </div>
      <div className="card">
        <h2>Operational model</h2>
        <p>Admin creates member → system issues permanent member QR → admin creates event → attendance opens → officer scans member QR → backend records exactly one Present/Late row.</p>
      </div>
    </div>
  );
}
