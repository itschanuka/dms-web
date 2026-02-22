'use client';

import { useState, FormEvent, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyMfa } from '@/lib/auth';

function VerifyMfaContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const factorId     = searchParams.get('factorId') ?? '';

  const [code,    setCode]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Redirect back if no factorId
  useEffect(() => {
    if (!factorId) router.replace('/login');
  }, [factorId, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;

    setError('');
    setLoading(true);

    const result = await verifyMfa(factorId, code);
    setLoading(false);

    if (result.success) {
      router.push('/admin');
    } else {
      setError(result.error ?? 'Invalid code. Please try again.');
      setCode('');
      inputRef.current?.focus();
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            marginBottom: 16,
          }}>
            🔐
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
            Two-factor authentication
          </h1>
          <p style={{ fontSize: 14, color: '#5c7090', margin: 0 }}>
            Open your authenticator app and enter the 6-digit code.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
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

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Verification code</label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="000000"
              style={{
                ...inputStyle,
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '0.3em',
                textAlign: 'center',
              }}
              disabled={loading}
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            style={buttonStyle(loading || code.length !== 6)}
          >
            {loading ? 'Verifying…' : 'Verify code →'}
          </button>
        </form>

        <button
          onClick={() => router.push('/login')}
          style={{
            width: '100%',
            marginTop: 12,
            background: 'none',
            border: 'none',
            color: '#5c7090',
            fontSize: 13,
            cursor: 'pointer',
            padding: '8px 0',
          }}
        >
          ← Back to login
        </button>
      </div>
    </div>
  );
}

export default function VerifyMfaPage() {
  return (
    <Suspense>
      <VerifyMfaContent />
    </Suspense>
  );
}

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
