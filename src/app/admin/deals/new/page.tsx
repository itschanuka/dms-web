'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import {
  dealApi,
  type CreateDealData,
  type PaymentType,
  type Salesperson,
  type VehicleSearchResult,
} from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { formatCurrency } from '@/lib/formatters';

// ── tokens ──────────────────────────────────────────────────────
function tok(isDark: boolean) {
  return {
    page:     isDark ? '#141c2e' : '#dde6f0',
    card:     isDark ? '#1c2538' : '#cdd8ea',
    card2:    isDark ? '#162030' : '#c4d4e6',
    border:   isDark ? '#263550' : '#aec2d6',
    text:     isDark ? '#e8f0fc' : '#0f1e32',
    muted:    isDark ? '#5a7295' : '#4a6278',
    input:    isDark ? '#0e1729' : '#b8c8db',
    inputTxt: isDark ? '#d4e2f4' : '#0f1e32',
    label:    isDark ? '#94aec8' : '#2a4260',
    accent:   '#ef4444',
    accentHover: '#dc2626',
    green:    '#34d399',
    amber:    '#f59e0b',
    indigo:   '#818cf8',
  };
}

// ── helpers ──────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

interface CustomerResult {
  id: string;
  customer_code: string;
  full_name: string;
  phone_primary: string;
  status: string;
}

// ── Autocomplete component ───────────────────────────────────────
function AutocompleteField<T>({
  label, placeholder, value, displayValue, onSearch, onSelect, onClear,
  renderItem, t, required,
}: {
  label: string;
  placeholder: string;
  value: T | null;
  displayValue: (item: T) => string;
  onSearch: (q: string) => Promise<T[]>;
  onSelect: (item: T) => void;
  onClear: () => void;
  renderItem: (item: T) => React.ReactNode;
  t: ReturnType<typeof tok>;
  required?: boolean;
}) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (v: string) => {
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (v.trim().length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await onSearch(v.trim());
        setResults(r);
        setOpen(true);
      } finally { setLoading(false); }
    }, 280);
  };

  const inp: React.CSSProperties = {
    width: '100%', background: t.input, color: t.inputTxt,
    border: `1px solid ${t.border}`, borderRadius: 8,
    padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  if (value) {
    return (
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: t.label, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
          {label}{required && <span style={{ color: t.accent }}> *</span>}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: t.input, border: `1px solid ${t.green}`, borderRadius: 8, padding: '8px 12px' }}>
          <span style={{ flex: 1, fontSize: 14, color: t.inputTxt }}>{displayValue(value)}</span>
          <button type="button" onClick={onClear} style={{ background: 'none', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: t.label, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
        {label}{required && <span style={{ color: t.accent }}> *</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder={placeholder}
          style={inp}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: t.muted, fontSize: 12 }}>…</span>
        )}
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: t.card, border: `1px solid ${t.border}`, borderRadius: 8,
          marginTop: 4, maxHeight: 240, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {results.map((item, i) => (
            <div
              key={i}
              onMouseDown={() => { onSelect(item); setQuery(''); setOpen(false); }}
              style={{ padding: '10px 14px', cursor: 'pointer', borderTop: i > 0 ? `1px solid ${t.border}` : 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && query.length >= 2 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, marginTop: 4, padding: '12px 14px', color: t.muted, fontSize: 13 }}>
          No results found
        </div>
      )}
    </div>
  );
}

