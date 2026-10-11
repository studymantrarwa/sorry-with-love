import { useEffect, useState } from 'react';
import { getProfileRole, isSupabaseConfigured, signIn, signOut, signUp } from '../lib/supabase';

export default function AuthModal({ open, onClose, session, setSession }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [adminRole, setAdminRole] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!open || !session?.access_token) { setAdminRole(false); return () => { alive = false; }; }
    getProfileRole(session).then(role => { if (alive) setAdminRole(role === 'admin'); }).catch(() => { if (alive) setAdminRole(false); });
    return () => { alive = false; };
  }, [open, session]);
  if (!open) return null;
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (!isSupabaseConfigured) throw new Error('Supabase abhi configure nahi hai. Project URL aur publishable key .env mein daalein, phir deploy karein.');
      if (mode === 'register') {
        const result = await signUp(email.trim(), password);
        if (result.access_token) { setSession(result); setMessage('Registration successful. Aap sign in ho gaye hain.'); }
        else setMessage('Registration request ho gayi. Email confirmation on hai to inbox mein confirmation link check karein.');
      } else {
        const result = await signIn(email.trim(), password); setSession(result); setMessage('Login successful.');
      }
    } catch (e) { setError(e.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  };
  const logout = async () => { setBusy(true); try { await signOut(); setSession(null); setMessage('You are signed out.'); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <div className="auth-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="auth-close" type="button" onClick={onClose} aria-label="Close">×</button>
      <div className="eyebrow">SORRY WITH LOVE · YOUR ACCOUNT</div>
      <h2 id="auth-title">{session ? 'Welcome back 💗' : mode === 'register' ? 'Create your account' : 'Login / Register'}</h2>
      {session ? <><p className="auth-subtitle">Signed in as <strong>{session.user?.email || 'your account'}</strong>.</p><div className="auth-actions"><a className="primary-btn" href="/account">Open My User Panel ↗</a>{adminRole && <a className="soft-btn" href="/admin/analytics">Open admin analytics ↗</a>}<button className="soft-btn" type="button" disabled={busy} onClick={logout}>{busy ? 'Please wait…' : 'Sign out'}</button></div></> : <>
        <p className="auth-subtitle">Login karein taaki apne cards aur shared links ko track kar sakein. Admin analytics sirf admin account ko dikhega.</p>
        <div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); setMessage(''); }}>Login</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); setMessage(''); }}>Register</button></div>
        <form onSubmit={submit} className="auth-form"><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" minLength={6} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></label><button className="primary-btn full" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account ♡' : 'Login ♡'}</button></form>
      </>}
      {message && <p className="auth-success" role="status">{message}</p>}{error && <p className="auth-error" role="alert">{error}</p>}
      {!isSupabaseConfigured && <p className="auth-hint">Setup pending: see <code>docs/SUPABASE_SETUP_HI.md</code>.</p>}
    </section>
  </div>;
}
