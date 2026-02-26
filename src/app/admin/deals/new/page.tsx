'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { dealApi, type PaymentType, type Salesperson, type VehicleSearchResult } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { formatCurrency } from '@/lib/formatters';

function tok(isDark: boolean) {
  return {
    page:      isDark ? '#141c2e' : '#dde6f0',
    card:      isDark ? '#1c2538' : '#cdd8ea',
    cardInner: isDark ? '#111827' : '#c8d6e8',
    border:    isDark ? '#263550' : '#aec2d6',
    text:      isDark ? '#e8f0fc' : '#0f1e32',
    muted:     isDark ? '#5a7295' : '#4a6278',
    input:     isDark ? '#0e1729' : '#b8c8db',
    inputText: isDark ? '#d4e2f4' : '#0f1e32',
    accent:    '#ef4444',
    label:     isDark ? '#a0b8d8' : '#2a4a68',
  };
}

interface CustomerResult {
  id: string;
  customer_code: string;
  full_name: string;
  phone_primary: string;
  status: string;
}

export default function NewDealPage() {
  const { isDark } = useTheme();
  const t = tok(isDark);
  const router = useRouter();

  const [vehicleId,       setVehicleId]       = useState('');
  const [vehicleDisplay,  setVehicleDisplay]  = useState('');
  const [customerId,      setCustomerId]      = useState('');
  const [customerDisplay, setCustomerDisplay] = useState('');
  const [salespersonId,   setSalespersonId]   = useState('');
  const [dealDate,        setDealDate]        = useState(new Date().toISOString().split('T')[0]!);
  const [sellingPrice,    setSellingPrice]    = useState('');
  const [discountAmount,  setDiscountAmount]  = useState('0');
  const [paymentType,     setPaymentType]     = useState<PaymentType>('cash');
  const [reservationAmt,  setReservationAmt]  = useState('');
  const [reservationDate, setReservationDate] = useState('');
  const [reservationExp,  setReservationExp]  = useState('');
  const [notes,           setNotes]           = useState('');

  const [salespersons,    setSalespersons]    = useState<Salesperson[]>([]);
  const [vehicleSearch,   setVehicleSearch]   = useState('');
  const [vehicleResults,  setVehicleResults]  = useState<VehicleSearchResult[]>([]);
  const [customerSearch,  setCustomerSearch]  = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [vehicleOpen,     setVehicleOpen]     = useState(false);
  const [customerOpen,    setCustomerOpen]    = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const vTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dealApi.getSalespersons().then(r => { if (r.success) setSalespersons(r.data); });
  }, []);

  useEffect(() => {
    if (vehicleSearch.length < 2) { setVehicleResults([]); setVehicleOpen(false); return; }
    if (vTimer.current) clearTimeout(vTimer.current);
    vTimer.current = setTimeout(async () => {
      const r = await dealApi.searchVehicles(vehicleSearch);
      if (r.success) { setVehicleResults(r.data); setVehicleOpen(true); }
    }, 300);
  }, [vehicleSearch]);

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); setCustomerOpen(false); return; }
    if (cTimer.current) clearTimeout(cTimer.current);
    cTimer.current = setTimeout(async () => {
      const r = await dealApi.searchCustomers(customerSearch);
      if (r.success) { setCustomerResults(r.data); setCustomerOpen(true); }
    }, 300);
  }, [customerSearch]);

  const selectVehicle = (v: VehicleSearchResult) => {
    setVehicleId(v.id);
    setVehicleDisplay(`${v.make} ${v.model} (${v.year}) — ${v.stock_id}`);
    if (!sellingPrice) setSellingPrice(String(v.asking_price));
    setVehicleSearch(''); setVehicleResults([]); setVehicleOpen(false);
  };

  const selectCustomer = (c: CustomerResult) => {
    setCustomerId(c.id);
    setCustomerDisplay(`${c.full_name} · ${c.phone_primary}`);
    setCustomerSearch(''); setCustomerResults([]); setCustomerOpen(false);
  };

  const handleSubmit = async () => {
    if (!vehicleId || !customerId || !salespersonId || !sellingPrice || !dealDate) {
      setError('Please fill in all required fields.'); return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await dealApi.create({
        vehicle_id:      vehicleId,
        customer_id:     customerId,
        salesperson_id:  salespersonId,
        deal_date:       dealDate,
        selling_price:   parseFloat(sellingPrice),
        discount_amount: parseFloat(discountAmount || '0'),
        payment_type:    paymentType,
        reservation_amount: reservationAmt ? parseFloat(reservationAmt) : undefined,
        reservation_date:   reservationDate || undefined,
        reservation_expiry: reservationExp  || undefined,
        notes: notes || undefined,
      });
      if (res.success) {
        router.push(`/admin/deals/${res.data.id}`);
      } else {
        setError((res as { error?: { message?: string } }).error?.message ?? 'Failed to create deal');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const inputSt: React.CSSProperties = {
    background: t.input, color: t.inputText, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', width: '100%',
  };
  const labelSt: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 700, color: t.label,
    textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 6,
  };

  const eff = parseFloat(sellingPrice || '0') - parseFloat(discountAmount || '0');
  const canSubmit = !submitting && !!vehicleId && !!customerId && !!salespersonId && !!sellingPrice;

  return (
    <AdminShell activePage="deals">
      <div style={{ minHeight: '100vh', background: t.page, padding: '32px 40px' }}>

        <div style={{ marginBottom: 28 }}>
          <button onClick={() => router.back()} style={{
            background: 'transparent', border: 'none', color: t.muted,
            cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0,
          }}>← Back to Deals</button>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: t.text, margin: 0 }}>New Deal</h1>
          <p style={{ color: t.muted, fontSize: 14, margin: '4px 0 0' }}>Create a new sales deal</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '12px 16px', color: '#ef4444', marginBottom: 20, fontSize: 14,
          }}>{error}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

          {/* ── Main form ── */}
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.border}` }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text, margin: 0 }}>Deal Details</h2>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Vehicle picker */}
              <div style={{ position: 'relative' }}>
                <label style={labelSt}>Vehicle *</label>
                {vehicleId ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ ...inputSt, background: t.cardInner, color: '#34d399', fontWeight: 600, flex: 1 }}>
                      ✓ {vehicleDisplay}
                    </div>
                    <button onClick={() => { setVehicleId(''); setVehicleDisplay(''); setSellingPrice(''); }}
                      style={{
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 8, padding: '9px 14px', color: '#ef4444', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700,
                      }}>Change</button>
                  </div>
                ) : (
                  <>
                    <input
                      value={vehicleSearch}
                      onChange={e => setVehicleSearch(e.target.value)}
                      placeholder="Search by make, model, stock ID…"
                      style={inputSt}
                    />
                    {vehicleOpen && vehicleResults.length > 0 && (
                      <div style={{
                        position: 'absolute', zIndex: 50, width: '100%', top: '100%', marginTop: 4,
                        background: t.card, border: `1px solid ${t.border}`, borderRadius: 10,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.4)', overflow: 'hidden',
                      }}>
                        {vehicleResults.map(v => (
                          <div key={v.id} onClick={() => selectVehicle(v)}
                            style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div>
                              <div style={{ color: t.text, fontWeight: 600, fontSize: 14 }}>{v.make} {v.model} ({v.year})</div>
                              <div style={{ color: t.muted, fontSize: 12 }}>{v.stock_id} · {v.status}</div>
                            </div>
                            <div style={{ color: '#34d399', fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(v.asking_price)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Customer picker */}
              <div style={{ position: 'relative' }}>
                <label style={labelSt}>Customer *</label>
                {customerId ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ ...inputSt, background: t.cardInner, color: '#34d399', fontWeight: 600, flex: 1 }}>
                      ✓ {customerDisplay}
                    </div>
                    <button onClick={() => { setCustomerId(''); setCustomerDisplay(''); }}
                      style={{
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 8, padding: '9px 14px', color: '#ef4444', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700,
                      }}>Change</button>
                  </div>
                ) : (
                  <>
                    <input
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="Search by name, phone, customer code…"
                      style={inputSt}
                    />
                    {customerOpen && customerResults.length > 0 && (
                      <div style={{
                        position: 'absolute', zIndex: 50, width: '100%', top: '100%', marginTop: 4,
                        background: t.card, border: `1px solid ${t.border}`, borderRadius: 10,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.4)', overflow: 'hidden',
                      }}>
                        {customerResults.map(c => (
                          <div key={c.id}
                            onClick={() => c.status !== 'blacklisted' ? selectCustomer(c) : undefined}
                            style={{
                              padding: '10px 16px', cursor: c.status === 'blacklisted' ? 'not-allowed' : 'pointer',
                              borderBottom: `1px solid ${t.border}`, opacity: c.status === 'blacklisted' ? 0.5 : 1,
                            }}
                            onMouseEnter={e => { if (c.status !== 'blacklisted') e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{ color: t.text, fontWeight: 600, fontSize: 14 }}>{c.full_name}</div>
                            <div style={{ color: t.muted, fontSize: 12 }}>
                              {c.phone_primary} · {c.customer_code}
                              {c.status === 'blacklisted' && <span style={{ color: '#ef4444', marginLeft: 8 }}>🚫 Blacklisted</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Salesperson + Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelSt}>Salesperson *</label>
                  <select value={salespersonId} onChange={e => setSalespersonId(e.target.value)}
                    style={{ ...inputSt, cursor: 'pointer' }}>
                    <option value="">Select salesperson…</option>
                    {salespersons.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>Deal Date *</label>
                  <input type="date" value={dealDate} onChange={e => setDealDate(e.target.value)} style={inputSt} />
                </div>
              </div>

              {/* Price + Discount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelSt}>Selling Price (LKR) *</label>
                  <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)}
                    placeholder="0.00" style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>Discount (LKR)</label>
                  <input type="number" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)}
                    placeholder="0.00" style={inputSt} />
                </div>
              </div>

              {/* Payment type */}
              <div>
                <label style={labelSt}>Payment Type *</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['cash', 'finance', 'mixed'] as PaymentType[]).map(pt => (
                    <button key={pt} onClick={() => setPaymentType(pt)} style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13,
                      fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                      textTransform: 'capitalize',
                      background: paymentType === pt ? t.accent : t.input,
                      color:      paymentType === pt ? '#fff'    : t.muted,
                      border: `1px solid ${paymentType === pt ? t.accent : t.border}`,
                    }}>{pt}</button>
                  ))}
                </div>
              </div>

              {/* Reservation */}
              <div style={{ background: t.cardInner, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
                <label style={{ ...labelSt, marginBottom: 12 }}>Reservation (Optional)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ ...labelSt, fontSize: 11 }}>Deposit Amount</label>
                    <input type="number" value={reservationAmt} onChange={e => setReservationAmt(e.target.value)} placeholder="0.00" style={inputSt} />
                  </div>
                  <div>
                    <label style={{ ...labelSt, fontSize: 11 }}>Reservation Date</label>
                    <input type="date" value={reservationDate} onChange={e => setReservationDate(e.target.value)} style={inputSt} />
                  </div>
                  <div>
                    <label style={{ ...labelSt, fontSize: 11 }}>Expiry Date</label>
                    <input type="date" value={reservationExp} onChange={e => setReservationExp(e.target.value)} style={inputSt} />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelSt}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Internal notes…"
                  style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

            </div>
          </div>

          {/* ── Sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 20px' }}>
                Deal Summary
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: t.muted }}>Selling Price</span>
                  <span style={{ color: t.text, fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(parseFloat(sellingPrice || '0'))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: t.muted }}>Discount</span>
                  <span style={{ color: '#ef4444', fontFamily: 'monospace', fontWeight: 600 }}>− {formatCurrency(parseFloat(discountAmount || '0'))}</span>
                </div>
                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                  <span style={{ color: t.text, fontWeight: 700 }}>Effective Price</span>
                  <span style={{ color: '#34d399', fontFamily: 'monospace', fontWeight: 800 }}>{formatCurrency(Math.max(0, eff))}</span>
                </div>
                {reservationAmt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: t.muted }}>Reservation Deposit</span>
                    <span style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(parseFloat(reservationAmt))}</span>
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleSubmit} disabled={!canSubmit} style={{
              background: canSubmit ? t.accent : 'rgba(239,68,68,0.3)',
              color: '#fff', border: 'none', borderRadius: 12, padding: '14px 0',
              fontSize: 15, fontWeight: 800, cursor: canSubmit ? 'pointer' : 'not-allowed', width: '100%',
            }}>
              {submitting ? 'Creating…' : '🤝 Create Deal'}
            </button>

            <button onClick={() => router.back()} style={{
              background: 'transparent', color: t.muted, border: `1px solid ${t.border}`,
              borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%',
            }}>
              Cancel
            </button>
          </div>

        </div>
      </div>
    </AdminShell>
  );
}