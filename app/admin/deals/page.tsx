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
  unpaid:         { label: 'Unpaid',     color: '#ef4444' },
  partially_paid: { label: 'Partial',    color: '#f59e0b' },
  fully_paid:     { label: 'Fully Paid', color: '#34d399' },
};
const DEAL_STATUSES: DealStatus[]    = ['draft', 'reserved', 'active', 'completed', 'cancelled'];
const PAY_STATUSES:  PaymentStatus[] = ['unpaid', 'partially_paid', 'fully_paid'];
const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: '3m',    label: 'Last 3 Mo' },
  { key: 'year',  label: 'This Year' },
];

function presetRange(key: string) {
  const now = new Date();
  const to  = now.toISOString().slice(0, 10);
  if (key === 'today') return { from: to, to };
  if (key === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 6);   return { from: d.toISOString().slice(0, 10), to }; }
  if (key === 'month') return { from: `${to.slice(0, 7)}-01`, to };
  if (key === '3m')    { const d = new Date(now); d.setMonth(d.getMonth() - 3); return { from: d.toISOString().slice(0, 10), to }; }
  if (key === 'year')  return { from: `${now.getFullYear()}-01-01`, to };
  return { from: '', to: '' };
}

function tok(isDark: boolean) {
  return {
    page:     isDark ? '#141c2e' : '#dde6f0',
    card:     isDark ? '#1c2538' : '#cdd8ea',
    border:   isDark ? '#263550' : '#aec2d6',
    hoverRow: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    shadow:   isDark ? '0 16px 48px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.12)',
    text:     isDark ? '#e8f0fc' : '#0f1e32',
    muted:    isDark ? '#5a7295' : '#4a6278',
    input:    isDark ? '#0e1729' : '#b8c8db',
    inputTxt: isDark ? '#d4e2f4' : '#0f1e32',
    accent:   '#ef4444',
  };
}

interface DealStats {
  total: number; draft: number; reserved: number;
  active: number; completed: number; cancelled: number;
  revenue: number; outstanding: number;
}

function Skeleton({ w = '70%' }: { w?: string }) {
  return <div style={{ height: 13, borderRadius: 4, background: 'rgba(128,128,128,0.12)', width: w }} />;
}

