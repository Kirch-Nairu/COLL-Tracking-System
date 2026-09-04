import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { clearToken, getToken } from "./api";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MembersPage } from "./pages/MembersPage";
import { EventsPage } from "./pages/EventsPage";
import { ScannerPage } from "./pages/ScannerPage";

function ProtectedShell() {
  const navigate = useNavigate();

  if (!getToken()) return <Navigate to="/login" replace />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          COLL
          <small>Attendance Operations</small>
        </div>
        <nav className="nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/members">Members</NavLink>
          <NavLink to="/events">Events</NavLink>
          <NavLink to="/scanner">Scanner</NavLink>
          <a href="#" onClick={(event) => {
            event.preventDefault();
            clearToken();
            navigate("/login");
          }}>Logout</a>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedShell />} />
    </Routes>
  );
}
