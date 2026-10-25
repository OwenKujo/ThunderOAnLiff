import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './app/query-client';
import { LiffSessionProvider, useLiffSession } from './app/LiffSessionContext';
import { LoadingState, ErrorState } from './components/Ui';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ClassesPage } from './features/classes/ClassesPage';
import { BookingsPage } from './features/bookings/BookingsPage';
import { PackagePage } from './features/account/PackagePage';
import './styles.css';

const navItems = [
  { to: '/', label: 'Home', icon: '⌂', end: true },
  { to: '/classes', label: 'Classes', icon: '▦' },
  { to: '/bookings', label: 'Bookings', icon: '◷' },
  { to: '/package', label: 'Package', icon: '◈' },
];

function LiffAppShell() {
  const session = useLiffSession();
  if (session.loading) return <div className="liff-loading-screen"><div className="link-brand"><span className="link-logo">T</span><span>THUNDER <small>MUAYTHAI STUDIO</small></span></div><LoadingState text="Connecting to LINE securely…"/><p className="liff-loading-foot">VERIFYING YOUR MEMBER SESSION</p></div>;
  if (session.error || !session.token) return <main className="config-error-screen"><div className="link-brand"><span className="link-logo">T</span><span>THUNDER <small>MUAYTHAI STUDIO</small></span></div><p className="kicker">CONNECTION ISSUE</p><h1>Let’s get you<br /><em>connected.</em></h1><p>{session.error ?? 'LINE authentication is not available. Open this app from the configured LINE LIFF entry.'}</p><button className="action-button secondary" onClick={() => window.location.reload()}>Try again ↻</button></main>;

  return <BrowserRouter><div className="liff-app-shell"><header className="liff-topbar"><NavLink to="/" className="liff-brand"><span className="liff-brand-mark">T</span><span>THUNDER <small>MUAYTHAI</small></span></NavLink><div className="profile-chip">{session.profile?.pictureUrl ? <img src={session.profile.pictureUrl} alt=""/> : <span>{session.profile?.displayName?.slice(0, 1) ?? 'T'}</span>}<div><strong>{session.profile?.displayName ?? 'Trainee'}</strong><small>MEMBER SPACE</small></div></div></header><main className="liff-main"><Routes><Route path="/" element={<DashboardRoute/>}/><Route path="/classes" element={<ClassesPage/>}/><Route path="/bookings" element={<BookingsPage/>}/><Route path="/package" element={<PackagePage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></main><nav className="bottom-nav" aria-label="Member navigation">{navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `bottom-nav-item${isActive ? ' is-active' : ''}`}><span>{item.icon}</span><small>{item.label}</small></NavLink>)}</nav><footer className="liff-footer"><span>THUNDER MUAYTHAI</span><span>TRAIN WITH PURPOSE.</span></footer></div></BrowserRouter>;
}

function DashboardRoute() {
  const navigate = useNavigate();
  return <DashboardPage onBrowseClasses={() => navigate('/classes')}/>;
}

export function App() {
  return <QueryClientProvider client={queryClient}><LiffSessionProvider><LiffAppShell/></LiffSessionProvider></QueryClientProvider>;
}
