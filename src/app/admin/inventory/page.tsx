'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import StatusBadge from '@/components/admin/StatusBadge';
import { adminApi, type AdminVehicle, type Pagination } from '@/lib/api';
import { formatPrice, formatMileage } from '@/lib/formatters';
import { useTheme } from '@/lib/theme';

const AGING_COLORS: Record<string, string> = {
  fresh:      '#10b981',
  aging:      '#f59e0b',
  old:        '#ef4444',
  dead_stock: '#dc2626',
};

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

  // ── Color tokens ──────────────────────────────────────────
  const c = {
    pageBg:      isDark ? '#141c2e' : '#dde6f0',
    cardBg:      isDark ? '#1a2236' : '#e8f2fb',
    filterBg:    isDark ? '#1e2840' : '#ddeaf8',
    border:      isDark ? '#243048' : '#b2c4d8',
    borderLight: isDark ? '#1e2a3e' : '#c8d8e8',
    // Text
    textPrimary: isDark ? '#e8f0fc' : '#0f1e32',   // headings, key values — max contrast
    textBody:    isDark ? '#b8cce0' : '#243650',   // normal body text
    textSub:     isDark ? '#6b82a0' : '#4a6278',   // labels, subtitles
    textMuted:   isDark ? '#3d5270' : '#7a96b0',   // hints, placeholders
    // Inputs
    inputBg:     isDark ? '#111827' : '#d8e8f4',
    inputText:   isDark ? '#d0dff0' : '#1a2c42',
    inputBorder: isDark ? '#243048' : '#a8bed4',
    // Row hover
    rowHover:    isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    // Accent stock ID color
    stockId:     isDark ? '#818cf8' : '#4f46e5',
  };

  const INPUT: React.CSSProperties = {
    background: c.inputBg,
    border:     `1px solid ${c.inputBorder}`,
    borderRadius: 7,
    padding:    '7px 11px',
    fontSize:   13,
    color:      c.inputText,
    outline:    'none',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
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

        {/* Filters */}
        <div style={{ background: c.filterBg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', transition: 'background 0.25s' }}>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search make, model, stock ID…"
            style={{ ...INPUT, minWidth: 220 }}
          />

          {[
            { value: status,  onChange: setStatus,  options: [['', 'All Statuses'], ['draft','Draft'], ['available','Available'], ['reserved','Reserved'], ['sold','Sold'], ['written_off','Written Off']] },
            { value: aging,   onChange: setAging,   options: [['', 'All Ages'], ['fresh','Fresh (0–30d)'], ['aging','Aging (31–60d)'], ['old','Old (61–90d)'], ['dead_stock','Dead Stock (90d+)']] },
            { value: website, onChange: setWebsite, options: [['', 'Website: All'], ['true','Website: Visible'], ['false','Website: Hidden']] },
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
              transition: 'all 0.15s',
            }}>← Prev</button>
            <span style={{ fontSize: 12, color: c.textSub }}>Page {page} of {pagination.totalPages}</span>
            <button onClick={() => void load(page + 1)} disabled={!pagination.hasNext} style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: c.cardBg, border: `1px solid ${c.border}`,
              color: pagination.hasNext ? c.textBody : c.textMuted,
              cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}>Next →</button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}