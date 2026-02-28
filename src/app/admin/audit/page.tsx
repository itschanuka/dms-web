'use client';
import { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { auditApi, type AuditLog, type AuditListParams } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';

// ── Time helpers ────────────────────────────────────────────────
function formatDateTime(ts: string) {
  try {
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return ts; }
}

function timeAgo(ts: string) {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60)    return `${s}s ago`;
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  } catch { return ''; }
}

// ── Config maps ─────────────────────────────────────────────────
const MODULE_CFG: Record<string, { color: string; icon: string; label: string }> = {
  auth:       { color: '#6366f1', icon: '🔐', label: 'Auth'       },
  inventory:  { color: '#0ea5e9', icon: '🚗', label: 'Inventory'  },
  crm:        { color: '#10b981', icon: '📋', label: 'CRM'        },
  sales:      { color: '#f59e0b', icon: '🤝', label: 'Sales'      },
  customers:  { color: '#8b5cf6', icon: '👤', label: 'Customers'  },
  employees:  { color: '#ec4899', icon: '👥', label: 'Employees'  },
  commission: { color: '#f97316', icon: '💰', label: 'Commission' },
  expenses:   { color: '#ef4444', icon: '💳', label: 'Expenses'   },
  reports:    { color: '#14b8a6', icon: '📈', label: 'Reports'    },
  trash:      { color: '#64748b', icon: '🗑️', label: 'Trash'      },
  backup:     { color: '#a855f7', icon: '💾', label: 'Backup'     },
};

const ACTION_CFG: Record<string, { color: string; label: string }> = {
  create:          { color: '#10b981', label: 'Created'         },
  update:          { color: '#0ea5e9', label: 'Updated'         },
  delete:          { color: '#ef4444', label: 'Deleted'         },
  restore:         { color: '#f59e0b', label: 'Restored'        },
  perm_delete:     { color: '#dc2626', label: 'Perm. Deleted'   },
  export:          { color: '#14b8a6', label: 'Exported'        },
  login:           { color: '#6366f1', label: 'Login'           },
  login_fail:      { color: '#ef4444', label: 'Login Failed'    },
  logout:          { color: '#64748b', label: 'Logout'          },
  mfa_setup:       { color: '#a855f7', label: 'MFA Setup'       },
  password_change: { color: '#f97316', label: 'Password Change' },
  backup_start:    { color: '#0ea5e9', label: 'Backup Start'    },
  backup_success:  { color: '#10b981', label: 'Backup OK'       },
  backup_fail:     { color: '#ef4444', label: 'Backup Failed'   },
  backup_download: { color: '#14b8a6', label: 'Backup DL'       },
  purge:           { color: '#dc2626', label: 'Purged'          },
  mark_paid:       { color: '#10b981', label: 'Marked Paid'     },
  override:        { color: '#f59e0b', label: 'Override'        },
  blacklist:       { color: '#ef4444', label: 'Blacklisted'     },
  complete_deal:   { color: '#10b981', label: 'Deal Completed'  },
  cancel_deal:     { color: '#ef4444', label: 'Deal Cancelled'  },
};

const MODULES = Object.keys(MODULE_CFG);
const ACTIONS = Object.keys(ACTION_CFG);

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 6,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      background: `${color}18`, color, border: `1px solid ${color}30`,
      letterSpacing: '0.01em',
    }}>{label}</span>
  );
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      background: `${color}22`, border: `1.5px solid ${color}45`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 800, color,
    }}>{initials || '?'}</div>
  );
}

