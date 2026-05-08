'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { trashApi, employeeApi, type TrashRecord } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';

// ── Helpers ───────────────────────────────────────────────────────
function formatDateTime(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TABLE_CONFIG: Record<string, {
  label:     string;
  icon:      string;
  color:     string;
  nameField: string;
  detailUrl: (id: string) => string;
}> = {
  vehicles:  { label: 'Vehicle',  icon: '🚗', color: '#0ea5e9', nameField: 'stock_id',     detailUrl: id => `/admin/inventory/${id}` },
  customers: { label: 'Customer', icon: '👤', color: '#8b5cf6', nameField: 'full_name',     detailUrl: id => `/admin/customers/${id}` },
  leads:     { label: 'Lead',     icon: '📋', color: '#10b981', nameField: 'customer_name', detailUrl: id => `/admin/crm/${id}` },
  deals:     { label: 'Deal',     icon: '🤝', color: '#f59e0b', nameField: 'deal_code',     detailUrl: id => `/admin/deals/${id}` },
  expenses:  { label: 'Expense',  icon: '💳', color: '#ef4444', nameField: 'description',   detailUrl: id => `/admin/expenses/${id}/edit` },
};

const TABS = ['all', 'vehicles', 'customers', 'leads', 'deals', 'expenses'] as const;
type Tab = typeof TABS[number];

function getRecordName(type: string, record: TrashRecord): string {
  const field = TABLE_CONFIG[type]?.nameField ?? 'id';
  return record[field] ?? `#${record.id?.slice(0, 8)}`;
}

function getRecordSubtitle(type: string, record: TrashRecord): string {
  if (type === 'vehicles')  return `${record.year ?? ''} ${record.make ?? ''} ${record.model ?? ''}`.trim();
  if (type === 'customers') return record.phone_primary ?? '';
  if (type === 'leads')     return `${record.source ?? ''} · ${record.status ?? ''}`;
  if (type === 'deals')     return record.selling_price ? `usd ${Number(record.selling_price).toLocaleString()}` : '';
  if (type === 'expenses')  return `${record.category ?? ''} · ${record.amount ? `usd ${Number(record.amount).toLocaleString()}` : ''}`;
  return '';
}

// ── Main Page ─────────────────────────────────────────────────────
export default function TrashPage() {
  const { isDark } = useTheme();
  const { isAdmin, isLoading: authLoading } = useAuth();

  const [data,    setData]    = useState<Record<string, TrashRecord[]>>({});
  const [empMap,  setEmpMap]  = useState<Record<string, string>>({});  // id → full_name
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState<Tab>('all');
  const [acting,  setActing]  = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ type: string; id: string; name: string } | null>(null);
  const [toast,   setToast]   = useState('');

  const c = {
    bg:       isDark ? '#141c2e' : '#dde6f0',
    card:     isDark ? '#1c2538' : '#eaf2fb',
    border:   isDark ? '#263550' : '#aec2d6',
    text:     isDark ? '#e8f0fc' : '#0f1e32',
    muted:    isDark ? '#5a7295' : '#4a6278',
    rowHov:   isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    tabAct:   isDark ? '#263550' : '#cddaed',
    thead:    isDark ? '#111827' : '#d4e4f4',
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [trashResult, empResult] = await Promise.all([
        trashApi.list(),
        employeeApi.list({ limit: 200 }),
      ]);
      setData(trashResult);
      const map: Record<string, string> = {};
      for (const emp of empResult.employees) map[emp.id] = emp.full_name;
      setEmpMap(map);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load trash');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  }

  async function handleRestore(type: string, id: string, name: string) {
    setActing(`restore-${id}`);
    try {
      await trashApi.restore(type, id);
      showToast(`✅ "${name}" restored successfully`);
      fetchData();
    } catch (e: any) {
      showToast(`❌ Restore failed: ${e.message}`);
    } finally {
      setActing(null);
    }
  }

  async function handlePermDelete(type: string, id: string) {
    setConfirm(null);
    setActing(`delete-${id}`);
    try {
      await trashApi.permanentDelete(type, id);
      showToast('🗑️ Permanently deleted');
      fetchData();
    } catch (e: any) {
      showToast(`❌ Delete failed: ${e.message}`);
    } finally {
      setActing(null);
    }
  }

  const types = tab === 'all' ? Object.keys(TABLE_CONFIG) : [tab];
  const rows: { type: string; record: TrashRecord }[] = [];
  for (const type of types) {
    for (const record of data[type] ?? []) rows.push({ type, record });
  }
  rows.sort((a, b) => new Date(b.record.deleted_at).getTime() - new Date(a.record.deleted_at).getTime());

  const counts     = Object.fromEntries(Object.keys(TABLE_CONFIG).map(t => [t, (data[t] ?? []).length]));
  const totalCount = Object.values(counts).reduce((s, n) => s + n, 0);

  if (authLoading) {
    return <AdminShell><div style={{ padding: 40, textAlign: 'center', color: '#6366f1' }}>Loading…</div></AdminShell>;
  }

  return (
    <AdminShell>
      <div style={{ padding: '24px 28px', maxWidth: 1300, margin: '0 auto' }}>

        {/* ── Header ───────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, margin: 0 }}>🗑️ Trash</h1>
          <p style={{ fontSize: 13, color: c.muted, margin: '4px 0 0' }}>
            Soft-deleted records · {totalCount} item{totalCount !== 1 ? 's' : ''} awaiting review
          </p>
        </div>

        {/* ── Tabs ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
          {TABS.map(t => {
            const count  = t === 'all' ? totalCount : (counts[t] ?? 0);
            const cfg    = t === 'all' ? null : TABLE_CONFIG[t];
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
                borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12,
                fontWeight: active ? 700 : 500,
                background: active ? c.tabAct : 'transparent',
                color: active ? (cfg?.color ?? '#6366f1') : c.muted,
                transition: 'all 0.15s',
              }}>
                {cfg?.icon ?? '📦'} {t === 'all' ? 'All' : cfg?.label + 's'}
                {count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, borderRadius: 10, padding: '1px 6px',
                    background: active ? `${cfg?.color ?? '#6366f1'}22` : c.border,
                    color: active ? (cfg?.color ?? '#6366f1') : c.muted,
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Error ────────────────────────────────────────── */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#ef444422', border: '1px solid #ef444444', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Loading / Empty ──────────────────────────────── */}
        {loading && (
          <div style={{ padding: 56, textAlign: 'center', background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, color: c.muted }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>Loading trash…
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', background: c.card, border: `1px solid ${c.border}`, borderRadius: 12 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Trash is empty</div>
            <div style={{ fontSize: 13, color: c.muted, marginTop: 6 }}>No soft-deleted records in this category.</div>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────── */}
        {!loading && rows.length > 0 && (
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>

            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 220px 200px', background: c.thead, borderBottom: `1px solid ${c.border}`, padding: '0 16px' }}>
              {['Type', 'Record', 'Deleted By / When', 'Actions'].map(h => (
                <div key={h} style={{ padding: '11px 8px', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {h}
                </div>
              ))}
            </div>

            {rows.map(({ type, record }) => {
              const cfg             = TABLE_CONFIG[type]!;
              const name            = getRecordName(type, record);
              const subtitle        = getRecordSubtitle(type, record);
              const deletedByName   = record.deleted_by
                ? (empMap[record.deleted_by] ?? `ID …${record.deleted_by.slice(-6)}`)
                : 'Unknown';
              const isActingRestore = acting === `restore-${record.id}`;
              const isActingDelete  = acting === `delete-${record.id}`;

              return (
                <div
                  key={`${type}-${record.id}`}
                  style={{ display: 'grid', gridTemplateColumns: '120px 1fr 220px 200px', padding: '0 16px', borderBottom: `1px solid ${c.border}`, transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = c.rowHov}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  {/* ── Type ── */}
                  <div style={{ padding: '15px 8px', display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
                      padding: '4px 9px', borderRadius: 10,
                      background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}33`,
                    }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  {/* ── Record info + View Details btn ── */}
                  <div style={{ padding: '15px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </div>
                      {subtitle && (
                        <div style={{ fontSize: 11, color: c.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {subtitle}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: c.muted, marginTop: 3, fontFamily: 'monospace', opacity: 0.6 }}>
                        {record.id}
                      </div>
                    </div>

                    {/* View Details */}
                    <Link
                      href={cfg.detailUrl(record.id)}
                      style={{
                        flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 11px', borderRadius: 7, textDecoration: 'none',
                        fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                        color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}33`,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${cfg.color}30`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${cfg.color}18`; }}
                    >
                      View →
                    </Link>
                  </div>

                  {/* ── Deleted by / when ── */}
                  <div style={{ padding: '15px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        background: `${cfg.color}22`, border: `1px solid ${cfg.color}33`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                      }}>👤</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deletedByName}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: c.muted, paddingLeft: 30 }}>
                      {record.deleted_at ? formatDateTime(record.deleted_at) : '—'}
                    </div>
                  </div>

                  {/* ── Actions ── */}
                  <div style={{ padding: '15px 8px', display: 'flex', alignItems: 'center', gap: 7 }}>
                    {/* Restore */}
                    <button
                      disabled={!!acting}
                      onClick={() => handleRestore(type, record.id, name)}
                      style={{
                        padding: '6px 13px', borderRadius: 7, whiteSpace: 'nowrap',
                        border: '1px solid #10b98144', background: '#10b98118', color: '#10b981',
                        fontSize: 11, fontWeight: 700,
                        cursor: acting ? 'not-allowed' : 'pointer',
                        opacity: acting ? 0.6 : 1, transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!acting) (e.currentTarget as HTMLButtonElement).style.background = '#10b98130'; }}
                      onMouseLeave={e => { if (!acting) (e.currentTarget as HTMLButtonElement).style.background = '#10b98118'; }}
                    >
                      {isActingRestore ? '…' : '↩ Restore'}
                    </button>

                    {/* Permanent Delete — admin only */}
                    {isAdmin && (
                      <button
                        disabled={!!acting}
                        onClick={() => setConfirm({ type, id: record.id, name })}
                        style={{
                          padding: '6px 13px', borderRadius: 7, whiteSpace: 'nowrap',
                          border: '1px solid #ef444444', background: '#ef444418', color: '#ef4444',
                          fontSize: 11, fontWeight: 700,
                          cursor: acting ? 'not-allowed' : 'pointer',
                          opacity: acting ? 0.6 : 1, transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!acting) (e.currentTarget as HTMLButtonElement).style.background = '#ef444430'; }}
                        onMouseLeave={e => { if (!acting) (e.currentTarget as HTMLButtonElement).style.background = '#ef444418'; }}
                      >
                        {isActingDelete ? '…' : '✕ Delete'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Confirm Dialog ───────────────────────────────── */}
        {confirm && (
          <>
            <div
              onClick={() => setConfirm(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 800, backdropFilter: 'blur(2px)' }}
            />
            <div style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              background: c.card, border: `1px solid ${c.border}`, borderRadius: 16,
              padding: '32px 28px', zIndex: 900, minWidth: 380,
              boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
            }}>
              <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 14 }}>⚠️</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: c.text, textAlign: 'center', marginBottom: 10 }}>
                Permanently Delete?
              </div>
              <div style={{ fontSize: 13, color: c.muted, textAlign: 'center', lineHeight: 1.7, marginBottom: 28 }}>
                <strong style={{ color: c.text }}>&ldquo;{confirm.name}&rdquo;</strong> will be permanently marked as deleted and cannot be restored.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={() => setConfirm(null)}
                  style={{ padding: '9px 22px', borderRadius: 9, border: `1px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePermDelete(confirm.type, confirm.id)}
                  style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(239,68,68,0.4)' }}
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Toast ────────────────────────────────────────── */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
            background: isDark ? '#1c2538' : '#fff', border: `1px solid ${c.border}`,
            borderRadius: 10, padding: '12px 22px', fontSize: 13, fontWeight: 600, color: c.text,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 1000, whiteSpace: 'nowrap',
          }}>
            {toast}
          </div>
        )}

      </div>
    </AdminShell>
  );
}