import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="page-header-action">{action}</div>}</div>;
}
export function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}
export function StatusBadge({ value }: { value: string }) {
  const label = value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className={`status-badge status-${value.toLowerCase().replaceAll('_', '-')}`}>{label}</span>;
}
export function LoadingState({ label = 'Loading data…' }: { label?: string }) { return <div className="state-box" role="status"><span className="spinner" />{label}</div>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { return <div className="state-box error-state" role="alert"><strong>Couldn’t load this data</strong><span>{message}</span>{onRetry && <button className="button button-secondary" onClick={onRetry}>Try again</button>}</div>; }
export function EmptyState({ title, description }: { title: string; description?: string }) { return <div className="empty-state"><span className="empty-icon">◇</span><strong>{title}</strong>{description && <span>{description}</span>}</div>; }
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
