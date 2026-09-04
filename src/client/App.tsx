import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { getToken } from './api';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MembersPage } from './pages/MembersPage';
import { EventsPage } from './pages/EventsPage';
import { ScannerPage } from './pages/ScannerPage';
import { AttendancePage } from './pages/AttendancePage';

function Guard({ children }: { children: React.ReactNode }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>COLL</span><small>Attendance Console</small></div>
        <nav>
          <Link className={location.pathname === '/dashboard' ? 'active' : ''} to="/dashboard">Dashboard</Link>
          <Link className={location.pathname.startsWith('/members') ? 'active' : ''} to="/members">Members</Link>
          <Link className={location.pathname.startsWith('/events') ? 'active' : ''} to="/events">Events</Link>
        </nav>
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
      <Route path="/events" element={<Protected><EventsPage /></Protected>} />
      <Route path="/events/:eventId/scan" element={<Protected><ScannerPage /></Protected>} />
      <Route path="/events/:eventId/attendance" element={<Protected><AttendancePage /></Protected>} />
      <Route path="*" element={<Navigate to={getToken() ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
