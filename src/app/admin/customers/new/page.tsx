'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { customerApi, type CreateCustomerData, type DuplicateMatch } from '@/lib/api';
import { useTheme } from '@/lib/theme';

// ── Styles ─────────────────────────────────────────────────────

const fieldStyle = (isDark: boolean): React.CSSProperties => ({
  width: '100%', background: isDark ? '#07090f' : '#f0f4f8',
  border: `1px solid ${isDark ? '#1f2d45' : '#d0dcea'}`,
  borderRadius: 7, padding: '8px 11px', fontSize: 13,
  color: isDark ? '#dde4f0' : '#1a2535', outline: 'none',
  boxSizing: 'border-box',
});

const labelStyle = (isDark: boolean): React.CSSProperties => ({
  display: 'block', fontSize: 12, fontWeight: 600,
  color: isDark ? '#8097b8' : '#5c7090', marginBottom: 5, letterSpacing: '0.04em',
});

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8097b8', marginBottom: 5 }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function NewCustomerPage() {
  const router   = useRouter();
  const { isDark } = useTheme();

  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [dupWarning,  setDupWarning]  = useState<DuplicateMatch[] | null>(null);
  const [dupChecking, setDupChecking] = useState(false);

  const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<CreateCustomerData>({
    full_name:        '',
    phone_primary:    '',
    phone_secondary:  '',
    email:            '',
    address:          '',
    city:             '',
    nic_passport:     '',
    business_name:    '',
    business_reg_no:  '',
    customer_type:    'individual',
  });

  const c = {
    bg:     isDark ? '#07090f' : '#f0f4f8',
    card:   isDark ? '#0d1117' : '#ffffff',
    border: isDark ? '#1f2d45' : '#d0dcea',
    text:   isDark ? '#dde4f0' : '#1a2535',
    muted:  isDark ? '#5c7090' : '#6b7fa0',
  };

  function set(key: keyof CreateCustomerData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  // Debounced duplicate check on phone / NIC change
  useEffect(() => {
    if (!form.phone_primary || form.phone_primary.length < 7) {
      setDupWarning(null);
      return;
    }
    if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
    dupTimerRef.current = setTimeout(async () => {
      setDupChecking(true);
      try {
        const result = await customerApi.checkDuplicate(form.phone_primary, form.nic_passport);
        setDupWarning(result.duplicates.length > 0 ? result.duplicates : null);
      } catch {
        // silently ignore
      } finally {
        setDupChecking(false);
      }
    }, 600);
    return () => { if (dupTimerRef.current) clearTimeout(dupTimerRef.current); };
  }, [form.phone_primary, form.nic_passport]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim())     { setError('Full name is required');  return; }
    if (!form.phone_primary.trim()) { setError('Primary phone is required'); return; }

    setSaving(true);
    setError('');

    try {
      const customer = await customerApi.create({
        ...form,
        phone_secondary:  form.phone_secondary  || undefined,
        email:            form.email            || undefined,
        address:          form.address          || undefined,
        city:             form.city             || undefined,
        nic_passport:     form.nic_passport     || undefined,
        business_name:    form.business_name    || undefined,
        business_reg_no:  form.business_reg_no  || undefined,
      });
      router.push(`/admin/customers/${customer.id}`);
    } catch (err: any) {
      // Check if API returned a duplicate error with an ID
      const msg = String(err);
      if (msg.includes('already exists')) {
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  const isBusiness = form.customer_type === 'business';
  const F = fieldStyle(isDark);
  const L = labelStyle(isDark);

  return (
    <AdminShell>
      <div style={{ padding: '28px 32px', maxWidth: 760 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <Link href="/admin/customers" style={{ fontSize: 12, color: c.muted, textDecoration: 'none' }}>
            ← Back to Customers
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, margin: '10px 0 4px' }}>New Customer</h1>
          <p style={{ fontSize: 13, color: c.muted }}>Fill in the customer details. Phone number is required for duplicate checking.</p>
        </div>

        {/* ── Duplicate Warning ── */}
        {dupWarning && dupWarning.length > 0 && (
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 10, padding: '14px 18px', marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>
              ⚠️ Possible duplicate detected
            </div>
            {dupWarning.map(d => (
              <div key={d.id} style={{ fontSize: 13, color: c.muted, marginBottom: 6 }}>
                A customer with this {d.field === 'phone' ? 'phone number' : 'NIC/Passport'} already exists:{' '}
                <Link href={`/admin/customers/${d.id}`} style={{ color: '#f59e0b', fontWeight: 700, textDecoration: 'none' }}>
                  {d.full_name} ({d.customer_code}) →
                </Link>
              </div>
            ))}
            <div style={{ fontSize: 12, color: c.muted, marginTop: 8 }}>
              You can still save if this is a different person, but check carefully first.
            </div>
          </div>
        )}

        {dupChecking && (
          <div style={{ fontSize: 12, color: c.muted, marginBottom: 16 }}>Checking for duplicates…</div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>Identity</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Full Name" required>
                  <input value={form.full_name} onChange={e => set('full_name', e.target.value)} style={F} placeholder="e.g. Kamal Perera" />
                </Field>
              </div>

              <Field label="Customer Type" required>
                <select value={form.customer_type} onChange={e => set('customer_type', e.target.value as any)} style={F}>
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                  <option value="dealer_trader">Dealer / Trader</option>
                  <option value="repeat_buyer">Repeat Buyer</option>
                </select>
              </Field>

              <Field label="NIC / Passport">
                <input value={form.nic_passport} onChange={e => set('nic_passport', e.target.value)} style={F} placeholder="e.g. 199812345678" />
              </Field>
            </div>

            {isBusiness && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 0 }}>
                <Field label="Business Name">
                  <input value={form.business_name} onChange={e => set('business_name', e.target.value)} style={F} placeholder="Company name" />
                </Field>
                <Field label="Business Reg. No.">
                  <input value={form.business_reg_no} onChange={e => set('business_reg_no', e.target.value)} style={F} placeholder="e.g. PV 12345" />
                </Field>
              </div>
            )}
          </div>

          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>Contact</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Primary Phone" required>
                <input value={form.phone_primary} onChange={e => set('phone_primary', e.target.value)} style={F} placeholder="+94 77 123 4567" />
              </Field>
              <Field label="Secondary Phone">
                <input value={form.phone_secondary} onChange={e => set('phone_secondary', e.target.value)} style={F} placeholder="Optional" />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Email">
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={F} placeholder="Optional" />
                </Field>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Address">
                  <textarea value={form.address} onChange={e => set('address', e.target.value)} style={{ ...F, resize: 'vertical', minHeight: 64 }} placeholder="Optional" />
                </Field>
              </div>
              <Field label="City">
                <input value={form.city} onChange={e => set('city', e.target.value)} style={F} placeholder="e.g. Colombo" />
              </Field>
            </div>
          </div>

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: saving ? '#4c3b84' : '#8b5cf6', color: '#fff',
                border: 'none', borderRadius: 8, padding: '10px 22px',
                fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Create Customer'}
            </button>
            <Link
              href="/admin/customers"
              style={{
                background: 'none', border: `1px solid ${c.border}`, borderRadius: 8,
                padding: '10px 18px', fontSize: 14, color: c.muted, textDecoration: 'none',
              }}
            >
              Cancel
            </Link>
          </div>
        </form>

      </div>
    </AdminShell>
  );
}
