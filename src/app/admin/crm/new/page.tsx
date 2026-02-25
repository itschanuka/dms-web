'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import {
  leadApi, customerApi, adminApi,
  type Lead, type LeadSource, type CreateLeadData,
  type Salesperson, type VehicleSearchResult, type Customer, type AdminVehicle,
} from '@/lib/api';
import { formatPrice } from '@/lib/formatters';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';

// ─── Theme ─────────────────────────────────────────────────────────────────────
function tok(isDark: boolean) {
  return {
    page:      isDark ? '#080e1a' : '#eef2f8',
    card:      isDark ? '#0f1623' : '#ffffff',
    cardAlt:   isDark ? '#0b1220' : '#f7fafd',
    section:   isDark ? '#0d1420' : '#f4f8fd',
    border:    isDark ? '#1c2d46' : '#d4e0ee',
    text:      isDark ? '#e4ecf9' : '#0d1e32',
    sub:       isDark ? '#c5d3e8' : '#334155',
    muted:     isDark ? '#4d6580' : '#6b829e',
    label:     isDark ? '#5a7898' : '#5a7898',
    input:     isDark ? '#060d17' : '#eef2f8',
    inputText: isDark ? '#d0dff4' : '#1a2e44',
    accent:    '#10b981',
    accentBg:  'rgba(16,185,129,0.09)',
    accentBdr: 'rgba(16,185,129,0.28)',
    amber:     '#f59e0b',
    amberBg:   'rgba(245,158,11,0.09)',
    amberBdr:  'rgba(245,158,11,0.28)',
    violet:    '#8b5cf6',
    violetBg:  'rgba(139,92,246,0.1)',
    violetBdr: 'rgba(139,92,246,0.28)',
    danger:    '#ef4444',
    dangerBg:  'rgba(239,68,68,0.08)',
    shadow:    isDark ? '0 4px 32px rgba(0,0,0,0.5)' : '0 2px 20px rgba(0,0,0,0.09)',
    shadowMd:  isDark ? '0 12px 48px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.14)',
  };
}

const SRC_OPTIONS: { value: LeadSource; label: string; icon: string }[] = [
  { value: 'walk_in',  label: 'Walk-in',  icon: '🚶' },
  { value: 'call',     label: 'Call',     icon: '📞' },
  { value: 'website',  label: 'Website',  icon: '🌐' },
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'referral', label: 'Referral', icon: '🤝' },
  { value: 'other',    label: 'Other',    icon: '📌' },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon, title, extra, children, isDark }: {
  icon: string; title: string; extra?: React.ReactNode; children: React.ReactNode; isDark: boolean;
}) {
  const t = tok(isDark);
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '13px 20px', borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 15 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: t.sub }}>{title}</span>
        </div>
        {extra}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ─── Input / Label ────────────────────────────────────────────────────────────
function FieldLabel({ text, required, isDark }: { text: string; required?: boolean; isDark: boolean }) {
  const t = tok(isDark);
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: t.label, marginBottom: 6,
      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {text}{required && <span style={{ color: t.danger, marginLeft: 2 }}>*</span>}
    </div>
  );
}

