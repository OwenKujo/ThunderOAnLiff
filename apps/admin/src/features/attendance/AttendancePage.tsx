import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AttendanceStatus, BookingRecord } from '@thunder/shared';
import { api } from '../../lib/api';
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from '../../components/Ui';

function localDateOffset(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export function AttendancePage() {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(localDateOffset(-7));
  const [to, setTo] = useState(localDateOffset(7));
  const query = useQuery({ queryKey: ['attendance', from, to], queryFn: () => api.get<BookingRecord[]>(`/admin/attendance?from=${encodeURIComponent(new Date(`${from}T00:00:00+07:00`).toISOString())}&to=${encodeURIComponent(new Date(`${to}T23:59:59+07:00`).toISOString())}`) });
  const update = useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: AttendanceStatus }) => api.patch(`/admin/attendance/${bookingId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });

  return <div className="page-stack">
    <PageHeader eyebrow="CLASS OPERATIONS" title="Attendance" description="Review check-ins and resolve attendance exceptions with a clear audit trail." />
    <Panel title="Attendance register" subtitle="Times are displayed in Thailand time." action={<div className="date-filter"><label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>}>
      {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : !query.data?.length ? <EmptyState title="No bookings in this period" description="Bookings will appear when trainees reserve classes." /> : <div className="table-wrap"><table><thead><tr><th>Class date</th><th>Trainee</th><th>Class / Trainer</th><th>Booking</th><th>Check-in</th><th>Attendance action</th></tr></thead><tbody>{query.data.map((booking) => <tr key={booking.id}><td>{dateTime(booking.classSchedule.startAt)}</td><td><strong>{booking.trainee?.firstName} {booking.trainee?.lastName}</strong><span className="table-subtext">{booking.trainee?.phone || 'No phone'}</span></td><td><strong>{booking.classSchedule.title}</strong><span className="table-subtext">{booking.classSchedule.trainer.name}</span></td><td><StatusBadge value={booking.status} /></td><td>{dateTime(booking.attendance?.checkedInAt ?? null)}</td><td><select aria-label={`Attendance status for ${booking.trainee?.firstName ?? 'trainee'}`} value={booking.attendance?.status ?? ''} disabled={booking.status === 'CANCELLED' || update.isPending} onChange={(e) => update.mutate({ bookingId: booking.id, status: e.target.value as AttendanceStatus })}><option value="" disabled>Set status…</option><option value="CHECKED_IN">Checked in</option><option value="ATTENDED">Attended</option><option value="NO_SHOW">No-show</option></select></td></tr>)}</tbody></table></div>}
      {update.isError && <p className="inline-error">{update.error.message}</p>}
    </Panel>
  </div>;
}