function SummaryCards({ stats, loading, t }: { stats: DealStats | null; loading: boolean; t: ReturnType<typeof tok> }) {
  const cards = [
    { label: 'Total Deals',   val: stats?.total,       money: false, color: '#818cf8', icon: '🤝' },
    { label: 'Active',        val: stats?.active,      money: false, color: '#38bdf8', icon: '⚡' },
    { label: 'Reserved',      val: stats?.reserved,    money: false, color: '#f59e0b', icon: '📌' },
    { label: 'Completed',     val: stats?.completed,   money: false, color: '#34d399', icon: '✅' },
    { label: 'Total Revenue', val: stats?.revenue,     money: true,  color: '#34d399', icon: '💰' },
    { label: 'Outstanding',   val: stats?.outstanding, money: true,  color: '#ef4444', icon: '⏳' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 20 }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: t.card, border: `1px solid ${t.border}`,
          borderRadius: 12, padding: '14px 16px', borderTop: `3px solid ${c.color}`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 9 }}>
            {c.icon} {c.label}
          </div>
          {loading ? <Skeleton /> : (
            <div style={{ fontSize: c.money ? 13 : 22, fontWeight: 900, color: c.color, fontFamily: c.money ? 'monospace' : 'inherit' }}>
              {c.money ? formatCurrency(c.val as number) : c.val}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DealsContent() {
  const { isDark } = useTheme();
  const t = tok(isDark);

  const [deals,        setDeals]        = useState<Deal[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [stats,        setStats]        = useState<DealStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [status,       setStatus]       = useState('');
  const [payStatus,    setPayStatus]    = useState('');
  const [spId,         setSpId]         = useState('');
  const [search,       setSearch]       = useState('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [activePreset, setActivePreset] = useState('');

  useEffect(() => {
    dealApi.getStats().then(setStats).catch(() => {}).finally(() => setStatsLoading(false));
    dealApi.getSalespersons().then(setSalespersons).catch(() => {});
  }, []);

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

  const applyPreset = (key: string) => {
    const r = presetRange(key);
    setDateFrom(r.from); setDateTo(r.to);
    setActivePreset(key); setPage(1);
  };
  const clearFilters = () => {
    setStatus(''); setPayStatus(''); setSpId('');
    setSearch(''); setDateFrom(''); setDateTo('');
    setActivePreset(''); setPage(1);
  };
  const hasFilter = !!(status || payStatus || spId || search || dateFrom || dateTo);

  const inp: React.CSSProperties = {
    background: t.input, color: t.inputTxt, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '7px 11px', fontSize: 13, outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: t.page, padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: t.text, margin: 0 }}>Deals</h1>
          <p style={{ color: t.muted, fontSize: 13, margin: '3px 0 0' }}>
            {hasFilter ? `${total} matching filters` : `${total} deals total`}
          </p>
        </div>
        <Link href="/admin/deals/new" style={{
          background: t.accent, color: '#fff', borderRadius: 10,
          padding: '10px 22px', fontWeight: 700, fontSize: 14, textDecoration: 'none',
          boxShadow: '0 2px 12px rgba(239,68,68,0.35)',
        }}>+ New Deal</Link>
      </div>

      {/* Summary cards */}
      <SummaryCards stats={stats} loading={statsLoading} t={t} />

      {/* Filters */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>

        {/* Date preset row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 4 }}>Period:</span>
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => applyPreset(p.key)} style={{
              padding: '4px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
              background: activePreset === p.key ? '#6366f1'            : 'transparent',
              color:      activePreset === p.key ? '#fff'                : t.muted,
              border:     activePreset === p.key ? '1px solid #6366f1'  : `1px solid ${t.border}`,
            }}>{p.label}</button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActivePreset(''); setPage(1); }}
              style={{ ...inp, fontSize: 12, width: 138 }} />
            <span style={{ color: t.muted, fontSize: 12 }}>→</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setActivePreset(''); setPage(1); }}
              style={{ ...inp, fontSize: 12, width: 138 }} />
          </div>
        </div>

        {/* Search + dropdown row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="🔍  Deal code, customer name…" style={{ ...inp, minWidth: 230 }} />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">All Statuses</option>
            {DEAL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
          </select>
          <select value={payStatus} onChange={e => { setPayStatus(e.target.value); setPage(1); }} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">All Payments</option>
            {PAY_STATUSES.map(s => <option key={s} value={s}>{PAY_CFG[s].label}</option>)}
          </select>
          <select value={spId} onChange={e => { setSpId(e.target.value); setPage(1); }} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">All Salespersons</option>
            {salespersons.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          {hasFilter && (
            <button onClick={clearFilters} style={{
              padding: '7px 13px', borderRadius: 8, border: `1px solid rgba(239,68,68,0.4)`,
              background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>✕ Clear all</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: t.shadow, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)', borderBottom: `1px solid ${t.border}` }}>
              {['Deal', 'Customer', 'Vehicle', 'Salesperson', 'Status', 'Price', 'Paid', 'Balance', 'Payment', 'Date'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: t.muted, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${t.border}` }}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} style={{ padding: '14px 14px' }}><Skeleton w={`${50 + (j * 7) % 40}%`} /></td>
                  ))}
                </tr>
              ))
            ) : deals.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: 64, textAlign: 'center' }}>
                  <div style={{ fontSize: 34, marginBottom: 10 }}>🤝</div>
                  <div style={{ fontWeight: 700, color: t.text, marginBottom: 4 }}>No deals found</div>
                  <div style={{ color: t.muted, fontSize: 13, marginBottom: 16 }}>
                    {hasFilter ? 'Try adjusting your filters.' : 'Create your first deal to get started.'}
                  </div>
                  {!hasFilter && (
                    <Link href="/admin/deals/new" style={{ background: t.accent, color: '#fff', textDecoration: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                      + New Deal
                    </Link>
                  )}
                </td>
              </tr>
            ) : deals.map((deal, i) => {
              const sc  = STATUS_CFG[deal.status];
              const pc  = PAY_CFG[deal.payment_status];
              const eff = deal.selling_price - (deal.discount_amount ?? 0);
              const bal = Math.max(0, eff - (deal.total_paid_cache ?? 0));
              return (
                <tr key={deal.id}
                  style={{ borderTop: i > 0 ? `1px solid ${t.border}` : 'none', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.hoverRow)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <Link href={`/admin/deals/${deal.id}`} style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                      {deal.deal_code}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: t.text }}>{deal.customer?.full_name ?? '—'}</div>
                    <div style={{ color: t.muted, fontSize: 11 }}>{deal.customer?.phone_primary}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {deal.vehicle ? (
                      <><div style={{ fontWeight: 600, color: t.text }}>{deal.vehicle.make} {deal.vehicle.model}</div>
                      <div style={{ color: t.muted, fontSize: 11 }}>{deal.vehicle.year} · {deal.vehicle.stock_id}</div></>
                    ) : <span style={{ color: t.muted }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 14px', color: t.text, whiteSpace: 'nowrap' }}>{deal.salesperson?.full_name ?? '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>
                      {sc.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: t.text, fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{formatCurrency(deal.selling_price)}</td>
                  <td style={{ padding: '12px 14px', color: '#34d399', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{formatCurrency(deal.total_paid_cache ?? 0)}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap', color: bal > 0 ? '#ef4444' : '#34d399' }}>{formatCurrency(bal)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ color: pc.color, fontSize: 12, fontWeight: 600 }}>{pc.label}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: t.muted, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(deal.deal_date).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: `1px solid ${t.border}` }}>
            <span style={{ color: t.muted, fontSize: 13 }}>Page {page} of {totalPages} · {total} results</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ background: page <= 1 ? t.input : t.accent, color: page <= 1 ? t.muted : '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ background: page >= totalPages ? t.input : t.accent, color: page >= totalPages ? t.muted : '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>Next →</button>
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
      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center', color: isDark ? '#5a7295' : '#4a6278' }}>Loading…</div>}>
        <DealsContent />
      </Suspense>
    </AdminShell>
  );
}