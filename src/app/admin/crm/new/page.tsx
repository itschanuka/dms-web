'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import {
  leadApi, customerApi, adminApi,
  type CreateLeadData, type LeadSource,
  type Salesperson, type VehicleSearchResult, type Customer, type AdminVehicle,
} from '@/lib/api';
import { formatPrice } from '@/lib/formatters';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';

const SOURCE_LABELS: Record<string, string> = {
  walk_in: 'Walk-in', call: 'Call', website: 'Website',
  facebook: 'Facebook', whatsapp: 'WhatsApp', referral: 'Referral', other: 'Other',
};
const SOURCE_ICONS: Record<string, string> = {
  walk_in: '🚶', call: '📞', website: '🌐',
  facebook: '📘', whatsapp: '💬', referral: '🤝', other: '📌',
};
const CONDITION_LABELS: Record<string, string> = {
  used: 'Used', reconditioned: 'Recon', brand_new: 'New',
};
const TRANSMISSION_LABELS: Record<string, string> = {
  manual: 'MT', automatic: 'AT', cvt: 'CVT',
};

// ─── Theme tokens ────────────────────────────────────────────────────────────
function useTokens(isDark: boolean) {
  return {
    pageBg:    isDark ? '#0d1321' : '#e8eef6',
    card:      isDark ? '#111827' : '#ffffff',
    cardInner: isDark ? '#0d1321' : '#f4f7fb',
    border:    isDark ? '#1e2d45' : '#c8d6e8',
    borderFocus: '#10b981',
    text:      isDark ? '#e2eaf8' : '#0f1e32',
    muted:     isDark ? '#4a6278' : '#5a7a95',
    label:     isDark ? '#6b8aaa' : '#4e6880',
    input:     isDark ? '#070d18' : '#eef2f8',
    inputText: isDark ? '#d4e0f4' : '#1a2e42',
    drop:      isDark ? '#0f1c2e' : '#f0f5fb',
    accent:    '#10b981',
    accentBg:  isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
    accentBorder: 'rgba(16,185,129,0.25)',
    amber:     '#f59e0b',
    amberBg:   isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
    amberBorder: 'rgba(245,158,11,0.28)',
    danger:    '#ef4444',
    shadow:    isDark ? '0 4px 24px rgba(0,0,0,0.45)' : '0 2px 16px rgba(0,0,0,0.10)',
    shadowMd:  isDark ? '0 12px 40px rgba(0,0,0,0.55)' : '0 8px 32px rgba(0,0,0,0.14)',
  };
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  const { isDark } = useTheme();
  const t = useTokens(isDark);
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: t.label, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
        {required && <span style={{ color: t.danger, fontSize: 13, lineHeight: 1 }}>*</span>}
        {hint && <span style={{ fontSize: 10, fontWeight: 400, color: t.muted, textTransform: 'none', letterSpacing: 0 }}>— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ icon, title, action, children, isDark }: {
  icon: string; title: string; action?: React.ReactNode;
  children: React.ReactNode; isDark: boolean;
}) {
  const t = useTokens(isDark);
  return (
    <div style={{
      background: t.card, border: `1px solid ${t.border}`,
      borderRadius: 14, overflow: 'hidden',
      boxShadow: t.shadow,
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: `1px solid ${t.border}`,
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>{icon}</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.text, letterSpacing: '-0.1px' }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ─── Styled input / select ────────────────────────────────────────────────────
function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const { isDark } = useTheme();
  const t = useTokens(isDark);
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: '100%', background: t.input,
        border: `1px solid ${focused ? t.borderFocus : t.border}`,
        borderRadius: 8, padding: '9px 12px', fontSize: 13,
        color: props.disabled ? t.muted : t.inputText,
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: focused ? `0 0 0 3px rgba(16,185,129,0.12)` : 'none',
        cursor: props.disabled ? 'not-allowed' : undefined,
        opacity: props.disabled ? 0.7 : 1,
        ...style,
      }}
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { isDark } = useTheme();
  const t = useTokens(isDark);
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: '100%', background: t.input,
        border: `1px solid ${focused ? t.borderFocus : t.border}`,
        borderRadius: 8, padding: '9px 12px', fontSize: 13,
        color: t.inputText, outline: 'none', boxSizing: 'border-box',
        cursor: 'pointer', appearance: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: focused ? `0 0 0 3px rgba(16,185,129,0.12)` : 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b8aaa' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: 32,
      }}
    >
      {children}
    </select>
  );
}

