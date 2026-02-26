'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { expenseApi, type Expense } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/formatters';

// ── Category config ────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent', utilities: 'Utilities', salaries: 'Salaries',
  marketing: 'Marketing', office: 'Office', vehicle_repair: 'Vehicle Repair',
  transport: 'Transport', other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  rent: '#6366f1', utilities: '#0ea5e9', salaries: '#f59e0b',
  marketing: '#ec4899', office: '#8b5cf6', vehicle_repair: '#ef4444',
  transport: '#10b981', other: '#64748b',
};

function CategoryBadge({ cat }: { cat: string }) {
  const bg = `${CATEGORY_COLORS[cat] ?? '#64748b'}22`;
  const fg = CATEGORY_COLORS[cat] ?? '#64748b';
  return (
    <span style={{ background: bg, color: fg, border: `1px solid ${fg}44`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {CATEGORY_LABELS[cat] ?? cat}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function ExpensesPage() {
  const t      = useTheme();
  const { employee } = useAuth();
  const router = useRouter();
  const isAdmin = employee?.role === 'admin';

  const [expenses,      setExpenses]      = useState<Expense[]>([]);
  const [total,         setTotal]         = useState(0);
  const [pages,         setPages]         = useState(1);
  const [page,          setPage]          = useState(1);
  const [runningTotal,  setRunningTotal]  = useState(0);
  const [loading,       setLoading]       = useState(true);

  // Filters
  const [category,  setCategory]  = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [search,    setSearch]    = useState('');
  const [vehicle,   setVehicle]   = useState('');

  // Category totals
  const [catTotals, setCatTotals] = useState<Record<string, number>>({});

  const [msg, setMsg] = useState('');

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 25 };
      if (category) params['category']  = category;
      if (vehicle)  params['vehicle_id'] = vehicle;
      if (dateFrom) params['date_from']  = dateFrom;
      if (dateTo)   params['date_to']    = dateTo;
      if (search)   params['search']     = search;

      const data = await expenseApi.list(params);
      setExpenses(data.expenses);
      setTotal(data.total);
      setPages(data.pages);
      setRunningTotal(data.running_total);
    } catch { flash('Failed to load expenses'); }
    setLoading(false);
  }, [page, category, vehicle, dateFrom, dateTo, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    expenseApi.getCategoryTotals(dateFrom || undefined, dateTo || undefined)
      .then(r => setCatTotals(r.by_category))
      .catch(() => {});
  }, [dateFrom, dateTo]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await expenseApi.delete(id);
      flash('Expense deleted');
      load();
    } catch { flash('Failed to delete'); }
  };

  const inp = { background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '8px 12px', color: t.text, fontSize: 13 };
  const th  = { padding: '10px 14px', fontSize: 11, fontWeight: 700 as const, color: t.muted, textTransform: 'uppercase' as const, letterSpacing: '.06em', textAlign: 'left' as const, borderBottom: `1px solid ${t.border}` };

  return (
    <AdminShell activeKey="expenses">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: t.text, margin: 0 }}>🧾 Expenses</h1>
            <p style={{ color: t.muted, fontSize: 13, margin: '4px 0 0' }}>{total} total records</p>
          </div>
          <Link href="/admin/expenses/new" style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            + Add Expense
          </Link>
        </div>

        {/* Flash */}
        {msg && <div style={{ background: '#16a34a22', border: '1px solid #16a34a44', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#16a34a', fontSize: 13 }}>{msg}</div>}

        {/* Category totals strip */}
        {Object.keys(catTotals).length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            {Object.entries(catTotals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <button key={cat} onClick={() => { setCategory(cat === category ? '' : cat); setPage(1); }}
                style={{ background: cat === category ? `${CATEGORY_COLORS[cat]}33` : t.card, border: `1px solid ${cat === category ? CATEGORY_COLORS[cat] : t.border}`, borderRadius: 20, padding: '5px 14px', cursor: 'pointer', transition: 'all .15s' }}>
                <span style={{ color: CATEGORY_COLORS[cat] ?? t.muted, fontWeight: 700, fontSize: 11, textTransform: 'capitalize' }}>{CATEGORY_LABELS[cat] ?? cat}</span>
                <span style={{ color: t.text, fontWeight: 800, fontSize: 12, marginLeft: 8 }}>LKR {amt.toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, color: t.muted, fontWeight: 700, display: 'block', marginBottom: 4 }}>SEARCH</label>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Description or ref..." style={{ ...inp, width: 200 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: t.muted, fontWeight: 700, display: 'block', marginBottom: 4 }}>CATEGORY</label>
            <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} style={{ ...inp, cursor: 'pointer' }}>
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: t.muted, fontWeight: 700, display: 'block', marginBottom: 4 }}>FROM</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: t.muted, fontWeight: 700, display: 'block', marginBottom: 4 }}>TO</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} style={inp} />
          </div>
          {(category || dateFrom || dateTo || search) && (
            <button onClick={() => { setCategory(''); setDateFrom(''); setDateTo(''); setSearch(''); setVehicle(''); setPage(1); }}
              style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, padding: '8px 14px', color: t.muted, cursor: 'pointer', fontSize: 12 }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Category</th>
                <th style={th}>Description</th>
                <th style={th}>Vehicle</th>
                <th style={th}>Reference</th>
                <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                <th style={th}>Added By</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: t.muted }}>Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: t.muted }}>No expenses found</td></tr>
              ) : expenses.map((e, i) => (
                <tr key={e.id} style={{ borderTop: `1px solid ${t.border}`, background: i % 2 === 1 ? `${t.border}22` : 'transparent' }}>
                  <td style={{ padding: '12px 14px', color: t.muted, fontSize: 13, whiteSpace: 'nowrap' }}>{formatDate(e.expense_date)}</td>
                  <td style={{ padding: '12px 14px' }}><CategoryBadge cat={e.category} /></td>
                  <td style={{ padding: '12px 14px', color: t.text, fontSize: 13, maxWidth: 240 }}>
                    <div style={{ fontWeight: 600 }}>{e.description}</div>
                    {e.notes && <div style={{ color: t.muted, fontSize: 11, marginTop: 2 }}>{e.notes}</div>}
                  </td>
                  <td style={{ padding: '12px 14px', color: t.muted, fontSize: 12 }}>
                    {(e.vehicle as any) ? (
                      <Link href={`/admin/inventory/${(e.vehicle as any).id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontSize: 12 }}>
                        {(e.vehicle as any).make} {(e.vehicle as any).model} {(e.vehicle as any).year}<br />
                        <span style={{ opacity: 0.7 }}>{(e.vehicle as any).stock_id}</span>
                      </Link>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: t.muted, fontSize: 12 }}>{e.reference ?? '—'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#ef4444', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {formatCurrency(e.amount)}
                  </td>
                  <td style={{ padding: '12px 14px', color: t.muted, fontSize: 12 }}>{(e.created_by_emp as any)?.full_name ?? '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href={`/admin/expenses/${e.id}/edit`} style={{ color: '#60a5fa', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>Edit</Link>
                      {isAdmin && (
                        <button onClick={() => handleDelete(e.id)} style={{ color: '#ef4444', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Running total row */}
          {expenses.length > 0 && (
            <div style={{ borderTop: `2px solid ${t.border}`, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: t.muted, fontSize: 13 }}>
                {(category || dateFrom || dateTo) ? 'Filtered total' : 'Grand total'} · {total} records
              </span>
              <span style={{ fontWeight: 900, fontSize: 18, color: '#ef4444', fontFamily: 'monospace' }}>
                {formatCurrency(runningTotal)}
              </span>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '8px 18px', borderRadius: 8, background: t.card, border: `1px solid ${t.border}`, color: page === 1 ? t.muted : t.text, cursor: page === 1 ? 'default' : 'pointer' }}>
              ← Prev
            </button>
            <span style={{ color: t.muted, fontSize: 13, display: 'flex', alignItems: 'center' }}>Page {page} of {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              style={{ padding: '8px 18px', borderRadius: 8, background: t.card, border: `1px solid ${t.border}`, color: page === pages ? t.muted : t.text, cursor: page === pages ? 'default' : 'pointer' }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
