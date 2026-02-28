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
      display: 'inline-block', padding: '3px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      background: `${color}20`, color, border: `1px solid ${color}35`,
    }}>{label}</span>
  );
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: `${color}25`, border: `1.5px solid ${color}40`,
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
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontSize: 11, color: c.text, lineHeight: 1.5,
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
  };

  // ── Auth guard ─────────────────────────────────────────────
  if (authLoading) {
    return (
      <AdminShell>
        <div style={{ padding: 60, textAlign: 'center', color: '#6366f1' }}>
          <div style={{ fontSize: 28 }}>⏳</div>
          <div style={{ marginTop: 12, fontSize: 13 }}>Loading…</div>
        </div>
      </AdminShell>
    );
  }

  if (!can('audit_view')) {
    return (
      <AdminShell>
        <div style={{ padding: 80, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444', marginBottom: 8 }}>Access Denied</div>
          <div style={{ color: '#64748b', fontSize: 13 }}>You don&apos;t have permission to view the audit log.</div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div style={{ padding: '24px 28px', maxWidth: 1440, margin: '0 auto' }}>

        {/* ── Header ───────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, margin: 0 }}>🔐 Audit Log</h1>
            <p style={{ fontSize: 13, color: c.muted, margin: '5px 0 0' }}>
              Tamper-evident record of all database activity
              {pagination.total > 0 && <span style={{ marginLeft: 8, fontWeight: 700, color: c.text }}>· {pagination.total.toLocaleString()} entries</span>}
            </p>
          </div>
          <button
            onClick={handleVerify}
            disabled={verifyState.loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9,
              border: `1px solid ${c.border}`, background: c.card, color: c.text,
              fontSize: 12, fontWeight: 700, cursor: verifyState.loading ? 'not-allowed' : 'pointer',
              opacity: verifyState.loading ? 0.7 : 1,
            }}
          >
            🔎 {verifyState.loading ? 'Verifying…' : 'Verify Chain Integrity'}
          </button>
        </div>

        {/* ── Verify banner ────────────────────────────────── */}
        {verifyState.result && (
          <div style={{
            marginBottom: 20, padding: '12px 16px', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 10,
            background: verifyState.result.valid ? '#10b98118' : '#ef444418',
            border: `1px solid ${verifyState.result.valid ? '#10b98140' : '#ef444440'}`,
            color: verifyState.result.valid ? '#10b981' : '#ef4444',
            fontSize: 13, fontWeight: 600,
          }}>
            {verifyState.result.valid
              ? '✅ Chain intact — no tampering detected in last 500 entries.'
              : `❌ Chain broken at entry: ${verifyState.result.firstBrokenAt ?? 'unknown'}`}
            <button onClick={() => setVerifyState({ result: null, loading: false })}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* ── Filters ──────────────────────────────────────── */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            style={{ ...inputSty, minWidth: 240, flex: 1 }}
            placeholder="🔍  Search messages, actor names…"
            value={filters.search ?? ''}
            onChange={e => setFilter('search', e.target.value)}
          />
          <select style={inputSty} value={filters.module ?? ''} onChange={e => setFilter('module', e.target.value)}>
            <option value="">All Modules</option>
            {MODULES.map(m => <option key={m} value={m}>{MODULE_CFG[m]!.icon} {MODULE_CFG[m]!.label}</option>)}
          </select>
          <select style={inputSty} value={filters.action ?? ''} onChange={e => setFilter('action', e.target.value)}>
            <option value="">All Actions</option>
            {ACTIONS.map(a => <option key={a} value={a}>{ACTION_CFG[a]!.label}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 11, color: c.muted }}>From</span>
            <input type="date" style={inputSty} value={filters.from ?? ''} onChange={e => setFilter('from', e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 11, color: c.muted }}>To</span>
            <input type="date" style={inputSty} value={filters.to ?? ''} onChange={e => setFilter('to', e.target.value)} />
          </div>
          <select style={inputSty} value={filters.limit ?? 50} onChange={e => setFilter('limit', Number(e.target.value))}>
            {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>
          <button
            onClick={() => setFilters({ page: 1, limit: filters.limit ?? 50, module: '', action: '', search: '', from: '', to: '' })}
            style={{ ...inputSty, cursor: 'pointer', color: c.muted, background: 'transparent' }}
          >✕ Clear</button>
        </div>

        {/* ── Error ────────────────────────────────────────── */}
        {error && (
          <div style={{ padding: '14px 18px', borderRadius: 10, marginBottom: 16, background: '#ef444418', border: '1px solid #ef444440', color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Failed to load audit logs</div>
              <div style={{ opacity: 0.85 }}>{error}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                Make sure <code style={{ background: '#ef444420', padding: '1px 5px', borderRadius: 4 }}>dms-api/src/routes/audit.routes.ts</code> has been replaced with the fixed version.
              </div>
            </div>
            <button onClick={() => fetchLogs(filters)}
              style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 7, border: '1px solid #ef444440', background: '#ef444418', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Retry
            </button>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────── */}
        {loading && (
          <div style={{ padding: 56, textAlign: 'center', background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, color: c.muted }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
            Loading audit logs…
          </div>
        )}

        {/* ── Empty ────────────────────────────────────────── */}
        {!loading && !error && logs.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', background: c.card, border: `1px solid ${c.border}`, borderRadius: 12 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>No audit entries found</div>
            <div style={{ fontSize: 13, color: c.muted, marginTop: 6 }}>Try adjusting your filters.</div>
          </div>
        )}

        {/* ── Log Table ────────────────────────────────────── */}
        {!loading && logs.length > 0 && (
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {/* Head */}
            <div style={{ display: 'grid', gridTemplateColumns: '180px 120px 130px 1fr 170px', background: c.thead, borderBottom: `1px solid ${c.border}`, padding: '0 16px' }}>
              {['Timestamp', 'Module', 'Action', 'What Happened', 'Who Did It'].map(h => (
                <div key={h} style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</div>
              ))}
            </div>

            {logs.map((log, i) => {
              const modCfg = MODULE_CFG[log.module]  ?? { color: '#64748b', icon: '⚙️', label: log.module };
              const actCfg = ACTION_CFG[log.action]  ?? { color: '#64748b', label: log.action };
              const isExp  = expanded === log.id;
              const isLast = i === logs.length - 1;

              return (
                <div key={log.id}>
                  <div
                    onClick={() => setExpanded(isExp ? null : log.id)}
                    style={{
                      display: 'grid', gridTemplateColumns: '180px 120px 130px 1fr 170px',
                      padding: '0 16px', cursor: 'pointer',
                      borderBottom: isLast && !isExp ? 'none' : `1px solid ${c.border}`,
                      background: isExp ? (isDark ? '#182030' : '#dbeaf8') : 'transparent',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (!isExp) (e.currentTarget as HTMLDivElement).style.background = c.rowHov; }}
                    onMouseLeave={e => { if (!isExp) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    {/* Timestamp */}
                    <div style={{ padding: '13px 8px' }}>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: c.text, fontWeight: 500 }}>{formatDateTime(log.timestamp)}</div>
                      <div style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>{timeAgo(log.timestamp)}</div>
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
                      <div style={{ fontSize: 12, fontWeight: 600, color: c.text, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {log.message}
                      </div>
                      {(log.entity_type || log.entity_id) && (
                        <div style={{ fontSize: 10, color: c.muted, marginTop: 3, fontFamily: 'monospace' }}>
                          {log.entity_type && <span style={{ color: modCfg.color, fontWeight: 600 }}>{log.entity_type}</span>}
                          {log.entity_type && log.entity_id && ' · '}
                          {log.entity_id && (log.entity_id.length > 20 ? log.entity_id.slice(0, 20) + '…' : log.entity_id)}
                        </div>
                      )}
                    </div>
                    {/* Who */}
                    <div style={{ padding: '13px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {log.actor_name ? (
                        <>
                          <Avatar name={log.actor_name} color={modCfg.color} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.actor_name}</div>
                            <div style={{ fontSize: 10, color: c.muted, textTransform: 'capitalize', marginTop: 1 }}>{log.actor_type}</div>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                            {log.actor_type === 'system' ? '⚙️' : '?'}
                          </div>
                          <span style={{ fontSize: 11, color: c.muted, textTransform: 'capitalize' }}>{log.actor_type}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExp && (
                    <div style={{ padding: '18px 24px 22px', background: c.expBg, borderBottom: isLast ? 'none' : `1px solid ${c.border}` }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>

                        {/* Event detail */}
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>Event Detail</div>
                          <DetailRow label="Full Message" value={log.message}   c={c} />
                          <DetailRow label="Timestamp"    value={formatDateTime(log.timestamp)} c={c} mono />
                          {log.ip_address && <DetailRow label="IP Address"  value={log.ip_address}  c={c} mono />}
                          {log.actor_id   && <DetailRow label="Actor ID"    value={log.actor_id}    c={c} mono truncate />}
                        </div>

                        {/* Entity */}
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>Entity</div>
                          {log.entity_type && <DetailRow label="Type"      value={log.entity_type} c={c} />}
                          {log.entity_id   && <DetailRow label="Entity ID" value={log.entity_id}   c={c} mono />}
                          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <Badge label={`${modCfg.icon} ${modCfg.label}`} color={modCfg.color} />
                            <Badge label={actCfg.label} color={actCfg.color} />
                          </div>
                        </div>

                        {/* Metadata + hashes */}
                        <div>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <>
                              <div style={{ fontSize: 10, fontWeight: 800, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>Metadata</div>
                              <pre style={{
                                fontSize: 10, color: c.muted, lineHeight: 1.6,
                                background: isDark ? '#0a1020' : '#c8dcea',
                                borderRadius: 7, padding: '10px 12px',
                                overflow: 'auto', maxHeight: 140, margin: 0,
                                border: `1px solid ${c.border}`,
                              }}>
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </>
                          )}
                          {(log.row_hash || log.prev_hash) && (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>Chain Hashes</div>
                              {log.row_hash  && <div style={{ fontSize: 9, fontFamily: 'monospace', color: c.muted, marginBottom: 3, wordBreak: 'break-all' }}>Row: {log.row_hash}</div>}
                              {log.prev_hash && <div style={{ fontSize: 9, fontFamily: 'monospace', color: c.muted, wordBreak: 'break-all' }}>Prev: {log.prev_hash}</div>}
                            </div>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => setFilter('page', pagination.page - 1)}
              style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.card, color: c.text, cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer', opacity: pagination.page <= 1 ? 0.4 : 1, fontSize: 12, fontWeight: 600 }}
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
                }}>{p}</button>
              );
            })}

            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => setFilter('page', pagination.page + 1)}
              style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.card, color: c.text, cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer', opacity: pagination.page >= pagination.pages ? 0.4 : 1, fontSize: 12, fontWeight: 600 }}
            >Next →</button>
          </div>
        )}

        {!loading && pagination.total > 0 && (
          <div style={{ textAlign: 'center', fontSize: 11, color: c.muted, marginTop: 10 }}>
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total).toLocaleString()} of {pagination.total.toLocaleString()} entries
          </div>
        )}
      </div>
    </AdminShell>
  );
}