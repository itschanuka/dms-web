'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { employeeApi, type Employee } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';

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
    accent:   '#f97316',
  };
}

const ROLE_CFG: Record<string, { color: string; bg: string; border: string }> = {
  admin:       { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.3)' },
  manager:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'  },
  salesperson: { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  accountant:  { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)'  },
};

function Skeleton({ w = '70%' }: { w?: string }) {
  return <div style={{ height: 13, borderRadius: 4, background: 'rgba(128,128,128,0.12)', width: w }} />;
}

function EmployeesContent() {
  const { isDark } = useTheme();
  const t = tok(isDark);
  const { employee: me } = useAuth();
  const isAdmin = me?.role === 'admin';

  const [employees,  setEmployees]  = useState<Employee[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [role,   setRole]   = useState('');
  const [status, setStatus] = useState('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeApi.list({ page, limit: 25, search: search || undefined, role: role || undefined, status: status || undefined });
      setEmployees(res.employees);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, search, role, status]);

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
          <h1 style={{ fontSize: 24, fontWeight: 900, color: t.text, margin: 0 }}>Employees</h1>
          <p style={{ color: t.muted, fontSize: 13, margin: '3px 0 0' }}>{total} staff members</p>
        </div>
        {isAdmin && (
          <Link href="/admin/employees/new" style={{
            background: t.accent, color: '#fff', borderRadius: 10,
            padding: '10px 22px', fontWeight: 700, fontSize: 14, textDecoration: 'none',
            boxShadow: '0 2px 12px rgba(249,115,22,0.35)',
          }}>+ New Employee</Link>
        )}
      </div>

      {/* Filters */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="🔍  Name, email, code…" style={{ ...inp, minWidth: 220 }} />
          <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="salesperson">Salesperson</option>
            <option value="accountant">Accountant</option>
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {(search || role || status !== 'active') && (
            <button onClick={() => { setSearch(''); setRole(''); setStatus('active'); setPage(1); }}
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
              {['Employee', 'Role', 'Status', 'Commission', 'TOTP', 'Join Date', 'Last Login', ''].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: t.muted, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${t.border}` }}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} style={{ padding: '14px 14px' }}><Skeleton w={`${50 + (j * 9) % 40}%`} /></td>
                  ))}
                </tr>
              ))
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 64, textAlign: 'center' }}>
                  <div style={{ fontSize: 34, marginBottom: 10 }}>👥</div>
                  <div style={{ fontWeight: 700, color: t.text, marginBottom: 4 }}>No employees found</div>
                  <div style={{ color: t.muted, fontSize: 13 }}>Adjust your filters or create a new employee.</div>
                </td>
              </tr>
            ) : employees.map((emp, i) => {
              const rc = ROLE_CFG[emp.role] ?? ROLE_CFG.accountant!;
              const isActive = emp.status === 'active';
              return (
                <tr key={emp.id}
                  style={{ borderTop: i > 0 ? `1px solid ${t.border}` : 'none', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.hoverRow)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: t.text }}>{emp.full_name}</div>
                    <div style={{ color: t.muted, fontSize: 11 }}>{emp.employee_code} · {emp.email}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: rc.color, background: rc.bg, border: `1px solid ${rc.border}`, textTransform: 'capitalize' }}>
                      {emp.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#34d399' : '#ef4444' }}>
                      {isActive ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {emp.commission_type ? (
                      <span style={{ fontSize: 12, color: '#f59e0b' }}>
                        {emp.commission_type.replace(/_/g, ' ')}
                        {emp.commission_value !== null ? ` · ${emp.commission_value}${emp.commission_type === 'fixed' ? ' LKR' : '%'}` : ''}
                      </span>
                    ) : <span style={{ color: t.muted, fontSize: 12 }}>None</span>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 12, color: emp.totp_enabled ? '#34d399' : t.muted }}>
                      {emp.totp_enabled ? '🔐 On' : '⚠ Off'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: t.muted, fontSize: 12 }}>
                    {new Date(emp.join_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 14px', color: t.muted, fontSize: 12 }}>
                    {emp.last_login_at ? new Date(emp.last_login_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <Link href={`/admin/employees/${emp.id}`}
                      style={{ padding: '5px 12px', borderRadius: 7, background: 'transparent', color: t.muted, border: `1px solid ${t.border}`, fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      View →
                    </Link>
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

export default function EmployeesPage() {
  const { isDark } = useTheme();
  return (
    <AdminShell activePage="employees">
      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center', color: isDark ? '#5a7295' : '#4a6278' }}>Loading…</div>}>
        <EmployeesContent />
      </Suspense>
    </AdminShell>
  );
}
