import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookingRecord } from '@thunder/shared';
import { useLiffSession } from '../../app/LiffSessionContext';
import { liffApi } from '../../lib/api';
import { EmptyState, ErrorState, LoadingState, StatusPill } from '../../components/Ui';

const dateTime = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
function canCancel(booking: BookingRecord) { return booking.status === 'BOOKED' && Date.now() <= new Date(booking.classSchedule.startAt).getTime() - 60 * 60 * 1000; }

export function BookingsPage() {
  const { token } = useLiffSession();
  const client = useQueryClient();
  const [filter, setFilter] = useState<'UPCOMING' | 'HISTORY'>('UPCOMING');
  const [notice, setNotice] = useState('');
  const bookings = useQuery({ queryKey: ['trainee-bookings'], queryFn: () => liffApi.get<BookingRecord[]>('/trainee/bookings', token!), enabled: Boolean(token) });
  const cancel = useMutation({
    mutationFn: (id: string) => liffApi.post(`/trainee/bookings/${id}/cancel`, token!, { reason: 'Cancelled by trainee' }),
    onSuccess: async () => { setNotice('Booking cancelled. Your session credit has been returned according to the package rules.'); await Promise.all([client.invalidateQueries({ queryKey: ['trainee-bookings'] }), client.invalidateQueries({ queryKey: ['trainee-dashboard'] }), client.invalidateQueries({ queryKey: ['open-classes'] })]); },
    onError: (error) => setNotice(error.message),
  });
  const now = Date.now();
  const visible = (bookings.data ?? []).filter((item) => filter === 'UPCOMING' ? new Date(item.classSchedule.startAt).getTime() >= now && ['BOOKED', 'CHECKED_IN'].includes(item.status) : new Date(item.classSchedule.startAt).getTime() < now || ['CANCELLED', 'NO_SHOW', 'ATTENDED', 'COMPLETED'].includes(item.status));

  return <div className="trainee-page"><header className="screen-header"><div><p className="kicker">YOUR TRAINING HISTORY</p><h1>My bookings.</h1><p className="screen-description">Keep track of upcoming sessions and your past work.</p></div><span className="header-sigil">03</span></header>
    {notice && <div className={`liff-notice ${cancel.isError ? 'notice-error' : ''}`} role="status"><span>{cancel.isError ? '!' : '✓'}</span><p>{notice}</p><button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div>}
    <div className="segmented-tabs" role="tablist"><button role="tab" aria-selected={filter === 'UPCOMING'} className={filter === 'UPCOMING' ? 'selected' : ''} onClick={() => setFilter('UPCOMING')}>Upcoming</button><button role="tab" aria-selected={filter === 'HISTORY'} className={filter === 'HISTORY' ? 'selected' : ''} onClick={() => setFilter('HISTORY')}>History</button></div>
    {bookings.isPending ? <LoadingState/> : bookings.isError ? <ErrorState message={bookings.error.message} retry={() => void bookings.refetch()}/> : !visible.length ? <EmptyState title={filter === 'UPCOMING' ? 'Nothing booked yet' : 'No training history yet'} message={filter === 'UPCOMING' ? 'Choose a class and reserve your next session.' : 'Your previous sessions will appear here.'}/> : <div className="booking-cards">{visible.map((booking) => <article className="booking-card" key={booking.id}><div className="booking-card-date"><strong>{new Date(booking.classSchedule.startAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit' })}</strong><span>{new Date(booking.classSchedule.startAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok', month: 'short' }).toUpperCase()}</span></div><div className="booking-card-content"><div className="booking-card-heading"><h3>{booking.classSchedule.title}</h3><StatusPill status={booking.status}/></div><p>{dateTime(booking.classSchedule.startAt)} · {booking.classSchedule.trainer.name}</p>{booking.attendance?.checkedInAt && <small className="checkin-detail">✓ Checked in at {new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }).format(new Date(booking.attendance.checkedInAt))}</small>}{canCancel(booking) && <button className="cancel-link" disabled={cancel.isPending} onClick={() => { if (window.confirm('Cancel this booking? The session credit will be returned according to your package rules.')) cancel.mutate(booking.id); }}>Cancel booking</button>}{booking.status === 'BOOKED' && !canCancel(booking) && <small className="late-note">Cancellation window has closed. Please contact the studio.</small>}</div></article>)}</div>}
  </div>;
}
