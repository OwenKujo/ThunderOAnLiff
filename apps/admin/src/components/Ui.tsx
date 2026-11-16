import type { ReactNode } from 'react';
import { useLanguage } from '../app/LanguageContext';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  const { t } = useLanguage();
  return <div className="page-header"><div>{eyebrow && <p className="eyebrow">{t(eyebrow)}</p>}<h1>{t(title)}</h1>{description && <p className="page-description">{t(description)}</p>}</div>{action && <div className="page-header-action">{action}</div>}</div>;
}
export function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  const { t } = useLanguage();
  return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{t(title)}</h2>{subtitle && <p>{t(subtitle)}</p>}</div>{action}</div>{children}</section>;
}
export function StatusBadge({ value }: { value: string }) {
  const { t } = useLanguage();
  const label = value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className={`status-badge status-${value.toLowerCase().replaceAll('_', '-')}`}>{t(label)}</span>;
}
export function LoadingState({ label = 'Loading data…' }: { label?: string }) { const { t } = useLanguage(); return <div className="state-box" role="status"><span className="spinner" />{t(label)}</div>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { const { t } = useLanguage(); return <div className="state-box error-state" role="alert"><strong>{t('Couldn’t load this data')}</strong><span>{message}</span>{onRetry && <button className="button button-secondary" onClick={onRetry}>{t('Try again')}</button>}</div>; }
export function EmptyState({ title, description }: { title: string; description?: string }) { const { t } = useLanguage(); return <div className="empty-state"><span className="empty-icon">◇</span><strong>{t(title)}</strong>{description && <span>{t(description)}</span>}</div>; }
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { const { t } = useLanguage(); return <label className="field"><span>{t(label)}</span>{children}{hint && <small>{t(hint)}</small>}</label>; }
