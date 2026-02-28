'use client';
import { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { backupApi, type SystemBackup, type BackupStats } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';

// ── Helpers ────────────────────────────────────────────────────

function formatDateTime(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(ts: string | null) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const s    = Math.floor(diff / 1000);
  if (s < 60)     return `${s}s ago`;
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return formatDateTime(ts);
}

function timeUntil(ts: string) {
  const diff = new Date(ts).getTime() - Date.now();
  if (diff <= 0) return 'soon';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

function formatBytes(bytes: number | null) {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function totalRows(rowCounts: Record<string, number> | null): string {
  if (!rowCounts) return '—';
  const total = Object.values(rowCounts).reduce((a, b) => a + b, 0);
  return total.toLocaleString();
}

// ── Sub-components ──────────────────────────────────────────────

function StatusBadge({ status }: { status: SystemBackup['status'] }) {
  const cfg = {
    success: { bg: '#10b981', label: '✓ Success' },
    failed:  { bg: '#ef4444', label: '✗ Failed'  },
    running: { bg: '#f59e0b', label: '⏳ Running' },
  }[status];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      background: `${cfg.bg}20`, color: cfg.bg, border: `1px solid ${cfg.bg}35`,
    }}>{cfg.label}</span>
  );
}

function TypeBadge({ type }: { type: SystemBackup['type'] }) {
  const cfg = {
    daily:  { color: '#6366f1', label: '📅 Daily'  },
    weekly: { color: '#0ea5e9', label: '📆 Weekly' },
    manual: { color: '#a855f7', label: '🖐 Manual' },
  }[type];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>{cfg.label}</span>
  );
}

// ── Row detail drawer ──────────────────────────────────────────

