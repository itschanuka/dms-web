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

const CONDITION_LABELS: Record<string, string> = {
  used: 'Used', reconditioned: 'Recon', brand_new: 'Brand New',
};

const TRANSMISSION_LABELS: Record<string, string> = {
  manual: 'MT', automatic: 'AT', cvt: 'CVT',
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8097b8', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function VehicleBrowseModal({
  onPick,
  onClose,
  isDark,
}: {
  onPick: (v: VehicleSearchResult) => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const [vehicles,   setVehicles]   = useState<AdminVehicle[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterMake, setFilterMake] = useState('');
  const [makes,      setMakes]      = useState<string[]>([]);

  const c = {
    bg:     isDark ? '#07090f' : '#f0f4f8',
    card:   isDark ? '#0d1117' : '#ffffff',
    border: isDark ? '#1f2d45' : '#d0dcea',
    text:   isDark ? '#dde4f0' : '#1a2535',
    muted:  isDark ? '#5c7090' : '#6b7fa0',
  };

  useEffect(() => {
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
      (!q ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.stock_id.toLowerCase().includes(q) ||
        String(v.year).includes(q) ||
        (v.color || '').toLowerCase().includes(q)
      ) &&
      (!filterMake || v.make === filterMake)
    );
  });

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 20px', overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: c.card, borderRadius: 16,
        border: `1px solid ${c.border}`,
        width: '100%', maxWidth: 920,
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: c.text }}>Browse Available Vehicles</div>
            <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
              {loading ? 'Loading inventory…' : `${filtered.length} vehicle${filtered.length !== 1 ? 's' : ''} available`}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${c.border}`,
            borderRadius: 8, padding: '6px 14px',
            fontSize: 13, color: c.muted, cursor: 'pointer',
          }}>
            ✕ Close
          </button>
        </div>

        {/* Filters */}
        <div style={{
          padding: '14px 24px', borderBottom: `1px solid ${c.border}`,
          display: 'flex', gap: 10,
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', fontSize: 13, color: c.muted,
              pointerEvents: 'none',
            }}>🔍</span>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search make, model, stock ID, color…"
              style={{
                width: '100%', background: c.bg, border: `1px solid ${c.border}`,
                borderRadius: 8, padding: '8px 11px 8px 32px',
                fontSize: 13, color: c.text, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <select
            value={filterMake}
            onChange={e => setFilterMake(e.target.value)}
            style={{
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 8, padding: '8px 12px',
              fontSize: 13, color: c.text, outline: 'none', minWidth: 140,
            }}
          >
            <option value="">All Makes</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Grid */}
        <div style={{ padding: 24, maxHeight: 520, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: c.muted, fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: c.muted, fontSize: 13 }}>
              No vehicles match your search.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: 12,
            }}>
              {filtered.map(v => (
                <div
                  key={v.id}
                  onClick={() => {
                    onPick({ id: v.id, stock_id: v.stock_id, make: v.make, model: v.model, year: v.year, asking_price: v.asking_price, status: v.status, main_image_url: v.main_image_url });
                    onClose();
                  }}
                  style={{
                    background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                    transition: 'border-color 0.15s, transform 0.12s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#f59e0b';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = c.border;
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  }}
                >
                  {/* Image */}
                  <div style={{ height: 128, background: isDark ? '#111827' : '#e0e8f0', position: 'relative' }}>
                    {v.main_image_url ? (
                      <img src={v.main_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: c.muted }}>🚗</div>
                    )}
                    <div style={{
                      position: 'absolute', top: 7, left: 7,
                      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                      borderRadius: 4, padding: '2px 7px',
                      fontSize: 10, fontWeight: 700, color: '#fff',
                    }}>
                      {CONDITION_LABELS[v.condition] ?? v.condition}
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 2 }}>
                      {v.year} {v.make} {v.model}
                    </div>
                    <div style={{ fontSize: 11, color: c.muted, marginBottom: 8 }}>
                      {v.stock_id}{v.color ? ` · ${v.color}` : ''}{v.transmission ? ` · ${TRANSMISSION_LABELS[v.transmission] ?? v.transmission}` : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b' }}>{formatPrice(v.asking_price)}</div>
                      <div style={{
                        fontSize: 10, fontWeight: 600, color: '#10b981',
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                        borderRadius: 4, padding: '2px 7px',
                      }}>
                        Available
                      </div>
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

function NewLeadForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isDark }   = useTheme();
  const { employee } = useAuth();

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
    customer_id:             '',
    customer_name:           '',
    customer_phone:          '',
    interested_vehicle_id:   '',
    interested_vehicle_desc: '',
    source:                  'walk_in',
    assigned_to:             '',
    next_followup_date:      '',
    next_followup_note:      '',
  });

  const c = {
    bg:     isDark ? '#07090f' : '#f0f4f8',
    card:   isDark ? '#0d1117' : '#ffffff',
    border: isDark ? '#1f2d45' : '#d0dcea',
    text:   isDark ? '#dde4f0' : '#1a2535',
    muted:  isDark ? '#5c7090' : '#6b7fa0',
    drop:   isDark ? '#111827' : '#f8fafc',
  };

  const F: React.CSSProperties = {
    width: '100%', background: c.bg, border: `1px solid ${c.border}`,
    borderRadius: 7, padding: '8px 11px', fontSize: 13, color: c.text,
    outline: 'none', boxSizing: 'border-box',
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
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
    if (employee && employee.role === 'salesperson') {
      setForm(f => ({ ...f, assigned_to: employee.id }));
    }
  }, [employee]);

  useEffect(() => {
    if (!vehicleQuery || vehicleQuery.length < 2) { setVehicleResults([]); setDropdownOpen(false); return; }
    if (vehicleTimerRef.current) clearTimeout(vehicleTimerRef.current);
    vehicleTimerRef.current = setTimeout(async () => {
      setVehicleSearching(true);
      try {
        const res = await leadApi.searchVehicles(vehicleQuery);
        setVehicleResults(res);
        setDropdownOpen(res.length > 0);
      } catch { /* ignore */ } finally { setVehicleSearching(false); }
    }, 350);
    return () => { if (vehicleTimerRef.current) clearTimeout(vehicleTimerRef.current); };
  }, [vehicleQuery]);

  useEffect(() => {
    if (!customerQuery || customerQuery.length < 2) { setCustomerResults([]); return; }
    if (customerTimerRef.current) clearTimeout(customerTimerRef.current);
    customerTimerRef.current = setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const res = await customerApi.list({ search: customerQuery, limit: 8 });
        setCustomerResults(res.customers);
      } catch { /* ignore */ } finally { setCustomerSearching(false); }
    }, 400);
    return () => { if (customerTimerRef.current) clearTimeout(customerTimerRef.current); };
  }, [customerQuery]);

  function set(key: keyof CreateLeadData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function pickVehicle(v: VehicleSearchResult) {
    setSelectedVehicle(v);
    setVehicleResults([]);
    setVehicleQuery('');
    setDropdownOpen(false);
    setForm(f => ({
      ...f,
      interested_vehicle_id:   v.id,
      interested_vehicle_desc: `${v.year} ${v.make} ${v.model} (${v.stock_id})`,
    }));
  }

  function clearVehicle() {
    setSelectedVehicle(null);
    setVehicleQuery('');
    setForm(f => ({ ...f, interested_vehicle_id: '', interested_vehicle_desc: '' }));
  }

  function pickCustomer(cu: Customer) {
    setSelectedCustomer(cu);
    setCustomerResults([]);
    setCustomerQuery('');
    setForm(f => ({ ...f, customer_id: cu.id, customer_name: cu.full_name, customer_phone: cu.phone_primary }));
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setForm(f => ({ ...f, customer_id: '', customer_name: '', customer_phone: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name.trim())  { setError('Customer name is required');  return; }
    if (!form.customer_phone.trim()) { setError('Customer phone is required'); return; }
    if (!form.assigned_to)           { setError('Salesperson is required');     return; }
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
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 800 }}>

      <div style={{ marginBottom: 28 }}>
        <Link href="/admin/crm" style={{ fontSize: 12, color: c.muted, textDecoration: 'none' }}>← Back to CRM</Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, margin: '10px 0 4px' }}>New Lead</h1>
        <p style={{ fontSize: 13, color: c.muted }}>Log a new customer inquiry into the pipeline.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#ef4444' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ── Customer ── */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>Customer</div>

          {!selectedCustomer ? (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.muted, marginBottom: 5 }}>Search Existing Customer (optional)</label>
              <div style={{ position: 'relative' }}>
                <input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)} placeholder="Type name or phone to search…" style={F} />
                {customerSearching && <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: c.muted }}>Searching…</div>}
                {customerResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: c.drop, border: `1px solid ${c.border}`, borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                    {customerResults.map(cu => (
                      <div key={cu.id} onClick={() => pickCustomer(cu)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${c.border}` }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{cu.full_name}</div>
                        <div style={{ fontSize: 11, color: c.muted }}>{cu.phone_primary} · {cu.customer_code}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{selectedCustomer.full_name}</div>
                <div style={{ fontSize: 11, color: c.muted }}>{selectedCustomer.phone_primary} · {selectedCustomer.customer_code}</div>
              </div>
              <button type="button" onClick={clearCustomer} style={{ background: 'none', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 13 }}>✕ Unlink</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Customer Name" required>
              <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} style={F} placeholder="Full name" disabled={!!selectedCustomer} />
            </Field>
            <Field label="Customer Phone" required>
              <input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} style={F} placeholder="+94 77 000 0000" disabled={!!selectedCustomer} />
            </Field>
          </div>
        </div>

        {/* ── Vehicle Interest ── */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Vehicle Interest</div>
            {!selectedVehicle && (
              <button
                type="button"
                onClick={() => setShowBrowse(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 7, padding: '5px 12px',
                  fontSize: 12, fontWeight: 600, color: '#f59e0b', cursor: 'pointer',
                }}
              >
                🚗 Browse Available
              </button>
            )}
          </div>

          {/* Selected vehicle card */}
          {selectedVehicle ? (
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ display: 'flex' }}>
                <div style={{ width: 120, flexShrink: 0, background: isDark ? '#111827' : '#e0e8f0' }}>
                  {selectedVehicle.main_image_url ? (
                    <img src={selectedVehicle.main_image_url} alt="" style={{ width: '100%', height: '100%', minHeight: 86, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', minHeight: 86, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: c.muted }}>🚗</div>
                  )}
                </div>
                <div style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b', marginBottom: 3 }}>{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</div>
                    <div style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>Stock ID: {selectedVehicle.stock_id}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: c.text }}>{formatPrice(selectedVehicle.asking_price)}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 5, padding: '3px 8px' }}>✓ Linked</div>
                    <button type="button" onClick={clearVehicle} style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, color: c.muted, cursor: 'pointer' }}>✕ Remove</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Live search input */
            <div style={{ marginBottom: 16 }} ref={searchBoxRef}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.muted, marginBottom: 5 }}>
                Quick Search by Make / Model / Stock ID
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: c.muted, pointerEvents: 'none' }}>🔍</span>
                <input
                  value={vehicleQuery}
                  onChange={e => setVehicleQuery(e.target.value)}
                  onFocus={() => vehicleResults.length > 0 && setDropdownOpen(true)}
                  placeholder="e.g. Toyota, Aqua, STK-001…"
                  style={{ ...F, paddingLeft: 32 }}
                />
                {vehicleSearching && (
                  <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: c.muted }}>Searching…</div>
                )}
                {dropdownOpen && vehicleResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: c.drop, border: `1px solid ${c.border}`, borderRadius: 10, marginTop: 4, maxHeight: 300, overflowY: 'auto', boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}>
                    {vehicleResults.map(v => (
                      <div key={v.id} onClick={() => pickVehicle(v)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${c.border}` }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                      >
                        {/* Mini thumbnail */}
                        <div style={{ width: 52, height: 38, flexShrink: 0, borderRadius: 6, overflow: 'hidden', background: isDark ? '#1f2d45' : '#e0e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {v.main_image_url
                            ? <img src={v.main_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 18 }}>🚗</span>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{v.year} {v.make} {v.model}</div>
                          <div style={{ fontSize: 11, color: c.muted }}>
                            {v.stock_id}
                            <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: v.status === 'available' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: v.status === 'available' ? '#10b981' : '#f59e0b' }}>
                              {v.status}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b', flexShrink: 0 }}>{formatPrice(v.asking_price)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {vehicleQuery.length > 0 && vehicleQuery.length < 2 && (
                <div style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>Type at least 2 characters…</div>
              )}
            </div>
          )}

          <Field label={selectedVehicle ? 'Additional Notes / Requirements' : 'Or describe the vehicle they want (free text)'}>
            <input
              value={form.interested_vehicle_desc}
              onChange={e => set('interested_vehicle_desc', e.target.value)}
              style={F}
              placeholder={selectedVehicle ? 'Any colour preference, extra requirements…' : 'e.g. Toyota Aqua 2020, white, hybrid…'}
            />
          </Field>
        </div>

        {/* ── Lead Details ── */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>Lead Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Source" required>
              <select value={form.source} onChange={e => set('source', e.target.value as LeadSource)} style={F}>
                {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Assign To" required>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} style={F}>
                <option value="">— Select salesperson —</option>
                {salespersons.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
              </select>
            </Field>
            <Field label="Next Follow-up Date">
              <input type="date" value={form.next_followup_date} onChange={e => set('next_followup_date', e.target.value)} style={F} />
            </Field>
            <Field label="Follow-up Note">
              <input value={form.next_followup_note} onChange={e => set('next_followup_note', e.target.value)} style={F} placeholder="What to discuss…" />
            </Field>
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={saving} style={{ background: saving ? '#0a6647' : '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creating…' : 'Create Lead'}
          </button>
          <Link href="/admin/crm" style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 18px', fontSize: 14, color: c.muted, textDecoration: 'none' }}>
            Cancel
          </Link>
        </div>

      </form>

      {showBrowse && (
        <VehicleBrowseModal onPick={pickVehicle} onClose={() => setShowBrowse(false)} isDark={isDark} />
      )}
    </div>
  );
}

export default function NewLeadPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div style={{ padding: 32, color: '#5c7090' }}>Loading…</div>}>
        <NewLeadForm />
      </Suspense>
    </AdminShell>
  );
}