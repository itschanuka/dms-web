'use client';

import { useState, type FormEvent, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordContent() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setValidSession(!!data.session);
      if (!data.session) setError('Invalid or expired reset link. Please request a new one.');
      setChecking(false);
    });
  }, []);

  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One number', met: /[0-9]/.test(newPassword) },
  ];

  const allMet = requirements.every((r) => r.met);
  const doMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allMet && doMatch && !loading && validSession;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Session expired. Please request a new reset link.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error?.message || json?.message || 'Reset failed. Please try again.');
        setLoading(false);
        return;
      }

      setDone(true);
      setTimeout(() => router.push('/admin/login'), 2500);
    } catch (err: any) {
      setError(err?.message || 'Network error. Please try again.');
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
          <p style={{ color: '#5c7090', fontSize: 14 }}>Verifying reset link…</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Password updated!</h2>
          <p style={{ fontSize: 14, color: '#5c7090' }}>Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ marginBottom: 28 }}>
          <div style={tagStyle}>Password reset</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Set a new password</h1>
          <p style={{ fontSize: 14, color: '#5c7090', margin: 0 }}>Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={errorStyle}>{error}</div>}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
              disabled={loading || !validSession}
              autoComplete="new-password"
            />
          </div>

          {newPassword.length > 0 && (
            <div style={{ background: '#07090f', border: '1px solid #1f2d45', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              {requirements.map((req) => (
                <div key={req.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4, color: req.met ? '#10b981' : '#5c7090' }}>
                  <span style={{ fontSize: 10 }}>{req.met ? '✓' : '○'}</span>
                  {req.label}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ ...inputStyle, borderColor: confirmPassword.length > 0 ? (doMatch ? '#10b981' : '#ef4444') : '#1f2d45' }}
              disabled={loading || !validSession}
              autoComplete="new-password"
            />
            {confirmPassword.length > 0 && !doMatch && (
              <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Passwords don&apos;t match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%',
              background: canSubmit ? '#6366f1' : '#1f2d45',
              color: canSubmit ? '#fff' : '#3a4e6a',
              border: 'none',
              borderRadius: 8,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Saving…' : 'Set new password →'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordContent /></Suspense>;
}

const tagStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6366f1', marginBottom: 8 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#8097b8', marginBottom: 6, letterSpacing: '0.04em' };
const inputStyle: React.CSSProperties = { width: '100%', background: '#07090f', border: '1px solid #1f2d45', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#dde4f0', outline: 'none', boxSizing: 'border-box' };
const errorStyle: React.CSSProperties = { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#fca5a5' };