// ─── Vehicle Browse Modal ──────────────────────────────────────────────────────
function VehicleModal({ onPick, onClose, isDark }: {
  onPick: (v: VehicleSearchResult) => void; onClose: () => void; isDark: boolean;
}) {
  const t = tok(isDark);
  const [vehicles,   setVehicles]   = useState<AdminVehicle[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterMake, setFilterMake] = useState('');
  const [makes,      setMakes]      = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
    adminApi.listVehicles({ status: 'available', limit: 200 })
      .then(res => {
        setVehicles(res.vehicles);
        setMakes([...new Set(res.vehicles.map(v => v.make))].sort());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    return (!filterMake || v.make === filterMake) &&
      (!q || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) ||
        v.stock_id.toLowerCase().includes(q) || String(v.year).includes(q) ||
        (v.color || '').toLowerCase().includes(q));
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', padding: '48px 20px', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`,
        width: '100%', maxWidth: 920, boxShadow: t.shadowMd }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>Browse Available Vehicles</div>
            <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
              {loading ? 'Loading…' : `${filtered.length} vehicle${filtered.length !== 1 ? 's' : ''} available`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${t.border}`,
            borderRadius: 8, padding: '6px 14px', fontSize: 12, color: t.muted, cursor: 'pointer' }}>
            ✕ Close
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 24px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', gap: 10, background: t.section }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: t.muted, fontSize: 13, pointerEvents: 'none' }}>🔍</span>
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Make, model, stock ID, colour, year…"
              style={{ width: '100%', background: t.input, border: `1px solid ${t.border}`, borderRadius: 8,
                padding: '8px 12px 8px 34px', fontSize: 13, color: t.inputText, outline: 'none',
                boxSizing: 'border-box' }} />
          </div>
          <select value={filterMake} onChange={e => setFilterMake(e.target.value)}
            style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 8,
              padding: '8px 28px 8px 12px', fontSize: 13, color: t.inputText, outline: 'none',
              cursor: 'pointer', appearance: 'none', minWidth: 130,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235a7898' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
            <option value="">All Makes</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Grid */}
        <div style={{ padding: 24, maxHeight: 500, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: t.muted }}>Loading inventory…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: t.muted }}>No vehicles match.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {filtered.map(v => (
                <div key={v.id}
                  onClick={() => { onPick({ id: v.id, stock_id: v.stock_id, make: v.make, model: v.model, year: v.year, asking_price: v.asking_price, status: v.status, main_image_url: v.main_image_url }); onClose(); }}
                  style={{ background: t.section, border: `1px solid ${t.border}`, borderRadius: 12,
                    overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = t.amber; el.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = t.border; el.style.transform = 'translateY(0)'; }}>
                  <div style={{ height: 110, background: isDark ? '#07101e' : '#dce9f4', position: 'relative' }}>
                    {v.main_image_url
                      ? <img src={v.main_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: t.muted }}>🚗</div>}
                    <div style={{ position: 'absolute', top: 7, left: 7, background: 'rgba(0,0,0,0.65)',
                      backdropFilter: 'blur(6px)', borderRadius: 5, padding: '2px 7px', fontSize: 10,
                      fontWeight: 700, color: '#fff' }}>
                      {v.condition === 'brand_new' ? 'New' : v.condition === 'reconditioned' ? 'Recon' : 'Used'}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>
                      {v.year} {v.make} {v.model}
                    </div>
                    <div style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>{v.stock_id}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: t.amber }}>{formatPrice(v.asking_price)}</div>
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

// ─── New Lead Form ──────────────────────────────────────────────────────────────
function NewLeadFormInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isDark }   = useTheme();
  const { employee } = useAuth();
  const t = tok(isDark);

  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [showBrowse,   setShowBrowse]   = useState(false);

  // Vehicle search
  const [vehicleQuery,     setVehicleQuery]     = useState('');
  const [vehicleResults,   setVehicleResults]   = useState<VehicleSearchResult[]>([]);
  const [vehicleSearching, setVehicleSearching] = useState(false);
  const [vehicleDrop,      setVehicleDrop]      = useState(false);
  const [selectedVehicle,  setSelectedVehicle]  = useState<VehicleSearchResult | null>(null);
  const vehicleTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vehicleBoxRef = useRef<HTMLDivElement>(null);

  // Customer search
  const [customerQuery,     setCustomerQuery]     = useState('');
  const [customerResults,   setCustomerResults]   = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomer,  setSelectedCustomer]  = useState<Customer | null>(null);
  const customerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<CreateLeadData>({
    customer_id: '', customer_name: '', customer_phone: '',
    interested_vehicle_id: '', interested_vehicle_desc: '',
    source: 'walk_in', assigned_to: '',
    next_followup_date: '', next_followup_note: '',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`, borderRadius: 9,
    padding: '9px 13px', fontSize: 13, color: t.inputText, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  };

  const valid = {
    name: !!form.customer_name.trim(),
    phone: !!form.customer_phone.trim(),
    sp: !!form.assigned_to,
    vehicle: !!(selectedVehicle || form.interested_vehicle_desc),
  };
  const completedCount = Object.values(valid).filter(Boolean).length;

  // Load initial data
  useEffect(() => {
    leadApi.getSalespersons().then(setSalespersons).catch(() => {});
    const preId = searchParams.get('customer_id');
    if (preId) {
      customerApi.get(preId).then(c => {
        setSelectedCustomer(c);
        setForm(f => ({ ...f, customer_id: c.id, customer_name: c.full_name, customer_phone: c.phone_primary }));
      }).catch(() => {});
    }
  }, [searchParams]);

  useEffect(() => {
    if (employee?.role === 'salesperson') setForm(f => ({ ...f, assigned_to: employee.id }));
  }, [employee]);

  // Click outside close vehicle dropdown
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (vehicleBoxRef.current && !vehicleBoxRef.current.contains(e.target as Node)) setVehicleDrop(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Vehicle debounce search
  useEffect(() => {
    if (!vehicleQuery || vehicleQuery.length < 2) { setVehicleResults([]); setVehicleDrop(false); return; }
    if (vehicleTimer.current) clearTimeout(vehicleTimer.current);
    vehicleTimer.current = setTimeout(async () => {
      setVehicleSearching(true);
      try { const res = await leadApi.searchVehicles(vehicleQuery); setVehicleResults(res); setVehicleDrop(res.length > 0); }
      catch { } finally { setVehicleSearching(false); }
    }, 350);
    return () => { if (vehicleTimer.current) clearTimeout(vehicleTimer.current); };
  }, [vehicleQuery]);

  // Customer debounce search
  useEffect(() => {
    if (!customerQuery || customerQuery.length < 2) { setCustomerResults([]); return; }
    if (customerTimer.current) clearTimeout(customerTimer.current);
    customerTimer.current = setTimeout(async () => {
      setCustomerSearching(true);
      try { const res = await customerApi.list({ search: customerQuery, limit: 8 }); setCustomerResults(res.customers); }
      catch { } finally { setCustomerSearching(false); }
    }, 400);
    return () => { if (customerTimer.current) clearTimeout(customerTimer.current); };
  }, [customerQuery]);

  function setF(key: keyof CreateLeadData, val: string) { setForm(f => ({ ...f, [key]: val })); }

  function pickVehicle(v: VehicleSearchResult) {
    setSelectedVehicle(v); setVehicleResults([]); setVehicleQuery(''); setVehicleDrop(false);
    setF('interested_vehicle_id', v.id);
    setF('interested_vehicle_desc', `${v.year} ${v.make} ${v.model} (${v.stock_id})`);
  }

  function clearVehicle() {
    setSelectedVehicle(null); setVehicleQuery('');
    setF('interested_vehicle_id', ''); setF('interested_vehicle_desc', '');
  }

  function pickCustomer(c: Customer) {
    setSelectedCustomer(c); setCustomerResults([]); setCustomerQuery('');
    setForm(f => ({ ...f, customer_id: c.id, customer_name: c.full_name, customer_phone: c.phone_primary }));
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setForm(f => ({ ...f, customer_id: '', customer_name: '', customer_phone: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid.name)  { setError('Customer name is required');  return; }
    if (!valid.phone) { setError('Customer phone is required'); return; }
    if (!valid.sp)    { setError('Please assign a salesperson'); return; }
    setSaving(true); setError('');
    try {
      const lead = await leadApi.create({
        ...form,
        customer_id:             form.customer_id             || undefined,
        interested_vehicle_id:   form.interested_vehicle_id   || undefined,
        interested_vehicle_desc: form.interested_vehicle_desc || undefined,
        next_followup_date:      form.next_followup_date      || undefined,
        next_followup_note:      form.next_followup_note      || undefined,
      });
      router.push(`/admin/crm/${lead.id}`);
    } catch (err) { setError(String(err)); setSaving(false); }
  }

  const assignedPerson = salespersons.find(s => s.id === form.assigned_to);

  return (
    <div style={{ background: t.page, minHeight: '100%', padding: '28px 32px 60px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/admin/crm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12,
            color: t.muted, textDecoration: 'none', marginBottom: 12 }}>
          ← Back to CRM
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: t.text, margin: 0, letterSpacing: '-0.4px' }}>
              New Lead
            </h1>
            <p style={{ fontSize: 13, color: t.muted, margin: '4px 0 0' }}>
              Log a new customer enquiry into the pipeline.
            </p>
          </div>
          {/* Progress indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width: 28, height: 4, borderRadius: 2,
                  background: i < completedCount ? t.accent : t.border, transition: 'background 0.3s' }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: t.muted }}>{completedCount}/4 fields</span>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: t.dangerBg,
          border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px',
          marginBottom: 20, fontSize: 13, color: t.danger }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

          {/* ── LEFT: Sections ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* SECTION 1: Customer */}
            <Section icon="👤" title="Customer Details" isDark={isDark}>
              {!selectedCustomer ? (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <FieldLabel text="Search existing customer" isDark={isDark} />
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: t.muted, pointerEvents: 'none' }}>🔍</span>
                      <input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)}
                        placeholder="Type name or phone number…"
                        style={{ ...inputStyle, paddingLeft: 34 }} />
                      {customerSearching && (
                        <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                          fontSize: 11, color: t.muted }}>…</span>
                      )}
                      {customerResults.length > 0 && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                          background: isDark ? '#0a1525' : '#fff', border: `1px solid ${t.border}`, borderRadius: 10,
                          maxHeight: 220, overflowY: 'auto', boxShadow: t.shadowMd }}>
                          {customerResults.map(c => (
                            <div key={c.id} onClick={() => pickCustomer(c)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                                cursor: 'pointer', borderBottom: `1px solid ${t.border}` }}
                              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f4f7fb'}
                              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.violetBg,
                                border: `1px solid ${t.violetBdr}`, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 13, color: t.violet, fontWeight: 800, flexShrink: 0 }}>
                                {c.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{c.full_name}</div>
                                <div style={{ fontSize: 11, color: t.muted }}>{c.phone_primary} · {c.customer_code}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: t.border }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.label, letterSpacing: '0.05em' }}>
                      OR ENTER MANUALLY
                    </span>
                    <div style={{ flex: 1, height: 1, background: t.border }} />
                  </div>
                </>
              ) : (
                <div style={{ background: t.accentBg, border: `1px solid ${t.accentBdr}`,
                  borderRadius: 10, padding: '11px 14px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: t.violetBg,
                    border: `1px solid ${t.violetBdr}`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 14, color: t.violet, fontWeight: 800, flexShrink: 0 }}>
                    {selectedCustomer.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.accent }}>
                      {selectedCustomer.full_name}
                      <span style={{ fontSize: 10, fontWeight: 700, background: t.accentBg, color: t.accent,
                        border: `1px solid ${t.accentBdr}`, borderRadius: 4, padding: '1px 6px', marginLeft: 7 }}>
                        Linked
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: t.muted }}>{selectedCustomer.phone_primary} · {selectedCustomer.customer_code}</div>
                  </div>
                  <button type="button" onClick={clearCustomer}
                    style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 7,
                      padding: '4px 10px', fontSize: 11, color: t.muted, cursor: 'pointer' }}>
                    Unlink
                  </button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <FieldLabel text="Full Name" required isDark={isDark} />
                  <input value={form.customer_name} onChange={e => setF('customer_name', e.target.value)}
                    placeholder="e.g. Nimal Perera" style={inputStyle} disabled={!!selectedCustomer} />
                </div>
                <div>
                  <FieldLabel text="Phone" required isDark={isDark} />
                  <input value={form.customer_phone} onChange={e => setF('customer_phone', e.target.value)}
                    placeholder="+94 77 000 0000" style={inputStyle} disabled={!!selectedCustomer} />
                </div>
              </div>
            </Section>

            {/* SECTION 2: Vehicle Interest */}
            <Section icon="🚗" title="Vehicle Interest"
              extra={!selectedVehicle && (
                <button type="button" onClick={() => setShowBrowse(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: t.amberBg,
                    border: `1px solid ${t.amberBdr}`, borderRadius: 7, padding: '5px 12px',
                    fontSize: 12, fontWeight: 700, color: t.amber, cursor: 'pointer' }}>
                  📋 Browse All
                </button>
              )}
              isDark={isDark}>

              {selectedVehicle ? (
                <div style={{ background: t.amberBg, border: `1px solid ${t.amberBdr}`,
                  borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    <div style={{ width: 100, flexShrink: 0, background: isDark ? '#060e1c' : '#d5e2f0', position: 'relative' }}>
                      {selectedVehicle.main_image_url
                        ? <img src={selectedVehicle.main_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 80 }} />
                        : <div style={{ width: '100%', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: t.muted }}>🚗</div>}
                    </div>
                    <div style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: t.amber, marginBottom: 2 }}>
                          {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                        </div>
                        <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>Stock: {selectedVehicle.stock_id}</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: t.text }}>{formatPrice(selectedVehicle.asking_price)}</div>
                      </div>
                      <button type="button" onClick={clearVehicle}
                        style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 7,
                          padding: '5px 11px', fontSize: 11, color: t.muted, cursor: 'pointer' }}>
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 14 }} ref={vehicleBoxRef}>
                  <FieldLabel text="Quick search by make, model or stock ID" isDark={isDark} />
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 13, color: t.muted, pointerEvents: 'none' }}>🔍</span>
                    <input value={vehicleQuery} onChange={e => setVehicleQuery(e.target.value)}
                      onFocus={() => vehicleResults.length > 0 && setVehicleDrop(true)}
                      placeholder="Toyota, Aqua, STK-001…"
                      style={{ ...inputStyle, paddingLeft: 34 }} />
                    {vehicleSearching && (
                      <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 11, color: t.muted }}>…</span>
                    )}
                    {vehicleDrop && vehicleResults.length > 0 && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                        background: isDark ? '#0a1525' : '#fff', border: `1px solid ${t.border}`, borderRadius: 10,
                        maxHeight: 260, overflowY: 'auto', boxShadow: t.shadowMd }}>
                        {vehicleResults.map(v => (
                          <div key={v.id} onClick={() => pickVehicle(v)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                              cursor: 'pointer', borderBottom: `1px solid ${t.border}` }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f4f7fb'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                            <div style={{ width: 48, height: 36, flexShrink: 0, borderRadius: 6, overflow: 'hidden',
                              background: isDark ? '#0a1120' : '#d5e0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {v.main_image_url
                                ? <img src={v.main_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span style={{ fontSize: 16 }}>🚗</span>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{v.year} {v.make} {v.model}</div>
                              <div style={{ fontSize: 11, color: t.muted }}>{v.stock_id}</div>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: t.amber, flexShrink: 0 }}>{formatPrice(v.asking_price)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <FieldLabel text={selectedVehicle ? 'Colour preference / notes — optional' : 'Or describe what they are looking for — optional'} isDark={isDark} />
                <input value={form.interested_vehicle_desc} onChange={e => setF('interested_vehicle_desc', e.target.value)}
                  placeholder={selectedVehicle ? 'Colour, extras, specific requirements…' : 'e.g. Toyota Aqua 2020, white, low mileage…'}
                  style={inputStyle} />
              </div>
            </Section>

            {/* SECTION 3: Lead Details */}
            <Section icon="📋" title="Lead Details" isDark={isDark}>
              <div style={{ marginBottom: 16 }}>
                <FieldLabel text="Source" required isDark={isDark} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {SRC_OPTIONS.map(s => {
                    const active = form.source === s.value;
                    return (
                      <button key={s.value} type="button" onClick={() => setF('source', s.value)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '6px 13px', borderRadius: 20, fontSize: 12,
                          fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.12s',
                          border: `1px solid ${active ? t.accentBdr : t.border}`,
                          background: active ? t.accentBg : 'transparent',
                          color: active ? t.accent : t.muted }}>
                        {s.icon} {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <FieldLabel text="Assign To" required isDark={isDark} />
                  <select value={form.assigned_to} onChange={e => setF('assigned_to', e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235a7898' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32 }}>
                    <option value="">— Select salesperson —</option>
                    {salespersons.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel text="Next Follow-up Date" isDark={isDark} />
                  <input type="date" value={form.next_followup_date} onChange={e => setF('next_followup_date', e.target.value)}
                    style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <FieldLabel text="Follow-up Note — optional" isDark={isDark} />
                  <input value={form.next_followup_note} onChange={e => setF('next_followup_note', e.target.value)}
                    placeholder="Topics to discuss, customer preferences…" style={inputStyle} />
                </div>
              </div>
            </Section>
          </div>

          {/* ── RIGHT: Summary + Submit ── */}
          <div style={{ position: 'sticky', top: 20 }}>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14,
              overflow: 'hidden', boxShadow: t.shadow }}>

              <div style={{ padding: '13px 18px', borderBottom: `1px solid ${t.border}`,
                background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: t.label,
                  letterSpacing: '0.08em', textTransform: 'uppercase' }}>Lead Summary</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>
                  {completedCount}/4 ready
                </span>
              </div>

              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Customer preview */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.label, letterSpacing: '0.05em',
                    textTransform: 'uppercase', marginBottom: 7 }}>Customer</div>
                  {form.customer_name ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: t.violetBg,
                        border: `1px solid ${t.violetBdr}`, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 12, color: t.violet, fontWeight: 800, flexShrink: 0 }}>
                        {form.customer_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{form.customer_name}</div>
                        <div style={{ fontSize: 11, color: t.muted }}>{form.customer_phone || '—'}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: t.muted, fontStyle: 'italic' }}>Not entered yet</div>
                  )}
                </div>

                <div style={{ height: 1, background: t.border }} />

                {/* Vehicle preview */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.label, letterSpacing: '0.05em',
                    textTransform: 'uppercase', marginBottom: 7 }}>Vehicle</div>
                  {selectedVehicle ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 40, height: 30, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                        background: isDark ? '#07101e' : '#d5e2f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selectedVehicle.main_image_url
                          ? <img src={selectedVehicle.main_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span>🚗</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: t.amber }}>
                          {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                        </div>
                        <div style={{ fontSize: 11, color: t.muted }}>{formatPrice(selectedVehicle.asking_price)}</div>
                      </div>
                    </div>
                  ) : form.interested_vehicle_desc ? (
                    <div style={{ fontSize: 12, color: t.sub }}>📝 {form.interested_vehicle_desc}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: t.muted, fontStyle: 'italic' }}>Not specified</div>
                  )}
                </div>

                <div style={{ height: 1, background: t.border }} />

                {/* Details preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[
                    { label: 'Source', value: `${SRC_OPTIONS.find(s => s.value === form.source)?.icon} ${SRC_OPTIONS.find(s => s.value === form.source)?.label}` },
                    { label: 'Assigned', value: assignedPerson?.full_name ?? null },
                    { label: 'Follow-up', value: form.next_followup_date ? fmtDate(form.next_followup_date) : null },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: t.muted }}>{row.label}</span>
                      <span style={{ fontWeight: 600, color: row.value ? t.sub : t.muted,
                        fontStyle: row.value ? 'normal' : 'italic' }}>
                        {row.value ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ height: 1, background: t.border }} />

                {/* Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { ok: valid.name,    label: 'Customer name'    },
                    { ok: valid.phone,   label: 'Phone number'     },
                    { ok: valid.sp,      label: 'Salesperson'      },
                    { ok: valid.vehicle, label: 'Vehicle interest'  },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
                        fontWeight: 800, background: item.ok ? t.accentBg : 'transparent',
                        border: `1.5px solid ${item.ok ? t.accentBdr : t.border}`,
                        color: item.ok ? t.accent : t.muted, transition: 'all 0.2s' }}>
                        {item.ok ? '✓' : ''}
                      </div>
                      <span style={{ color: item.ok ? t.sub : t.muted }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div style={{ padding: '14px 18px', borderTop: `1px solid ${t.border}`,
                background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                <button type="submit" disabled={saving}
                  style={{ width: '100%', background: saving ? '#0a4a35' : `linear-gradient(135deg, ${t.accent}, #059669)`,
                    color: '#fff', border: 'none', borderRadius: 10, padding: '11px 16px',
                    fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    boxShadow: saving ? 'none' : '0 4px 16px rgba(16,185,129,0.35)',
                    transition: 'all 0.15s', opacity: saving ? 0.7 : 1 }}>
                  {saving ? '⏳ Creating…' : '✦ Create Lead'}
                </button>
                <Link href="/admin/crm"
                  style={{ display: 'block', textAlign: 'center', marginTop: 9, fontSize: 12,
                    color: t.muted, textDecoration: 'none' }}>
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>

      {showBrowse && (
        <VehicleModal onPick={pickVehicle} onClose={() => setShowBrowse(false)} isDark={isDark} />
      )}
    </div>
  );
}

export default function NewLeadPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div style={{ padding: 40, color: '#4a6278', fontSize: 13 }}>Loading…</div>}>
        <NewLeadFormInner />
      </Suspense>
    </AdminShell>
  );
}