// ─── Vehicle Browse Modal ──────────────────────────────────────────────────────
function VehicleBrowseModal({ onPick, onClose, isDark }: {
  onPick: (v: VehicleSearchResult) => void; onClose: () => void; isDark: boolean;
}) {
  const t = useTokens(isDark);
  const [vehicles,   setVehicles]   = useState<AdminVehicle[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterMake, setFilterMake] = useState('');
  const [makes,      setMakes]      = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 80);
    adminApi.listVehicles({ status: 'available', limit: 100 })
      .then(res => {
        setVehicles(res.vehicles);
        setMakes([...new Set(res.vehicles.map(v => v.make))].sort());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    return (
      (!q || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) ||
        v.stock_id.toLowerCase().includes(q) || String(v.year).includes(q) ||
        (v.color || '').toLowerCase().includes(q)) &&
      (!filterMake || v.make === filterMake)
    );
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 20px', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, width: '100%', maxWidth: 960, boxShadow: t.shadowMd, overflow: 'hidden' }}>

        {/* Modal header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: t.amberBg, border: `1px solid ${t.amberBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚗</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: t.text }}>Browse Available Vehicles</div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 1 }}>
                {loading ? 'Loading inventory…' : `${filtered.length} vehicle${filtered.length !== 1 ? 's' : ''} available`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: t.muted, cursor: 'pointer' }}>
            ✕ Close
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '14px 24px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: 10, background: t.cardInner }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: t.muted, fontSize: 13, pointerEvents: 'none' }}>🔍</span>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search make, model, stock ID, color, year…"
              style={{ width: '100%', background: t.input, border: `1px solid ${t.border}`, borderRadius: 8, padding: '8px 12px 8px 34px', fontSize: 13, color: t.inputText, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <select
            value={filterMake}
            onChange={e => setFilterMake(e.target.value)}
            style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13, color: t.inputText, outline: 'none', minWidth: 150, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b8aaa' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value="">All Makes</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Grid */}
        <div style={{ padding: 24, maxHeight: 540, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
              <div style={{ fontSize: 28 }}>🔄</div>
              <div style={{ fontSize: 13, color: t.muted }}>Loading inventory…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
              <div style={{ fontSize: 28 }}>🔍</div>
              <div style={{ fontSize: 13, color: t.muted }}>No vehicles match your search.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
              {filtered.map(v => (
                <div
                  key={v.id}
                  onClick={() => { onPick({ id: v.id, stock_id: v.stock_id, make: v.make, model: v.model, year: v.year, asking_price: v.asking_price, status: v.status, main_image_url: v.main_image_url }); onClose(); }}
                  style={{ background: t.cardInner, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = t.amber; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = `0 8px 24px rgba(245,158,11,0.15)`; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = t.border; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
                >
                  {/* Image */}
                  <div style={{ height: 124, background: isDark ? '#0a1120' : '#dce5f0', position: 'relative', overflow: 'hidden' }}>
                    {v.main_image_url
                      ? <img src={v.main_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: t.muted }}>🚗</div>
                    }
                    <div style={{ position: 'absolute', top: 7, left: 7, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                      {CONDITION_LABELS[v.condition] ?? v.condition}
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>{v.year} {v.make} {v.model}</div>
                    <div style={{ fontSize: 11, color: t.muted, marginBottom: 9 }}>
                      {v.stock_id}{v.color ? ` · ${v.color}` : ''}{v.transmission ? ` · ${TRANSMISSION_LABELS[v.transmission] ?? v.transmission}` : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: t.amber }}>{formatPrice(v.asking_price)}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: t.accent, background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: 5, padding: '2px 7px' }}>Available</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Form ─────────────────────────────────────────────────────────────────
function NewLeadForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isDark }   = useTheme();
  const { employee } = useAuth();
  const t = useTokens(isDark);

  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [showBrowse,   setShowBrowse]   = useState(false);

  const [vehicleQuery,     setVehicleQuery]     = useState('');
  const [vehicleResults,   setVehicleResults]   = useState<VehicleSearchResult[]>([]);
  const [vehicleSearching, setVehicleSearching] = useState(false);
  const [selectedVehicle,  setSelectedVehicle]  = useState<VehicleSearchResult | null>(null);
  const [dropdownOpen,     setDropdownOpen]     = useState(false);
  const vehicleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBoxRef    = useRef<HTMLDivElement>(null);

  const [customerQuery,     setCustomerQuery]     = useState('');
  const [customerResults,   setCustomerResults]   = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomer,  setSelectedCustomer]  = useState<Customer | null>(null);
  const customerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<CreateLeadData>({
    customer_id: '', customer_name: '', customer_phone: '',
    interested_vehicle_id: '', interested_vehicle_desc: '',
    source: 'walk_in', assigned_to: '',
    next_followup_date: '', next_followup_note: '',
  });

  const F: React.CSSProperties = { width: '100%', background: t.input, border: `1px solid ${t.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: t.inputText, outline: 'none', boxSizing: 'border-box' };

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setDropdownOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    leadApi.getSalespersons().then(setSalespersons).catch(() => {});
    const preCustomerId = searchParams.get('customer_id');
    if (preCustomerId) {
      customerApi.get(preCustomerId).then(c => {
        setSelectedCustomer(c);
        setForm(f => ({ ...f, customer_id: c.id, customer_name: c.full_name, customer_phone: c.phone_primary }));
      }).catch(() => {});
    }
  }, [searchParams]);

  useEffect(() => {
    if (employee?.role === 'salesperson') setForm(f => ({ ...f, assigned_to: employee.id }));
  }, [employee]);

  useEffect(() => {
    if (!vehicleQuery || vehicleQuery.length < 2) { setVehicleResults([]); setDropdownOpen(false); return; }
    if (vehicleTimerRef.current) clearTimeout(vehicleTimerRef.current);
    vehicleTimerRef.current = setTimeout(async () => {
      setVehicleSearching(true);
      try { const res = await leadApi.searchVehicles(vehicleQuery); setVehicleResults(res); setDropdownOpen(res.length > 0); }
      catch { /* ignore */ } finally { setVehicleSearching(false); }
    }, 350);
    return () => { if (vehicleTimerRef.current) clearTimeout(vehicleTimerRef.current); };
  }, [vehicleQuery]);

  useEffect(() => {
    if (!customerQuery || customerQuery.length < 2) { setCustomerResults([]); return; }
    if (customerTimerRef.current) clearTimeout(customerTimerRef.current);
    customerTimerRef.current = setTimeout(async () => {
      setCustomerSearching(true);
      try { const res = await customerApi.list({ search: customerQuery, limit: 8 }); setCustomerResults(res.customers); }
      catch { /* ignore */ } finally { setCustomerSearching(false); }
    }, 400);
    return () => { if (customerTimerRef.current) clearTimeout(customerTimerRef.current); };
  }, [customerQuery]);

  function set(key: keyof CreateLeadData, value: string) { setForm(f => ({ ...f, [key]: value })); }

  function pickVehicle(v: VehicleSearchResult) {
    setSelectedVehicle(v); setVehicleResults([]); setVehicleQuery(''); setDropdownOpen(false);
    setForm(f => ({ ...f, interested_vehicle_id: v.id, interested_vehicle_desc: `${v.year} ${v.make} ${v.model} (${v.stock_id})` }));
  }
  function clearVehicle() { setSelectedVehicle(null); setVehicleQuery(''); setForm(f => ({ ...f, interested_vehicle_id: '', interested_vehicle_desc: '' })); }
  function pickCustomer(c: Customer) {
    setSelectedCustomer(c); setCustomerResults([]); setCustomerQuery('');
    setForm(f => ({ ...f, customer_id: c.id, customer_name: c.full_name, customer_phone: c.phone_primary }));
  }
  function clearCustomer() { setSelectedCustomer(null); setForm(f => ({ ...f, customer_id: '', customer_name: '', customer_phone: '' })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name.trim())  { setError('Customer name is required');  return; }
    if (!form.customer_phone.trim()) { setError('Customer phone is required'); return; }
    if (!form.assigned_to)           { setError('Salesperson is required');     return; }
    setSaving(true); setError('');
    try {
      const lead = await leadApi.create({
        ...form,
        customer_id:             form.customer_id || undefined,
        interested_vehicle_id:   form.interested_vehicle_id || undefined,
        interested_vehicle_desc: form.interested_vehicle_desc || undefined,
        next_followup_date:      form.next_followup_date || undefined,
        next_followup_note:      form.next_followup_note || undefined,
      });
      router.push(`/admin/crm/${lead.id}`);
    } catch (err) { setError(String(err)); setSaving(false); }
  }

  const assignedPerson = salespersons.find(s => s.id === form.assigned_to);

  return (
    <div style={{ padding: '28px 28px 48px', background: t.pageBg, minHeight: '100%' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <Link href="/admin/crm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: t.muted, textDecoration: 'none', marginBottom: 10, padding: '4px 10px', border: `1px solid ${t.border}`, borderRadius: 20, background: t.card }}>
            ← Back to CRM
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: t.text, margin: '0 0 4px', letterSpacing: '-0.4px' }}>
            New Lead
          </h1>
          <p style={{ fontSize: 13, color: t.muted, margin: 0 }}>Log a new customer inquiry into the pipeline.</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: t.card, border: `1px solid ${t.border}`, borderRadius: 24, fontSize: 11, fontWeight: 600, color: t.muted }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: t.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>1</span>
          <span style={{ color: t.text }}>Customer</span>
          <span style={{ color: t.border }}>›</span>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: t.border, color: t.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>2</span>
          <span>Vehicle</span>
          <span style={{ color: t.border }}>›</span>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: t.border, color: t.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>3</span>
          <span>Details</span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#ef4444' }}>
          <span style={{ fontSize: 16 }}>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Two-column layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

          {/* ── LEFT column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── 1. Customer ── */}
            <Section icon="👤" title="Customer" isDark={isDark}>
              {/* Customer search */}
              {!selectedCustomer ? (
                <div style={{ marginBottom: 18 }}>
                  <Field label="Search Existing Customer" hint="optional">
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: t.muted, fontSize: 13, pointerEvents: 'none' }}>🔍</span>
                      <input
                        value={customerQuery}
                        onChange={e => setCustomerQuery(e.target.value)}
                        placeholder="Search by name or phone…"
                        style={{ ...F, paddingLeft: 34 }}
                      />
                      {customerSearching && <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: t.muted }}>…</span>}
                      {customerResults.length > 0 && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: t.drop, border: `1px solid ${t.border}`, borderRadius: 10, maxHeight: 220, overflowY: 'auto', boxShadow: t.shadowMd }}>
                          {customerResults.map(cu => (
                            <div key={cu.id} onClick={() => pickCustomer(cu)}
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10 }}
                              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                            >
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#8b5cf6', fontWeight: 700, flexShrink: 0 }}>
                                {cu.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{cu.full_name}</div>
                                <div style={{ fontSize: 11, color: t.muted }}>{cu.phone_primary} · {cu.customer_code}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Field>
                  {/* Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
                    <div style={{ flex: 1, height: 1, background: t.border }} />
                    <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>OR ENTER MANUALLY</span>
                    <div style={{ flex: 1, height: 1, background: t.border }} />
                  </div>
                </div>
              ) : (
                /* Linked customer chip */
                <div style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: 10, padding: '12px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#8b5cf6', fontWeight: 800, flexShrink: 0 }}>
                    {selectedCustomer.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.accent }}>
                      {selectedCustomer.full_name}
                      <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: t.accent, background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: 4, padding: '2px 6px' }}>Linked</span>
                    </div>
                    <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{selectedCustomer.phone_primary} · {selectedCustomer.customer_code}</div>
                  </div>
                  <button type="button" onClick={clearCustomer} style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 7, padding: '4px 10px', fontSize: 11, color: t.muted, cursor: 'pointer' }}>Unlink</button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Full Name" required>
                  <Input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="e.g. Nimal Perera" disabled={!!selectedCustomer} />
                </Field>
                <Field label="Phone" required>
                  <Input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} placeholder="+94 77 000 0000" disabled={!!selectedCustomer} />
                </Field>
              </div>
            </Section>

            {/* ── 2. Vehicle ── */}
            <Section
              icon="🚗"
              title="Vehicle Interest"
              isDark={isDark}
              action={
                !selectedVehicle ? (
                  <button
                    type="button"
                    onClick={() => setShowBrowse(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: t.amberBg, border: `1px solid ${t.amberBorder}`, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: t.amber, cursor: 'pointer' }}
                  >
                    <span>📋</span> Browse All
                  </button>
                ) : undefined
              }
            >
              {/* Selected vehicle */}
              {selectedVehicle ? (
                <div style={{ background: t.amberBg, border: `1px solid ${t.amberBorder}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ display: 'flex' }}>
                    <div style={{ width: 130, flexShrink: 0, background: isDark ? '#060d18' : '#d5e0ee', position: 'relative' }}>
                      {selectedVehicle.main_image_url
                        ? <img src={selectedVehicle.main_image_url} alt="" style={{ width: '100%', height: '100%', minHeight: 90, objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: '100%', minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: t.muted }}>🚗</div>
                      }
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 60%, rgba(245,158,11,0.08))' }} />
                    </div>
                    <div style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: t.amber, letterSpacing: '-0.2px', marginBottom: 3 }}>
                          {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                        </div>
                        <div style={{ fontSize: 12, color: t.muted, marginBottom: 8 }}>Stock: {selectedVehicle.stock_id}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: t.text }}>{formatPrice(selectedVehicle.asking_price)}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: 6, padding: '3px 9px' }}>✓ Linked</div>
                        <button type="button" onClick={clearVehicle} style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 7, padding: '4px 10px', fontSize: 11, color: t.muted, cursor: 'pointer' }}>✕ Remove</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Search input */
                <div style={{ marginBottom: 16 }} ref={searchBoxRef}>
                  <Field label="Quick Search" hint="make, model, stock ID">
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: t.muted, fontSize: 13, pointerEvents: 'none' }}>🔍</span>
                      <input
                        value={vehicleQuery}
                        onChange={e => setVehicleQuery(e.target.value)}
                        onFocus={() => vehicleResults.length > 0 && setDropdownOpen(true)}
                        placeholder="Toyota, Aqua, STK-001…"
                        style={{ ...F, paddingLeft: 34 }}
                      />
                      {vehicleSearching && <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: t.muted }}>…</span>}

                      {/* Dropdown */}
                      {dropdownOpen && vehicleResults.length > 0 && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: t.drop, border: `1px solid ${t.border}`, borderRadius: 10, maxHeight: 300, overflowY: 'auto', boxShadow: t.shadowMd }}>
                          {vehicleResults.map(v => (
                            <div key={v.id} onClick={() => pickVehicle(v)}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${t.border}` }}
                              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                            >
                              <div style={{ width: 54, height: 38, flexShrink: 0, borderRadius: 7, overflow: 'hidden', background: isDark ? '#0a1120' : '#d5e0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {v.main_image_url ? <img src={v.main_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>🚗</span>}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{v.year} {v.make} {v.model}</div>
                                <div style={{ fontSize: 11, color: t.muted }}>
                                  {v.stock_id}
                                  <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: v.status === 'available' ? t.accentBg : t.amberBg, color: v.status === 'available' ? t.accent : t.amber }}>
                                    {v.status}
                                  </span>
                                </div>
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: t.amber, flexShrink: 0 }}>{formatPrice(v.asking_price)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Field>
                </div>
              )}

              <Field label={selectedVehicle ? 'Additional Notes' : 'Free-text description'} hint="optional">
                <Input
                  value={form.interested_vehicle_desc}
                  onChange={e => set('interested_vehicle_desc', e.target.value)}
                  placeholder={selectedVehicle ? 'Colour preference, special requirements…' : 'e.g. Toyota Aqua 2020, white, hybrid…'}
                />
              </Field>
            </Section>

            {/* ── 3. Lead details ── */}
            <Section icon="📋" title="Lead Details" isDark={isDark}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

                {/* Source — pill selector */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Source" required>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {Object.entries(SOURCE_LABELS).map(([val, lbl]) => {
                        const active = form.source === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => set('source', val)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '7px 14px', borderRadius: 20,
                              fontSize: 12, fontWeight: active ? 700 : 500,
                              border: `1px solid ${active ? t.accentBorder : t.border}`,
                              background: active ? t.accentBg : t.input,
                              color: active ? t.accent : t.muted,
                              cursor: 'pointer', transition: 'all 0.12s',
                            }}
                          >
                            <span>{SOURCE_ICONS[val]}</span> {lbl}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                </div>

                <Field label="Assign To" required>
                  <Select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                    <option value="">— Select salesperson —</option>
                    {salespersons.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
                  </Select>
                </Field>

                <Field label="Next Follow-up Date">
                  <Input type="date" value={form.next_followup_date} onChange={e => set('next_followup_date', e.target.value)} />
                </Field>

                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Follow-up Note" hint="optional">
                    <Input value={form.next_followup_note} onChange={e => set('next_followup_note', e.target.value)} placeholder="What to discuss, customer preferences…" />
                  </Field>
                </div>
              </div>
            </Section>
          </div>

          {/* ── RIGHT column — Summary ── */}
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: t.shadow }}>
              {/* Header */}
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.label, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Lead Summary</div>
              </div>

              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Customer summary */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Customer</div>
                  {form.customer_name ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#8b5cf6', fontWeight: 700, flexShrink: 0 }}>
                        {form.customer_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{form.customer_name}</div>
                        <div style={{ fontSize: 11, color: t.muted }}>{form.customer_phone || '—'}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: t.muted, fontStyle: 'italic' }}>Not set</div>
                  )}
                </div>

                <div style={{ height: 1, background: t.border }} />

                {/* Vehicle summary */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Vehicle</div>
                  {selectedVehicle ? (
                    <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                      <div style={{ width: 42, height: 30, borderRadius: 6, overflow: 'hidden', background: isDark ? '#0a1120' : '#d5e0ee', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selectedVehicle.main_image_url
                          ? <img src={selectedVehicle.main_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 14 }}>🚗</span>
                        }
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: t.amber }}>{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</div>
                        <div style={{ fontSize: 11, color: t.muted }}>{formatPrice(selectedVehicle.asking_price)}</div>
                      </div>
                    </div>
                  ) : form.interested_vehicle_desc ? (
                    <div style={{ fontSize: 12, color: t.text }}>{form.interested_vehicle_desc}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: t.muted, fontStyle: 'italic' }}>Not specified</div>
                  )}
                </div>

                <div style={{ height: 1, background: t.border }} />

                {/* Details summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>Details</div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: t.muted }}>Source</span>
                    <span style={{ fontWeight: 600, color: t.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {SOURCE_ICONS[form.source]} {SOURCE_LABELS[form.source]}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: t.muted }}>Assigned to</span>
                    <span style={{ fontWeight: 600, color: assignedPerson ? t.text : t.muted }}>
                      {assignedPerson ? assignedPerson.full_name : '—'}
                    </span>
                  </div>

                  {form.next_followup_date && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: t.muted }}>Follow-up</span>
                      <span style={{ fontWeight: 600, color: t.text }}>
                        {new Date(form.next_followup_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ height: 1, background: t.border }} />

                {/* Readiness check */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { ok: !!form.customer_name.trim(), label: 'Customer name' },
                    { ok: !!form.customer_phone.trim(), label: 'Phone number' },
                    { ok: !!form.assigned_to, label: 'Salesperson assigned' },
                    { ok: !!(selectedVehicle || form.interested_vehicle_desc), label: 'Vehicle interest' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, background: item.ok ? t.accentBg : t.cardInner, border: `1px solid ${item.ok ? t.accentBorder : t.border}`, color: item.ok ? t.accent : t.muted }}>
                        {item.ok ? '✓' : '·'}
                      </span>
                      <span style={{ color: item.ok ? t.text : t.muted }}>{item.label}</span>
                    </div>
                  ))}
                </div>

              </div>

              {/* Submit button */}
              <div style={{ padding: '14px 18px', borderTop: `1px solid ${t.border}`, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    width: '100%',
                    background: saving
                      ? (isDark ? '#0a4a35' : '#6ee7b7')
                      : 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff', border: 'none', borderRadius: 10,
                    padding: '11px 20px', fontSize: 13, fontWeight: 800,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: saving ? 'none' : '0 4px 14px rgba(16,185,129,0.35)',
                    transition: 'all 0.15s',
                    letterSpacing: '0.02em',
                  }}
                  onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
                >
                  {saving ? <>⏳ Creating…</> : <>✦ Create Lead</>}
                </button>
                <Link href="/admin/crm" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 12, color: t.muted, textDecoration: 'none' }}>
                  Cancel
                </Link>
              </div>
            </div>
          </div>

        </div>
      </form>

      {showBrowse && <VehicleBrowseModal onPick={pickVehicle} onClose={() => setShowBrowse(false)} isDark={isDark} />}
    </div>
  );
}

export default function NewLeadPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div style={{ padding: 40, color: '#4a6278', fontSize: 13 }}>Loading…</div>}>
        <NewLeadForm />
      </Suspense>
    </AdminShell>
  );
}