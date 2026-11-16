import { useQuery } from '@tanstack/react-query';
import type { TraineeDashboard } from '@thunder/shared';
import { useLiffSession } from '../../app/LiffSessionContext';
import { liffApi } from '../../lib/api';
import { EmptyState, ErrorState, LoadingState, StatusPill } from '../../components/Ui';
import { useLanguage } from '../../app/LanguageContext';

export function PackagePage() {
  const { token } = useLiffSession();
  const { t, language } = useLanguage();
  const locale = language === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB';
  const query = useQuery({ queryKey: ['trainee-dashboard'], queryFn: () => liffApi.get<TraineeDashboard>('/trainee/dashboard', token!), enabled: Boolean(token) });
  if (query.isPending) return <LoadingState/>;
  if (query.isError) return <ErrorState message={query.error.message} retry={() => void query.refetch()}/>;
  const memberPackage = query.data.package;
  return <div className="trainee-page"><header className="screen-header"><div><p className="kicker">{t('MEMBERSHIP DETAILS')}</p><h1>{t('My package.')}</h1><p className="screen-description">{t('See the package currently attached to your member profile.')}</p></div><span className="header-sigil">04</span></header>{memberPackage ? <section className="entitlement-card"><div className="entitlement-card-top"><span className="package-badge">◈ {t('ACTIVE ENTITLEMENT')}</span><StatusPill status="ACTIVE"/></div><p className="kicker">{t('YOUR CURRENT PLAN')}</p><h2>{memberPackage.name}</h2><p className="entitlement-type">{t(memberPackage.type)}</p><div className="entitlement-balance"><span>{t('Sessions available')}</span><strong>{memberPackage.remainingSessions == null ? '∞' : memberPackage.remainingSessions}</strong><small>{memberPackage.remainingSessions == null ? t('Unlimited package') : t('Credits ready to reserve a class')}</small></div><div className="entitlement-dates"><div><span>{t('START DATE')}</span><strong>{new Date(memberPackage.startDate).toLocaleDateString(locale, { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', year: 'numeric' })}</strong></div><div><span>{t('EXPIRY DATE')}</span><strong>{memberPackage.endDate ? new Date(memberPackage.endDate).toLocaleDateString(locale, { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', year: 'numeric' }) : t('No fixed expiry')}</strong></div></div><p className="entitlement-footnote">{t('A session credit is reserved when a booking is confirmed. Cancellation is permitted at least 60 minutes before class starts.')}</p></section> : <EmptyState title="No active package" message="Please contact the studio admin to purchase or activate a training package."/>}</div>;
}
