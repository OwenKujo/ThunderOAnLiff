import { useQuery } from '@tanstack/react-query';
import type { TraineeDashboard } from '@thunder/shared';
import { useLiffSession } from '../../app/LiffSessionContext';
import { liffApi } from '../../lib/api';
import { ErrorState, LoadingState, StatusPill } from '../../components/Ui';
import { LinkAccountPage } from '../account/LinkAccountPage';

const fullDate = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(value));
const fullTime = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export function DashboardPage({ onBrowseClasses }: { onBrowseClasses: () => void }) {
  const { token } = useLiffSession();
  const query = useQuery({ queryKey: ['trainee-dashboard'], queryFn: () => liffApi.get<TraineeDashboard>('/trainee/dashboard', token!), enabled: Boolean(token) });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} retry={() => void query.refetch()} />;
  if (!query.data.linked) return <LinkAccountPage />;
  const data = query.data;
  const next = data.upcomingBookings?.[0];
  return <div className="trainee-page">
    <section className="welcome-card"><div className="welcome-copy"><p className="kicker">YOUR TRAINING SPACE</p><h1>Let’s get<br /><em>stronger.</em></h1><p>Welcome back, {data.trainee?.name.split(' ')[0]}.</p><div className="membership-state"><span className="status-light"/><span>{data.trainee?.memberStatus === 'ACTIVE' ? 'MEMBERSHIP ACTIVE' : data.trainee?.memberStatus.replaceAll('_', ' ')}</span></div></div><div className="welcome-number">TM<span>EST. 2026</span></div><div className="welcome-noise" /></section>
    <div className="liff-metric-row"><article className="liff-metric"><span>PACKAGE</span><strong>{data.package?.name ?? 'No active package'}</strong><small>{data.package?.endDate ? `Expires ${fullDate(data.package.endDate)}` : 'Manage your training access'}</small></article><article className="liff-metric metric-accent"><span>SESSIONS LEFT</span><strong>{data.package?.remainingSessions == null ? (data.package ? '∞' : '—') : data.package.remainingSessions}</strong><small>{data.package?.remainingSessions == null ? (data.package ? 'Unlimited package' : 'Choose a package') : 'Available to book'}</small></article></div>
    <section className="liff-section"><div className="section-title-row"><div><p className="kicker">UP NEXT</p><h2>Your next class</h2></div><button className="text-action" onClick={onBrowseClasses}>Explore classes ↗</button></div>{next ? <article className="next-class-card"><div className="next-class-date"><span>{fullDate(next.startAt).split(',')[0]}</span><strong>{new Date(next.startAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit' })}</strong><small>{new Date(next.startAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok', month: 'short' }).toUpperCase()}</small></div><div className="next-class-main"><div className="next-class-top"><span className="class-label">TRAINING SESSION</span><StatusPill status={next.status} /></div><h3>{next.className}</h3><p>{fullTime(next.startAt)} – {fullTime(next.endAt)} · {next.trainer}</p>{next.location && <small className="class-location">⌖ {next.location}</small>}</div><span className="next-arrow">↗</span></article> : <article className="empty-class-card"><span className="empty-symbol">◈</span><strong>Your next round starts here.</strong><p>Book a class and make time for your training.</p><button className="action-button primary" onClick={onBrowseClasses}>Find a class ↗</button></article>}</section>
    <section className="liff-section"><div className="section-title-row"><div><p className="kicker">YOUR PROGRESS</p><h2>Consistency counts.</h2></div><span className="progress-number">{data.attendanceRate == null ? '—' : `${data.attendanceRate}%`}</span></div><div className="progress-track"><span style={{ width: `${data.attendanceRate ?? 0}%` }}/></div><p className="progress-caption">Attendance rate from recorded sessions. Keep showing up.</p></section>
  </div>;
}
