import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { TraineesPage } from './features/trainees/TraineesPage';
import { PackagesPage } from './features/packages/PackagesPage';
import { SchedulePage } from './features/schedule/SchedulePage';
import { PaymentsPage } from './features/payments/PaymentsPage';
import { AttendancePage } from './features/attendance/AttendancePage';

const navigation = [
  { to: '/', label: 'Overview', icon: '◫', end: true },
  { to: '/trainees', label: 'Trainees', icon: '◎' },
  { to: '/schedule', label: 'Class schedule', icon: '▦' },
  { to: '/packages', label: 'Packages', icon: '◈' },
  { to: '/payments', label: 'Payments', icon: '฿' },
  { to: '/attendance', label: 'Attendance', icon: '✓' },
];

function ProtectedRoutes() {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return <div className="admin-app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><div className="brand-mark">T</div><div><strong>THUNDER</strong><span>MUAYTHAI STUDIO</span></div></div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Admin navigation">{navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `side-nav-link${isActive ? ' is-active' : ''}`}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.to === '/payments' && <span className="nav-trailing">↗</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="system-status"><span className="system-dot" /><span>Operational system</span></div><div className="sidebar-version">THUNDER DESK <span>PHASE 1</span></div></div>
    </aside>
    <div className="admin-main-column">
      <header className="admin-topbar"><div className="breadcrumb"><span>Studio</span><span className="breadcrumb-separator">/</span><strong>{navigation.find((item) => item.to === location.pathname)?.label ?? navigation.find((item) => location.pathname.startsWith(item.to) && item.to !== '/')?.label ?? 'Operations'}</strong></div><div className="topbar-actions"><span className="topbar-date">{new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</span><AccountMenu /></div></header>
      <main className="admin-content"><Routes><Route path="/" element={<DashboardPage />} /><Route path="/trainees" element={<TraineesPage />} /><Route path="/schedule" element={<SchedulePage />} /><Route path="/packages" element={<PackagesPage />} /><Route path="/payments" element={<PaymentsPage />} /><Route path="/attendance" element={<AttendancePage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main>
    </div>
  </div>;
}

function AccountMenu() {
  const { admin, signOut } = useAuth();
  return <div className="account-menu"><span className="account-avatar">{admin?.email?.slice(0, 1).toUpperCase() ?? 'A'}</span><div className="account-meta"><strong>{admin?.email ?? 'Administrator'}</strong><span>{admin?.role ?? 'ADMIN'}</span></div><button className="icon-button signout-button" onClick={signOut} title="Sign out" aria-label="Sign out">↗</button></div>;
}

export function App() {
  return <BrowserRouter><AuthProvider><Routes><Route path="/login" element={<LoginRoute />} /><Route path="/*" element={<ProtectedRoutes />} /></Routes></AuthProvider></BrowserRouter>;
}
function LoginRoute() {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : <LoginPage />;
}
