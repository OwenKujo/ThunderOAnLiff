import { useQuery } from '@tanstack/react-query';
import type { AdminDashboard } from '@thunder/shared';
import { api } from '../../lib/api';
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from '../../components/Ui';

const numberFormat = new Intl.NumberFormat('en-US');
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });

export function DashboardPage() {
  const dashboard = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => api.get<AdminDashboard>('/admin/dashboard') });
  if (dashboard.isPending) return <LoadingState label="Loading today’s operations…" />;
  if (dashboard.isError) return <ErrorState message={dashboard.error.message} onRetry={() => void dashboard.refetch()} />;
  const data = dashboard.data;
  const cards = [
    { label: 'Active members', value: data.activeMembers, note: 'Members eligible to train', icon: '◎' },
    { label: 'Classes today', value: data.todayClasses, note: 'Scheduled in Thailand time', icon: '▦' },
    { label: 'Booked seats', value: data.bookedSeats, note: 'Across today’s classes', icon: '◷' },
    { label: 'Pending payments', value: data.pendingPayments, note: 'Needs admin review', icon: '฿' },
  ];
  return <div className="page-stack">
    <PageHeader eyebrow="OVERVIEW · OPERATIONS" title="Good day. Here’s the studio." description="A live view of membership, classes and today’s attendance." action={<button className="button button-secondary" onClick={() => void dashboard.refetch()}>↻ Refresh</button>} />
    <div className="metric-grid">{cards.map((card, index) => <article className={`metric-tile metric-tile-${index}`} key={card.label}><div className="metric-tile-top"><span>{card.label}</span><span className="metric-icon">{card.icon}</span></div><strong>{numberFormat.format(card.value)}</strong><small>{card.note}</small></article>)}</div>
    <div className="dashboard-columns">
      <Panel title="Today’s class roster" subtitle={`${data.todayBookings.length} booking records`} action={<span className="small-tag">LIVE DATA</span>}>
        {data.todayBookings.length === 0 ? <EmptyState title="No classes scheduled today" description="Classes scheduled for today will appear here." /> : <div className="table-wrap"><table><thead><tr><th>Time / Class</th><th>Trainee</th><th>Trainer</th><th>Status</th><th>Check-in</th></tr></thead><tbody>{data.todayBookings.map((item) => <tr key={item.bookingId}><td><strong>{timeFormat.format(new Date(item.startAt))}</strong><span className="table-subtext">{item.className}</span></td><td>{item.traineeName}</td><td>{item.trainer}</td><td><StatusBadge value={item.status} /></td><td>{item.checkedInAt ? timeFormat.format(new Date(item.checkedInAt)) : <span className="muted">—</span>}</td></tr>)}</tbody></table></div>}
      </Panel>
      <div className="side-metrics">
        <article className="highlight-card"><div className="highlight-icon">✓</div><p className="eyebrow">ATTENDANCE</p><strong>{numberFormat.format(data.todayCheckIns)}</strong><span>check-ins recorded today</span><div className="highlight-rule" /></article>
        <article className="mini-insight"><div><span className="mini-insight-icon">◷</span><strong>Upcoming expiry</strong></div><span className="insight-number">{data.packagesNearExpiry}</span><p className="muted">Package entitlements ending within seven days.</p></article>
      </div>
    </div>
  </div>;
}
