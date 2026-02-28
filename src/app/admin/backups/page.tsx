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
  return Object.values(rowCounts).reduce((a, b) => a + b, 0).toLocaleString();
}

// ── Badges ─────────────────────────────────────────────────────

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

function TypeBadge({ backup_type }: { backup_type: SystemBackup['backup_type'] }) {
  const cfg = {
    daily:  { color: '#6366f1', label: '📅 Daily'  },
    weekly: { color: '#0ea5e9', label: '📆 Weekly' },
    manual: { color: '#a855f7', label: '🖐 Manual' },
  }[backup_type];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>{cfg.label}</span>
  );
}

// ── Run Backup Modal ────────────────────────────────────────────

function RunBackupModal({ onConfirm, onClose, running, t }: {
  onConfirm: () => void;
  onClose:   () => void;
  running:   boolean;
  t:         ReturnType<typeof useTheme>;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={() => !running && onClose()}
    >
      <div
        style={{
          background: t.card, border: `1px solid ${t.border}`,
          borderRadius: 16, padding: '32px 36px',
          maxWidth: 440, width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          animation: 'popIn 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, marginBottom: 20,
        }}>💾</div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text, margin: '0 0 8px' }}>
          Run Manual Backup
        </h2>
        <p style={{ fontSize: 13, color: t.muted, margin: '0 0 20px', lineHeight: 1.6 }}>
          This will immediately export all database tables to a compressed backup file.
          Typically takes 5–30 seconds depending on data volume.
        </p>

        <div style={{
          background: t.bg, border: `1px solid ${t.border}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Tables included
          </div>
          <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.9 }}>
            employees · vehicles · vehicle_costs · vehicle_documents · customers
            · leads · lead_follow_ups · deals · deal_payments · deal_finance
            · deal_trade_ins · commissions · expenses
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            disabled={running}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 14,
              background: 'transparent', border: `1px solid ${t.border}`,
              color: t.muted, cursor: running ? 'not-allowed' : 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            disabled={running}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 14,
              background: running ? 'rgba(37,99,235,0.5)' : '#2563eb',
              border: 'none', color: '#fff',
              cursor: running ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {running ? (
              <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Running…</>
            ) : '▶ Start Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Drawer ──────────────────────────────────────────────

function BackupDrawer({ backup, onClose, onDownload, downloading, isAdmin, onDelete, t }: {
  backup:      SystemBackup;
  onClose:     () => void;
  onDownload:  (id: string) => void;
  downloading: string | null;
  isAdmin:     boolean;
  onDelete:    (id: string, name: string | null) => void;
  t:           ReturnType<typeof useTheme>;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 440, background: t.card, borderLeft: `1px solid ${t.border}`,
          overflowY: 'auto', padding: '32px 28px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: t.text, fontSize: 18, fontWeight: 800, margin: 0 }}>💾 Backup Detail</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, fontSize: 24, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <StatusBadge status={backup.status} />
          <TypeBadge   backup_type={backup.backup_type} />
        </div>

        {([
          ['Backup ID',    backup.id,                           true],
          ['Triggered by', backup.triggered_by,                 false],
          ['Started',      formatDateTime(backup.started_at),   false],
          ['Completed',    formatDateTime(backup.completed_at), false],
          ['Duration',     formatDuration(backup.duration_ms),  false],
          ['File',         backup.file_name ?? '—',             true],
          ['File size',    formatBytes(backup.file_size_bytes), false],
          ['Total rows',   totalRows(backup.row_counts),        false],
        ] as [string, string, boolean][]).map(([label, value, mono]) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 13, color: t.text, wordBreak: 'break-all', fontFamily: mono ? 'monospace' : undefined }}>{value}</div>
          </div>
        ))}

        {backup.error_message && (
          <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Error</div>
            <div style={{ fontSize: 12, color: '#ef4444' }}>{backup.error_message}</div>
          </div>
        )}

        {backup.row_counts && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Row counts</div>
            <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {Object.entries(backup.row_counts).map(([table, count], i, arr) => (
                <div key={table} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', fontSize: 12, borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                  <span style={{ color: t.muted, fontFamily: 'monospace' }}>{table}</span>
                  <span style={{ color: t.text, fontWeight: 700 }}>{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {backup.status === 'success' && (
          <button
            onClick={() => onDownload(backup.id)}
            disabled={downloading === backup.id}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: downloading === backup.id ? t.border : '#2563eb',
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: downloading === backup.id ? 'not-allowed' : 'pointer',
              marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {downloading === backup.id
              ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Opening…</>
              : '⬇️ Download Backup'}
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => onDelete(backup.id, backup.file_name)}
            style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'transparent', border: '1px solid #ef444440', color: '#ef4444', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            🗑️ Delete Backup
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
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: t.text, marginBottom: 4 }}>{value}</div>
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

  const [backups,      setBackups]      = useState<SystemBackup[]>([]);
  const [stats,        setStats]        = useState<BackupStats | null>(null);
  const [total,        setTotal]        = useState(0);
  const [pages,        setPages]        = useState(1);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [triggering,   setTriggering]   = useState(false);
  const [downloading,  setDownloading]  = useState<string | null>(null);
  const [selected,     setSelected]     = useState<SystemBackup | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);
  const [flash,        setFlash]        = useState('');
  const [flashType,    setFlashType]    = useState<'ok' | 'err'>('ok');
  const [filterType,   setFilterType]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setFlash(msg); setFlashType(type);
    setTimeout(() => setFlash(''), 4000);
  };

  const loadStats = useCallback(async () => {
    try { setStats(await backupApi.stats()); } catch { /* non-fatal */ }
  }, []);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
      if (filterType)   params.type   = filterType;
      if (filterStatus) params.status = filterStatus;
      const data = await backupApi.list(params);
      setBackups(data.backups);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      notify('Failed to load backups', 'err');
    }
    setLoading(false);
  }, [page, filterType, filterStatus]);

  useEffect(() => { loadStats();   }, [loadStats]);
  useEffect(() => { loadBackups(); }, [loadBackups]);

  useEffect(() => {
    const hasRunning = backups.some(b => b.status === 'running');
    if (!hasRunning) return;
    const id = setInterval(() => { loadBackups(); loadStats(); }, 10000);
    return () => clearInterval(id);
  }, [backups, loadBackups, loadStats]);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const result = await backupApi.trigger('manual');
      notify(result.success ? `✓ ${result.message}` : `✗ ${result.message}`, result.success ? 'ok' : 'err');
      setShowRunModal(false);
      loadBackups();
      loadStats();
    } catch (err: any) {
      notify(err?.message ?? 'Trigger failed', 'err');
    }
    setTriggering(false);
  };

  const handleDownload = async (id: string) => {
    setDownloading(id);
    try {
      const { url, file_name } = await backupApi.getDownloadUrl(id);
      // NOTE: `a.download` is silently ignored by browsers for cross-origin URLs (Supabase storage).
      // window.open is the correct cross-origin download method.
      window.open(url, '_blank', 'noopener,noreferrer');
      notify(`✓ Download opened — ${file_name ?? 'backup.json.gz'}`);
    } catch (err: any) {
      notify(err?.message ?? 'Download failed', 'err');
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
      notify(err?.message ?? 'Delete failed', 'err');
    }
  };

  const inp: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '8px 12px', color: t.text, fontSize: 13, outline: 'none',
  };
  const th: React.CSSProperties = {
    padding: '10px 14px', fontSize: 11, fontWeight: 700,
    color: t.muted, textTransform: 'uppercase',
    letterSpacing: '.06em', textAlign: 'left',
    borderBottom: `1px solid ${t.border}`,
    background: t.bg,
  };
  const td: React.CSSProperties = {
    padding: '12px 14px', fontSize: 13, color: t.text,
    borderBottom: `1px solid ${t.border}`,
    verticalAlign: 'middle',
  };

  return (
    <AdminShell activeKey="backups">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Toast */}
        {flash && (
          <div style={{
            position: 'fixed', top: 20, right: 24, zIndex: 300,
            background: flashType === 'ok' ? '#10b981' : '#ef4444',
            color: '#fff', padding: '10px 20px', borderRadius: 10,
            fontWeight: 700, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>{flash}</div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: t.text, margin: 0 }}>💾 Automatic Backups</h1>
            <p style={{ color: t.muted, fontSize: 13, margin: '4px 0 0' }}>
              {total} backup{total !== 1 ? 's' : ''} recorded — daily @ 03:00 UTC · weekly @ Sunday 02:00 UTC
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowRunModal(true)}
              style={{
                background: '#2563eb', color: '#fff', padding: '10px 20px',
                borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              ▶ Run Backup Now
            </button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
            <StatCard icon="✅" label="Last Successful Backup" t={t} color="#10b981"
              value={stats.last_success ? timeAgo(stats.last_success.started_at) : 'Never'}
              sub={stats.last_success ? formatDateTime(stats.last_success.started_at) : undefined}
            />
            <StatCard icon="📊" label="Success Rate" t={t} color="#6366f1"
              value={`${stats.success_rate}%`}
              sub={`${stats.successful_backups} of ${stats.total_backups} succeeded`}
            />
            <StatCard icon="📅" label="Next Daily Backup" t={t} color="#0ea5e9"
              value={timeUntil(stats.next_daily_at)}
              sub={formatDateTime(stats.next_daily_at)}
            />
            <StatCard icon="📆" label="Next Weekly Backup" t={t} color="#a855f7"
              value={timeUntil(stats.next_weekly_at)}
              sub={formatDateTime(stats.next_weekly_at)}
            />
            {stats.failed_backups > 0 && (
              <StatCard icon="⚠️" label="Failed Backups" t={t} color="#ef4444"
                value={String(stats.failed_backups)}
                sub={stats.last_failure ? `Last: ${timeAgo(stats.last_failure.started_at)}` : undefined}
              />
            )}
          </div>
        )}

        {/* Failure alert */}
        {stats?.last_failure && stats.last_failure.started_at > (stats.last_success?.started_at ?? '') && (
          <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>Last backup FAILED</div>
              <div style={{ color: t.muted, fontSize: 13, marginTop: 2 }}>
                {formatDateTime(stats.last_failure.started_at)} — {stats.last_failure.error_message ?? 'Unknown error'}
              </div>
            </div>
            <button
              onClick={() => setSelected(stats.last_failure!)}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid #ef444450', color: '#ef4444', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
            >View Details</button>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Filter:</span>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} style={inp}>
            <option value="">All types</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="manual">Manual</option>
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={inp}>
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>
          {(filterType || filterStatus) && (
            <button onClick={() => { setFilterType(''); setFilterStatus(''); setPage(1); }} style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 8, padding: '7px 14px', color: t.muted, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
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
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...td, textAlign: 'center', padding: 48, borderBottom: 'none', color: t.muted }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>Loading backups…
                </td></tr>
              ) : backups.length === 0 ? (
                <tr><td colSpan={8} style={{ ...td, textAlign: 'center', padding: 48, borderBottom: 'none' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>💾</div>
                  <div style={{ color: t.muted, fontWeight: 600 }}>No backups found</div>
                  <div style={{ color: t.muted, fontSize: 12, marginTop: 6 }}>
                    {isAdmin ? 'Click "Run Backup Now" to create the first backup.' : 'Backups run automatically every night at 03:00 UTC.'}
                  </div>
                </td></tr>
              ) : backups.map(backup => (
                <tr key={backup.id} style={{ cursor: 'pointer', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${t.border}30`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => setSelected(backup)}
                >
                  <td style={td}><StatusBadge status={backup.status} /></td>
                  <td style={td}><TypeBadge backup_type={backup.backup_type} /></td>
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
                      {backup.status === 'success' && (
                        <button onClick={() => handleDownload(backup.id)} disabled={downloading === backup.id} title="Download"
                          style={{ background: '#2563eb20', border: '1px solid #2563eb40', color: '#2563eb', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                          {downloading === backup.id ? '⏳' : '⬇️'}
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleDelete(backup.id, backup.file_name)} title="Delete"
                          style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ background: t.card, border: `1px solid ${t.border}`, color: t.text, padding: '7px 14px', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 700 }}>←</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ background: p === page ? '#2563eb' : t.card, border: `1px solid ${p === page ? '#2563eb' : t.border}`, color: p === page ? '#fff' : t.text, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, minWidth: 38 }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              style={{ background: t.card, border: `1px solid ${t.border}`, color: t.text, padding: '7px 14px', borderRadius: 8, cursor: page === pages ? 'not-allowed' : 'pointer', fontWeight: 700 }}>→</button>
          </div>
        )}

        {/* Info */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: '16px 20px', marginTop: 24, fontSize: 13, color: t.muted }}>
          <div style={{ fontWeight: 700, color: t.text, marginBottom: 8 }}>ℹ️ How backups work</div>
          <p style={{ margin: '0 0 6px' }}>
            <strong style={{ color: t.text }}>Daily backups</strong> run every night at 03:00 UTC and are kept for 30 days.{' '}
            <strong style={{ color: t.text }}>Weekly backups</strong> run every Sunday at 02:00 UTC and are kept for 12 weeks.
          </p>
          <p style={{ margin: '0 0 6px' }}>
            Each backup exports all tables into a single compressed JSON file (.json.gz) stored in Supabase Storage.
          </p>
          <p style={{ margin: 0 }}>
            Download links open in a new tab and expire after <strong style={{ color: t.text }}>5 minutes</strong>.
            {isAdmin ? ' As admin, you can trigger a manual backup at any time.' : ''}
          </p>
        </div>

      </div>

      {/* Run Backup Modal */}
      {showRunModal && (
        <RunBackupModal
          onConfirm={handleTrigger}
          onClose={() => !triggering && setShowRunModal(false)}
          running={triggering}
          t={t}
        />
      )}

      {/* Detail Drawer */}
      {selected && (
        <BackupDrawer
          backup={selected}
          onClose={() => setSelected(null)}
          onDownload={handleDownload}
          downloading={downloading}
          isAdmin={isAdmin}
          onDelete={handleDelete}
          t={t}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </AdminShell>
  );
}