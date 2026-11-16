import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LanguageSwitcher, useLanguage } from '../../app/LanguageContext';

export function LoginPage() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await signIn(email, password); navigate('/', { replace: true }); }
    catch (e) { setError(e instanceof Error ? e.message : t('Unable to sign in.')); }
    finally { setBusy(false); }
  }

  return <main className="login-screen"><div className="login-art"><div className="brand-mark brand-mark-large">T</div><p className="eyebrow">THUNDER MUAYTHAI</p><h1>{t('Train with')}<br /><em>{t('purpose.')}</em></h1><p className="login-art-copy">{t('A calmer way to manage members, classes and training operations.')}</p><div className="login-art-footer">{t('MEMBERSHIP & CLASS OPERATIONS · PHASE 1')}</div></div><section className="login-panel"><LanguageSwitcher /><div className="login-form-wrap"><p className="eyebrow">{t('ADMIN PORTAL')}</p><h2>{t('Welcome back')}</h2><p className="muted">{t('Sign in to manage the training studio.')}</p><form onSubmit={submit} className="form-stack"><label className="field"><span>{t('Email')}</span><input autoComplete="username" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" /></label><label className="field"><span>{t('Password')}</span><input autoComplete="current-password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('Enter your password')} /></label>{error && <div className="inline-error" role="alert">{error}</div>}<button className="button button-primary button-full" disabled={busy}>{busy ? t('Signing in…') : t('Sign in')} <span aria-hidden="true">↗</span></button></form><small className="muted login-note">{t('Use the administrator account provisioned for this environment.')}</small></div></section></main>;
}