function DetailRow({ label, value, c, mono, truncate }: {
  label: string; value: string;
  c: { text: string; muted: string };
  mono?: boolean; truncate?: boolean;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 9, color: c.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{
        fontSize: 12, color: c.text, lineHeight: 1.5,
        fontFamily: mono ? 'monospace' : undefined,
        overflow: truncate ? 'hidden' : undefined,
        textOverflow: truncate ? 'ellipsis' : undefined,
        whiteSpace: truncate ? 'nowrap' : undefined,
      }}>
        {value}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export default function AuditPage() {
  const { isDark } = useTheme();
  const { can, isLoading: authLoading } = useAuth();

  const [logs,        setLogs]        = useState<AuditLog[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [pagination,  setPagination]  = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<{
    result: { valid: boolean; firstBrokenAt?: string } | null;
    loading: boolean;
  }>({ result: null, loading: false });

  const [filters, setFilters] = useState<AuditListParams>({
    page: 1, limit: 50, module: '', action: '', search: '', from: '', to: '',
  });

  const c = {
    bg:     isDark ? '#141c2e' : '#dde6f0',
    card:   isDark ? '#1c2538' : '#eaf2fb',
    border: isDark ? '#263550' : '#aec2d6',
    text:   isDark ? '#e8f0fc' : '#0f1e32',
    muted:  isDark ? '#5a7295' : '#4a6278',
    rowHov: isDark ? 'rgba(99,130,230,0.06)' : 'rgba(0,0,50,0.03)',
    thead:  isDark ? '#0f1624' : '#d0e2f2',
    expBg:  isDark ? '#0e1520' : '#d6e8f6',
    input:  isDark ? '#111827' : '#fff',
  };

  const fetchLogs = useCallback(async (params: AuditListParams) => {
    setLoading(true);
    setError('');
    try {
      const result = await auditApi.list(params);
      setLogs(Array.isArray(result?.logs) ? result.logs : []);
      setPagination(result?.pagination ?? { page: 1, limit: 50, total: 0, pages: 1 });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) fetchLogs(filters);
  }, [filters, fetchLogs, authLoading]);

  function setFilter(key: keyof AuditListParams, value: string | number) {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }

  async function handleVerify() {
    setVerifyState({ result: null, loading: true });
    try {
      const result = await auditApi.verify();
      setVerifyState({ result, loading: false });
    } catch {
      setVerifyState({ result: null, loading: false });
    }
  }

  const inputSty: React.CSSProperties = {
    background: c.input, border: `1px solid ${c.border}`, borderRadius: 8,
    color: c.text, fontSize: 12, padding: '7px 11px', outline: 'none',
    transition: 'border-color 0.15s',
  };

  // ── Auth guard ─────────────────────────────────────────────
  if (authLoading) {
    return (
      <AdminShell>
        <div style={{ padding: 80, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>⏳</div>
          <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 600 }}>Loading…</div>
        </div>
      </AdminShell>
    );
  }

  if (!can('audit_view')) {
    return (
      <AdminShell>
        <div style={{ padding: 100, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 18 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444', marginBottom: 8 }}>Access Denied</div>
          <div style={{ color: '#64748b', fontSize: 13 }}>You don&apos;t have permission to view the audit log.</div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div style={{ padding: '28px 28px 64px', maxWidth: 1440, margin: '0 auto' }}>

        {/* ── Header ───────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🔐</span> Audit Log
            </h1>
            <p style={{ fontSize: 13, color: c.muted, margin: '5px 0 0', paddingLeft: 32 }}>
              Tamper-evident record of all database activity
              {pagination.total > 0 && (
                <span style={{ marginLeft: 8, fontWeight: 700, color: c.text }}>
                  · {pagination.total.toLocaleString()} entries
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleVerify}
            disabled={verifyState.loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10,
              border: `1px solid ${c.border}`, background: c.card, color: c.text,
              fontSize: 12, fontWeight: 700,
              cursor: verifyState.loading ? 'not-allowed' : 'pointer',
              opacity: verifyState.loading ? 0.7 : 1,
              transition: 'all 0.15s', letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { if (!verifyState.loading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = c.border; }}
          >
            <span>🔎</span>
            {verifyState.loading ? 'Verifying…' : 'Verify Chain Integrity'}
          </button>
        </div>

        {/* ── Verify banner ────────────────────────────────── */}
        {verifyState.result && (
          <div style={{
            marginBottom: 20, padding: '13px 18px', borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 12,
            background: verifyState.result.valid ? '#10b98115' : '#ef444415',
            border: `1px solid ${verifyState.result.valid ? '#10b98138' : '#ef444438'}`,
            color: verifyState.result.valid ? '#10b981' : '#ef4444',
            fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{verifyState.result.valid ? '✅' : '❌'}</span>
            <span>
              {verifyState.result.valid
                ? 'Chain intact — no tampering detected in last 500 entries.'
                : `Chain broken at entry: ${verifyState.result.firstBrokenAt ?? 'unknown'}`}
            </span>
            <button
              onClick={() => setVerifyState({ result: null, loading: false })}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 20, lineHeight: 1, opacity: 0.6, flexShrink: 0 }}
            >×</button>
          </div>
        )}

        {/* ── Filters ──────────────────────────────────────── */}
        <div style={{
          background: c.card, border: `1px solid ${c.border}`,
          borderRadius: 14, padding: '16px 18px', marginBottom: 20,
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, pointerEvents: 'none', opacity: 0.45 }}>🔍</span>
            <input
              style={{ ...inputSty, width: '100%', paddingLeft: 30, boxSizing: 'border-box' }}
              placeholder="Search messages, actor names…"
              value={filters.search ?? ''}
              onChange={e => setFilter('search', e.target.value)}
            />
          </div>

          <select style={inputSty} value={filters.module ?? ''} onChange={e => setFilter('module', e.target.value)}>
            <option value="">All Modules</option>
            {MODULES.map(m => <option key={m} value={m}>{MODULE_CFG[m]!.icon} {MODULE_CFG[m]!.label}</option>)}
          </select>

          <select style={inputSty} value={filters.action ?? ''} onChange={e => setFilter('action', e.target.value)}>
            <option value="">All Actions</option>
            {ACTIONS.map(a => <option key={a} value={a}>{ACTION_CFG[a]!.label}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: c.input, border: `1px solid ${c.border}`, borderRadius: 8, padding: '0 11px', height: 34 }}>
            <span style={{ fontSize: 11, color: c.muted, whiteSpace: 'nowrap' }}>From</span>
            <input type="date" style={{ ...inputSty, border: 'none', background: 'transparent', padding: '0', outline: 'none' }} value={filters.from ?? ''} onChange={e => setFilter('from', e.target.value)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: c.input, border: `1px solid ${c.border}`, borderRadius: 8, padding: '0 11px', height: 34 }}>
            <span style={{ fontSize: 11, color: c.muted, whiteSpace: 'nowrap' }}>To</span>
            <input type="date" style={{ ...inputSty, border: 'none', background: 'transparent', padding: '0', outline: 'none' }} value={filters.to ?? ''} onChange={e => setFilter('to', e.target.value)} />
          </div>

          <select style={inputSty} value={filters.limit ?? 50} onChange={e => setFilter('limit', Number(e.target.value))}>
            {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>

          <button
            onClick={() => setFilters({ page: 1, limit: filters.limit ?? 50, module: '', action: '', search: '', from: '', to: '' })}
            style={{ ...inputSty, cursor: 'pointer', color: c.muted, background: 'transparent', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = c.text; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = c.muted; }}
          >
            <span>✕</span> Clear
          </button>
        </div>

        {/* ── Error ────────────────────────────────────────── */}
        {error && (
          <div style={{
            padding: '14px 18px', borderRadius: 12, marginBottom: 18,
            background: '#ef444412', border: '1px solid #ef444435',
            color: '#ef4444', fontSize: 13,
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Failed to load audit logs</div>
              <div style={{ opacity: 0.85 }}>{error}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                Make sure <code style={{ background: '#ef444420', padding: '1px 5px', borderRadius: 4 }}>dms-api/src/routes/audit.routes.ts</code> has been replaced with the fixed version.
              </div>
            </div>
            <button
              onClick={() => fetchLogs(filters)}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #ef444435', background: '#ef444415', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >Retry</button>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────── */}
        {loading && (
          <div style={{ padding: 64, textAlign: 'center', background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, color: c.muted }}>
            <div style={{ fontSize: 30, marginBottom: 12, opacity: 0.4 }}>⏳</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Loading audit logs…</div>
          </div>
        )}

        {/* ── Empty ────────────────────────────────────────── */}
        {!loading && !error && logs.length === 0 && (
          <div style={{ padding: 72, textAlign: 'center', background: c.card, border: `1px solid ${c.border}`, borderRadius: 14 }}>
            <div style={{ fontSize: 42, marginBottom: 14, opacity: 0.35 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>No audit entries found</div>
            <div style={{ fontSize: 13, color: c.muted, marginTop: 6 }}>Try adjusting your filters.</div>
          </div>
        )}

        {/* ── Log Table ────────────────────────────────────── */}
        {!loading && logs.length > 0 && (
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>

            {/* Table Head */}
            <div style={{
              display: 'grid', gridTemplateColumns: '180px 120px 138px 1fr 180px',
              background: c.thead, borderBottom: `1px solid ${c.border}`,
              padding: '0 16px',
            }}>
              {['Timestamp', 'Module', 'Action', 'What Happened', 'Who Did It'].map(h => (
                <div key={h} style={{
                  padding: '11px 8px', fontSize: 10, fontWeight: 700,
                  color: c.muted, textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>{h}</div>
              ))}
            </div>

            {logs.map((log, i) => {
              const modCfg = MODULE_CFG[log.module]  ?? { color: '#64748b', icon: '⚙️', label: log.module };
              const actCfg = ACTION_CFG[log.action]  ?? { color: '#64748b', label: log.action };
              const isExp  = expanded === log.id;
              const isLast = i === logs.length - 1;

              return (
                <div key={log.id}>
                  {/* Row */}
                  <div
                    onClick={() => setExpanded(isExp ? null : log.id)}
                    style={{
                      display: 'grid', gridTemplateColumns: '180px 120px 138px 1fr 180px',
                      padding: '0 16px', cursor: 'pointer',
                      borderBottom: isLast && !isExp ? 'none' : `1px solid ${c.border}`,
                      background: isExp
                        ? (isDark ? '#182030' : '#dbeaf8')
                        : 'transparent',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (!isExp) (e.currentTarget as HTMLDivElement).style.background = c.rowHov; }}
                    onMouseLeave={e => { if (!isExp) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    {/* Timestamp */}
                    <div style={{ padding: '13px 8px' }}>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: c.text, fontWeight: 500, lineHeight: 1.4 }}>{formatDateTime(log.timestamp)}</div>
                      <div style={{ fontSize: 10, color: c.muted, marginTop: 3 }}>{timeAgo(log.timestamp)}</div>
                    </div>

                    {/* Module */}
                    <div style={{ padding: '13px 8px', display: 'flex', alignItems: 'center' }}>
                      <Badge label={`${modCfg.icon} ${modCfg.label}`} color={modCfg.color} />
                    </div>

                    {/* Action */}
                    <div style={{ padding: '13px 8px', display: 'flex', alignItems: 'center' }}>
                      <Badge label={actCfg.label} color={actCfg.color} />
                    </div>

                    {/* Message */}
                    <div style={{ padding: '13px 8px' }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: c.text, lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {log.message}
                      </div>
                      {(log.entity_type || log.entity_id) && (
                        <div style={{ fontSize: 10, color: c.muted, marginTop: 4, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {log.entity_type && (
                            <span style={{ color: modCfg.color, fontWeight: 600 }}>{log.entity_type}</span>
                          )}
                          {log.entity_type && log.entity_id && <span style={{ opacity: 0.4 }}>·</span>}
                          {log.entity_id && (log.entity_id.length > 20 ? log.entity_id.slice(0, 20) + '…' : log.entity_id)}
                        </div>
                      )}
                    </div>

                    {/* Who */}
                    <div style={{ padding: '13px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      {log.actor_name ? (
                        <>
                          <Avatar name={log.actor_name} color={modCfg.color} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.actor_name}</div>
                            <div style={{ fontSize: 10, color: c.muted, textTransform: 'capitalize', marginTop: 2 }}>{log.actor_type}</div>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: c.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                            {log.actor_type === 'system' ? '⚙️' : '?'}
                          </div>
                          <span style={{ fontSize: 11, color: c.muted, textTransform: 'capitalize' }}>{log.actor_type}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Expanded detail panel ── */}
                  {isExp && (
                    <div style={{
                      padding: '20px 24px 24px',
                      background: c.expBg,
                      borderBottom: isLast ? 'none' : `1px solid ${c.border}`,
                      borderTop: `1px solid ${c.border}`,
                    }}>
                      {/* Panel header strip */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                        <div style={{ width: 3, height: 20, borderRadius: 3, background: modCfg.color }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: modCfg.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Entry Detail</span>
                        <div style={{ flex: 1, height: 1, background: c.border, marginLeft: 4, opacity: 0.5 }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Badge label={`${modCfg.icon} ${modCfg.label}`} color={modCfg.color} />
                          <Badge label={actCfg.label} color={actCfg.color} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>

                        {/* Event Detail */}
                        <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${c.border}`, borderRadius: 10, padding: '14px 16px' }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Event Detail</div>
                          <DetailRow label="Full Message" value={log.message}              c={c} />
                          <DetailRow label="Timestamp"    value={formatDateTime(log.timestamp)} c={c} mono />
                          {log.ip_address && <DetailRow label="IP Address" value={log.ip_address} c={c} mono />}
                          {log.actor_id   && <DetailRow label="Actor ID"   value={log.actor_id}   c={c} mono truncate />}
                        </div>

                        {/* Entity */}
                        <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${c.border}`, borderRadius: 10, padding: '14px 16px' }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Entity</div>
                          {log.entity_type && <DetailRow label="Type"      value={log.entity_type} c={c} />}
                          {log.entity_id   && <DetailRow label="Entity ID" value={log.entity_id}   c={c} mono />}
                          {!log.entity_type && !log.entity_id && (
                            <div style={{ fontSize: 12, color: c.muted, opacity: 0.5, fontStyle: 'italic' }}>No entity linked</div>
                          )}
                        </div>

                        {/* Metadata + Hashes */}
                        <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${c.border}`, borderRadius: 10, padding: '14px 16px' }}>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <>
                              <div style={{ fontSize: 9, fontWeight: 800, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Metadata</div>
                              <pre style={{
                                fontSize: 10, color: c.muted, lineHeight: 1.6,
                                background: isDark ? '#0a1020' : '#c8dcea',
                                borderRadius: 7, padding: '10px 12px',
                                overflow: 'auto', maxHeight: 130, margin: '0 0 12px',
                                border: `1px solid ${c.border}`,
                              }}>
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </>
                          )}
                          {(log.row_hash || log.prev_hash) && (
                            <>
                              <div style={{ fontSize: 9, fontWeight: 800, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Chain Hashes</div>
                              <div style={{ background: isDark ? '#0a1020' : '#c8dcea', border: `1px solid ${c.border}`, borderRadius: 7, padding: '10px 12px' }}>
                                {log.row_hash  && <div style={{ fontSize: 9, fontFamily: 'monospace', color: c.muted, marginBottom: 4, wordBreak: 'break-all' }}><span style={{ color: c.text, opacity: 0.5, fontSize: 8 }}>ROW </span>{log.row_hash}</div>}
                                {log.prev_hash && <div style={{ fontSize: 9, fontFamily: 'monospace', color: c.muted, wordBreak: 'break-all' }}><span style={{ color: c.text, opacity: 0.5, fontSize: 8 }}>PRV </span>{log.prev_hash}</div>}
                              </div>
                            </>
                          )}
                          {!log.metadata && !log.row_hash && !log.prev_hash && (
                            <div style={{ fontSize: 12, color: c.muted, opacity: 0.5, fontStyle: 'italic' }}>No metadata available</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────── */}
        {!loading && pagination.pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, flexWrap: 'wrap' }}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => setFilter('page', pagination.page - 1)}
              style={{
                padding: '7px 16px', borderRadius: 8, border: `1px solid ${c.border}`,
                background: c.card, color: c.text,
                cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                opacity: pagination.page <= 1 ? 0.4 : 1,
                fontSize: 12, fontWeight: 600, transition: 'all 0.12s',
              }}
            >← Prev</button>

            {Array.from({ length: Math.min(7, pagination.pages) }, (_, i) => {
              const p = i + 1 + Math.max(0, Math.min(pagination.page - 4, pagination.pages - 7));
              return (
                <button key={p} onClick={() => setFilter('page', p)} style={{
                  width: 34, height: 34, borderRadius: 8,
                  border: `1px solid ${p === pagination.page ? '#6366f1' : c.border}`,
                  background: p === pagination.page ? '#6366f1' : 'transparent',
                  color: p === pagination.page ? '#fff' : c.muted,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  boxShadow: p === pagination.page ? '0 2px 10px rgba(99,102,241,0.3)' : 'none',
                  transition: 'all 0.12s',
                }}>{p}</button>
              );
            })}

            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => setFilter('page', pagination.page + 1)}
              style={{
                padding: '7px 16px', borderRadius: 8, border: `1px solid ${c.border}`,
                background: c.card, color: c.text,
                cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer',
                opacity: pagination.page >= pagination.pages ? 0.4 : 1,
                fontSize: 12, fontWeight: 600, transition: 'all 0.12s',
              }}
            >Next →</button>
          </div>
        )}

        {!loading && pagination.total > 0 && (
          <div style={{ textAlign: 'center', fontSize: 11, color: c.muted, marginTop: 12 }}>
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total).toLocaleString()} of {pagination.total.toLocaleString()} entries
          </div>
        )}

      </div>
    </AdminShell>
  );
}