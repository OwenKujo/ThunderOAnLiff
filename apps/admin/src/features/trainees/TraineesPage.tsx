import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { MemberStatus, TraineeRecord } from '@thunder/shared';
import { api } from '../../lib/api';
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, Panel, StatusBadge } from '../../components/Ui';

const traineeSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  phone: z.string().trim().max(30).optional(),
  email: z.union([z.string().trim().email('Enter a valid email'), z.literal('')]).optional(),
});
type TraineeInput = z.infer<typeof traineeSchema>;

export function TraineesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [linkCode, setLinkCode] = useState<{ code: string; expiresAt: string; traineeName: string } | null>(null);
  const trainees = useQuery({ queryKey: ['trainees', search], queryFn: () => api.get<TraineeRecord[]>(`/admin/trainees${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`) });
  const form = useForm<TraineeInput>({ resolver: zodResolver(traineeSchema), defaultValues: { firstName: '', lastName: '', phone: '', email: '' } });
  const createTrainee = useMutation({
    mutationFn: (input: TraineeInput) => api.post<TraineeRecord>('/admin/trainees', { ...input, phone: input.phone || undefined, email: input.email || undefined }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['trainees'] }); form.reset(); setShowCreate(false); },
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, memberStatus }: { id: string; memberStatus: MemberStatus }) => api.patch(`/admin/trainees/${id}`, { memberStatus }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['trainees'] }); },
  });
  const createCode = useMutation({
    mutationFn: (trainee: TraineeRecord) => api.post<{ code: string; expiresAt: string; traineeId: string }>(`/admin/trainees/${trainee.id}/link-code`),
    onSuccess: (result, trainee) => setLinkCode({ ...result, traineeName: `${trainee.firstName} ${trainee.lastName}` }),
  });
  const list = useMemo(() => trainees.data ?? [], [trainees.data]);

  return <div className="page-stack">
    <PageHeader eyebrow="MEMBERSHIP" title="Trainees" description="Manage member profiles, activation and LINE account linking." action={<button className="button button-primary" onClick={() => setShowCreate((value) => !value)}>＋ Add trainee</button>} />
    {showCreate && <Panel title="Create trainee profile" subtitle="The member starts in Pending until a package is paid and activated."><form className="form-grid" onSubmit={form.handleSubmit((value) => createTrainee.mutate(value))}>
      <Field label="First name"><input {...form.register('firstName')} placeholder="First name" />{form.formState.errors.firstName && <small className="field-error">{form.formState.errors.firstName.message}</small>}</Field>
      <Field label="Last name"><input {...form.register('lastName')} placeholder="Last name" />{form.formState.errors.lastName && <small className="field-error">{form.formState.errors.lastName.message}</small>}</Field>
      <Field label="Phone (optional)"><input {...form.register('phone')} placeholder="08x xxx xxxx" /></Field>
      <Field label="Email (optional)"><input type="email" {...form.register('email')} placeholder="member@example.com" />{form.formState.errors.email && <small className="field-error">{form.formState.errors.email.message}</small>}</Field>
      <div className="form-actions"><button type="button" className="button button-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button className="button button-primary" disabled={createTrainee.isPending}>{createTrainee.isPending ? 'Creating…' : 'Create member'}</button></div>
      {createTrainee.isError && <p className="inline-error">{createTrainee.error.message}</p>}
    </form></Panel>}
    <Panel title="Member directory" subtitle={`${list.length} members shown`} action={<div className="search-box"><span>⌕</span><input aria-label="Search trainees" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or email" /></div>}>
      {trainees.isPending ? <LoadingState /> : trainees.isError ? <ErrorState message={trainees.error.message} onRetry={() => void trainees.refetch()} /> : list.length === 0 ? <EmptyState title="No members found" description="Try another search or create a new trainee profile." /> : <div className="table-wrap"><table><thead><tr><th>Member</th><th>Contact</th><th>Status</th><th>LINE account</th><th>Package</th><th>Actions</th></tr></thead><tbody>{list.map((trainee) => {
        const entitlement = trainee.packageEntitlements?.[0];
        const line = trainee.lineAccounts?.[0];
        return <tr key={trainee.id}><td><div className="person-cell"><span className="avatar">{trainee.firstName.slice(0, 1)}{trainee.lastName.slice(0, 1)}</span><span><strong>{trainee.firstName} {trainee.lastName}</strong><span className="table-subtext">Added {new Date(trainee.createdAt).toLocaleDateString('en-GB')}</span></span></div></td><td><span>{trainee.phone || '—'}</span><span className="table-subtext">{trainee.email || 'No email'}</span></td><td><StatusBadge value={trainee.memberStatus} /></td><td>{line ? <span className="connected-label">● Linked</span> : <span className="muted">Not linked</span>}</td><td>{entitlement?.package?.name ?? '—'}{entitlement?.remainingSessions != null && <span className="table-subtext">{entitlement.remainingSessions} sessions left</span>}</td><td><div className="table-actions">{!line && <button className="button button-small button-secondary" onClick={() => createCode.mutate(trainee)} disabled={createCode.isPending}>Link LINE</button>}<select aria-label={`Set status for ${trainee.firstName}`} value={trainee.memberStatus} disabled={updateStatus.isPending} onChange={(e) => updateStatus.mutate({ id: trainee.id, memberStatus: e.target.value as MemberStatus })}><option value="PENDING">Pending</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="EXPIRED">Expired</option></select></div></td></tr>;
      })}</tbody></table></div>}
      {updateStatus.isError && <p className="inline-error">Member status could not be updated: {updateStatus.error.message}</p>}
      {createCode.isError && <p className="inline-error">{createCode.error.message}</p>}
    </Panel>
    {linkCode && <div className="modal-backdrop" role="presentation" onClick={() => setLinkCode(null)}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="link-code-title" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setLinkCode(null)} aria-label="Close">×</button><p className="eyebrow">LINE ACCOUNT LINKING</p><h2 id="link-code-title">One-time linking code</h2><p className="muted">Give this code to <strong>{linkCode.traineeName}</strong> to enter in the LIFF app. It expires {new Date(linkCode.expiresAt).toLocaleString('en-GB')} and can only be used once.</p><div className="code-display">{linkCode.code}</div><button className="button button-primary button-full" onClick={() => navigator.clipboard.writeText(linkCode.code)}>Copy code</button><p className="tiny-note">This code is shown only once. Generate a new code if it is lost.</p></section></div>}
  </div>;
}
