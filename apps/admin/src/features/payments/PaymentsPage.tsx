import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PackageRecord, PaymentRecord, PaymentStatus, TraineeRecord } from '@thunder/shared';
import { api } from '../../lib/api';
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, Panel, StatusBadge } from '../../components/Ui';

const money = (cents: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(cents / 100);
const dateTime = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [error, setError] = useState('');
  const payments = useQuery({ queryKey: ['payments', statusFilter], queryFn: () => api.get<PaymentRecord[]>(`/admin/payments${statusFilter === 'ALL' ? '' : `?status=${statusFilter}`}`) });
  const trainees = useQuery({ queryKey: ['trainees', 'all-for-payments'], queryFn: () => api.get<TraineeRecord[]>('/admin/trainees') });
  const packages = useQuery({ queryKey: ['admin-packages'], queryFn: () => api.get<PackageRecord[]>('/admin/packages') });
  const createPayment = useMutation({
    mutationFn: (payload: unknown) => api.post<PaymentRecord>('/admin/payments', payload),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['payments'] }); setShowForm(false); setError(''); },
    onError: (e) => setError(e.message),
  });
  const markPaid = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/payments/${id}/mark-paid`),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['payments'] }), queryClient.invalidateQueries({ queryKey: ['trainees'] }), queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })]); },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    createPayment.mutate({
      traineeId: String(form.get('traineeId')), packageId: String(form.get('packageId')),
      amountCents: Math.round(Number(form.get('amount')) * 100), paymentMethod: String(form.get('paymentMethod')),
      paymentReference: String(form.get('paymentReference') || '').trim() || undefined,
      notes: String(form.get('notes') || '').trim() || undefined,
    });
  }

  return <div className="page-stack">
    <PageHeader eyebrow="REVENUE OPERATIONS" title="Payments" description="Record manual payments, confirm settlement and activate entitlements exactly once." action={<button className="button button-primary" onClick={() => setShowForm((value) => !value)}>＋ Record payment</button>} />
    {showForm && <Panel title="Record a payment" subtitle="New payment records remain Pending until the admin confirms that funds have been received."><form className="form-grid" onSubmit={submit}>
      <Field label="Trainee"><select name="traineeId" required defaultValue=""><option value="" disabled>Select a trainee</option>{trainees.data?.map((trainee) => <option key={trainee.id} value={trainee.id}>{trainee.firstName} {trainee.lastName} · {trainee.memberStatus}</option>)}</select></Field>
      <Field label="Package"><select name="packageId" required defaultValue=""><option value="" disabled>Select a package</option>{packages.data?.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name} — {money(item.priceCents)}</option>)}</select></Field>
      <Field label="Paid amount (THB)"><input name="amount" type="number" min="0" step="0.01" required placeholder="4500" /></Field>
      <Field label="Payment method"><select name="paymentMethod" required defaultValue="BANK_TRANSFER"><option value="BANK_TRANSFER">Bank transfer</option><option value="CASH">Cash</option><option value="QR_PROMPTPAY">QR / PromptPay</option><option value="OTHER">Other</option></select></Field>
      <Field label="Reference (optional)"><input name="paymentReference" maxLength={150} placeholder="Transfer reference / receipt no." /></Field>
      <Field label="Notes (optional)"><input name="notes" maxLength={1000} placeholder="Internal note" /></Field>
      <div className="form-actions"><button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>Cancel</button><button className="button button-primary" disabled={createPayment.isPending || trainees.isPending || packages.isPending}>{createPayment.isPending ? 'Saving…' : 'Save pending payment'}</button></div>
      {error && <p className="inline-error">{error}</p>}
    </form></Panel>}
    <Panel title="Payment records" subtitle={`${payments.data?.length ?? 0} records`} action={<select aria-label="Filter payment status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'ALL')}><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></select>}>
      {payments.isPending ? <LoadingState /> : payments.isError ? <ErrorState message={payments.error.message} onRetry={() => void payments.refetch()} /> : !payments.data?.length ? <EmptyState title="No payment records" description="Record a payment to associate a package with a member." /> : <div className="table-wrap"><table><thead><tr><th>Payment</th><th>Trainee</th><th>Package</th><th>Amount</th><th>Method</th><th>Status</th><th>Action</th></tr></thead><tbody>{payments.data.map((payment) => <tr key={payment.id}><td><strong>{dateTime(payment.createdAt)}</strong><span className="table-subtext">{payment.paymentReference || payment.id.slice(-8)}</span></td><td>{payment.trainee.firstName} {payment.trainee.lastName}</td><td>{payment.package?.name ?? 'Package removed'}</td><td><strong>{money(payment.amountCents)}</strong></td><td><span className="table-subtext">{payment.paymentMethod.replaceAll('_', ' ')}</span></td><td><StatusBadge value={payment.status} /></td><td>{payment.status === 'PENDING' ? <button className="button button-small button-primary" disabled={markPaid.isPending} onClick={() => { if (window.confirm(`Confirm payment from ${payment.trainee.firstName} ${payment.trainee.lastName}? This activates the package.`)) markPaid.mutate(payment.id); }}>Confirm paid</button> : payment.paidAt ? <span className="muted">{dateTime(payment.paidAt)}</span> : '—'}</td></tr>)}</tbody></table></div>}
      {markPaid.isError && <p className="inline-error">{markPaid.error.message}</p>}
    </Panel>
  </div>;
}
