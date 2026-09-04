import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api, getToken } from './api';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MembersPage } from './pages/MembersPage';
import { EventsPage } from './pages/EventsPage';
import { ScannerPage } from './pages/ScannerPage';
import { AttendancePage } from './pages/AttendancePage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';
import { OfficersPage } from './pages/OfficersPage';
import { MemberHistoryPage } from './pages/MemberHistoryPage';

type Officer = { id: string; fullName: string; email: string; role: 'SUPER_ADMIN' | 'ADMIN' | 'SCANNER' | 'VIEWER' };

function Guard({ children }: { children: React.ReactNode }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [officer, setOfficer] = useState<Officer | null>(null);
  useEffect(() => { void api<{ officer: Officer }>('/api/auth/me').then((result) => setOfficer(result.officer)).catch(() => undefined); }, []);
  const administrative = officer?.role === 'SUPER_ADMIN' || officer?.role === 'ADMIN';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>COLL</span><small>Attendance Console</small></div>
        <nav>
          <Link className={location.pathname === '/dashboard' ? 'active' : ''} to="/dashboard">Dashboard</Link>
          <Link className={location.pathname.startsWith('/members') ? 'active' : ''} to="/members">Members</Link>
          <Link className={location.pathname.startsWith('/events') ? 'active' : ''} to="/events">Events</Link>
          <Link className={location.pathname.startsWith('/reports') ? 'active' : ''} to="/reports">Reports</Link>
          {administrative && <Link className={location.pathname.startsWith('/audit') ? 'active' : ''} to="/audit">Audit</Link>}
          {officer?.role === 'SUPER_ADMIN' && <Link className={location.pathname.startsWith('/officers') ? 'active' : ''} to="/officers">Officers</Link>}
        </nav>
        {officer && <div className="sidebar-footer"><strong>{officer.fullName}</strong><small>{officer.role}</small></div>}
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  return <Guard><Shell>{children}</Shell></Guard>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/members" element={<Protected><MembersPage /></Protected>} />
      <Route path="/members/:memberId/attendance" element={<Protected><MemberHistoryPage /></Protected>} />
      <Route path="/events" element={<Protected><EventsPage /></Protected>} />
      <Route path="/events/:eventId/scan" element={<Protected><ScannerPage /></Protected>} />
      <Route path="/events/:eventId/attendance" element={<Protected><AttendancePage /></Protected>} />
      <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />
      <Route path="/audit" element={<Protected><AuditPage /></Protected>} />
      <Route path="/officers" element={<Protected><OfficersPage /></Protected>} />
      <Route path="*" element={<Navigate to={getToken() ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
