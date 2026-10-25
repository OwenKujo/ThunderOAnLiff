import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PackageRecord, PackageType } from '@thunder/shared';
import { api } from '../../lib/api';
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, Panel, StatusBadge } from '../../components/Ui';

const packageTypes: Array<{ value: PackageType; label: string }> = [
  { value: 'PERSONAL_TRAINING', label: 'Personal training' },
  { value: 'MONTHLY_UNLIMITED', label: 'Monthly unlimited' },
  { value: 'TEN_SESSIONS', label: 'Session package' },
  { value: 'CUSTOM', label: 'Custom package' },
];
const money = (cents: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(cents / 100);

export function PackagesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const packages = useQuery({ queryKey: ['admin-packages'], queryFn: () => api.get<PackageRecord[]>('/admin/packages') });
  const createPackage = useMutation({
    mutationFn: (payload: unknown) => api.post<PackageRecord>('/admin/packages', payload),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-packages'] }); setShowForm(false); setError(''); },
    onError: (e) => setError(e.message),
  });
  const toggleActive = useMutation({
    mutationFn: (item: PackageRecord) => api.patch(`/admin/packages/${item.id}`, { isActive: !item.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-packages'] }),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const values = new FormData(event.currentTarget);
    const type = values.get('type') as PackageType;
    const count = String(values.get('sessionCount') || '');
    const duration = String(values.get('durationDays') || '');
    createPackage.mutate({
      name: String(values.get('name')).trim(), type,
      priceCents: Math.round(Number(values.get('price')) * 100),
      sessionCount: type === 'MONTHLY_UNLIMITED' || !count ? null : Number(count),
      durationDays: duration ? Number(duration) : (type === 'MONTHLY_UNLIMITED' ? 30 : null),
      description: String(values.get('description') || '').trim() || undefined,
    });
  }

  return <div className="page-stack">
    <PageHeader eyebrow="PRODUCTS & ENTITLEMENTS" title="Packages" description="Configure what members buy and which booking rules apply." action={<button className="button button-primary" onClick={() => setShowForm((value) => !value)}>＋ New package</button>} />
    {showForm && <Panel title="Create package" subtitle="Session-based packages reserve a session when a booking is confirmed."><form className="form-grid" onSubmit={submit}>
      <Field label="Package name"><input name="name" required minLength={2} maxLength={100} placeholder="e.g. 10 Training Sessions" /></Field>
      <Field label="Package type"><select name="type" defaultValue="TEN_SESSIONS">{packageTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
      <Field label="Price (THB)"><input name="price" type="number" min="0" step="1" required placeholder="4500" /></Field>
      <Field label="Number of sessions" hint="Leave empty for monthly unlimited. For CUSTOM, empty also means unlimited."><input name="sessionCount" type="number" min="1" step="1" placeholder="10" /></Field>
      <Field label="Validity (days)" hint="Example: 30 for one month."><input name="durationDays" type="number" min="1" step="1" placeholder="30" /></Field>
      <Field label="Description"><input name="description" maxLength={1000} placeholder="Optional notes or terms" /></Field>
      <div className="form-actions"><button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>Cancel</button><button className="button button-primary" disabled={createPackage.isPending}>{createPackage.isPending ? 'Saving…' : 'Create package'}</button></div>
      {error && <p className="inline-error">{error}</p>}
    </form></Panel>}
    <Panel title="Package catalogue" subtitle={`${packages.data?.length ?? 0} package types configured`}>
      {packages.isPending ? <LoadingState /> : packages.isError ? <ErrorState message={packages.error.message} onRetry={() => void packages.refetch()} /> : !packages.data?.length ? <EmptyState title="No packages yet" description="Create your first package to start attaching paid entitlements to trainees." /> : <div className="package-grid">{packages.data.map((item) => <article className={`package-card ${!item.isActive ? 'package-card-inactive' : ''}`} key={item.id}><div className="package-card-top"><span className="package-symbol">{item.type === 'MONTHLY_UNLIMITED' ? '∞' : item.type === 'PERSONAL_TRAINING' ? '✳' : '◈'}</span><StatusBadge value={item.isActive ? 'ACTIVE' : 'SUSPENDED'} /></div><h3>{item.name}</h3><p className="package-type">{packageTypes.find((type) => type.value === item.type)?.label}</p><strong className="package-price">{money(item.priceCents)}</strong><div className="package-meta"><span>{item.sessionCount == null ? 'Unlimited sessions' : `${item.sessionCount} sessions`}</span><span>{item.durationDays == null ? 'No expiry set' : `${item.durationDays} days validity`}</span></div>{item.description && <p className="package-description">{item.description}</p>}<div className="package-card-footer"><span>{item._count?.entitlements ?? 0} assigned · {item._count?.payments ?? 0} payments</span><button className="button button-small button-secondary" disabled={toggleActive.isPending} onClick={() => toggleActive.mutate(item)}>{item.isActive ? 'Deactivate' : 'Activate'}</button></div></article>)}</div>}
      {toggleActive.isError && <p className="inline-error">{toggleActive.error.message}</p>}
    </Panel>
  </div>;
}
