'use client';
import { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { backupApi, type SystemBackup, type BackupStats } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';

function formatDateTime(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(ts: string | null) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
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
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
}
function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function formatDuration(ms: number | null) {
  if (!ms) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
function totalRows(rc: Record<string, number> | null) {
  if (!rc) return '—';
  return Object.values(rc).reduce((a, b) => a + b, 0).toLocaleString();
}

function StatusBadge({ status }: { status: SystemBackup['status'] }) {
  const cfg = { success: { bg: '#10b981', label: '✓ Success' }, failed: { bg: '#ef4444', label: '✗ Failed' }, running: { bg: '#f59e0b', label: '⏳ Running' } }[status];
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${cfg.bg}20`, color: cfg.bg, border: `1px solid ${cfg.bg}35` }}>{cfg.label}</span>;
}
function TypeBadge({ backup_type }: { backup_type: SystemBackup['backup_type'] }) {
  const cfg = { daily: { color: '#6366f1', label: '📅 Daily' }, weekly: { color: '#0ea5e9', label: '📆 Weekly' }, manual: { color: '#a855f7', label: '🖐 Manual' } }[backup_type];
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>{cfg.label}</span>;
}

// ── Centered popup modal for backup detail ──────────────────────
function BackupModal({ backup, onClose, onDownload, downloading, t }: {
  backup: SystemBackup; onClose: () => void;
  onDownload: (id: string) => void; downloading: string | null;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', animation: 'popIn 0.18s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 24px 16px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💾</div>
            <div>
              <h2 style={{ color: t.text, fontSize: 17, fontWeight: 800, margin: 0 }}>Backup Detail</h2>
              <div style={{ fontSize: 11, color: t.muted, marginTop: 2, fontFamily: 'monospace' }}>{backup.id.slice(0, 20)}…</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${t.border}`, cursor: 'pointer', color: t.muted, fontSize: 18, lineHeight: 1, borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 24px', borderBottom: `1px solid ${t.border}` }}>
          <StatusBadge status={backup.status} />
          <TypeBadge backup_type={backup.backup_type} />
        </div>

        {/* Info grid */}
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
          {([
            ['Triggered by', backup.triggered_by,          false],
            ['Started',      formatDateTime(backup.started_at),   false],
            ['Completed',    formatDateTime(backup.completed_at), false],
            ['Duration',     formatDuration(backup.duration_ms),  true],
            ['File name',    backup.file_name ?? '—',      true],
            ['File size',    formatBytes(backup.file_size_bytes), true],
            ['Total rows',   totalRows(backup.row_counts),  true],
          ] as [string, string, boolean][]).map(([label, value, mono]) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: t.text, fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Error message */}
        {backup.error_message && (
          <div style={{ margin: '0 24px 16px', background: '#ef444415', border: '1px solid #ef444430', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>❌ Error</div>
            <div style={{ fontSize: 13, color: '#ef4444', lineHeight: 1.5 }}>{backup.error_message}</div>
          </div>
        )}

        {/* Row counts */}
        {backup.row_counts && Object.keys(backup.row_counts).length > 0 && (
          <div style={{ margin: '0 24px 20px' }}>
            <div style={{ fontSize: 10, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Row Counts by Table</div>
            <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {Object.entries(backup.row_counts).map(([table, count], i, arr) => (
                <div key={table} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', fontSize: 12, borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                  <span style={{ color: t.muted, fontFamily: 'monospace' }}>{table}</span>
                  <span style={{ color: t.text, fontWeight: 700, background: `${count > 0 ? '#6366f1' : t.border}18`, padding: '2px 8px', borderRadius: 6, fontSize: 11 }}>{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: 10 }}>
          {backup.status === 'success' && (
            <button
              onClick={() => onDownload(backup.id)}
              disabled={downloading === backup.id}
              style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: downloading === backup.id ? t.border : '#2563eb', color: '#fff', fontWeight: 700, fontSize: 14, cursor: downloading === backup.id ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
            >
              {downloading === backup.id ? '⏳ Downloading…' : '⬇️ Download Backup'}
            </button>
          )}
          <button
            onClick={onClose}
            style={{ flex: backup.status === 'success' ? '0 0 100px' : 1, padding: '11px 0', borderRadius: 10, background: 'transparent', border: `1px solid ${t.border}`, color: t.muted, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Trigger Backup Modal ────────────────────────────────────────
function TriggerModal({ onConfirm, onClose, triggering, t }: {
  onConfirm: (type: 'manual' | 'daily' | 'weekly') => void;
  onClose: () => void; triggering: boolean; t: ReturnType<typeof useTheme>;
}) {
  const [type, setType] = useState<'manual' | 'daily' | 'weekly'>('manual');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.5)', animation: 'popIn 0.18s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 24px 16px', borderBottom: `1px solid ${t.border}` }}>
          <h2 style={{ color: t.text, fontSize: 17, fontWeight: 800, margin: 0 }}>▶ Run Backup Now</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${t.border}`, cursor: 'pointer', color: t.muted, fontSize: 18, borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <p style={{ color: t.muted, fontSize: 13, margin: '0 0 16px' }}>Choose the backup type to run immediately.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {([['manual', '🖐', 'Manual', 'Ad-hoc snapshot'], ['daily', '📅', 'Daily', 'Same as nightly automated'], ['weekly', '📆', 'Weekly', 'Same as Sunday automated']] as const).map(([val, icon, label, desc]) => (
              <div key={val} onClick={() => setType(val)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${type === val ? '#6366f1' : t.border}`, background: type === val ? 'rgba(99,102,241,0.08)' : 'transparent', transition: 'all 0.15s' }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: type === val ? '#6366f1' : t.text }}>{label}</div>
                  <div style={{ fontSize: 12, color: t.muted }}>{desc}</div>
                </div>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${type === val ? '#6366f1' : t.border}`, background: type === val ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {type === val && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#f59e0b' }}>
            ⚠️ Backup runs synchronously — may take 10–30 seconds.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 9, background: 'transparent', border: `1px solid ${t.border}`, color: t.muted, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => onConfirm(type)} disabled={triggering} style={{ flex: 2, padding: '11px 0', borderRadius: 9, background: triggering ? '#4338ca80' : '#4f46e5', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: triggering ? 'not-allowed' : 'pointer', boxShadow: triggering ? 'none' : '0 2px 12px rgba(99,102,241,0.4)' }}>
              {triggering ? '⏳ Running…' : `▶ Run ${type.charAt(0).toUpperCase() + type.slice(1)} Backup`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, t }: { icon: string; label: string; value: string; sub?: string; color: string; t: ReturnType<typeof useTheme> }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: t.text, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: t.muted, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

export default function BackupsPage() {
  const t            = useTheme();
  const { employee } = useAuth();
  const isAdmin      = employee?.role === 'admin';
  // Admins always can download; others need the explicit permission flag
  const canDownload  = isAdmin || (employee?.permissions?.backup_download ?? false);

  const [backups,     setBackups]     = useState<SystemBackup[]>([]);
  const [stats,       setStats]       = useState<BackupStats | null>(null);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [triggering,  setTriggering]  = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selected,    setSelected]    = useState<SystemBackup | null>(null);
  const [showTrigger, setShowTrigger] = useState(false);
  const [flash,       setFlash]       = useState('');
  const [flashType,   setFlashType]   = useState<'ok' | 'err'>('ok');
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
      if (filterType)   params['type']   = filterType;
      if (filterStatus) params['status'] = filterStatus;
      const data = await backupApi.list(params);
      setBackups(data.backups); setTotal(data.total); setPages(data.pages);
    } catch { notify('Failed to load backups', 'err'); }
    setLoading(false);
  }, [page, filterType, filterStatus]);

  useEffect(() => { loadStats(); },   [loadStats]);
  useEffect(() => { loadBackups(); }, [loadBackups]);

  useEffect(() => {
    if (!backups.some(b => b.status === 'running')) return;
    const iv = setInterval(() => { loadBackups(); loadStats(); }, 10000);
    return () => clearInterval(iv);
  }, [backups, loadBackups, loadStats]);

  const handleTrigger = async (type: 'manual' | 'daily' | 'weekly') => {
    setTriggering(true);
    try {
      const r = await backupApi.trigger(type);
      setShowTrigger(false);
      notify(r.success ? `✓ ${r.message}` : `✗ ${r.message}`, r.success ? 'ok' : 'err');
      loadBackups(); loadStats();
    } catch (err: any) { notify(err.message ?? 'Trigger failed', 'err'); }
    setTriggering(false);
  };

  const handleDownload = async (id: string) => {
    setDownloading(id);
    try {
      const { url, file_name } = await backupApi.getDownloadUrl(id);
      // Fetch as blob to bypass cross-origin download restriction
      const resp    = await fetch(url);
      if (!resp.ok) throw new Error(`Fetch failed: ${resp.statusText}`);
      const blob    = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a       = document.createElement('a');
      a.href = blobUrl; a.download = file_name ?? 'backup.json.gz';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(blobUrl);
      notify(`✓ Download started — ${file_name}`);
    } catch (err: any) { notify(err.message ?? 'Download failed', 'err'); }
    setDownloading(null);
  };

  const handleDelete = async (id: string, fileName: string | null) => {
    if (!confirm(`Permanently delete "${fileName ?? 'this backup'}"?`)) return;
    try {
      await backupApi.delete(id);
      notify('Backup deleted');
      if (selected?.id === id) setSelected(null);
      loadBackups(); loadStats();
    } catch (err: any) { notify(err.message ?? 'Delete failed', 'err'); }
  };

  const inp = { background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '8px 12px', color: t.text, fontSize: 13 };
  const th  = { padding: '10px 14px', fontSize: 11, fontWeight: 700 as const, color: t.muted, textTransform: 'uppercase' as const, letterSpacing: '.06em', textAlign: 'left' as const, borderBottom: `1px solid ${t.border}` };
  const td  = { padding: '12px 14px', fontSize: 13, color: t.text, borderBottom: `1px solid ${t.border}`, verticalAlign: 'middle' as const };

  return (
    <AdminShell activeKey="backups">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px' }}>

        {flash && (
          <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 300, background: flashType === 'ok' ? '#10b981' : '#ef4444', color: '#fff', padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', animation: 'popIn 0.2s ease' }}>
            {flash}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: t.text, margin: 0 }}>💾 Automatic Backups</h1>
            <p style={{ color: t.muted, fontSize: 13, margin: '4px 0 0' }}>{total} backup{total !== 1 ? 's' : ''} recorded — daily @ 03:00 UTC, weekly @ Sunday 02:00 UTC</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowTrigger(true)} style={{ background: '#4f46e5', color: '#fff', padding: '10px 20px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 12px rgba(99,102,241,0.35)' }}>
              ▶ Run Backup Now
            </button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
            <StatCard icon="✅" label="Last Successful" t={t} color="#10b981" value={stats.last_success ? timeAgo(stats.last_success.started_at) : 'Never'} sub={stats.last_success ? formatDateTime(stats.last_success.started_at) : undefined} />
            <StatCard icon="📊" label="Success Rate"    t={t} color="#6366f1" value={`${stats.success_rate}%`} sub={`${stats.successful_backups} of ${stats.total_backups}`} />
            <StatCard icon="📅" label="Next Daily"      t={t} color="#0ea5e9" value={timeUntil(stats.next_daily_at)}  sub={formatDateTime(stats.next_daily_at)} />
            <StatCard icon="📆" label="Next Weekly"     t={t} color="#a855f7" value={timeUntil(stats.next_weekly_at)} sub={formatDateTime(stats.next_weekly_at)} />
            {stats.failed_backups > 0 && <StatCard icon="⚠️" label="Failed Backups" t={t} color="#ef4444" value={String(stats.failed_backups)} sub={stats.last_failure ? `Last: ${timeAgo(stats.last_failure.started_at)}` : undefined} />}
          </div>
        )}

        {/* Last failure alert */}
        {stats?.last_failure && stats.last_failure.started_at > (stats.last_success?.started_at ?? '') && (
          <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>Last backup FAILED</div>
              <div style={{ color: t.muted, fontSize: 13, marginTop: 2 }}>{formatDateTime(stats.last_failure.started_at)} — {stats.last_failure.error_message ?? 'Unknown error'}</div>
            </div>
            <button onClick={() => setSelected(stats.last_failure!)} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #ef444450', color: '#ef4444', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>View Details</button>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Filter:</span>
          <select value={filterType}   onChange={e => { setFilterType(e.target.value);   setPage(1); }} style={{ ...inp, minWidth: 130 }}>
            <option value="">All types</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="manual">Manual</option>
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ ...inp, minWidth: 140 }}>
            <option value="">All statuses</option><option value="success">Success</option><option value="failed">Failed</option><option value="running">Running</option>
          </select>
          {(filterType || filterStatus) && (
            <button onClick={() => { setFilterType(''); setFilterStatus(''); setPage(1); }} style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 8, padding: '7px 14px', color: t.muted, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Clear</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: t.muted }}>{total} result{total !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Status</th><th style={th}>Type</th><th style={th}>Started</th>
                <th style={th}>Duration</th><th style={th}>File size</th><th style={th}>Total rows</th>
                <th style={th}>Triggered by</th><th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...td, textAlign: 'center', padding: '40px', color: t.muted }}>Loading backups…</td></tr>
              ) : backups.length === 0 ? (
                <tr><td colSpan={8} style={{ ...td, textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>💾</div>
                  <div style={{ color: t.muted, fontWeight: 600 }}>No backups found</div>
                  <div style={{ color: t.muted, fontSize: 12, marginTop: 6 }}>{isAdmin ? 'Click "Run Backup Now" to create the first one.' : 'Backups run automatically at 03:00 UTC.'}</div>
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
                      {backup.status === 'success' && canDownload && (
                        <button onClick={() => handleDownload(backup.id)} disabled={downloading === backup.id} title="Download"
                          style={{ background: '#2563eb20', border: '1px solid #2563eb40', color: '#2563eb', borderRadius: 7, padding: '5px 10px', cursor: downloading === backup.id ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700 }}>
                          {downloading === backup.id ? '⏳' : '⬇️'}
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleDelete(backup.id, backup.file_name ?? null)} title="Delete"
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: t.card, border: `1px solid ${t.border}`, color: t.text, padding: '7px 14px', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 700 }}>←</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{ background: p === page ? '#2563eb' : t.card, border: `1px solid ${p === page ? '#2563eb' : t.border}`, color: p === page ? '#fff' : t.text, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, minWidth: 38 }}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} style={{ background: t.card, border: `1px solid ${t.border}`, color: t.text, padding: '7px 14px', borderRadius: 8, cursor: page === pages ? 'not-allowed' : 'pointer', fontWeight: 700 }}>→</button>
          </div>
        )}

        {/* Info */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: '16px 20px', marginTop: 24, fontSize: 13, color: t.muted }}>
          <div style={{ fontWeight: 700, color: t.text, marginBottom: 8 }}>ℹ️ How backups work</div>
          <p style={{ margin: '0 0 6px' }}><strong style={{ color: t.text }}>Daily backups</strong> run at 03:00 UTC (kept 30 days). <strong style={{ color: t.text }}>Weekly backups</strong> run Sundays at 02:00 UTC (kept 12 weeks).</p>
          <p style={{ margin: 0 }}>Each backup exports all tables into a compressed JSON file in Supabase Storage. Download links expire after <strong style={{ color: t.text }}>5 minutes</strong>.</p>
        </div>
      </div>

      {showTrigger && <TriggerModal onConfirm={handleTrigger} onClose={() => !triggering && setShowTrigger(false)} triggering={triggering} t={t} />}
      {selected    && <BackupModal  backup={selected} onClose={() => setSelected(null)} onDownload={handleDownload} downloading={downloading} t={t} />}

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </AdminShell>
  );
}