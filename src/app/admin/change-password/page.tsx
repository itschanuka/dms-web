'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { changePassword } from '@/lib/auth';

// ✅ Set this based on your routing choice:
// If your MFA page is /setup-mfa => keep false
// If your MFA page is /admin/setup-mfa => set true
const ADMIN_AUTH_ROUTES = false;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One number', met: /[0-9]/.test(newPassword) },
  ];

  const allMet = requirements.every((r) => r.met);
  const doMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allMet && doMatch && !loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError('');
    setLoading(true);

    const result = await changePassword(newPassword);

    setLoading(false);

    if (result.success) {
      // ✅ After password change, go to MFA setup
      router.push(ADMIN_AUTH_ROUTES ? '/admin/setup-mfa' : '/setup-mfa');
      return;
    }

    // ✅ Show the real error
    setError(result.error || 'Failed to change password');
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#f59e0b',
              marginBottom: 8,
            }}
          >
            Action required
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
            Set your password
          </h1>

          <p style={{ fontSize: 14, color: '#5c7090', margin: 0 }}>
            This is your first login. Create a new secure password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 20,
                fontSize: 13,
                color: '#fca5a5',
                whiteSpace: 'pre-wrap',
              }}
            >
              {error}
            </div>
          )}

          {/* New password */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {/* Requirements */}
          {newPassword.length > 0 && (
            <div
              style={{
                background: '#07090f',
                border: '1px solid #1f2d45',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
              }}
            >
              {requirements.map((req) => (
                <div
                  key={req.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    marginBottom: 4,
                    color: req.met ? '#10b981' : '#5c7090',
                  }}
                >
                  <span style={{ fontSize: 10 }}>{req.met ? '✓' : '○'}</span>
                  {req.label}
                </div>
              ))}
            </div>
          )}

          {/* Confirm password */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                ...inputStyle,
                borderColor:
                  confirmPassword.length > 0 ? (doMatch ? '#10b981' : '#ef4444') : '#1f2d45',
              }}
              autoComplete="new-password"
              disabled={loading}
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
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Saving…' : 'Set password and continue →'}
          </button>
        </form>
      </div>
    </div>
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