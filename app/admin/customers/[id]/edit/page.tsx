'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { customerApi, type CustomerDetail, type DuplicateMatch } from '@/lib/api';
import { useTheme } from '@/lib/theme';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8097b8', marginBottom: 5 }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const { isDark } = useTheme();
  const id = params['id'] as string;

  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [dupWarning,  setDupWarning]  = useState<DuplicateMatch[] | null>(null);
  const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    full_name: '', phone_primary: '', phone_secondary: '', email: '',
    address: '', city: '', nic_passport: '', business_name: '',
    business_reg_no: '', customer_type: 'individual' as string, status: 'active' as string,
  });

  const c = {
    bg:     isDark ? '#07090f' : '#f0f4f8',
    card:   isDark ? '#0d1117' : '#ffffff',
    border: isDark ? '#1f2d45' : '#d0dcea',
    text:   isDark ? '#dde4f0' : '#1a2535',
    muted:  isDark ? '#5c7090' : '#6b7fa0',
  };

  const F: React.CSSProperties = {
    width: '100%', background: c.bg, border: `1px solid ${c.border}`,
    borderRadius: 7, padding: '8px 11px', fontSize: 13, color: c.text,
    outline: 'none', boxSizing: 'border-box',
  };

  // Load customer
  useEffect(() => {
    customerApi.get(id)
      .then(data => {
        setForm({
          full_name:       data.full_name,
          phone_primary:   data.phone_primary,
          phone_secondary: data.phone_secondary ?? '',
          email:           data.email           ?? '',
          address:         data.address         ?? '',
          city:            data.city            ?? '',
          nic_passport:    data.nic_passport     ?? '',
          business_name:   data.business_name   ?? '',
          business_reg_no: (data as any).business_reg_no ?? '',
          customer_type:   data.customer_type,
          status:          data.status === 'blacklisted' ? 'active' : data.status,
        });
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [id]);

  // Debounced duplicate check
  useEffect(() => {
    if (!form.phone_primary || form.phone_primary.length < 7) { setDupWarning(null); return; }
    if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
    dupTimerRef.current = setTimeout(async () => {
      try {
        const result = await customerApi.checkDuplicate(form.phone_primary, form.nic_passport, id);
        setDupWarning(result.duplicates.length > 0 ? result.duplicates : null);
      } catch { /* ignore */ }
    }, 600);
    return () => { if (dupTimerRef.current) clearTimeout(dupTimerRef.current); };
  }, [form.phone_primary, form.nic_passport, id]);

  function set(key: string, value: string) { setForm(f => ({ ...f, [key]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim())     { setError('Full name is required');     return; }
    if (!form.phone_primary.trim()) { setError('Primary phone is required'); return; }
    setSaving(true);
    setError('');
    try {
      await customerApi.update(id, {
        full_name:        form.full_name,
        phone_primary:    form.phone_primary,
        phone_secondary:  form.phone_secondary  || undefined,
        email:            form.email            || undefined,
        address:          form.address          || undefined,
        city:             form.city             || undefined,
        nic_passport:     form.nic_passport     || undefined,
        business_name:    form.business_name    || undefined,
        business_reg_no:  form.business_reg_no  || undefined,
        customer_type:    form.customer_type as any,
        status:           form.status as any,
      });
      router.push(`/admin/customers/${id}`);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  if (loading) {
    return <AdminShell><div style={{ padding: 40, color: c.muted, textAlign: 'center' }}>Loading…</div></AdminShell>;
  }

  const isBusiness = form.customer_type === 'business';

  return (
    <AdminShell>
      <div style={{ padding: '28px 32px', maxWidth: 760 }}>

        <div style={{ marginBottom: 28 }}>
          <Link href={`/admin/customers/${id}`} style={{ fontSize: 12, color: c.muted, textDecoration: 'none' }}>
            ← Back to Profile
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, margin: '10px 0 4px' }}>Edit Customer</h1>
        </div>

        {dupWarning && dupWarning.length > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>⚠️ Possible duplicate detected</div>
            {dupWarning.map(d => (
              <div key={d.id} style={{ fontSize: 13, color: c.muted }}>
                {d.field === 'phone' ? 'Phone' : 'NIC'} already used by{' '}
                <Link href={`/admin/customers/${d.id}`} style={{ color: '#f59e0b', fontWeight: 700, textDecoration: 'none' }}>
                  {d.full_name} ({d.customer_code}) →
                </Link>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#ef4444' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>Identity</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Full Name" required><input value={form.full_name} onChange={e => set('full_name', e.target.value)} style={F} /></Field>
              </div>
              <Field label="Customer Type" required>
                <select value={form.customer_type} onChange={e => set('customer_type', e.target.value)} style={F}>
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                  <option value="dealer_trader">Dealer / Trader</option>
                  <option value="repeat_buyer">Repeat Buyer</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e => set('status', e.target.value)} style={F}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <Field label="NIC / Passport"><input value={form.nic_passport} onChange={e => set('nic_passport', e.target.value)} style={F} /></Field>
              {isBusiness && (
                <>
                  <Field label="Business Name"><input value={form.business_name} onChange={e => set('business_name', e.target.value)} style={F} /></Field>
                  <Field label="Business Reg. No."><input value={form.business_reg_no} onChange={e => set('business_reg_no', e.target.value)} style={F} /></Field>
                </>
              )}
            </div>
          </div>

          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>Contact</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Primary Phone" required><input value={form.phone_primary} onChange={e => set('phone_primary', e.target.value)} style={F} /></Field>
              <Field label="Secondary Phone"><input value={form.phone_secondary} onChange={e => set('phone_secondary', e.target.value)} style={F} /></Field>
              <div style={{ gridColumn: '1 / -1' }}><Field label="Email"><input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={F} /></Field></div>
              <div style={{ gridColumn: '1 / -1' }}><Field label="Address"><textarea value={form.address} onChange={e => set('address', e.target.value)} style={{ ...F, resize: 'vertical', minHeight: 64 }} /></Field></div>
              <Field label="City"><input value={form.city} onChange={e => set('city', e.target.value)} style={F} /></Field>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={{ background: saving ? '#4c3b84' : '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <Link href={`/admin/customers/${id}`} style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 18px', fontSize: 14, color: c.muted, textDecoration: 'none' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
