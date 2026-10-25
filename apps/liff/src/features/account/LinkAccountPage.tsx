import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLiffSession } from '../../app/LiffSessionContext';
import { liffApi } from '../../lib/api';
import { Field } from '../../components/Ui';

export function LinkAccountPage() {
  const { token, profile } = useLiffSession();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const link = useMutation({
    mutationFn: () => liffApi.post('/trainee/link-account', token!, { code: code.trim().toUpperCase(), displayName: profile?.displayName, pictureUrl: profile?.pictureUrl }),
    onSuccess: async () => { await queryClient.invalidateQueries(); setError(''); },
    onError: (e) => setError(e.message),
  });
  function submit(event: FormEvent) { event.preventDefault(); setError(''); link.mutate(); }

  return <main className="link-screen"><div className="link-brand"><span className="link-logo">T</span><span>THUNDER <small>MUAYTHAI STUDIO</small></span></div><div className="link-illustration"><div className="link-ring ring-one"/><div className="link-ring ring-two"/><span>01</span></div><p className="kicker">MEMBER ACTIVATION</p><h1>Link your<br /><em>LINE account.</em></h1><p className="screen-description">Your membership profile is ready, but it has not been linked to this LINE account yet. Ask the studio admin for a one-time linking code.</p><form className="link-form" onSubmit={submit}><Field label="One-time linking code"><input value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-fA-F0-9]/g, '').slice(0, 16).toUpperCase())} placeholder="A1B2C3D4E5F6A7B8" minLength={16} maxLength={16} required autoComplete="one-time-code" /></Field>{error && <p className="inline-error">{error}</p>}<button className="action-button primary full-width" disabled={link.isPending || code.length !== 16}>{link.isPending ? 'Linking account…' : 'Link my account ↗'}</button></form><div className="link-security">🔒 Your verified LINE identity is used only to connect this member profile.</div></main>;
}
