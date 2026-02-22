'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);

    switch (result.status) {
      case 'mfa_required':
        // Has verified MFA — go verify TOTP code
        router.push(`/verify-mfa?factorId=${result.factorId ?? ''}`);
        break;

      case 'mfa_setup_required':
        // First login or no MFA set up yet
        router.push('/setup-mfa');
        break;

      case 'password_change_required':
        // Must change temp password before anything else
        router.push('/change-password');
        break;

      case 'success':
        // Authenticated without MFA (shouldn't happen in prod but handle gracefully)
        router.push('/admin');
        break;

      case 'error':
        setError(result.error ?? 'Sign in failed. Check your credentials.');
        break;
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo / Brand */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#5c7090',
            marginBottom: 8,
          }}>
            Dealership Management System
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>
            Sign in
          </h1>
          <p style={{ fontSize: 14, color: '#5c7090', marginTop: 6 }}>
            Enter your email and password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Error message */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 20,
              fontSize: 13,
              color: '#fca5a5',
            }}>
              {error}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@dealership.com"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            style={buttonStyle(loading || !email || !password)}
          >
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

// ── Shared styles ─────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#8097b8',
  marginBottom: 6,
  letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#07090f',
  border: '1px solid #1f2d45',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 14,
  color: '#dde4f0',
  outline: 'none',
  boxSizing: 'border-box',
};

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    background: disabled ? '#1f2d45' : '#6366f1',
    color: disabled ? '#3a4e6a' : '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  };
}
