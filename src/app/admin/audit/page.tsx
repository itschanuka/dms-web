'use client';
import { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { auditApi, type AuditLog, type AuditListParams } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';

// ── Helpers ──────────────────────────────────────────────────────
function formatDateTime(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const MODULE_COLORS: Record<string, string> = {
  auth:       '#6366f1',
  inventory:  '#0ea5e9',
  crm:        '#10b981',
  sales:      '#f59e0b',
  customers:  '#8b5cf6',
  employees:  '#ec4899',
  commission: '#f97316',
  expenses:   '#ef4444',
  reports:    '#14b8a6',
  trash:      '#64748b',
  backup:     '#a855f7',
};

const ACTION_COLORS: Record<string, string> = {
  create:         '#10b981',
  update:         '#0ea5e9',
  delete:         '#ef4444',
  restore:        '#f59e0b',
  perm_delete:    '#dc2626',
  export:         '#14b8a6',
  login:          '#6366f1',
  login_fail:     '#ef4444',
  logout:         '#64748b',
  mfa_setup:      '#a855f7',
  password_change:'#f97316',
  backup_start:   '#0ea5e9',
  backup_success: '#10b981',
  backup_fail:    '#ef4444',
  backup_download:'#14b8a6',
  purge:          '#dc2626',
  mark_paid:      '#10b981',
  override:       '#f59e0b',
  blacklist:      '#ef4444',
  complete_deal:  '#10b981',
  cancel_deal:    '#ef4444',
};

const MODULES = ['auth','inventory','crm','sales','customers','employees','commission','expenses','reports','trash','backup'];
const ACTIONS = ['create','update','delete','restore','perm_delete','export','login','login_fail','logout','mfa_setup','password_change','backup_start','backup_success','backup_fail','backup_download','purge','mark_paid','override','blacklist','complete_deal','cancel_deal'];

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>{label}</span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function AuditPage() {
  const { isDark } = useTheme();
  const { can, isLoading: authLoading } = useAuth();

  const [logs,       setLogs]       = useState<AuditLog[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [verifyStatus, setVerifyStatus] = useState<{ valid: boolean; firstBrokenAt?: string } | null>(null);

  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [filters,    setFilters]    = useState<AuditListParams>({
    page: 1, limit: 50, module: '', action: '', search: '', from: '', to: '',
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  // Color tokens
  const c = {
    bg:      isDark ? '#141c2e' : '#dde6f0',
    card:    isDark ? '#1c2538' : '#eaf2fb',
    border:  isDark ? '#263550' : '#aec2d6',
    text:    isDark ? '#e8f0fc' : '#0f1e32',
    muted:   isDark ? '#5a7295' : '#4a6278',
    row:     isDark ? '#1a2235' : '#f0f6fc',
    rowHov:  isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    input:   isDark ? '#111827' : '#fff',
    inputBr: isDark ? '#263550' : '#aec2d6',
  };

  const fetchLogs = useCallback(async (params: AuditListParams) => {
    setLoading(true);
    setError('');
    try {
      const result = await auditApi.list(params);
      setLogs(result.logs);
      setPagination(result.pagination);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(filters);
  }, [filters, fetchLogs]);

  function setFilter(key: keyof AuditListParams, value: string | number) {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }

  async function handleVerify() {
    try {
      const result = await auditApi.verify();
      setVerifyStatus(result);
    } catch {
      setVerifyStatus(null);
    }
  }

  if (authLoading) return <AdminShell><div style={{ padding: 40, textAlign: 'center', color: '#6366f1' }}>Loading…</div></AdminShell>;
  if (!can('audit_view')) {
    return (
      <AdminShell>
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>Access Denied</div>
          <div style={{ color: '#64748b', marginTop: 8 }}>You don&apos;t have permission to view the audit log.</div>
        </div>
      </AdminShell>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: c.input, border: `1px solid ${c.inputBr}`, borderRadius: 8,
    color: c.text, fontSize: 12, padding: '6px 10px', outline: 'none',
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <AdminShell>
      <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── Header ───────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, margin: 0 }}>🔐 Audit Log</h1>
            <p style={{ fontSize: 13, color: c.muted, margin: '4px 0 0' }}>
              Tamper-evident record of all system activity · {pagination.total.toLocaleString()} entries
            </p>
          </div>
          <button
            onClick={handleVerify}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.card, color: c.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            🔎 Verify Integrity
          </button>
        </div>

        {/* ── Verify Banner ─────────────────────────────────── */}
        {verifyStatus && (
          <div style={{
            marginBottom: 20, padding: '12px 16px', borderRadius: 10,
            background: verifyStatus.valid ? '#10b98122' : '#ef444422',
            border: `1px solid ${verifyStatus.valid ? '#10b981' : '#ef4444'}44`,
            color: verifyStatus.valid ? '#10b981' : '#ef4444',
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {verifyStatus.valid ? '✅ Audit chain is intact — no tampering detected.' : `❌ Chain broken at: ${verifyStatus.firstBrokenAt ?? 'unknown'}`}
            <button onClick={() => setVerifyStatus(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>×</button>
          </div>
        )}

        {/* ── Filters ──────────────────────────────────────── */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            style={{ ...inputStyle, minWidth: 220, flex: 1 }}
            placeholder="🔍  Search messages, actors, entity IDs…"
            value={filters.search ?? ''}
            onChange={e => setFilter('search', e.target.value)}
          />
          <select style={selectStyle} value={filters.module ?? ''} onChange={e => setFilter('module', e.target.value)}>
            <option value="">All Modules</option>
            {MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
          <select style={selectStyle} value={filters.action ?? ''} onChange={e => setFilter('action', e.target.value)}>
            <option value="">All Actions</option>
            {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
          <input
            type="date" style={selectStyle}
            value={filters.from ?? ''}
            onChange={e => setFilter('from', e.target.value)}
            title="From date"
          />
          <input
            type="date" style={selectStyle}
            value={filters.to ?? ''}
            onChange={e => setFilter('to', e.target.value)}
            title="To date"
          />
          <select style={selectStyle} value={filters.limit ?? 50} onChange={e => setFilter('limit', Number(e.target.value))}>
            {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button
            onClick={() => setFilters({ page: 1, limit: 50, module: '', action: '', search: '', from: '', to: '' })}
            style={{ ...inputStyle, cursor: 'pointer', color: c.muted, border: `1px solid ${c.border}` }}
          >
            Clear
          </button>
        </div>

        {/* ── Error ────────────────────────────────────────── */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#ef444422', border: '1px solid #ef444444', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Table ────────────────────────────────────────── */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '190px 100px 100px 1fr 140px 90px', gap: 0, background: isDark ? '#111827' : '#d4e4f4', borderBottom: `1px solid ${c.border}`, padding: '0 16px' }}>
            {['Timestamp','Module','Action','Message / Actor','Entity','IP'].map(h => (
              <div key={h} style={{ padding: '10px 8px', fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: c.muted }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
              Loading audit logs…
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: c.muted }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              No audit entries match your filters.
            </div>
          ) : logs.map(log => {
            const isExp = expanded === log.id;
            const modColor = MODULE_COLORS[log.module] ?? '#64748b';
            const actColor = ACTION_COLORS[log.action] ?? '#64748b';
            return (
              <div key={log.id}>
                <div
                  onClick={() => setExpanded(isExp ? null : log.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '190px 100px 100px 1fr 140px 90px',
                    gap: 0, padding: '0 16px', cursor: 'pointer',
                    borderBottom: `1px solid ${c.border}`,
                    background: isExp ? (isDark ? '#1a2740' : '#e0edf8') : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isExp) (e.currentTarget as HTMLDivElement).style.background = c.rowHov; }}
                  onMouseLeave={e => { if (!isExp) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <div style={{ padding: '10px 8px', fontSize: 11, color: c.muted, fontFamily: 'monospace' }}>
                    {formatDateTime(log.timestamp)}
                  </div>
                  <div style={{ padding: '10px 8px', display: 'flex', alignItems: 'center' }}>
                    <Badge label={log.module} color={modColor} />
                  </div>
                  <div style={{ padding: '10px 8px', display: 'flex', alignItems: 'center' }}>
                    <Badge label={log.action.replace(/_/g, ' ')} color={actColor} />
                  </div>
                  <div style={{ padding: '10px 8px' }}>
                    <div style={{ fontSize: 12, color: c.text, fontWeight: 500, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.message}
                    </div>
                    {log.actor_name && (
                      <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
                        👤 {log.actor_name} · {log.actor_type}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 8px' }}>
                    {log.entity_type && (
                      <div style={{ fontSize: 11, color: c.muted }}>
                        <span style={{ fontWeight: 600, color: c.text }}>{log.entity_type}</span>
                      </div>
                    )}
                    {log.entity_id && (
                      <div style={{ fontSize: 10, color: c.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.entity_id.slice(0, 16)}…
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 8px', fontSize: 10, color: c.muted, fontFamily: 'monospace' }}>
                    {log.ip_address ?? '—'}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExp && (
                  <div style={{ padding: '16px 24px', background: isDark ? '#0f1624' : '#dae8f6', borderBottom: `1px solid ${c.border}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', marginBottom: 6 }}>Full Message</div>
                        <div style={{ fontSize: 13, color: c.text }}>{log.message}</div>
                        {log.actor_id && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 }}>Actor ID</div>
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: c.muted }}>{log.actor_id}</div>
                          </>
                        )}
                        {log.entity_id && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 }}>Entity ID</div>
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: c.muted }}>{log.entity_id}</div>
                          </>
                        )}
                      </div>
                      <div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', marginBottom: 6 }}>Metadata</div>
                            <pre style={{ fontSize: 11, color: c.muted, background: isDark ? '#111827' : '#c8d8e8', borderRadius: 6, padding: '10px 12px', overflow: 'auto', maxHeight: 160, margin: 0 }}>
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </>
                        )}
                        {(log.row_hash || log.prev_hash) && (
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', marginBottom: 4 }}>Chain Hashes</div>
                            {log.row_hash  && <div style={{ fontSize: 10, fontFamily: 'monospace', color: c.muted }}>Row:  {log.row_hash}</div>}
                            {log.prev_hash && <div style={{ fontSize: 10, fontFamily: 'monospace', color: c.muted }}>Prev: {log.prev_hash}</div>}
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

        {/* ── Pagination ───────────────────────────────────── */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => setFilter('page', pagination.page - 1)}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.card, color: c.text, cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer', opacity: pagination.page <= 1 ? 0.4 : 1, fontSize: 12 }}
            >← Prev</button>

            <span style={{ fontSize: 12, color: c.muted }}>
              Page {pagination.page} of {pagination.pages} &nbsp;·&nbsp; {pagination.total.toLocaleString()} total
            </span>

            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => setFilter('page', pagination.page + 1)}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.card, color: c.text, cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer', opacity: pagination.page >= pagination.pages ? 0.4 : 1, fontSize: 12 }}
            >Next →</button>
          </div>
        )}

      </div>
    </AdminShell>
  );
}