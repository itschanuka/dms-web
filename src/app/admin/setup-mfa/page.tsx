'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { enrollMfa, verifyEnrolledMfa } from '@/lib/auth';

type Step = 'loading' | 'scan' | 'verify' | 'done';

export default function SetupMfaPage() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step,     setStep]     = useState<Step>('loading');
  const [factorId, setFactorId] = useState('');
  const [qrCode,   setQrCode]   = useState('');
  const [secret,   setSecret]   = useState('');
  const [code,     setCode]     = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    async function enroll() {
      // ── SESSION GUARD ─────────────────────────────────────────
      // Before calling mfa.enroll(), verify there is actually a live
      // session. If the manager came from /change-password and the
      // re-auth in changePassword() failed silently, or the old
      // auth.ts (without the fix) is still deployed, the session will
      // be null here and mfa.enroll() throws "missing sub claim".
      // Redirect to login instead of showing a cryptic error.
      // ─────────────────────────────────────────────────────────
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/admin/login');
        return;
      }

      const result = await enrollMfa();

      if (result.status === 'success') {
        setFactorId(result.factorId ?? '');
        setQrCode(result.qrCode ?? '');
        setSecret(result.secret ?? '');
        setStep('scan');
      } else {
        // If we still get SESSION_EXPIRED despite the guard above,
        // the token was invalidated between the check and the enroll call.
        // Boot back to login cleanly.
        if (result.error === 'SESSION_EXPIRED') {
          router.replace('/admin/login');
          return;
        }
        setError(result.error ?? 'Failed to start MFA setup');
        setStep('scan');
      }
    }
    void enroll();
  }, [router]);

  useEffect(() => {
    if (step === 'verify') {
      inputRef.current?.focus();
    }
  }, [step]);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;

    setError('');
    setLoading(true);

    const result = await verifyEnrolledMfa(factorId, code);
    setLoading(false);

    if (result.success) {
      setStep('done');
      setTimeout(() => router.push('/admin'), 1500);
    } else {
      setError(result.error ?? 'Invalid code. Please try again.');
      setCode('');
      inputRef.current?.focus();
    }
  }

  // ── Loading ──────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
          <p style={{ color: '#5c7090', fontSize: 14 }}>Setting up MFA…</p>
        </div>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
            MFA enabled!
          </h2>
          <p style={{ color: '#5c7090', fontSize: 14, marginTop: 8 }}>
            Redirecting to dashboard…
          </p>
        </div>
      </div>
    );
  }

  // ── Scan QR ──────────────────────────────────────────────────
  if (step === 'scan') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5c7090', marginBottom: 8 }}>
              Step 1 of 2
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
              Set up two-factor authentication
            </h1>
            <p style={{ fontSize: 14, color: '#5c7090', margin: 0 }}>
              Scan this QR code with Google Authenticator or any TOTP app.
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {/* QR Code */}
          {qrCode && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ background: '#fff', padding: 12, borderRadius: 12 }}>
                <Image
                  src={qrCode}
                  alt="MFA QR Code"
                  width={180}
                  height={180}
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Manual entry */}
          {secret && (
            <div style={{ background: '#07090f', border: '1px solid #1f2d45', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#5c7090', marginBottom: 6, fontWeight: 600 }}>
                CAN&apos;T SCAN? ENTER MANUALLY:
              </div>
              <code style={{ fontSize: 13, color: '#8097b8', letterSpacing: '0.1em', wordBreak: 'break-all' }}>
                {secret}
              </code>
            </div>
          )}

          <button
            onClick={() => setStep('verify')}
            disabled={!factorId}
            style={{
              width: '100%',
              background: !factorId ? '#1f2d45' : '#6366f1',
              color: !factorId ? '#3a4e6a' : '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 700,
              cursor: !factorId ? 'not-allowed' : 'pointer',
            }}
          >
            I&apos;ve scanned the code →
          </button>
        </div>
      </div>
    );
  }

  // ── Verify code ───────────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5c7090', marginBottom: 8 }}>
            Step 2 of 2
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
            Verify your authenticator
          </h1>
          <p style={{ fontSize: 14, color: '#5c7090', margin: 0 }}>
            Enter the 6-digit code from your authenticator app to confirm setup.
          </p>
        </div>

        <form onSubmit={handleVerify}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8097b8', marginBottom: 6 }}>
              Verification code
            </label>
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
                width: '100%',
                background: '#07090f',
                border: '1px solid #1f2d45',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '0.3em',
                textAlign: 'center',
                color: '#dde4f0',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              disabled={loading}
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            style={{
              width: '100%',
              background: (loading || code.length !== 6) ? '#1f2d45' : '#10b981',
              color: (loading || code.length !== 6) ? '#3a4e6a' : '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 700,
              cursor: (loading || code.length !== 6) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verifying…' : 'Activate MFA →'}
          </button>
        </form>

        <button
          onClick={() => setStep('scan')}
          style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: '#5c7090', fontSize: 13, cursor: 'pointer', padding: '8px 0' }}
        >
          ← Back to QR code
        </button>
      </div>
    </div>
  );
}