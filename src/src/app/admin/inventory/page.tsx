'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import StatusBadge from '@/components/admin/StatusBadge';
import { adminApi, type AdminVehicle, type Pagination } from '@/lib/api';
import { formatPrice, formatMileage } from '@/lib/formatters';
import { useTheme } from '@/lib/theme';

// ── Aging colour map ───────────────────────────────────────────
const AGING_COLORS: Record<string, string> = {
  fresh:      '#10b981',
  aging:      '#f59e0b',
  old:        '#ef4444',
  dead_stock: '#dc2626',
};

// ── Date preset helpers ────────────────────────────────────────
function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]!;
}

function getPresetRange(preset: string): { from: string; to: string } {
  const today = new Date();
  const to    = toDateStr(today);
  switch (preset) {
    case 'today': {
      return { from: to, to };
    }
    case 'week': {
      const d = new Date(today); d.setDate(d.getDate() - 6);
      return { from: toDateStr(d), to };
    }
    case 'month': {
      return { from: `${to.slice(0, 7)}-01`, to };
    }
    case '3months': {
      const d = new Date(today); d.setMonth(d.getMonth() - 3);
      return { from: toDateStr(d), to };
    }
    case 'year': {
      return { from: `${today.getFullYear()}-01-01`, to };
    }
    default:
      return { from: `${to.slice(0, 7)}-01`, to };
  }
}

// ── Mini bar chart (pure CSS) ───────────────────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
    </div>
  );
}

// ── Trend spark bars ───────────────────────────────────────────
function SparkBars({ data, field, color }: { data: Array<{ month: string; added: number; sold: number }>; field: 'added' | 'sold'; color: string }) {
  const max = Math.max(...data.map(d => d[field]), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 36 }}>
      {data.slice(-12).map((d: { month: string; added: number; sold: number }) => {
        const h = Math.max(2, (d[field] / max) * 36);
        return (
          <div key={d.month} title={`${d.month}: ${d[field]}`} style={{
            flex: 1, height: h, background: color, borderRadius: '2px 2px 0 0',
            opacity: 0.7, transition: 'height 0.3s',
          }} />
        );
      })}
    </div>
  );
}

// ── Analytics data type (unwrapped success shape) ───────────────
type AnalyticsData = {
  period:            { from: string; to: string };
  totalVehicles:     number;
  statusCounts:      Record<string, number>;
  availableCount:    number;
  inventoryValue:    number;
  inventoryCostBase: number;
  inventoryProfit:   number;
  addedInPeriod:     number;
  soldInPeriod:      number;
  revenueInPeriod:   number;
  costInPeriod:      number;
  profitInPeriod:    number;
  agingBreakdown:    { fresh: number; aging: number; old: number; dead_stock: number };
  monthlyTrend:      Array<{ month: string; added: number; sold: number }>;
};

const PRESETS = [
  { key: 'today',   label: 'Today'      },
  { key: 'week',    label: 'This Week'  },
  { key: 'month',   label: 'This Month' },
  { key: '3months', label: 'Last 3 Mo'  },
  { key: 'year',    label: 'This Year'  },
];

