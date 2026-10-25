import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await signIn(email, password); navigate('/', { replace: true }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); }
    finally { setBusy(false); }
  }

  return <main className="login-screen"><div className="login-art"><div className="brand-mark brand-mark-large">T</div><p className="eyebrow">THUNDER MUAYTHAI</p><h1>Train with<br /><em>purpose.</em></h1><p className="login-art-copy">A calmer way to manage members, classes and training operations.</p><div className="login-art-footer">MEMBERSHIP & CLASS OPERATIONS · PHASE 1</div></div><section className="login-panel"><div className="login-form-wrap"><p className="eyebrow">ADMIN PORTAL</p><h2>Welcome back</h2><p className="muted">Sign in to manage the training studio.</p><form onSubmit={submit} className="form-stack"><label className="field"><span>Email</span><input autoComplete="username" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" /></label><label className="field"><span>Password</span><input autoComplete="current-password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /></label>{error && <div className="inline-error" role="alert">{error}</div>}<button className="button button-primary button-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <span aria-hidden="true">↗</span></button></form><small className="muted login-note">Use the administrator account provisioned for this environment.</small></div></section></main>;
}
