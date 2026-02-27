'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);

    switch (result.status) {
      case 'mfa_required':
        router.push(`/admin/verify-mfa?factorId=${result.factorId ?? ''}`);
        break;
      case 'mfa_setup_required':
        router.push('/admin/setup-mfa');
        break;
      case 'password_change_required':
        router.push('/admin/change-password');
        break;
      case 'success':
        router.push('/admin');
        break;
      case 'error':
      default:
        setError(result.error ?? 'Sign in failed. Check your credentials.');
        break;
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#5c7090', marginBottom: 8 }}>
            Dealership Management System
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>Sign in</h1>
          <p style={{ fontSize: 14, color: '#5c7090', marginTop: 6 }}>
            Enter your email and password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@dealership.com" style={inputStyle} disabled={loading} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" style={inputStyle} disabled={loading} />
          </div>

          <div style={{ textAlign: 'right', marginBottom: 24 }}>
            <button type="button" onClick={() => router.push('/admin/forgot-password')} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: 500 }}>
              Forgot password?
            </button>
          </div>

          <button type="submit" disabled={loading || !email || !password} style={btnStyle(loading || !email || !password)}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 12, color: '#3a4e6a', textAlign: 'center' }}>
          Access is by invitation only. Contact your administrator.
        </p>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#8097b8', marginBottom: 6, letterSpacing: '0.04em' };
const inputStyle: React.CSSProperties = { width: '100%', background: '#07090f', border: '1px solid #1f2d45', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#dde4f0', outline: 'none', boxSizing: 'border-box' };
function btnStyle(disabled: boolean): React.CSSProperties {
  return { width: '100%', background: disabled ? '#1f2d45' : '#6366f1', color: disabled ? '#3a4e6a' : '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 0.15s' };
}