// ── Section header ───────────────────────────────────────────────
function Section({ title, icon, t, children }: { title: string; icon: string; t: ReturnType<typeof tok>; children: React.ReactNode }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}`, background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{title}</span>
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Field wrapper ────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────
export default function NewDealPage() {
  const { isDark } = useTheme();
  const t = tok(isDark);
  const router = useRouter();

  // selections
  const [vehicle,     setVehicle]     = useState<VehicleSearchResult | null>(null);
  const [customer,    setCustomer]    = useState<CustomerResult | null>(null);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);

  // form fields
  const [salespersonId,      setSalespersonId]      = useState('');
  const [dealDate,           setDealDate]           = useState(today());
  const [sellingPrice,       setSellingPrice]       = useState('');
  const [discountAmount,     setDiscountAmount]     = useState('0');
  const [paymentType,        setPaymentType]        = useState<PaymentType>('cash');
  const [reservationAmount,  setReservationAmount]  = useState('');
  const [reservationDate,    setReservationDate]    = useState('');
  const [reservationExpiry,  setReservationExpiry]  = useState('');
  const [notes,              setNotes]              = useState('');

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    dealApi.getSalespersons().then(sp => {
      setSalespersons(sp);
      if (sp.length === 1) setSalespersonId(sp[0]!.id);
    }).catch(() => {});
  }, []);

  // auto-fill selling price from vehicle asking price
  useEffect(() => {
    if (vehicle && !sellingPrice) {
      setSellingPrice(String(vehicle.asking_price));
    }
  }, [vehicle]);

  const effectivePrice  = Math.max(0, (parseFloat(sellingPrice) || 0) - (parseFloat(discountAmount) || 0));
  const isReservation   = paymentType === 'cash' && parseFloat(reservationAmount) > 0;

  const canSubmit = vehicle && customer && salespersonId && dealDate && sellingPrice && parseFloat(sellingPrice) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSubmitting(true);

    const payload: CreateDealData = {
      vehicle_id:     vehicle!.id,
      customer_id:    customer!.id,
      salesperson_id: salespersonId,
      deal_date:      dealDate,
      selling_price:  parseFloat(sellingPrice),
      discount_amount: parseFloat(discountAmount) || 0,
      payment_type:   paymentType,
      notes:          notes || undefined,
    };

    if (reservationAmount && parseFloat(reservationAmount) > 0) {
      payload.reservation_amount = parseFloat(reservationAmount);
    }
    if (reservationDate)   payload.reservation_date   = reservationDate;
    if (reservationExpiry) payload.reservation_expiry = reservationExpiry;

    try {
      const deal = await dealApi.create(payload);
      router.push(`/admin/deals/${(deal as any).id}`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('BLACKLISTED'))    setError('This customer is blacklisted and cannot be added to a deal.');
      else if (msg.includes('VEHICLE_UNAVAILABLE')) setError('This vehicle is no longer available.');
      else setError(msg || 'Failed to create deal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', background: t.input, color: t.inputTxt,
    border: `1px solid ${t.border}`, borderRadius: 8,
    padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 };

  return (
    <AdminShell activePage="deals">
      <div style={{ minHeight: '100vh', background: t.page, padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/admin/deals" style={{ fontSize: 12, color: t.muted, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            ← Back to Deals
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: t.text, margin: 0 }}>New Deal</h1>
          <p style={{ color: t.muted, fontSize: 13, margin: '4px 0 0' }}>Deal code will be auto-generated on save.</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#ef4444', fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ── 1. Vehicle ── */}
          <Section title="Vehicle" icon="🚗" t={t}>
            <AutocompleteField<VehicleSearchResult>
              label="Select Vehicle"
              placeholder="Search by stock ID, make, model…"
              value={vehicle}
              displayValue={v => `${v.make} ${v.model} ${v.year} · ${v.stock_id} · ${formatCurrency(v.asking_price)}`}
              onSearch={q => dealApi.searchVehicles(q)}
              onSelect={v => setVehicle(v)}
              onClear={() => { setVehicle(null); setSellingPrice(''); }}
              renderItem={v => (
                <div>
                  <div style={{ fontWeight: 700, color: t.text, fontSize: 14 }}>{v.make} {v.model} <span style={{ color: t.muted, fontWeight: 400 }}>{v.year}</span></div>
                  <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{v.stock_id} · <span style={{ color: t.green, fontWeight: 600 }}>{formatCurrency(v.asking_price)}</span> · <span style={{ textTransform: 'capitalize' }}>{v.status}</span></div>
                </div>
              )}
              t={t}
              required
            />
          </Section>

          {/* ── 2. Customer ── */}
          <Section title="Customer" icon="👤" t={t}>
            <AutocompleteField<CustomerResult>
              label="Select Customer"
              placeholder="Search by name, phone, NIC…"
              value={customer}
              displayValue={c => `${c.full_name} · ${c.phone_primary}`}
              onSearch={q => dealApi.searchCustomers(q)}
              onSelect={c => setCustomer(c)}
              onClear={() => setCustomer(null)}
              renderItem={c => (
                <div>
                  <div style={{ fontWeight: 700, color: c.status === 'blacklisted' ? '#ef4444' : t.text, fontSize: 14 }}>
                    {c.full_name} {c.status === 'blacklisted' && '🚫'}
                  </div>
                  <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{c.customer_code} · {c.phone_primary}</div>
                </div>
              )}
              t={t}
              required
            />
          </Section>

          {/* ── 3. Deal details ── */}
          <Section title="Deal Details" icon="🤝" t={t}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              <Field label="Deal Date" required t={t}>
                <input type="date" value={dealDate} onChange={e => setDealDate(e.target.value)} style={inp} required />
              </Field>

              <Field label="Salesperson" required t={t}>
                <select value={salespersonId} onChange={e => setSalespersonId(e.target.value)} style={{ ...inp, cursor: 'pointer' }} required>
                  <option value="">— Select salesperson —</option>
                  {salespersons.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.full_name} ({sp.role})</option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ ...grid3, marginBottom: 16 }}>
              <Field label="Selling Price (usd)" required t={t}>
                <input
                  type="number" min="0" step="0.01"
                  value={sellingPrice}
                  onChange={e => setSellingPrice(e.target.value)}
                  placeholder="0.00"
                  style={inp}
                  required
                />
              </Field>

              <Field label="Discount (usd)" t={t}>
                <input
                  type="number" min="0" step="0.01"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(e.target.value)}
                  placeholder="0.00"
                  style={inp}
                />
              </Field>

              <Field label="Effective Price" t={t}>
                <div style={{ ...inp, background: 'transparent', color: effectivePrice > 0 ? t.green : t.muted, fontWeight: 700, fontFamily: 'monospace', cursor: 'default' }}>
                  {formatCurrency(effectivePrice)}
                </div>
              </Field>
            </div>

            <Field label="Payment Type" required t={t}>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['cash', 'finance', 'mixed'] as PaymentType[]).map(pt => (
                  <button
                    key={pt} type="button"
                    onClick={() => setPaymentType(pt)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, fontWeight: 700, fontSize: 13,
                      cursor: 'pointer', textTransform: 'capitalize', transition: 'all .15s',
                      background: paymentType === pt ? t.accent : t.input,
                      color:      paymentType === pt ? '#fff'    : t.muted,
                      border:     paymentType === pt ? `1px solid ${t.accent}` : `1px solid ${t.border}`,
                    }}
                  >{pt}</button>
                ))}
              </div>
            </Field>
          </Section>

          {/* ── 4. Reservation (optional) ── */}
          <Section title="Reservation (Optional)" icon="📌" t={t}>
            <p style={{ color: t.muted, fontSize: 13, margin: '0 0 16px' }}>
              Fill in if the customer is placing a deposit/reservation. Leave blank to skip.
            </p>
            <div style={grid3}>
              <Field label="Reservation Amount (usd)" t={t}>
                <input
                  type="number" min="0" step="0.01"
                  value={reservationAmount}
                  onChange={e => setReservationAmount(e.target.value)}
                  placeholder="0.00"
                  style={inp}
                />
              </Field>
              <Field label="Reservation Date" t={t}>
                <input type="date" value={reservationDate} onChange={e => setReservationDate(e.target.value)} style={inp} />
              </Field>
              <Field label="Expiry Date" t={t}>
                <input type="date" value={reservationExpiry} onChange={e => setReservationExpiry(e.target.value)} style={inp} />
              </Field>
            </div>
          </Section>

          {/* ── 5. Notes ── */}
          <Section title="Internal Notes" icon="📝" t={t}>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes about this deal…"
              rows={4}
              style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
            />
          </Section>

          {/* ── Summary bar ── */}
          {(vehicle || customer) && (
            <div style={{ background: t.card2, border: `1px solid ${t.border}`, borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
              {vehicle && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Vehicle</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{vehicle.make} {vehicle.model} {vehicle.year}</div>
                  <div style={{ fontSize: 11, color: t.muted }}>{vehicle.stock_id}</div>
                </div>
              )}
              {customer && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Customer</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{customer.full_name}</div>
                  <div style={{ fontSize: 11, color: t.muted }}>{customer.phone_primary}</div>
                </div>
              )}
              {sellingPrice && (
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Deal Value</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: t.green, fontFamily: 'monospace' }}>{formatCurrency(effectivePrice)}</div>
                  {parseFloat(discountAmount) > 0 && (
                    <div style={{ fontSize: 11, color: t.amber }}>Discount: {formatCurrency(parseFloat(discountAmount))}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Link href="/admin/deals" style={{
              padding: '11px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14,
              textDecoration: 'none', color: t.muted, background: t.card, border: `1px solid ${t.border}`,
            }}>Cancel</Link>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              style={{
                padding: '11px 32px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
                background: canSubmit && !submitting ? t.accent : 'rgba(239,68,68,0.3)',
                color: '#fff', border: 'none',
                boxShadow: canSubmit && !submitting ? '0 2px 12px rgba(239,68,68,0.4)' : 'none',
                transition: 'all .15s',
              }}
            >
              {submitting ? 'Creating…' : '✓ Create Deal'}
            </button>
          </div>

        </form>
      </div>
    </AdminShell>
  );
}