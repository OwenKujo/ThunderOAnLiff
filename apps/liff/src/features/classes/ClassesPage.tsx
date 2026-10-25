import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClassRecord } from '@thunder/shared';
import { useLiffSession } from '../../app/LiffSessionContext';
import { liffApi } from '../../lib/api';
import { EmptyState, ErrorState, LoadingState, StatusPill } from '../../components/Ui';

const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', weekday: 'short', day: '2-digit', month: 'short' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });

export function ClassesPage() {
  const { token } = useLiffSession();
  const client = useQueryClient();
  const [notice, setNotice] = useState('');
  const classes = useQuery({ queryKey: ['open-classes'], queryFn: () => liffApi.get<ClassRecord[]>('/classes', token!), enabled: Boolean(token) });
  const book = useMutation({
    mutationFn: (classScheduleId: string) => liffApi.post('/trainee/bookings', token!, { classScheduleId }),
    onSuccess: async () => { setNotice('Class reserved successfully. A confirmation will be sent in LINE OA.'); await Promise.all([client.invalidateQueries({ queryKey: ['open-classes'] }), client.invalidateQueries({ queryKey: ['trainee-bookings'] }), client.invalidateQueries({ queryKey: ['trainee-dashboard'] })]); },
    onError: (error) => setNotice(error.message),
  });
  const grouped = useMemo(() => {
    const map = new Map<string, ClassRecord[]>();
    for (const item of classes.data ?? []) { const key = dateFormat.format(new Date(item.startAt)); map.set(key, [...(map.get(key) ?? []), item]); }
    return [...map.entries()];
  }, [classes.data]);

  return <div className="trainee-page">
    <header className="screen-header"><div><p className="kicker">FIND YOUR NEXT SESSION</p><h1>Book a class.</h1><p className="screen-description">Pick a session that fits your plan. Your package eligibility and available seats are checked when you confirm.</p></div><span className="header-sigil">02</span></header>
    {notice && <div className={`liff-notice ${book.isError ? 'notice-error' : ''}`} role="status"><span>{book.isError ? '!' : '✓'}</span><p>{notice}</p><button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div>}
    {classes.isPending ? <LoadingState text="Finding upcoming classes…"/> : classes.isError ? <ErrorState message={classes.error.message} retry={() => void classes.refetch()}/> : !classes.data?.length ? <EmptyState title="No classes open for booking" message="Check back later or contact the studio admin."/> : <div className="schedule-groups">{grouped.map(([date, items]) => <section className="schedule-group" key={date}><h2>{date}</h2><div className="available-class-list">{items.map((item) => <article className="available-class-card" key={item.id}><div className="available-class-time"><strong>{timeFormat.format(new Date(item.startAt))}</strong><span>{timeFormat.format(new Date(item.endAt))}</span></div><div className="available-class-detail"><div className="available-class-heading"><h3>{item.title}</h3><StatusPill status={item.status}/></div><p>{item.trainer.name}{item.trainer.specialty ? ` · ${item.trainer.specialty}` : ''}</p>{item.location && <small>⌖ {item.location}</small>}<div className="spots-line"><span className="spots-track"><span style={{ width: `${Math.min(100, item.bookedCount / item.capacity * 100)}%` }}/></span><span>{item.spotsRemaining} spots left</span></div></div><button className="action-button primary book-button" disabled={item.status !== 'OPEN' || item.spotsRemaining <= 0 || book.isPending} onClick={() => { setNotice(''); book.mutate(item.id); }}>{book.isPending ? 'Booking…' : item.spotsRemaining <= 0 ? 'Full' : 'Book class ↗'}</button></article>)}</div></section>)}</div>}
    <p className="rules-note"><span>i</span> You can cancel a booking up to 60 minutes before class starts. Late cancellations and no-shows follow your package terms.</p>
  </div>;
}
