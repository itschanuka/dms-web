'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { dealApi, type Deal, type DealStatus, type PaymentStatus, type Salesperson } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { formatCurrency } from '@/lib/formatters';

const STATUS_CFG: Record<DealStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Draft',     color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.28)' },
  reserved:  { label: 'Reserved',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'   },
  active:    { label: 'Active',    color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.32)'  },
  completed: { label: 'Completed', color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.32)'  },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'    },
};

const PAY_CFG: Record<PaymentStatus, { label: string; color: string }> = {
  unpaid:          { label: 'Unpaid',     color: '#ef4444' },
  partially_paid:  { label: 'Partial',    color: '#f59e0b' },
  fully_paid:      { label: 'Fully Paid', color: '#34d399' },
};

function tok(isDark: boolean) {
  return {
    page:      isDark ? '#141c2e' : '#dde6f0',
    card:      isDark ? '#1c2538' : '#cdd8ea',
    border:    isDark ? '#263550' : '#aec2d6',
    hoverRow:  isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    shadow:    isDark ? '0 16px 48px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.12)',
    text:      isDark ? '#e8f0fc' : '#0f1e32',
    muted:     isDark ? '#5a7295' : '#4a6278',
    input:     isDark ? '#0e1729' : '#b8c8db',
    inputText: isDark ? '#d4e2f4' : '#0f1e32',
    accent:    '#ef4444',
  };
}

const DEAL_STATUSES: DealStatus[] = ['draft', 'reserved', 'active', 'completed', 'cancelled'];
const PAY_STATUSES: PaymentStatus[] = ['unpaid', 'partially_paid', 'fully_paid'];

