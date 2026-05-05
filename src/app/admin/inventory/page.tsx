'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import StatusBadge from '@/components/admin/StatusBadge';
import { adminApi, type AdminVehicle, type Pagination } from '@/lib/api';
import { formatPrice, formatMileage } from '@/lib/formatters';
import { useTheme } from '@/lib/theme';

/* ─────────────────────────────────────────────────────────────────
   STYLES — injected once, scoped with .inv- prefix
───────────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&family=JetBrains+Mono:wght@500;700&display=swap');

  /* ── Tokens ── */
  .inv-root {
    --inv-font: 'DM Sans', sans-serif;
    --inv-mono: 'JetBrains Mono', monospace;

    /* dark */
    --inv-bg:          #0b0f1a;
    --inv-surface:     #111827;
    --inv-surface-2:   #161d2e;
    --inv-border:      rgba(255,255,255,0.07);
    --inv-border-soft: rgba(255,255,255,0.04);
    --inv-text:        #edf2fc;
    --inv-text-b:      #a8bdd6;
    --inv-text-c:      #536880;
    --inv-text-d:      #2e4258;
    --inv-input-bg:    #0d1421;
    --inv-hover:       rgba(255,255,255,0.035);
    --inv-accent:      #6366f1;
    --inv-accent-glow: rgba(99,102,241,0.25);
    --inv-green:       #10b981;
    --inv-amber:       #f59e0b;
    --inv-red:         #ef4444;
    --inv-red-deep:    #dc2626;
    --inv-radius-sm:   6px;
    --inv-radius:      10px;
    --inv-radius-lg:   14px;
  }

  .inv-root.inv-light {
    --inv-bg:          #f0f4fa;
    --inv-surface:     #ffffff;
    --inv-surface-2:   #f5f8fd;
    --inv-border:      rgba(0,0,0,0.08);
    --inv-border-soft: rgba(0,0,0,0.04);
    --inv-text:        #0f1e32;
    --inv-text-b:      #2c4460;
    --inv-text-c:      #5a7896;
    --inv-text-d:      #9ab2c8;
    --inv-input-bg:    #eaf1f9;
    --inv-hover:       rgba(0,0,0,0.025);
  }

  .inv-root * { box-sizing: border-box; font-family: var(--inv-font); }

  /* ── Layout ── */
  .inv-root { background: var(--inv-bg); min-height: 100%; padding: 32px 28px; transition: background 0.25s; }

  /* ── Header ── */
  .inv-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 28px; }
  .inv-title { font-size: 24px; font-weight: 900; color: var(--inv-text); margin: 0; letter-spacing: -0.5px; }
  .inv-subtitle { font-size: 13px; color: var(--inv-text-c); margin-top: 4px; }

  /* ── Add Button ── */
  .inv-add-btn {
    background: var(--inv-accent); color: #fff; text-decoration: none;
    padding: 10px 20px; border-radius: var(--inv-radius); font-size: 13px; font-weight: 700;
    display: inline-flex; align-items: center; gap: 6px;
    box-shadow: 0 4px 20px var(--inv-accent-glow);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  }
  .inv-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 28px var(--inv-accent-glow); }
  .inv-add-btn:active { transform: translateY(0); opacity: 0.9; }

  /* ── Analytics Panel ── */
  .inv-analytics {
    background: var(--inv-surface);
    border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius-lg);
    margin-bottom: 20px;
    overflow: hidden;
    transition: background 0.25s;
  }
  .inv-analytics-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 15px 20px; cursor: pointer;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s;
  }
  .inv-analytics-header.open { border-color: var(--inv-border); }
  .inv-analytics-header:hover { background: var(--inv-hover); }
  .inv-analytics-title { font-size: 14px; font-weight: 800; color: var(--inv-text); display: flex; align-items: center; gap: 8px; }
  .inv-analytics-meta { font-size: 11px; color: var(--inv-text-c); font-weight: 500; }
  .inv-analytics-chevron { font-size: 11px; color: var(--inv-text-d); transition: transform 0.2s; }
  .inv-analytics-chevron.open { transform: rotate(180deg); }
  .inv-analytics-body { padding: 18px 20px; }

  /* Preset tabs */
  .inv-presets { display: flex; gap: 6px; margin-bottom: 18px; flex-wrap: wrap; align-items: center; }
  .inv-preset-btn {
    padding: 5px 13px; border-radius: var(--inv-radius-sm); font-size: 12px; font-weight: 600; cursor: pointer;
    border: 1px solid var(--inv-border); background: transparent; color: var(--inv-text-c);
    transition: all 0.15s;
  }
  .inv-preset-btn:hover { color: var(--inv-text); border-color: rgba(99,102,241,0.4); }
  .inv-preset-btn.active { background: var(--inv-accent); border-color: var(--inv-accent); color: #fff; box-shadow: 0 2px 10px var(--inv-accent-glow); }
  .inv-preset-range { font-size: 11px; color: var(--inv-text-d); margin-left: 4px; align-self: center; font-family: var(--inv-mono); }

  /* KPI Grid */
  .inv-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; }
  .inv-kpi-card {
    background: var(--inv-surface-2); border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius); padding: 14px 16px;
    transition: transform 0.15s;
  }
  .inv-kpi-card:hover { transform: translateY(-1px); }
  .inv-kpi-label { font-size: 10px; font-weight: 700; color: var(--inv-text-c); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
  .inv-kpi-value { font-size: 18px; font-weight: 900; }

  /* Two-col */
  .inv-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  @media (max-width: 640px) { .inv-two-col { grid-template-columns: 1fr; } }
  .inv-snapshot-card, .inv-aging-card {
    background: var(--inv-surface-2); border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius); padding: 14px 16px;
  }
  .inv-card-label { font-size: 10px; font-weight: 700; color: var(--inv-text-c); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px; }
  .inv-snapshot-row { display: flex; justify-content: space-between; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid var(--inv-border-soft); font-size: 12px; }
  .inv-snapshot-row:last-of-type { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .inv-snapshot-row-label { color: var(--inv-text-c); }
  .inv-snapshot-row-val { font-weight: 700; font-family: var(--inv-mono); font-size: 11px; }
  .inv-status-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 14px; }
  .inv-status-chip { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 5px; background: rgba(99,102,241,0.1); color: #818cf8; }

  /* Aging */
  .inv-aging-row { margin-bottom: 11px; }
  .inv-aging-row:last-child { margin-bottom: 0; }
  .inv-aging-meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
  .inv-aging-meta-label { color: var(--inv-text-c); }
  .inv-aging-meta-val { font-weight: 700; font-family: var(--inv-mono); font-size: 11px; }
  .inv-minibar-track { height: 5px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
  .inv-light .inv-minibar-track { background: rgba(0,0,0,0.07); }
  .inv-minibar-fill { height: 100%; border-radius: 3px; transition: width 0.5s cubic-bezier(0.4,0,0.2,1); }

  /* Trend */
  .inv-trend-card {
    background: var(--inv-surface-2); border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius); padding: 14px 16px;
  }
  .inv-trend-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .inv-trend-legend { display: flex; gap: 14px; font-size: 10px; color: var(--inv-text-c); }
  .inv-trend-legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; }
  .inv-trend-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .inv-spark-label { font-size: 10px; color: var(--inv-text-d); margin-bottom: 5px; }
  .inv-sparkbars { display: flex; align-items: flex-end; gap: 2px; height: 38px; }
  .inv-sparkbar { flex: 1; border-radius: 2px 2px 0 0; opacity: 0.75; transition: height 0.3s, opacity 0.2s; }
  .inv-sparkbar:hover { opacity: 1; }
  .inv-month-labels { display: flex; gap: 2px; margin-top: 5px; }
  .inv-month-label { flex: 1; font-size: 8px; color: var(--inv-text-d); text-align: center; font-family: var(--inv-mono); }

  /* ── Filters ── */
  .inv-filters {
    background: var(--inv-surface); border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius); padding: 14px 16px;
    margin-bottom: 20px; display: flex; gap: 9px; flex-wrap: wrap; align-items: center;
    transition: background 0.25s;
  }
  .inv-input {
    background: var(--inv-input-bg); border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius-sm); padding: 8px 12px; font-size: 13px;
    color: var(--inv-text); outline: none; min-width: 220px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .inv-input:focus { border-color: rgba(99,102,241,0.5); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  .inv-input::placeholder { color: var(--inv-text-d); }
  .inv-select-wrap { position: relative; }
  .inv-select {
    background: var(--inv-input-bg); border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius-sm); padding: 8px 28px 8px 12px; font-size: 13px;
    color: var(--inv-text); outline: none; cursor: pointer; appearance: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .inv-select:focus { border-color: rgba(99,102,241,0.5); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  .inv-select-arrow { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); font-size: 9px; color: var(--inv-text-d); pointer-events: none; }
  .inv-clear-btn {
    background: none; border: 1px solid var(--inv-border); border-radius: var(--inv-radius-sm);
    color: var(--inv-red); font-size: 12px; font-weight: 600; padding: 8px 13px; cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .inv-clear-btn:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); }

  /* ── Error ── */
  .inv-error {
    background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.18);
    border-radius: var(--inv-radius-sm); padding: 12px 16px; color: #fca5a5;
    font-size: 13px; margin-bottom: 16px;
  }

  /* ── Table Card ── */
  .inv-table-card {
    background: var(--inv-surface); border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius-lg); overflow: hidden; transition: background 0.25s;
  }
  .inv-loading, .inv-empty { padding: 48px; text-align: center; color: var(--inv-text-c); font-size: 13px; }
  .inv-empty-icon { font-size: 38px; margin-bottom: 12px; }
  .inv-empty-title { font-size: 15px; font-weight: 700; color: var(--inv-text); margin-bottom: 6px; }
  .inv-empty-sub { font-size: 13px; color: var(--inv-text-c); margin-bottom: 22px; }
  .inv-table-scroll { overflow-x: auto; }

  table.inv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.inv-table thead tr { border-bottom: 1px solid var(--inv-border); background: var(--inv-surface-2); }
  table.inv-table th {
    padding: 11px 14px; text-align: left; font-size: 10px; font-weight: 700;
    color: var(--inv-text-c); letter-spacing: 0.08em; white-space: nowrap; text-transform: uppercase;
  }
  table.inv-table tbody tr { border-top: 1px solid var(--inv-border-soft); transition: background 0.1s; }
  table.inv-table tbody tr:first-child { border-top: none; }
  table.inv-table tbody tr:hover { background: var(--inv-hover); }
  table.inv-table td { padding: 13px 14px; }

  .inv-stock-id { font-weight: 700; color: var(--inv-accent); white-space: nowrap; font-family: var(--inv-mono); font-size: 12px; }
  .inv-vehicle-name { font-weight: 700; color: var(--inv-text); }
  .inv-vehicle-variant { font-size: 11px; color: var(--inv-text-c); margin-top: 2px; }
  .inv-age-val { font-size: 11px; font-weight: 700; font-family: var(--inv-mono); }
  .inv-mileage { color: var(--inv-text-b); white-space: nowrap; font-family: var(--inv-mono); font-size: 12px; }
  .inv-price { font-weight: 700; color: var(--inv-text); white-space: nowrap; font-family: var(--inv-mono); font-size: 12px; }
  .inv-cost { color: var(--inv-amber); font-weight: 600; white-space: nowrap; font-family: var(--inv-mono); font-size: 12px; }
  .inv-profit { font-weight: 700; white-space: nowrap; font-family: var(--inv-mono); font-size: 12px; }
  .inv-profit.positive { color: var(--inv-green); }
  .inv-profit.negative { color: var(--inv-red); }
  .inv-website-live { font-size: 11px; font-weight: 600; color: var(--inv-green); }
  .inv-website-hidden { font-size: 11px; font-weight: 600; color: var(--inv-text-d); }
  .inv-view-link { font-size: 12px; color: var(--inv-accent); text-decoration: none; font-weight: 700; white-space: nowrap; transition: opacity 0.15s; }
  .inv-view-link:hover { opacity: 0.7; }

  /* ── Pagination ── */
  .inv-pagination { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 22px; }
  .inv-page-btn {
    padding: 8px 16px; border-radius: var(--inv-radius-sm); font-size: 12px; font-weight: 700;
    background: var(--inv-surface); border: 1px solid var(--inv-border);
    color: var(--inv-text-b); cursor: pointer; transition: all 0.15s;
  }
  .inv-page-btn:not(:disabled):hover { border-color: var(--inv-accent); color: var(--inv-accent); }
  .inv-page-btn:disabled { color: var(--inv-text-d); cursor: not-allowed; opacity: 0.5; }
  .inv-page-info { font-size: 12px; color: var(--inv-text-c); font-family: var(--inv-mono); }

  /* ── Analytics error/loading ── */
  .inv-analytics-error { font-size: 12px; color: var(--inv-red); margin-bottom: 12px; }
  .inv-analytics-loading { font-size: 13px; color: var(--inv-text-c); padding: 20px 0; }
