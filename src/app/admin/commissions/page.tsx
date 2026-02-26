'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { commissionApi, employeeApi, type Commission, type CommissionStats, type Employee } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/formatters';

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
    accent:   '#ec4899',
  };
}

function Skeleton({ w = '70%' }: { w?: string }) {
  return <div style={{ height: 13, borderRadius: 4, background: 'rgba(128,128,128,0.12)', width: w }} />;
}

// ── Month helpers ─────────────────────────────────────────────
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(m: string) {
  const [y, mon] = m.split('-');
  return new Date(Number(y), Number(mon) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function prevMonth(m: string) {
  const [y, mon] = m.split('-');
  const d = new Date(Number(y), Number(mon) - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(m: string) {
  const [y, mon] = m.split('-');
  const d = new Date(Number(y), Number(mon), 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Mark Paid inline ─────────────────────────────────────────
function MarkPaidButton({
  commissionId, onDone, t, isAdmin,
}: { commissionId: string; onDone: () => void; t: ReturnType<typeof tok>; isAdmin: boolean }) {
  const [loading,  setLoading]  = useState(false);
  const [confirm,  setConfirm]  = useState(false);

  if (!isAdmin) return null;
  if (confirm) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={async () => {
            setLoading(true);
            try { await commissionApi.markPaid(commissionId); onDone(); }
            finally { setLoading(false); setConfirm(false); }
          }}
          disabled={loading}
          style={{ padding: '4px 10px', borderRadius: 6, background: '#34d399', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
        >
          {loading ? '…' : '✓ Confirm'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', color: t.muted, border: `1px solid ${t.border}`, fontSize: 11, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setConfirm(true)}
      style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
    >
      Mark Paid
    </button>
  );
}

function CommissionsContent() {
  const { isDark } = useTheme();
  const t = tok(isDark);
  const { employee } = useAuth();

  const isAdmin   = ['admin', 'manager'].includes(employee?.role ?? '');
  const isSalesp  = employee?.role === 'salesperson';

  const [commissions,  setCommissions]  = useState<Commission[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [stats,        setStats]        = useState<CommissionStats | null>(null);
  const [employees,    setEmployees]    = useState<Employee[]>([]);

  const [month,       setMonth]       = useState(currentMonth());
  const [status,      setStatus]      = useState('');
  const [empFilter,   setEmpFilter]   = useState('');

  // Load stats + employee list (admin only)
  useEffect(() => {
    if (isAdmin) {
      commissionApi.getStats().then(setStats).catch(() => {});
      employeeApi.list({ limit: 100, role: 'salesperson' })
        .then(r => setEmployees(r.employees))
        .catch(() => {});
    }
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 25 };
      if (month)     params['month']       = month;
      if (status)    params['status']      = status;
      if (empFilter) params['employee_id'] = empFilter;

      const res = await commissionApi.list(params);
      setCommissions(res.commissions);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, month, status, empFilter]);

  useEffect(() => { load(); }, [load]);

  const inp: React.CSSProperties = {
    background: t.input, color: t.inputTxt, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '7px 11px', fontSize: 13, outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: t.page, padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: t.text, margin: 0 }}>Commissions</h1>
          <p style={{ color: t.muted, fontSize: 13, margin: '3px 0 0' }}>{total} records</p>
        </div>
      </div>

      {/* Stats (admin only) */}
      {isAdmin && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total',    val: stats.total_count,   money: false, color: '#818cf8', icon: '📊' },
            { label: 'Unpaid',   val: stats.unpaid_count,  money: false, color: '#ef4444', icon: '⏳' },
            { label: 'Paid',     val: stats.paid_count,    money: false, color: '#34d399', icon: '✅' },
            { label: 'Total Amt',val: stats.total_amount,  money: true,  color: '#ec4899', icon: '💸' },
            { label: 'Unpaid',   val: stats.unpaid_amount, money: true,  color: '#ef4444', icon: '❌' },
            { label: 'Paid',     val: stats.paid_amount,   money: true,  color: '#34d399', icon: '💰' },
          ].map(c => (
            <div key={c.label + c.icon} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '14px 16px', borderTop: `3px solid ${c.color}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 9 }}>{c.icon} {c.label}</div>
              <div style={{ fontSize: c.money ? 13 : 22, fontWeight: 900, color: c.color, fontFamily: c.money ? 'monospace' : 'inherit' }}>
                {c.money ? formatCurrency(c.val as number) : c.val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>

          {/* Month navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => { setMonth(prevMonth(month)); setPage(1); }}
              style={{ ...inp, cursor: 'pointer', padding: '7px 10px', fontSize: 14 }}>‹</button>
            <div style={{ ...inp, minWidth: 160, textAlign: 'center', fontWeight: 600 }}>{monthLabel(month)}</div>
            <button onClick={() => { setMonth(nextMonth(month)); setPage(1); }}
              style={{ ...inp, cursor: 'pointer', padding: '7px 10px', fontSize: 14 }}>›</button>
            <button onClick={() => { setMonth(currentMonth()); setPage(1); }}
              style={{ ...inp, cursor: 'pointer', fontSize: 12, color: t.muted }}>Today</button>
          </div>

          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>

          {isAdmin && employees.length > 0 && (
            <select value={empFilter} onChange={e => { setEmpFilter(e.target.value); setPage(1); }} style={{ ...inp, cursor: 'pointer' }}>
              <option value="">All Salespeople</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          )}

          {(status || empFilter) && (
            <button onClick={() => { setStatus(''); setEmpFilter(''); setPage(1); }}
              style={{ padding: '7px 13px', borderRadius: 8, border: `1px solid rgba(239,68,68,0.4)`, background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: t.shadow, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)', borderBottom: `1px solid ${t.border}` }}>
              {['Deal', 'Salesperson', 'Vehicle', 'Type', 'Calculated', 'Final Amount', 'Status', 'Date', ...(isAdmin ? ['Action'] : [])].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: t.muted, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${t.border}` }}>
                  {Array.from({ length: isAdmin ? 9 : 8 }).map((_, j) => (
                    <td key={j} style={{ padding: '14px 14px' }}><Skeleton w={`${50 + (j * 7) % 40}%`} /></td>
                  ))}
                </tr>
              ))
            ) : commissions.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} style={{ padding: 64, textAlign: 'center' }}>
                  <div style={{ fontSize: 34, marginBottom: 10 }}>💸</div>
                  <div style={{ fontWeight: 700, color: t.text, marginBottom: 4 }}>No commissions found</div>
                  <div style={{ color: t.muted, fontSize: 13 }}>Complete a deal to auto-create commissions.</div>
                </td>
              </tr>
            ) : commissions.map((c, i) => {
              const isPaid = c.status === 'paid';
              const isOverridden = c.manual_override_amount !== null;
              return (
                <tr key={c.id}
                  style={{ borderTop: i > 0 ? `1px solid ${t.border}` : 'none', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.hoverRow)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <Link href={`/admin/deals/${c.deal_id}`} style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 700, fontFamily: 'monospace' }}>
                      {c.deal?.deal_code ?? '—'}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: t.text }}>{c.employee?.full_name ?? '—'}</div>
                    <div style={{ color: t.muted, fontSize: 11 }}>{c.employee?.employee_code}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {c.deal?.vehicle ? (
                      <><div style={{ color: t.text }}>{c.deal.vehicle.make} {c.deal.vehicle.model}</div>
                      <div style={{ color: t.muted, fontSize: 11 }}>{c.deal.vehicle.year} · {c.deal.vehicle.stock_id}</div></>
                    ) : <span style={{ color: t.muted }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ color: t.muted, fontSize: 12, textTransform: 'capitalize' }}>
                      {c.commission_type.replace(/_/g, ' ')}
                      {c.commission_rate ? ` (${c.commission_rate}%)` : ''}
                      {c.fixed_value ? ` (LKR ${c.fixed_value})` : ''}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: t.muted, fontFamily: 'monospace' }}>
                    {formatCurrency(c.calculated_amount)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ec4899' }}>
                      {formatCurrency(c.final_amount)}
                    </div>
                    {isOverridden && (
                      <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 2 }}>⚡ Overridden</div>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      color:       isPaid ? '#34d399' : '#ef4444',
                      background:  isPaid ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.1)',
                      border:     `1px solid ${isPaid ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                      {isPaid ? '✓ Paid' : 'Unpaid'}
                    </span>
                    {c.paid_at && (
                      <div style={{ fontSize: 10, color: t.muted, marginTop: 2 }}>
                        {new Date(c.paid_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', color: t.muted, fontSize: 12 }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {!isPaid && (
                          <MarkPaidButton commissionId={c.id} onDone={load} t={t} isAdmin={isAdmin} />
                        )}
                        <Link
                          href={`/admin/commissions/${c.id}`}
                          style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', color: t.muted, border: `1px solid ${t.border}`, fontSize: 11, textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          Detail →
                        </Link>
                      </div>
                    </td>
                  )}
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

export default function CommissionsPage() {
  const { isDark } = useTheme();
  return (
    <AdminShell activePage="commissions">
      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center', color: isDark ? '#5a7295' : '#4a6278' }}>Loading…</div>}>
        <CommissionsContent />
      </Suspense>
    </AdminShell>
  );
}
