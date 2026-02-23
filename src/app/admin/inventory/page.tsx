'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import StatusBadge from '@/components/admin/StatusBadge';
import { adminApi, type AdminVehicle, type Pagination } from '@/lib/api';
import { formatPrice, formatMileage } from '@/lib/formatters';

const AGING_COLORS: Record<string, string> = {
  fresh:      '#10b981',
  aging:      '#f59e0b',
  old:        '#ef4444',
  dead_stock: '#7f1d1d',
};

const INPUT: React.CSSProperties = {
  background: '#07090f', border: '1px solid #1f2d45', borderRadius: 7,
  padding: '7px 11px', fontSize: 13, color: '#dde4f0', outline: 'none',
};

const SELECT: React.CSSProperties = { ...INPUT, appearance: 'none', cursor: 'pointer', paddingRight: 24 };

export default function InventoryListPage() {
  const [vehicles,   setVehicles]   = useState<AdminVehicle[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const [status,  setStatus]  = useState('');
  const [aging,   setAging]   = useState('');
  const [search,  setSearch]  = useState('');
  const [website, setWebsite] = useState('');
  const [page,    setPage]    = useState(1);

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
      <div style={{ padding: '28px 28px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>Inventory</h1>
            {pagination && (
              <div style={{ fontSize: 13, color: '#5c7090', marginTop: 4 }}>
                {pagination.total} vehicle{pagination.total !== 1 ? 's' : ''} total
              </div>
            )}
          </div>
          <Link href="/admin/inventory/new" style={{
            background: '#6366f1', color: '#fff', textDecoration: 'none',
            padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            + Add Vehicle
          </Link>
        </div>

        {/* Filters */}
        <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 10, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search make, model, stock ID…"
            style={{ ...INPUT, minWidth: 220 }}
          />

          {/* Status */}
          <div style={{ position: 'relative' }}>
            <select value={status} onChange={e => setStatus(e.target.value)} style={SELECT}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
              <option value="written_off">Written Off</option>
            </select>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#5c7090', pointerEvents: 'none' }}>▼</span>
          </div>

          {/* Aging */}
          <div style={{ position: 'relative' }}>
            <select value={aging} onChange={e => setAging(e.target.value)} style={SELECT}>
              <option value="">All Ages</option>
              <option value="fresh">Fresh (0–30d)</option>
              <option value="aging">Aging (31–60d)</option>
              <option value="old">Old (61–90d)</option>
              <option value="dead_stock">Dead Stock (90d+)</option>
            </select>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#5c7090', pointerEvents: 'none' }}>▼</span>
          </div>

          {/* Website */}
          <div style={{ position: 'relative' }}>
            <select value={website} onChange={e => setWebsite(e.target.value)} style={SELECT}>
              <option value="">Website: All</option>
              <option value="true">Website: Visible</option>
              <option value="false">Website: Hidden</option>
            </select>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#5c7090', pointerEvents: 'none' }}>▼</span>
          </div>

          {(status || aging || search || website) && (
            <button onClick={() => { setStatus(''); setAging(''); setSearch(''); setWebsite(''); }} style={{
              background: 'none', border: '1px solid #1f2d45', borderRadius: 7,
              color: '#ef4444', fontSize: 12, fontWeight: 600, padding: '7px 12px', cursor: 'pointer',
            }}>
              ✕ Clear
            </button>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#5c7090', fontSize: 13 }}>Loading…</div>
          ) : vehicles.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🚗</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>No vehicles found</div>
              <div style={{ fontSize: 13, color: '#5c7090', marginBottom: 20 }}>Add your first vehicle to get started</div>
              <Link href="/admin/inventory/new" style={{
                background: '#6366f1', color: '#fff', textDecoration: 'none',
                padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              }}>
                + Add Vehicle
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1f2d45' }}>
                    {['Stock ID', 'Vehicle', 'Status', 'Age', 'Mileage', 'Asking Price', 'Total Cost', 'Est. Profit', 'Website', ''].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#5c7090', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v, i) => (
                    <tr key={v.id} style={{ borderTop: i > 0 ? '1px solid #111827' : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#111827')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#818cf8', whiteSpace: 'nowrap' }}>{v.stock_id}</td>
                      <td style={{ padding: '12px 14px', minWidth: 180 }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{v.year} {v.make} {v.model}</div>
                        {v.variant && <div style={{ fontSize: 11, color: '#5c7090' }}>{v.variant}</div>}
                      </td>
                      <td style={{ padding: '12px 14px' }}><StatusBadge status={v.status} /></td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: AGING_COLORS[v.aging_bucket] ?? '#5c7090' }}>
                          {v.days_in_stock}d
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#8097b8', whiteSpace: 'nowrap' }}>{formatMileage(v.mileage)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{formatPrice(v.asking_price)}</td>
                      <td style={{ padding: '12px 14px', color: '#f59e0b', whiteSpace: 'nowrap' }}>{formatPrice(v.total_cost_cache ?? v.purchase_price)}</td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: v.estimated_profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                          {v.estimated_profit >= 0 ? '+' : ''}{formatPrice(v.estimated_profit)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: v.show_on_website ? '#10b981' : '#5c7090' }}>
                          {v.show_on_website ? '✓ Live' : '✗ Hidden'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link href={`/admin/inventory/${v.id}`} style={{
                          fontSize: 12, color: '#6366f1', textDecoration: 'none',
                          fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
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
              background: '#0d1117', border: '1px solid #1f2d45',
              color: pagination.hasPrev ? '#dde4f0' : '#3a4e6a',
              cursor: pagination.hasPrev ? 'pointer' : 'not-allowed',
            }}>← Prev</button>
            <span style={{ fontSize: 12, color: '#5c7090' }}>Page {page} of {pagination.totalPages}</span>
            <button onClick={() => void load(page + 1)} disabled={!pagination.hasNext} style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: '#0d1117', border: '1px solid #1f2d45',
              color: pagination.hasNext ? '#dde4f0' : '#3a4e6a',
              cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
            }}>Next →</button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