function DealsContent() {
  const { isDark } = useTheme();
  const t = tok(isDark);

  const [deals, setDeals]               = useState<Deal[]>([]);
  const [loading, setLoading]           = useState(true);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);

  const [status,    setStatus]    = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [spId,      setSpId]      = useState('');
  const [search,    setSearch]    = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dealApi.list({
        page, limit: 25,
        status:         status    || undefined,
        payment_status: payStatus || undefined,
        salesperson_id: spId      || undefined,
        search:         search    || undefined,
        date_from:      dateFrom  || undefined,
        date_to:        dateTo    || undefined,
      });
      setDeals(res.deals);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, status, payStatus, spId, search, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    dealApi.getSalespersons().then(setSalespersons).catch(() => {});
  }, []);

  const clearFilters = () => {
    setStatus(''); setPayStatus(''); setSpId('');
    setSearch(''); setDateFrom(''); setDateTo(''); setPage(1);
  };

  const inputSt: React.CSSProperties = {
    background: t.input, color: t.inputText, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none',
  };
  const selSt: React.CSSProperties = { ...inputSt, cursor: 'pointer' };
  const hasFilter = !!(status || payStatus || spId || search || dateFrom || dateTo);

  return (
    <div style={{ minHeight: '100vh', background: t.page, padding: '32px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: t.text, margin: 0 }}>Deals</h1>
          <p style={{ color: t.muted, fontSize: 14, margin: '4px 0 0' }}>
            {total} deal{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link href="/admin/deals/new" style={{
          background: t.accent, color: '#fff', borderRadius: 10,
          padding: '10px 20px', fontWeight: 700, fontSize: 14, textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          + New Deal
        </Link>
      </div>

      {/* Filters */}
      <div style={{
        background: t.card, border: `1px solid ${t.border}`, borderRadius: 14,
        padding: '18px 22px', marginBottom: 20,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search deal code…"
          style={{ ...inputSt, width: 180 }}
        />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={selSt}>
          <option value="">All Statuses</option>
          {DEAL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CFG[s].label}</option>
          ))}
        </select>
        <select value={payStatus} onChange={e => { setPayStatus(e.target.value); setPage(1); }} style={selSt}>
          <option value="">All Payment</option>
          {PAY_STATUSES.map(s => (
            <option key={s} value={s}>{PAY_CFG[s].label}</option>
          ))}
        </select>
        <select value={spId} onChange={e => { setSpId(e.target.value); setPage(1); }} style={selSt}>
          <option value="">All Salespersons</option>
          {salespersons.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          style={{ ...inputSt, width: 150 }} />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          style={{ ...inputSt, width: 150 }} />
        {hasFilter && (
          <button onClick={clearFilters} style={{
            background: 'transparent', border: `1px solid ${t.border}`,
            borderRadius: 8, padding: '7px 14px', color: t.muted, fontSize: 13, cursor: 'pointer',
          }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: t.card, border: `1px solid ${t.border}`, borderRadius: 16,
        boxShadow: t.shadow, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.border}` }}>
              {['Deal ID', 'Customer', 'Vehicle', 'Salesperson', 'Status', 'Selling Price', 'Paid', 'Balance', 'Payment', 'Date'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left', color: t.muted,
                  fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ padding: 48, textAlign: 'center', color: t.muted }}>
                  Loading…
                </td>
              </tr>
            ) : deals.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: 48, textAlign: 'center', color: t.muted }}>
                  No deals found.{' '}
                  <Link href="/admin/deals/new" style={{ color: t.accent, textDecoration: 'none' }}>
                    Create one →
                  </Link>
                </td>
              </tr>
            ) : deals.map(deal => {
              const sc  = STATUS_CFG[deal.status];
              const pc  = PAY_CFG[deal.payment_status];
              const eff = deal.selling_price - (deal.discount_amount ?? 0);
              const bal = Math.max(0, eff - (deal.total_paid_cache ?? 0));
              return (
                <tr key={deal.id}
                  style={{ borderBottom: `1px solid ${t.border}`, transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.hoverRow)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px' }}>
                    <Link href={`/admin/deals/${deal.id}`} style={{
                      color: '#818cf8', textDecoration: 'none',
                      fontWeight: 700, fontFamily: 'monospace', fontSize: 13,
                    }}>
                      {deal.deal_code}
                    </Link>
                  </td>
                  <td style={{ padding: '13px 16px', color: t.text }}>
                    <div style={{ fontWeight: 600 }}>{deal.customer?.full_name ?? '—'}</div>
                    <div style={{ color: t.muted, fontSize: 12 }}>{deal.customer?.phone_primary}</div>
                  </td>
                  <td style={{ padding: '13px 16px', color: t.text }}>
                    {deal.vehicle ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{deal.vehicle.make} {deal.vehicle.model}</div>
                        <div style={{ color: t.muted, fontSize: 12 }}>{deal.vehicle.year} · {deal.vehicle.stock_id}</div>
                      </>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '13px 16px', color: t.text }}>{deal.salesperson?.full_name ?? '—'}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                      fontSize: 11, fontWeight: 700,
                      color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`,
                    }}>
                      {sc.label}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px', color: t.text, fontWeight: 600, fontFamily: 'monospace' }}>
                    {formatCurrency(deal.selling_price)}
                  </td>
                  <td style={{ padding: '13px 16px', color: '#34d399', fontFamily: 'monospace' }}>
                    {formatCurrency(deal.total_paid_cache ?? 0)}
                  </td>
                  <td style={{ padding: '13px 16px', fontFamily: 'monospace', fontWeight: 600, color: bal > 0 ? '#ef4444' : '#34d399' }}>
                    {formatCurrency(bal)}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ color: pc.color, fontSize: 12, fontWeight: 600 }}>{pc.label}</span>
                  </td>
                  <td style={{ padding: '13px 16px', color: t.muted, fontSize: 12 }}>
                    {new Date(deal.deal_date).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderTop: `1px solid ${t.border}`,
          }}>
            <span style={{ color: t.muted, fontSize: 13 }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                style={{
                  background: page <= 1 ? t.input : t.accent,
                  color: page <= 1 ? t.muted : '#fff',
                  border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                style={{
                  background: page >= totalPages ? t.input : t.accent,
                  color: page >= totalPages ? t.muted : '#fff',
                  border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DealsPage() {
  const { isDark } = useTheme();
  return (
    <AdminShell activePage="deals">
      <Suspense fallback={
        <div style={{ padding: 48, textAlign: 'center', color: isDark ? '#5a7295' : '#4a6278' }}>
          Loading…
        </div>
      }>
        <DealsContent />
      </Suspense>
    </AdminShell>
  );
}