function BackupDrawer({
  backup, onClose, onDownload, downloading, isAdmin, t,
}: {
  backup:      SystemBackup;
  onClose:     () => void;
  onDownload:  (id: string) => void;
  downloading: string | null;
  isAdmin:     boolean;
  t:           ReturnType<typeof useTheme>;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div
        style={{
          width: 420, height: '100%', background: t.card,
          borderLeft: `1px solid ${t.border}`,
          overflowY: 'auto', padding: '32px 28px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: t.text, fontSize: 18, fontWeight: 800, margin: 0 }}>💾 Backup Detail</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Status + Type */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <StatusBadge status={backup.status} />
          <TypeBadge   type={backup.type} />
        </div>

        {/* Main info */}
        {[
          ['Backup ID',    backup.id],
          ['Triggered by', backup.triggered_by],
          ['Started',      formatDateTime(backup.started_at)],
          ['Completed',    formatDateTime(backup.completed_at)],
          ['Duration',     formatDuration(backup.duration_ms)],
          ['File',         backup.file_name ?? '—'],
          ['File size',    formatBytes(backup.file_size_bytes)],
          ['Total rows',   totalRows(backup.row_counts)],
        ].map(([label, value]) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>
              {label}
            </div>
            <div style={{ fontSize: 13, color: t.text, wordBreak: 'break-all', fontFamily: label === 'Backup ID' || label === 'File' ? 'monospace' : undefined }}>
              {value}
            </div>
          </div>
        ))}

        {/* Error message */}
        {backup.error_message && (
          <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Error</div>
            <div style={{ fontSize: 12, color: '#ef4444' }}>{backup.error_message}</div>
          </div>
        )}

        {/* Row counts table */}
        {backup.row_counts && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Row counts
            </div>
            <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {Object.entries(backup.row_counts).map(([table, count], i) => (
                <div key={table} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 12px', fontSize: 12,
                  borderBottom: i < Object.entries(backup.row_counts!).length - 1 ? `1px solid ${t.border}` : 'none',
                }}>
                  <span style={{ color: t.muted, fontFamily: 'monospace' }}>{table}</span>
                  <span style={{ color: t.text, fontWeight: 700 }}>{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download button */}
        {backup.status === 'success' && (
          <button
            onClick={() => onDownload(backup.id)}
            disabled={downloading === backup.id}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: downloading === backup.id ? `${t.border}` : '#2563eb',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: downloading === backup.id ? 'not-allowed' : 'pointer',
              marginTop: 8,
            }}
          >
            {downloading === backup.id ? '⏳ Getting link...' : '⬇️ Download Backup'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Stat Card ───────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color, t }: {
  icon: string; label: string; value: string; sub?: string; color: string;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <div style={{
      background: t.card, border: `1px solid ${t.border}`, borderRadius: 12,
      padding: '20px 24px', flex: 1, minWidth: 160,
    }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: t.text, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: t.muted, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────

export default function BackupsPage() {
  const t            = useTheme();
  const { employee } = useAuth();
  const isAdmin      = employee?.role === 'admin';
  const canDownload  = employee?.permissions?.backup_download ?? false;

  const [backups,     setBackups]     = useState<SystemBackup[]>([]);
  const [stats,       setStats]       = useState<BackupStats | null>(null);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [triggering,  setTriggering]  = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selected,    setSelected]    = useState<SystemBackup | null>(null);
  const [flash,       setFlash]       = useState('');
  const [flashType,   setFlashType]   = useState<'ok' | 'err'>('ok');

  // Filters
  const [filterType,   setFilterType]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setFlash(msg); setFlashType(type);
    setTimeout(() => setFlash(''), 4000);
  };

  const loadStats = useCallback(async () => {
    try {
      const s = await backupApi.stats();
      setStats(s);
    } catch { /* non-fatal */ }
  }, []);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
      if (filterType)   params['type']   = filterType;
      if (filterStatus) params['status'] = filterStatus;
      const data = await backupApi.list(params);
      setBackups(data.backups);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      notify('Failed to load backups', 'err');
    }
    setLoading(false);
  }, [page, filterType, filterStatus]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadBackups(); }, [loadBackups]);

  // Poll every 10s while any backup is 'running'
  useEffect(() => {
    const hasRunning = backups.some(b => b.status === 'running');
    if (!hasRunning) return;
    const interval = setInterval(() => { loadBackups(); loadStats(); }, 10000);
    return () => clearInterval(interval);
  }, [backups, loadBackups, loadStats]);

  const handleTrigger = async () => {
    if (!confirm('Manually trigger a backup now?')) return;
    setTriggering(true);
    try {
      const result = await backupApi.trigger('manual');
      notify(result.success ? `✓ ${result.message}` : `✗ ${result.message}`, result.success ? 'ok' : 'err');
      loadBackups();
      loadStats();
    } catch (err: any) {
      notify(err.message ?? 'Trigger failed', 'err');
    }
    setTriggering(false);
  };

  const handleDownload = async (id: string) => {
    setDownloading(id);
    try {
      const { url, file_name } = await backupApi.getDownloadUrl(id);
      // Open signed URL in a new tab — browser will trigger the download
      const a = document.createElement('a');
      a.href     = url;
      a.download = file_name ?? 'backup.json.gz';
      a.target   = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      notify(`✓ Download started — ${file_name}`);
    } catch (err: any) {
      notify(err.message ?? 'Download failed', 'err');
    }
    setDownloading(null);
  };

  const handleDelete = async (id: string, fileName: string | null) => {
    if (!confirm(`Permanently delete "${fileName ?? 'this backup'}"? This cannot be undone.`)) return;
    try {
      await backupApi.delete(id);
      notify('Backup deleted');
      if (selected?.id === id) setSelected(null);
      loadBackups();
      loadStats();
    } catch (err: any) {
      notify(err.message ?? 'Delete failed', 'err');
    }
  };

  // ── Styles ──
  const inp = {
    background: t.inputBg, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '8px 12px', color: t.text, fontSize: 13,
  };
  const th = {
    padding: '10px 14px', fontSize: 11, fontWeight: 700 as const,
    color: t.muted, textTransform: 'uppercase' as const,
    letterSpacing: '.06em', textAlign: 'left' as const,
    borderBottom: `1px solid ${t.border}`,
  };
  const td = {
    padding: '12px 14px', fontSize: 13, color: t.text,
    borderBottom: `1px solid ${t.border}`,
    verticalAlign: 'middle' as const,
  };

  return (
    <AdminShell activeKey="backups">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px' }}>

        {/* Flash */}
        {flash && (
          <div style={{
            position: 'fixed', top: 20, right: 24, zIndex: 100,
            background: flashType === 'ok' ? '#10b981' : '#ef4444',
            color: '#fff', padding: '10px 20px', borderRadius: 10,
            fontWeight: 700, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>{flash}</div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: t.text, margin: 0 }}>💾 Automatic Backups</h1>
            <p style={{ color: t.muted, fontSize: 13, margin: '4px 0 0' }}>
              {total} backup{total !== 1 ? 's' : ''} recorded — daily @ 03:00 UTC, weekly @ Sunday 02:00 UTC
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleTrigger}
              disabled={triggering}
              style={{
                background: triggering ? t.border : '#2563eb',
                color: '#fff', padding: '10px 20px', borderRadius: 10,
                border: 'none', fontWeight: 700, fontSize: 14,
                cursor: triggering ? 'not-allowed' : 'pointer',
              }}
            >
              {triggering ? '⏳ Running...' : '▶ Run Backup Now'}
            </button>
          )}
        </div>

        {/* Stats row */}
        {stats && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
            <StatCard
              icon="✅" label="Last Successful Backup" t={t} color="#10b981"
              value={stats.last_success ? timeAgo(stats.last_success.started_at) : 'Never'}
              sub={stats.last_success ? formatDateTime(stats.last_success.started_at) : undefined}
            />
            <StatCard
              icon="📊" label="Success Rate" t={t} color="#6366f1"
              value={`${stats.success_rate}%`}
              sub={`${stats.successful_backups} of ${stats.total_backups} succeeded`}
            />
            <StatCard
              icon="📅" label="Next Daily Backup" t={t} color="#0ea5e9"
              value={timeUntil(stats.next_daily_at)}
              sub={formatDateTime(stats.next_daily_at)}
            />
            <StatCard
              icon="📆" label="Next Weekly Backup" t={t} color="#a855f7"
              value={timeUntil(stats.next_weekly_at)}
              sub={formatDateTime(stats.next_weekly_at)}
            />
            {stats.failed_backups > 0 && (
              <StatCard
                icon="⚠️" label="Failed Backups" t={t} color="#ef4444"
                value={String(stats.failed_backups)}
                sub={stats.last_failure ? `Last: ${timeAgo(stats.last_failure.started_at)}` : undefined}
              />
            )}
          </div>
        )}

        {/* Last failure alert */}
        {stats?.last_failure && stats.last_failure.started_at > (stats.last_success?.started_at ?? '') && (
          <div style={{
            background: '#ef444410', border: '1px solid #ef444430', borderRadius: 10,
            padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>Last backup FAILED</div>
              <div style={{ color: t.muted, fontSize: 13, marginTop: 2 }}>
                {formatDateTime(stats.last_failure.started_at)} — {stats.last_failure.error_message ?? 'Unknown error'}
              </div>
            </div>
            <button
              onClick={() => setSelected(stats.last_failure!)}
              style={{ marginLeft: 'auto', background: 'none', border: `1px solid #ef444450`, color: '#ef4444', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >
              View Details
            </button>
          </div>
        )}

        {/* Filters */}
        <div style={{
          background: t.card, border: `1px solid ${t.border}`, borderRadius: 12,
          padding: '16px 20px', marginBottom: 20,
          display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Filter:</span>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} style={{ ...inp, minWidth: 130 }}>
            <option value="">All types</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="manual">Manual</option>
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ ...inp, minWidth: 140 }}>
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>
          {(filterType || filterStatus) && (
            <button
              onClick={() => { setFilterType(''); setFilterStatus(''); setPage(1); }}
              style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 8, padding: '7px 14px', color: t.muted, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >
              Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: t.muted }}>{total} result{total !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Status</th>
                <th style={th}>Type</th>
                <th style={th}>Started</th>
                <th style={th}>Duration</th>
                <th style={th}>File size</th>
                <th style={th}>Total rows</th>
                <th style={th}>Triggered by</th>
                <th style={{ ...th, textAlign: 'right' as const }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ ...td, textAlign: 'center', padding: '40px', color: t.muted }}>
                    Loading backups...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...td, textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>💾</div>
                    <div style={{ color: t.muted, fontWeight: 600 }}>No backups found</div>
                    <div style={{ color: t.muted, fontSize: 12, marginTop: 6 }}>
                      {isAdmin ? 'Click "Run Backup Now" to create the first backup.' : 'Backups run automatically every night at 03:00 UTC.'}
                    </div>
                  </td>
                </tr>
              ) : backups.map(backup => (
                <tr
                  key={backup.id}
                  style={{ cursor: 'pointer', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${t.border}30`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => setSelected(backup)}
                >
                  <td style={td}><StatusBadge status={backup.status} /></td>
                  <td style={td}><TypeBadge type={backup.type} /></td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{formatDateTime(backup.started_at)}</div>
                    <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{timeAgo(backup.started_at)}</div>
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{formatDuration(backup.duration_ms)}</td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{formatBytes(backup.file_size_bytes)}</td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{totalRows(backup.row_counts)}</td>
                  <td style={{ ...td, color: t.muted }}>{backup.triggered_by}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                      {backup.status === 'success' && canDownload && (
                        <button
                          onClick={() => handleDownload(backup.id)}
                          disabled={downloading === backup.id}
                          title="Download"
                          style={{
                            background: '#2563eb20', border: '1px solid #2563eb40', color: '#2563eb',
                            borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          }}
                        >
                          {downloading === backup.id ? '⏳' : '⬇️'}
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(backup.id, backup.file_name)}
                          title="Delete"
                          style={{
                            background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444',
                            borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ background: t.card, border: `1px solid ${t.border}`, color: t.text, padding: '7px 14px', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 700 }}
            >←</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
              <button
                key={p} onClick={() => setPage(p)}
                style={{
                  background: p === page ? '#2563eb' : t.card,
                  border: `1px solid ${p === page ? '#2563eb' : t.border}`,
                  color: p === page ? '#fff' : t.text,
                  padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, minWidth: 38,
                }}
              >{p}</button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              style={{ background: t.card, border: `1px solid ${t.border}`, color: t.text, padding: '7px 14px', borderRadius: 8, cursor: page === pages ? 'not-allowed' : 'pointer', fontWeight: 700 }}
            >→</button>
          </div>
        )}

        {/* Info box */}
        <div style={{
          background: t.card, border: `1px solid ${t.border}`, borderRadius: 10,
          padding: '16px 20px', marginTop: 24, fontSize: 13, color: t.muted,
        }}>
          <div style={{ fontWeight: 700, color: t.text, marginBottom: 8 }}>ℹ️ How backups work</div>
          <p style={{ margin: '0 0 6px' }}>
            <strong style={{ color: t.text }}>Daily backups</strong> run every night at 03:00 UTC and are kept for 30 days.
            {' '}<strong style={{ color: t.text }}>Weekly backups</strong> run every Sunday at 02:00 UTC and are kept for 12 weeks.
          </p>
          <p style={{ margin: '0 0 6px' }}>
            Each backup exports all tables (vehicles, customers, leads, deals, payments, employees, expenses, commissions) 
            into a single compressed JSON file stored in Supabase Storage.
          </p>
          <p style={{ margin: 0 }}>
            Download links expire after <strong style={{ color: t.text }}>5 minutes</strong> for security. 
            {isAdmin ? ' As admin, you can also trigger a manual backup at any time.' : ''}
          </p>
        </div>

      </div>

      {/* Drawer */}
      {selected && (
        <BackupDrawer
          backup={selected}
          onClose={() => setSelected(null)}
          onDownload={handleDownload}
          downloading={downloading}
          isAdmin={isAdmin}
          t={t}
        />
      )}
    </AdminShell>
  );
}