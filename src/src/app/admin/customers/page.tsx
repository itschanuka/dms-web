'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { customerApi, type Customer, type Pagination } from '@/lib/api';
import { formatPrice } from '@/lib/formatters';
import { useTheme } from '@/lib/theme';

// ── Constants ──────────────────────────────────────────────────

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  individual:    'Individual',
  business:      'Business',
  dealer_trader: 'Dealer / Trader',
  repeat_buyer:  'Repeat Buyer',
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:      { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Active'      },
  inactive:    { bg: 'rgba(92,112,144,0.15)',  color: '#8097b8', label: 'Inactive'    },
  blacklisted: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Blacklisted' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES['inactive']!;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

function TypePill({ type }: { type: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
      background: 'rgba(139,92,246,0.1)', color: '#a78bfa', whiteSpace: 'nowrap',
    }}>
      {CUSTOMER_TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function CustomersPage() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [customers,  setCustomers]  = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const [search,       setSearch]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page,         setPage]         = useState(1);

  const c = {
    bg:      isDark ? '#07090f' : '#f0f4f8',
    card:    isDark ? '#0d1117' : '#ffffff',
    border:  isDark ? '#1f2d45' : '#d0dcea',
    text:    isDark ? '#dde4f0' : '#1a2535',
    muted:   isDark ? '#5c7090' : '#6b7fa0',
    header:  isDark ? '#111827' : '#e8f2fb',
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await customerApi.list({
        page,
        limit:         20,
        search:        search || undefined,
        customer_type: typeFilter   || undefined,
        status:        statusFilter || undefined,
      });
      setCustomers(result.customers);
      setPagination(result.pagination);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter]);

  const SEL: React.CSSProperties = {
    background: isDark ? '#07090f' : '#f0f4f8',
    border: `1px solid ${c.border}`,
    borderRadius: 7, padding: '7px 10px', fontSize: 13,
    color: c.text, outline: 'none',
  };

  const INP: React.CSSProperties = {
    ...SEL,
    minWidth: 220,
  };

  return (
    <AdminShell>
      <div style={{ padding: '28px 32px', maxWidth: 1400 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, margin: 0 }}>Customers</h1>
            <p style={{ fontSize: 13, color: c.muted, marginTop: 4 }}>
              {pagination ? `${pagination.total} total customers` : 'Loading…'}
            </p>
          </div>
          <Link
            href="/admin/customers/new"
            style={{
              background: '#8b5cf6', color: '#fff', border: 'none',
              borderRadius: 8, padding: '9px 18px', fontSize: 13,
              fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            + New Customer
          </Link>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search name, phone, NIC, code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={INP}
          />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={SEL}>
            <option value="">All Types</option>
            <option value="individual">Individual</option>
            <option value="business">Business</option>
            <option value="dealer_trader">Dealer / Trader</option>
            <option value="repeat_buyer">Repeat Buyer</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={SEL}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
          {(search || typeFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); }}
              style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 7, padding: '7px 12px', fontSize: 12, color: c.muted, cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* ── Table ── */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: c.muted, fontSize: 14 }}>Loading customers…</div>
          ) : customers.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>No customers found</div>
              <div style={{ fontSize: 13, color: c.muted, marginBottom: 20 }}>
                {search || typeFilter || statusFilter ? 'Try different filters' : 'Add your first customer to get started'}
              </div>
              {!search && !typeFilter && !statusFilter && (
                <Link href="/admin/customers/new" style={{ background: '#8b5cf6', color: '#fff', padding: '8px 18px', borderRadius: 7, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                  + New Customer
                </Link>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: c.header }}>
                  {['Code', 'Name', 'Phone', 'Type', 'City', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: c.muted, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((cust, i) => (
                  <tr
                    key={cust.id}
                    style={{ borderTop: i > 0 ? `1px solid ${c.border}` : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                    onClick={() => router.push(`/admin/customers/${cust.id}`)}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 16px', color: c.muted, fontFamily: 'monospace', fontSize: 12 }}>{cust.customer_code}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ fontWeight: 600, color: c.text }}>{cust.full_name}</div>
                      {cust.business_name && <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{cust.business_name}</div>}
                    </td>
                    <td style={{ padding: '11px 16px', color: c.text }}>{cust.phone_primary}</td>
                    <td style={{ padding: '11px 16px' }}><TypePill type={cust.customer_type} /></td>
                    <td style={{ padding: '11px 16px', color: c.muted }}>{cust.city || '—'}</td>
                    <td style={{ padding: '11px 16px' }}><StatusPill status={cust.status} /></td>
                    <td style={{ padding: '11px 16px' }}>
                      <Link
                        href={`/admin/customers/${cust.id}`}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: 12, color: '#8b5cf6', textDecoration: 'none', fontWeight: 600 }}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {pagination && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: c.muted }}>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} customers
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={!pagination.hasPrev}
                style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 7, padding: '6px 14px', fontSize: 13, color: pagination.hasPrev ? c.text : c.muted, cursor: pagination.hasPrev ? 'pointer' : 'not-allowed' }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasNext}
                style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 7, padding: '6px 14px', fontSize: 13, color: pagination.hasNext ? c.text : c.muted, cursor: pagination.hasNext ? 'pointer' : 'not-allowed' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

      </div>
    </AdminShell>
  );
}
