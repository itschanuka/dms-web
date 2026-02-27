'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
            Check your email
          </h2>
          <p style={{ fontSize: 14, color: '#5c7090', marginBottom: 24 }}>
            If that email exists in our system, a reset link has been sent.
            Check your inbox and spam folder.
          </p>
          <button onClick={() => router.push('/admin/login')} style={btnStyle(true)}>
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ marginBottom: 28 }}>
          <div style={tagStyle}>Password reset</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
            Forgot your password?
          </h1>
          <p style={{ fontSize: 14, color: '#5c7090', margin: 0 }}>
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={errorStyle}>{error}</div>}

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@dealership.com"
              style={inputStyle}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <button type="submit" disabled={loading || !email} style={btnStyle(!(loading || !email))}>
            {loading ? 'Sending…' : 'Send reset link →'}
          </button>
        </form>

        <button
          onClick={() => router.push('/admin/login')}
          style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: '#5c7090', fontSize: 13, cursor: 'pointer', padding: '8px 0' }}
        >
          ← Back to login
        </button>
      </div>
    </div>
  );
}

const tagStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6366f1', marginBottom: 8 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#8097b8', marginBottom: 6, letterSpacing: '0.04em' };
const inputStyle: React.CSSProperties = { width: '100%', background: '#07090f', border: '1px solid #1f2d45', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#dde4f0', outline: 'none', boxSizing: 'border-box' };
const errorStyle: React.CSSProperties = { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#fca5a5' };
function btnStyle(active: boolean): React.CSSProperties {
  return { width: '100%', background: active ? '#6366f1' : '#1f2d45', color: active ? '#fff' : '#3a4e6a', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: active ? 'pointer' : 'not-allowed', transition: 'background 0.15s' };
}