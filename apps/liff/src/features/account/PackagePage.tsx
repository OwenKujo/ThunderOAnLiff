import { useQuery } from '@tanstack/react-query';
import type { TraineeDashboard } from '@thunder/shared';
import { useLiffSession } from '../../app/LiffSessionContext';
import { liffApi } from '../../lib/api';
import { EmptyState, ErrorState, LoadingState, StatusPill } from '../../components/Ui';

export function PackagePage() {
  const { token } = useLiffSession();
  const query = useQuery({ queryKey: ['trainee-dashboard'], queryFn: () => liffApi.get<TraineeDashboard>('/trainee/dashboard', token!), enabled: Boolean(token) });
  if (query.isPending) return <LoadingState/>;
  if (query.isError) return <ErrorState message={query.error.message} retry={() => void query.refetch()}/>;
  const memberPackage = query.data.package;
  return <div className="trainee-page"><header className="screen-header"><div><p className="kicker">MEMBERSHIP DETAILS</p><h1>My package.</h1><p className="screen-description">See the package currently attached to your member profile.</p></div><span className="header-sigil">04</span></header>{memberPackage ? <section className="entitlement-card"><div className="entitlement-card-top"><span className="package-badge">◈ ACTIVE ENTITLEMENT</span><StatusPill status="ACTIVE"/></div><p className="kicker">YOUR CURRENT PLAN</p><h2>{memberPackage.name}</h2><p className="entitlement-type">{memberPackage.type.replaceAll('_', ' ').toLowerCase()}</p><div className="entitlement-balance"><span>Sessions available</span><strong>{memberPackage.remainingSessions == null ? '∞' : memberPackage.remainingSessions}</strong><small>{memberPackage.remainingSessions == null ? 'Unlimited package' : 'Credits ready to reserve a class'}</small></div><div className="entitlement-dates"><div><span>START DATE</span><strong>{new Date(memberPackage.startDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', year: 'numeric' })}</strong></div><div><span>EXPIRY DATE</span><strong>{memberPackage.endDate ? new Date(memberPackage.endDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', year: 'numeric' }) : 'No fixed expiry'}</strong></div></div><p className="entitlement-footnote">A session credit is reserved when a booking is confirmed. Cancellation is permitted at least 60 minutes before class starts.</p></section> : <EmptyState title="No active package" message="Please contact the studio admin to purchase or activate a training package."/>}</div>;
}