`;

// ── Aging colour map (unchanged) ──────────────────────────────────
const AGING_COLORS: Record<string, string> = {
  fresh:      '#10b981',
  aging:      '#f59e0b',
  old:        '#ef4444',
  dead_stock: '#dc2626',
};

// ── Date preset helpers (unchanged) ──────────────────────────────
function toDateStr(d: Date) { return d.toISOString().split('T')[0]!; }
function getPresetRange(preset: string): { from: string; to: string } {
  const today = new Date();
  const to    = toDateStr(today);
  switch (preset) {
    case 'today':   return { from: to, to };
    case 'week':    { const d = new Date(today); d.setDate(d.getDate() - 6); return { from: toDateStr(d), to }; }
    case 'month':   return { from: `${to.slice(0, 7)}-01`, to };
    case '3months': { const d = new Date(today); d.setMonth(d.getMonth() - 3); return { from: toDateStr(d), to }; }
    case 'year':    return { from: `${today.getFullYear()}-01-01`, to };
    default:        return { from: `${to.slice(0, 7)}-01`, to };
  }
}

// ── Mini bar (pure CSS via className) ──────────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="inv-minibar-track">
      <div className="inv-minibar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Spark bars (unchanged logic) ─────────────────────────────────
function SparkBars({ data, field, color }: { data: Array<{ month: string; added: number; sold: number }>; field: 'added' | 'sold'; color: string }) {
  const max = Math.max(...data.map(d => d[field]), 1);
  return (
    <div className="inv-sparkbars">
      {data.slice(-12).map((d) => {
        const h = Math.max(2, (d[field] / max) * 38);
        return (
          <div
            key={d.month}
            className="inv-sparkbar"
            title={`${d.month}: ${d[field]}`}
            style={{ height: h, background: color }}
          />
        );
      })}
    </div>
  );
}

// ── Analytics data type (unchanged) ─────────────────────────────
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
  const [preset,  setPreset]  = useState('month');
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [open,    setOpen]    = useState(true);

  // ── All fetch logic UNCHANGED ──
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

  const ag       = data?.agingBreakdown ?? { fresh: 0, aging: 0, old: 0, dead_stock: 0 };
  const maxAging = Math.max(ag.fresh, ag.aging, ag.old, ag.dead_stock, 1);

  return (
    <div className="inv-analytics">
      <div
        className={`inv-analytics-header${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="inv-analytics-title">
            <span>📊</span> Analytics
          </span>
          {data && (
            <span className="inv-analytics-meta">
              {data.totalVehicles} vehicles total · {data.availableCount} available
            </span>
          )}
        </div>
        <span className={`inv-analytics-chevron${open ? ' open' : ''}`}>▼</span>
      </div>

      {open && (
        <div className="inv-analytics-body">
          {/* Preset tabs */}
          <div className="inv-presets">
            {PRESETS.map(p => (
              <button
                key={p.key}
                className={`inv-preset-btn${preset === p.key ? ' active' : ''}`}
                onClick={() => setPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
            {data && (
              <span className="inv-preset-range">
                {data.period.from} → {data.period.to}
              </span>
            )}
          </div>

          {error && <div className="inv-analytics-error">⚠️ {error}</div>}

          {loading ? (
            <div className="inv-analytics-loading">Loading analytics…</div>
          ) : data && (
            <>
              {/* Row 1: Period KPIs */}
              <div className="inv-kpi-grid">
                {[
                  { label: 'Added This Period',   value: data.addedInPeriod,   color: '#818cf8', fmt: (n: number) => String(n) },
                  { label: 'Sold This Period',    value: data.soldInPeriod,    color: '#10b981', fmt: (n: number) => String(n) },
                  { label: 'Revenue This Period', value: data.revenueInPeriod, color: '#34d399', fmt: formatPrice },
                  { label: 'Profit This Period',  value: data.profitInPeriod,  color: data.profitInPeriod >= 0 ? '#10b981' : '#ef4444', fmt: formatPrice },
                ].map(kpi => (
                  <div key={kpi.label} className="inv-kpi-card">
                    <div className="inv-kpi-label">{kpi.label}</div>
                    <div className="inv-kpi-value" style={{ color: kpi.color }}>{kpi.fmt(kpi.value)}</div>
                  </div>
                ))}
              </div>

              {/* Row 2: Snapshot + Aging */}
              <div className="inv-two-col">
                {/* Inventory snapshot */}
                <div className="inv-snapshot-card">
                  <div className="inv-card-label">Live Inventory Value</div>
                  {[
                    { label: 'Total Asking', value: data.inventoryValue,    color: 'var(--inv-text)' },
                    { label: 'Cost Basis',   value: data.inventoryCostBase, color: '#f59e0b'          },
                    { label: 'Est. Profit',  value: data.inventoryProfit,   color: data.inventoryProfit >= 0 ? '#10b981' : '#ef4444' },
                  ].map(row => (
                    <div key={row.label} className="inv-snapshot-row">
                      <span className="inv-snapshot-row-label">{row.label}</span>
                      <span className="inv-snapshot-row-val" style={{ color: row.color }}>{formatPrice(row.value)}</span>
                    </div>
                  ))}
                  <div className="inv-card-label" style={{ marginTop: 14 }}>By Status</div>
                  <div className="inv-status-chips">
                    {Object.entries(data.statusCounts).map(([status, count]) => (
                      <span key={status} className="inv-status-chip">{status}: {count}</span>
                    ))}
                  </div>
                </div>

                {/* Aging breakdown */}
                <div className="inv-aging-card">
                  <div className="inv-card-label">Stock Aging (Available)</div>
                  {([
                    { key: 'fresh',      label: 'Fresh (0–30d)',     color: '#10b981' },
                    { key: 'aging',      label: 'Aging (31–60d)',    color: '#f59e0b' },
                    { key: 'old',        label: 'Old (61–90d)',      color: '#ef4444' },
                    { key: 'dead_stock', label: 'Dead Stock (90d+)', color: '#dc2626' },
                  ] as const).map(row => (
                    <div key={row.key} className="inv-aging-row">
                      <div className="inv-aging-meta">
                        <span className="inv-aging-meta-label">{row.label}</span>
                        <span className="inv-aging-meta-val" style={{ color: row.color }}>{ag[row.key]}</span>
                      </div>
                      <MiniBar value={ag[row.key]} max={maxAging} color={row.color} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 3: Monthly trend */}
              {data.monthlyTrend.length > 0 && (
                <div className="inv-trend-card">
                  <div className="inv-trend-header">
                    <div className="inv-card-label" style={{ marginBottom: 0 }}>12-Month Trend</div>
                    <div className="inv-trend-legend">
                      <span><span className="inv-trend-legend-dot" style={{ background: '#818cf8' }} />Added</span>
                      <span><span className="inv-trend-legend-dot" style={{ background: '#10b981' }} />Sold</span>
                    </div>
                  </div>
                  <div className="inv-trend-cols">
                    <div>
                      <div className="inv-spark-label">Vehicles Added</div>
                      <SparkBars data={data.monthlyTrend} field="added" color="#818cf8" />
                    </div>
                    <div>
                      <div className="inv-spark-label">Vehicles Sold</div>
                      <SparkBars data={data.monthlyTrend} field="sold" color="#10b981" />
                    </div>
                  </div>
                  <div className="inv-month-labels">
                    {data.monthlyTrend.slice(-12).map((d) => (
                      <div key={d.month} className="inv-month-label">{d.month.slice(5)}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN INVENTORY PAGE — all fetch/state logic UNTOUCHED
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

  // ── All fetch logic UNCHANGED ──
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
      {/* Inject scoped CSS once */}
      <style>{CSS}</style>

      <div className={`inv-root${isDark ? '' : ' inv-light'}`}>

        {/* Header */}
        <div className="inv-header">
          <div>
            <h1 className="inv-title">Inventory</h1>
            {pagination && (
              <div className="inv-subtitle">
                {pagination.total} vehicle{pagination.total !== 1 ? 's' : ''} total
              </div>
            )}
          </div>
          <Link href="/admin/inventory/new" className="inv-add-btn">
            + Add Vehicle
          </Link>
        </div>

        {/* Analytics */}
        <AnalyticsPanel isDark={isDark} />

        {/* Filters */}
        <div className="inv-filters">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search make, model, stock ID…"
            className="inv-input"
          />

          {[
            { value: status,  onChange: setStatus,  options: [['', 'All Statuses'], ['draft','Draft'], ['available','Available'], ['reserved','Reserved'], ['sold','Sold'], ['written_off','Written Off']] as [string,string][] },
            { value: aging,   onChange: setAging,   options: [['', 'All Ages'], ['fresh','Fresh (0–30d)'], ['aging','Aging (31–60d)'], ['old','Old (61–90d)'], ['dead_stock','Dead Stock (90d+)']] as [string,string][] },
            { value: website, onChange: setWebsite, options: [['', 'Website: All'], ['true','Website: Visible'], ['false','Website: Hidden']] as [string,string][] },
          ].map((f, i) => (
            <div key={i} className="inv-select-wrap">
              <select value={f.value} onChange={e => f.onChange(e.target.value)} className="inv-select">
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <span className="inv-select-arrow">▼</span>
            </div>
          ))}

          {(status || aging || search || website) && (
            <button
              className="inv-clear-btn"
              onClick={() => { setStatus(''); setAging(''); setSearch(''); setWebsite(''); }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Error */}
        {error && <div className="inv-error">⚠️ {error}</div>}

        {/* Table */}
        <div className="inv-table-card">
          {loading ? (
            <div className="inv-loading">Loading…</div>
          ) : vehicles.length === 0 ? (
            <div className="inv-empty">
              <div className="inv-empty-icon">🚗</div>
              <div className="inv-empty-title">No vehicles found</div>
              <div className="inv-empty-sub">Add your first vehicle to get started</div>
              <Link href="/admin/inventory/new" className="inv-add-btn">
                + Add Vehicle
              </Link>
            </div>
          ) : (
            <div className="inv-table-scroll">
              <table className="inv-table">
                <thead>
                  <tr>
                    {['Stock ID', 'Vehicle', 'Status', 'Age', 'Mileage', 'Asking Price', 'Total Cost', 'Est. Profit', 'Website', ''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id}>
                      <td><span className="inv-stock-id">{v.stock_id}</span></td>
                      <td>
                        <div className="inv-vehicle-name">{v.year} {v.make} {v.model}</div>
                        {v.variant && <div className="inv-vehicle-variant">{v.variant}</div>}
                      </td>
                      <td><StatusBadge status={v.status} /></td>
                      <td>
                        <span className="inv-age-val" style={{ color: AGING_COLORS[v.aging_bucket] ?? 'var(--inv-text-c)' }}>
                          {v.days_in_stock}d
                        </span>
                      </td>
                      <td><span className="inv-mileage">{formatMileage(v.mileage)}</span></td>
                      <td><span className="inv-price">{formatPrice(v.asking_price)}</span></td>
                      <td><span className="inv-cost">{formatPrice(v.total_cost_cache ?? v.purchase_price)}</span></td>
                      <td>
                        <span className={`inv-profit${v.estimated_profit >= 0 ? ' positive' : ' negative'}`}>
                          {v.estimated_profit >= 0 ? '+' : ''}{formatPrice(v.estimated_profit)}
                        </span>
                      </td>
                      <td>
                        {v.show_on_website
                          ? <span className="inv-website-live">✓ Live</span>
                          : <span className="inv-website-hidden">✗ Hidden</span>
                        }
                      </td>
                      <td>
                        <Link href={`/admin/inventory/${v.id}`} className="inv-view-link">
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
          <div className="inv-pagination">
            <button
              className="inv-page-btn"
              onClick={() => void load(page - 1)}
              disabled={!pagination.hasPrev}
            >← Prev</button>
            <span className="inv-page-info">Page {page} of {pagination.totalPages}</span>
            <button
              className="inv-page-btn"
              onClick={() => void load(page + 1)}
              disabled={!pagination.hasNext}
            >Next →</button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}