function AnalyticsPanel({ isDark }: { isDark: boolean }) {
  const [preset,   setPreset]   = useState('month');
  const [data,     setData]     = useState<AnalyticsData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [open,     setOpen]     = useState(true);

  const c = {
    panelBg:  isDark ? '#0d1525' : '#ddeaf8',
    cardBg:   isDark ? '#111827' : '#e8f2fb',
    border:   isDark ? '#1f2d45' : '#b2c4d8',
    text:     isDark ? '#e8f0fc' : '#0f1e32',
    sub:      isDark ? '#5c7090' : '#4a6278',
    muted:    isDark ? '#3d5270' : '#7a96b0',
  };

  const load = useCallback(async (p: string) => {
    setLoading(true);
    setError('');
    try {
      const range = getPresetRange(p);
      const data  = await adminApi.getAnalytics(range.from, range.to);
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(preset); }, [preset, load]);

  const ag = data?.agingBreakdown ?? { fresh: 0, aging: 0, old: 0, dead_stock: 0 };
  const maxAging = Math.max(ag.fresh, ag.aging, ag.old, ag.dead_stock, 1);

  return (
    <div style={{ background: c.panelBg, border: `1px solid ${c.border}`, borderRadius: 12, marginBottom: 20, overflow: 'hidden', transition: 'background 0.25s' }}>
      {/* Panel header */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer', borderBottom: open ? `1px solid ${c.border}` : 'none' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: c.text }}>📊 Analytics</span>
          {data && (
            <span style={{ fontSize: 11, color: c.sub, fontWeight: 500 }}>
              {data.totalVehicles} vehicles total · {data.availableCount} available
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: c.muted }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '16px 18px' }}>
          {/* Preset tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: preset === p.key ? '#6366f1' : 'transparent',
                  border:     preset === p.key ? '1px solid #6366f1' : `1px solid ${c.border}`,
                  color:      preset === p.key ? '#fff' : c.sub,
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
            {data && (
              <span style={{ fontSize: 11, color: c.muted, alignSelf: 'center', marginLeft: 4 }}>
                {data.period.from} → {data.period.to}
              </span>
            )}
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>⚠️ {error}</div>
          )}

          {loading ? (
            <div style={{ fontSize: 13, color: c.sub, padding: '20px 0' }}>Loading analytics…</div>
          ) : data && (
            <div>
              {/* ── Row 1: Period KPIs ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Added This Period',   value: data.addedInPeriod,   color: '#818cf8', fmt: (n: number) => String(n) },
                  { label: 'Sold This Period',    value: data.soldInPeriod,    color: '#10b981', fmt: (n: number) => String(n) },
                  { label: 'Revenue This Period', value: data.revenueInPeriod, color: '#34d399', fmt: formatPrice },
                  { label: 'Profit This Period',  value: data.profitInPeriod,  color: data.profitInPeriod >= 0 ? '#10b981' : '#ef4444', fmt: formatPrice },
                ].map(kpi => (
                  <div key={kpi.label} style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '13px 15px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: c.sub, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                      {kpi.label}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 900, color: kpi.color }}>
                      {kpi.fmt(kpi.value)}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Row 2: Live inventory snapshot + aging ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {/* Inventory snapshot */}
                <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '13px 15px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: c.sub, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Live Inventory Value
                  </div>
                  {[
                    { label: 'Total Asking', value: data.inventoryValue,    color: '#fff'     },
                    { label: 'Cost Basis',   value: data.inventoryCostBase, color: '#f59e0b'  },
                    { label: 'Est. Profit',  value: data.inventoryProfit,   color: data.inventoryProfit >= 0 ? '#10b981' : '#ef4444' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 7, marginBottom: 7, borderBottom: `1px solid ${c.border}`, fontSize: 12 }}>
                      <span style={{ color: c.sub }}>{row.label}</span>
                      <span style={{ fontWeight: 700, color: row.color }}>{formatPrice(row.value)}</span>
                    </div>
                  ))}

                  {/* Status breakdown */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: c.muted, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 12, marginBottom: 8 }}>By Status</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(data.statusCounts).map(([status, count]) => (
                      <span key={status} style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                      }}>
                        {status}: {count}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Aging breakdown */}
                <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '13px 15px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: c.sub, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Stock Aging (Available)
                  </div>
                  {([
                    { key: 'fresh',      label: 'Fresh (0–30d)',     color: '#10b981' },
                    { key: 'aging',      label: 'Aging (31–60d)',    color: '#f59e0b' },
                    { key: 'old',        label: 'Old (61–90d)',      color: '#ef4444' },
                    { key: 'dead_stock', label: 'Dead Stock (90d+)', color: '#dc2626' },
                  ] as const).map(row => (
                    <div key={row.key} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: c.sub }}>{row.label}</span>
                        <span style={{ fontWeight: 700, color: row.color }}>{ag[row.key]}</span>
                      </div>
                      <MiniBar value={ag[row.key]} max={maxAging} color={row.color} />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Row 3: Monthly trend bars ── */}
              {data.monthlyTrend.length > 0 && (
                <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '13px 15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: c.sub, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                      12-Month Trend
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 10, color: c.muted }}>
                      <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#818cf8', marginRight: 4 }} />Added</span>
                      <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#10b981', marginRight: 4 }} />Sold</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, color: c.muted, marginBottom: 4 }}>Vehicles Added</div>
                      <SparkBars data={data.monthlyTrend} field="added" color="#818cf8" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: c.muted, marginBottom: 4 }}>Vehicles Sold</div>
                      <SparkBars data={data.monthlyTrend} field="sold" color="#10b981" />
                    </div>
                  </div>
                  {/* Month labels */}
                  <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                    {data.monthlyTrend.slice(-12).map((d: { month: string; added: number; sold: number }) => (
                      <div key={d.month} style={{ flex: 1, fontSize: 8, color: c.muted, textAlign: 'center' }}>
                        {d.month.slice(5)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN INVENTORY PAGE
// ═══════════════════════════════════════════════════════════════

export default function InventoryListPage() {
  const { isDark } = useTheme();
  const [vehicles,   setVehicles]   = useState<AdminVehicle[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [status,     setStatus]     = useState('');
  const [aging,      setAging]      = useState('');
  const [search,     setSearch]     = useState('');
  const [website,    setWebsite]    = useState('');
  const [page,       setPage]       = useState(1);

  const c = {
    pageBg:      isDark ? '#141c2e' : '#dde6f0',
    cardBg:      isDark ? '#1a2236' : '#e8f2fb',
    filterBg:    isDark ? '#1e2840' : '#ddeaf8',
    border:      isDark ? '#243048' : '#b2c4d8',
    borderLight: isDark ? '#1e2a3e' : '#c8d8e8',
    textPrimary: isDark ? '#e8f0fc' : '#0f1e32',
    textBody:    isDark ? '#b8cce0' : '#243650',
    textSub:     isDark ? '#6b82a0' : '#4a6278',
    textMuted:   isDark ? '#3d5270' : '#7a96b0',
    inputBg:     isDark ? '#111827' : '#d8e8f4',
    inputText:   isDark ? '#d0dff0' : '#1a2c42',
    inputBorder: isDark ? '#243048' : '#a8bed4',
    rowHover:    isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    stockId:     isDark ? '#818cf8' : '#4f46e5',
  };

  const INPUT: React.CSSProperties = {
    background: c.inputBg, border: `1px solid ${c.inputBorder}`,
    borderRadius: 7, padding: '7px 11px', fontSize: 13,
    color: c.inputText, outline: 'none',
  };
  const SELECT: React.CSSProperties = { ...INPUT, appearance: 'none', cursor: 'pointer', paddingRight: 24 };

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await adminApi.listVehicles({
        page: pg, limit: 20,
        ...(status  && { status }),
        ...(aging   && { aging }),
        ...(search  && { search }),
        ...(website === 'true'  && { show_on_website: true }),
        ...(website === 'false' && { show_on_website: false }),
      });
      setVehicles(result.vehicles);
      setPagination(result.pagination);
      setPage(pg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [status, aging, search, website]);

  useEffect(() => { void load(1); }, [load]);

  return (
    <AdminShell>
      <div style={{ padding: '28px', background: c.pageBg, minHeight: '100%', transition: 'background 0.25s' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: c.textPrimary, margin: 0, letterSpacing: '-0.4px' }}>
              Inventory
            </h1>
            {pagination && (
              <div style={{ fontSize: 13, color: c.textSub, marginTop: 4 }}>
                {pagination.total} vehicle{pagination.total !== 1 ? 's' : ''} total
              </div>
            )}
          </div>
          <Link href="/admin/inventory/new" style={{
            background: '#6366f1', color: '#fff', textDecoration: 'none',
            padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
          }}>
            + Add Vehicle
          </Link>
        </div>

        {/* ── Analytics panel ── */}
        <AnalyticsPanel isDark={isDark} />

        {/* Filters */}
        <div style={{ background: c.filterBg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', transition: 'background 0.25s' }}>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search make, model, stock ID…"
            style={{ ...INPUT, minWidth: 220 }}
          />

          {[
            { value: status,  onChange: setStatus,  options: [['', 'All Statuses'], ['draft','Draft'], ['available','Available'], ['reserved','Reserved'], ['sold','Sold'], ['written_off','Written Off']] as [string,string][] },
            { value: aging,   onChange: setAging,   options: [['', 'All Ages'], ['fresh','Fresh (0–30d)'], ['aging','Aging (31–60d)'], ['old','Old (61–90d)'], ['dead_stock','Dead Stock (90d+)']] as [string,string][] },
            { value: website, onChange: setWebsite, options: [['', 'Website: All'], ['true','Website: Visible'], ['false','Website: Hidden']] as [string,string][] },
          ].map((f, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <select value={f.value} onChange={e => f.onChange(e.target.value)} style={SELECT}>
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: c.textMuted, pointerEvents: 'none' }}>▼</span>
            </div>
          ))}

          {(status || aging || search || website) && (
            <button onClick={() => { setStatus(''); setAging(''); setSearch(''); setWebsite(''); }} style={{
              background: 'none', border: `1px solid ${c.border}`, borderRadius: 7,
              color: '#ef4444', fontSize: 12, fontWeight: 600, padding: '7px 12px', cursor: 'pointer',
            }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Table */}
        <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden', transition: 'background 0.25s' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: c.textSub, fontSize: 13 }}>Loading…</div>
          ) : vehicles.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🚗</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, marginBottom: 6 }}>No vehicles found</div>
              <div style={{ fontSize: 13, color: c.textSub, marginBottom: 20 }}>Add your first vehicle to get started</div>
              <Link href="/admin/inventory/new" style={{ background: '#6366f1', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                + Add Vehicle
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.border}`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)' }}>
                    {['Stock ID', 'Vehicle', 'Status', 'Age', 'Mileage', 'Asking Price', 'Total Cost', 'Est. Profit', 'Website', ''].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: c.textSub, letterSpacing: '0.07em', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v, i) => (
                    <tr key={v.id}
                      style={{ borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: c.stockId, whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>{v.stock_id}</td>
                      <td style={{ padding: '12px 14px', minWidth: 180 }}>
                        <div style={{ fontWeight: 700, color: c.textPrimary }}>{v.year} {v.make} {v.model}</div>
                        {v.variant && <div style={{ fontSize: 11, color: c.textSub, marginTop: 2 }}>{v.variant}</div>}
                      </td>
                      <td style={{ padding: '12px 14px' }}><StatusBadge status={v.status} /></td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: AGING_COLORS[v.aging_bucket] ?? c.textSub }}>
                          {v.days_in_stock}d
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: c.textBody, whiteSpace: 'nowrap' }}>{formatMileage(v.mileage)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: c.textPrimary, whiteSpace: 'nowrap' }}>{formatPrice(v.asking_price)}</td>
                      <td style={{ padding: '12px 14px', color: '#f59e0b', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatPrice(v.total_cost_cache ?? v.purchase_price)}</td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, color: v.estimated_profit >= 0 ? '#10b981' : '#ef4444' }}>
                          {v.estimated_profit >= 0 ? '+' : ''}{formatPrice(v.estimated_profit)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: v.show_on_website ? '#10b981' : c.textMuted }}>
                          {v.show_on_website ? '✓ Live' : '✗ Hidden'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link href={`/admin/inventory/${v.id}`} style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
            <button onClick={() => void load(page - 1)} disabled={!pagination.hasPrev} style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: c.cardBg, border: `1px solid ${c.border}`,
              color: pagination.hasPrev ? c.textBody : c.textMuted,
              cursor: pagination.hasPrev ? 'pointer' : 'not-allowed',
            }}>← Prev</button>
            <span style={{ fontSize: 12, color: c.textSub }}>Page {page} of {pagination.totalPages}</span>
            <button onClick={() => void load(page + 1)} disabled={!pagination.hasNext} style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: c.cardBg, border: `1px solid ${c.border}`,
              color: pagination.hasNext ? c.textBody : c.textMuted,
              cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
            }}>Next →</button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}