import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClassRecord, TraineeRecord, Trainer } from '@thunder/shared';
import { api } from '../../lib/api';
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, Panel, StatusBadge } from '../../components/Ui';
import { useLanguage } from '../../app/LanguageContext';

export function SchedulePage() {
  const { t, language } = useLanguage();
  const locale = language === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB';
  const timeFormat = new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [enrollClassId, setEnrollClassId] = useState('');
  const [selectedTraineeId, setSelectedTraineeId] = useState('');
  const [enrollError, setEnrollError] = useState('');
  const classes = useQuery({ queryKey: ['admin-classes'], queryFn: () => api.get<ClassRecord[]>('/admin/classes') });
  const trainers = useQuery({ queryKey: ['admin-trainers'], queryFn: () => api.get<Trainer[]>('/admin/trainers') });
  const trainees = useQuery({ queryKey: ['active-trainees-for-enrollment'], queryFn: () => api.get<TraineeRecord[]>('/admin/trainees?status=ACTIVE') });
  const createClass = useMutation({
    mutationFn: (payload: unknown) => api.post('/admin/classes', payload),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-classes'] }); setShowForm(false); setError(''); },
    onError: (e) => setError(e.message),
  });
  const changeClassStatus = useMutation({
    mutationFn: ({ id, cancel }: { id: string; cancel: boolean }) => api.patch(`/admin/classes/${id}/${cancel ? 'cancel' : 'close'}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-classes'] }),
  });
  const enrollTrainee = useMutation({
    mutationFn: ({ traineeId, classScheduleId }: { traineeId: string; classScheduleId: string }) =>
      api.post('/admin/bookings', { traineeId, classScheduleId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-classes'] }),
        queryClient.invalidateQueries({ queryKey: ['active-trainees-for-enrollment'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
      ]);
      setEnrollClassId('');
      setSelectedTraineeId('');
      setEnrollError('');
    },
    onError: (e) => setEnrollError(e.message),
  });

  const enrollmentClass = classes.data?.find((item) => item.id === enrollClassId);

  function submitEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnrollError('');
    if (!selectedTraineeId || !enrollClassId) {
      setEnrollError(t('Choose a trainee before confirming enrollment.'));
      return;
    }
    enrollTrainee.mutate({ traineeId: selectedTraineeId, classScheduleId: enrollClassId });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    createClass.mutate({
      title: String(form.get('title')).trim(), trainerId: String(form.get('trainerId')) || null,
      startAt: new Date(String(form.get('startAt'))).toISOString(), endAt: new Date(String(form.get('endAt'))).toISOString(),
      capacity: Number(form.get('capacity')), location: String(form.get('location') || '').trim() || undefined,
      notes: String(form.get('notes') || '').trim() || undefined,
    });
  }

  return <div className="page-stack">
    <PageHeader eyebrow="SCHEDULING" title="Class schedule" description="MuayThai Group Classes are scheduled automatically at the fixed weekly times. Add private classes here." action={<button className="button button-primary" onClick={() => setShowForm((value) => !value)}>{t('＋ Schedule private class')}</button>} />
    {showForm && <Panel title="Schedule a private class" subtitle="Group classes are generated automatically. Private class times are interpreted and displayed in Asia/Bangkok."><form className="form-grid" onSubmit={submit}>
      <Field label="Class name"><input name="title" required minLength={2} maxLength={120} placeholder={t('Muay Thai Conditioning')} /></Field>
      <Field label="Trainer"><select name="trainerId" defaultValue=""><option value="">{t('No trainer assigned')}</option>{trainers.data?.filter((trainer) => trainer.isActive).map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}{trainer.specialty ? ` — ${trainer.specialty}` : ''}</option>)}</select></Field>
      <Field label="Start date and time"><input name="startAt" type="datetime-local" required /></Field>
      <Field label="End date and time"><input name="endAt" type="datetime-local" required /></Field>
      <Field label="Capacity"><input name="capacity" type="number" min="1" max="200" defaultValue="12" required /></Field>
      <Field label="Location"><input name="location" maxLength={200} placeholder={t('Main training floor')} /></Field>
      <Field label="Notes"><input name="notes" maxLength={1000} placeholder={t('Optional class notes')} /></Field>
      <div className="form-actions"><button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>{t('Cancel')}</button><button className="button button-primary" disabled={createClass.isPending}>{createClass.isPending ? t('Saving…') : t('Create class')}</button></div>
      {error && <p className="inline-error">{error}</p>}
    </form></Panel>}
    {enrollmentClass && <Panel title={`${t('Add trainee to')} ${enrollmentClass.title}`} subtitle={`${timeFormat.format(new Date(enrollmentClass.startAt))} · ${enrollmentClass.spotsRemaining} ${t('seat(s) available. Booking rules and package credits are validated by the API.')}`}>
      <form className="form-grid" onSubmit={submitEnrollment}>
        <Field label="Active trainee"><select value={selectedTraineeId} onChange={(event) => setSelectedTraineeId(event.target.value)} required disabled={trainees.isPending || !trainees.data?.length}>
          <option value="" disabled>{trainees.isPending ? t('Loading members…') : trainees.data?.length ? t('Select a trainee') : t('No active trainees available')}</option>
          {trainees.data?.map((trainee) => <option key={trainee.id} value={trainee.id}>{trainee.firstName} {trainee.lastName}{trainee.phone ? ` · ${trainee.phone}` : ''}</option>)}
        </select></Field>
        {trainees.isError && <ErrorState message={trainees.error.message} onRetry={() => void trainees.refetch()} />}
        {enrollError && <p className="inline-error">{enrollError}</p>}
        <div className="form-actions"><button type="button" className="button button-ghost" onClick={() => { setEnrollClassId(''); setEnrollError(''); }}>{t('Cancel')}</button><button className="button button-primary" disabled={enrollTrainee.isPending || trainees.isPending || !trainees.data?.length || enrollmentClass.spotsRemaining <= 0}>{enrollTrainee.isPending ? t('Enrolling…') : t('Confirm enrollment')}</button></div>
      </form>
    </Panel>}
    <Panel title="Upcoming classes" subtitle={`${classes.data?.length ?? 0} ${t('scheduled classes')}`}>
      {classes.isPending ? <LoadingState /> : classes.isError ? <ErrorState message={classes.error.message} onRetry={() => void classes.refetch()} /> : !classes.data?.length ? <EmptyState title="No upcoming classes" description="Create the next session using Schedule class." /> : <div className="class-grid">{classes.data.map((item) => <article className="class-card" key={item.id}><div className="class-date-box"><strong>{new Date(item.startAt).toLocaleDateString(locale, { timeZone: 'Asia/Bangkok', day: '2-digit' })}</strong><span>{new Date(item.startAt).toLocaleDateString(locale, { timeZone: 'Asia/Bangkok', month: 'short' })}</span></div><div className="class-main"><div className="class-title-row"><h3>{item.title}</h3><StatusBadge value={item.status} /></div><p>{timeFormat.format(new Date(item.startAt))} – {new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }).format(new Date(item.endAt))} · {t(item.trainer?.name ?? 'No trainer assigned')}</p><div className="capacity-track"><span style={{ width: `${Math.min(100, item.capacity ? item.bookedCount / item.capacity * 100 : 0)}%` }} /></div><div className="class-meta"><span>{item.bookedCount}/{item.capacity} {t('spots booked')}</span><span>{item.spotsRemaining} {t('available')}</span></div></div><div className="class-actions">{item.status === 'OPEN' && <><button className="button button-small button-secondary" disabled={item.spotsRemaining <= 0} onClick={() => { setEnrollClassId(item.id); setSelectedTraineeId(''); setEnrollError(''); }}>{t('Add trainee')}</button><button className="button button-small button-secondary" onClick={() => changeClassStatus.mutate({ id: item.id, cancel: false })}>{t('Close')}</button><button className="button button-small button-danger" onClick={() => { if (window.confirm(t('Cancel this class? Review existing bookings before proceeding.'))) changeClassStatus.mutate({ id: item.id, cancel: true }); }}>{t('Cancel')}</button></>}</div></article>)}</div>}
      {changeClassStatus.isError && <p className="inline-error">{changeClassStatus.error.message}</p>}
    </Panel>
  </div>;
}
