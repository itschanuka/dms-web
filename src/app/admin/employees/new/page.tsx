'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { employeeApi, type CreateEmployeeData } from '@/lib/api';
import { useTheme } from '@/lib/theme';

function tok(isDark: boolean) {
  return {
    page:     isDark ? '#141c2e' : '#dde6f0',
    card:     isDark ? '#1c2538' : '#cdd8ea',
    border:   isDark ? '#263550' : '#aec2d6',
    text:     isDark ? '#e8f0fc' : '#0f1e32',
    muted:    isDark ? '#5a7295' : '#4a6278',
    input:    isDark ? '#0e1729' : '#b8c8db',
    inputTxt: isDark ? '#d4e2f4' : '#0f1e32',
    label:    isDark ? '#94aec8' : '#2a4260',
    accent:   '#f97316',
  };
}

function Section({ title, icon, t, children }: { title: string; icon: string; t: ReturnType<typeof tok>; children: React.ReactNode }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}`, background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{title}</span>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

function Field({ label, required, t, children }: { label: string; required?: boolean; t: ReturnType<typeof tok>; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: t.label, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
        {label}{required && <span style={{ color: t.accent }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function NewEmployeePage() {
  const { isDark } = useTheme();
  const t = tok(isDark);
  const router = useRouter();

  const [fullName,       setFullName]       = useState('');
  const [email,          setEmail]          = useState('');
  const [phone,          setPhone]          = useState('');
  const [address,        setAddress]        = useState('');
  const [nic,            setNic]            = useState('');
  const [joinDate,       setJoinDate]       = useState(new Date().toISOString().slice(0, 10));
  const [role,           setRole]           = useState<'admin' | 'manager' | 'salesperson' | 'accountant'>('salesperson');
  const [commType,       setCommType]       = useState('');
  const [commValue,      setCommValue]      = useState('');
  const [tempPassword,   setTempPassword]   = useState('');
  const [showPassword,   setShowPassword]   = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const inp: React.CSSProperties = {
    width: '100%', background: t.input, color: t.inputTxt,
    border: `1px solid ${t.border}`, borderRadius: 8,
    padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !joinDate || !role || !tempPassword) return;
    setError('');
    setSubmitting(true);

    const payload: CreateEmployeeData = {
      full_name:     fullName,
      email,
      phone:         phone || undefined,
      address:       address || undefined,
      nic:           nic || undefined,
      join_date:     joinDate,
      role,
      commission_type:  commType as any || null,
      commission_value: commValue ? parseFloat(commValue) : null,
      temp_password: tempPassword,
    };

    try {
      const emp = await employeeApi.create(payload);
      router.push(`/admin/employees/${(emp as any).id}`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('DUPLICATE_EMAIL') || msg.includes('already exists')) {
        setError('An employee with this email already exists.');
      } else {
        setError(msg || 'Failed to create employee. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = fullName && email && joinDate && role && tempPassword.length >= 8;

  return (
    <AdminShell activePage="employees">
      <div style={{ minHeight: '100vh', background: t.page, padding: '28px 32px', maxWidth: 800, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <Link href="/admin/employees" style={{ fontSize: 12, color: t.muted, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            ← Back to Employees
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: t.text, margin: 0 }}>New Employee</h1>
          <p style={{ color: t.muted, fontSize: 13, margin: '4px 0 0' }}>
            Creates a Supabase Auth account. Employee will be forced to change password and set up TOTP on first login.
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#ef4444', fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Identity */}
          <Section title="Identity" icon="👤" t={t}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Field label="Full Name" required t={t}>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Kasun Perera" style={inp} required />
              </Field>
              <Field label="Email" required t={t}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="employee@example.com" style={inp} required />
              </Field>
              <Field label="Phone" t={t}>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+94 77 000 0000" style={inp} />
              </Field>
              <Field label="NIC / Passport" t={t}>
                <input value={nic} onChange={e => setNic(e.target.value)} placeholder="e.g. 199012345678" style={inp} />
              </Field>
            </div>
            <Field label="Address" t={t}>
              <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                placeholder="Home address…" style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
            </Field>
          </Section>

          {/* Role & Dates */}
          <Section title="Role & Start Date" icon="🎯" t={t}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Role" required t={t}>
                <select value={role} onChange={e => setRole(e.target.value as any)} style={{ ...inp, cursor: 'pointer' }} required>
                  <option value="salesperson">Salesperson</option>
                  <option value="accountant">Accountant</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <Field label="Join Date" required t={t}>
                <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} style={inp} required />
              </Field>
            </div>
          </Section>

          {/* Commission */}
          <Section title="Commission Setup (Optional)" icon="💸" t={t}>
            <p style={{ color: t.muted, fontSize: 13, marginBottom: 16 }}>
              Leave blank if this employee doesn't earn commission. Can be updated later.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Commission Type" t={t}>
                <select value={commType} onChange={e => setCommType(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">— None —</option>
                  <option value="fixed">Fixed Amount (usd)</option>
                  <option value="percent_price">% of Selling Price</option>
                  <option value="percent_profit">% of Gross Profit</option>
                </select>
              </Field>
              <Field label={commType === 'fixed' ? 'Fixed Amount (usd)' : 'Rate (%)'} t={t}>
                <input
                  type="number" min="0" step={commType === 'fixed' ? '1' : '0.01'}
                  value={commValue} onChange={e => setCommValue(e.target.value)}
                  placeholder={commType === 'fixed' ? '0.00' : '0.00'}
                  disabled={!commType}
                  style={{ ...inp, opacity: commType ? 1 : 0.5 }}
                />
              </Field>
            </div>
            {commType && commValue && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, fontSize: 13, color: '#f97316' }}>
                💸 {commType === 'fixed'
                  ? `usd ${commValue} flat per completed deal`
                  : commType === 'percent_price'
                  ? `${commValue}% of selling price per completed deal`
                  : `${commValue}% of gross profit per completed deal`}
              </div>
            )}
          </Section>

          {/* Auth */}
          <Section title="Account Credentials" icon="🔐" t={t}>
            <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 10, fontSize: 13, color: '#38bdf8', lineHeight: 1.6 }}>
              ℹ️ A temporary password is set here. The employee <strong>must change it</strong> on first login and will also be required to set up <strong>TOTP (2FA)</strong>.
            </div>
            <Field label="Temporary Password" required t={t}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={tempPassword}
                  onChange={e => setTempPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  style={{ ...inp, paddingRight: 44 }}
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 16 }}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {tempPassword.length > 0 && tempPassword.length < 8 && (
                <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>At least 8 characters required</div>
              )}
            </Field>
          </Section>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Link href="/admin/employees" style={{
              padding: '11px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14,
              textDecoration: 'none', color: t.muted, background: t.card, border: `1px solid ${t.border}`,
            }}>Cancel</Link>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              style={{
                padding: '11px 32px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
                background: canSubmit && !submitting ? t.accent : 'rgba(249,115,22,0.3)',
                color: '#fff', border: 'none',
                boxShadow: canSubmit && !submitting ? '0 2px 12px rgba(249,115,22,0.4)' : 'none',
                transition: 'all .15s',
              }}
            >
              {submitting ? 'Creating…' : '✓ Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
