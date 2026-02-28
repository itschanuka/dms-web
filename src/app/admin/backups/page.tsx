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
  const cfg = {
    success: { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.25)', dot: '#10b981', label: 'Success' },
    failed:  { bg: 'rgba(239,68,68,0.10)',  text: '#f87171', border: 'rgba(239,68,68,0.25)',  dot: '#ef4444', label: 'Failed'  },
    running: { bg: 'rgba(251,191,36,0.10)', text: '#fbbf24', border: 'rgba(251,191,36,0.25)', dot: '#f59e0b', label: 'Running' },
  }[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, letterSpacing: '0.02em' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
      {cfg.label}
    </span>
  );
}

function TypeBadge({ backup_type }: { backup_type: SystemBackup['backup_type'] }) {
  const cfg = {
    daily:  { bg: 'rgba(99,102,241,0.10)',  text: '#818cf8', border: 'rgba(99,102,241,0.2)',  icon: '📅', label: 'Daily'  },
    weekly: { bg: 'rgba(14,165,233,0.10)',  text: '#38bdf8', border: 'rgba(14,165,233,0.2)',  icon: '📆', label: 'Weekly' },
    manual: { bg: 'rgba(168,85,247,0.10)', text: '#c084fc', border: 'rgba(168,85,247,0.2)', icon: '⚡', label: 'Manual' },
  }[backup_type];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, letterSpacing: '0.02em' }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Centered popup modal for backup detail ──────────────────────
function BackupModal({ backup, onClose, onDownload, downloading, t }: {
  backup: SystemBackup; onClose: () => void;
  onDownload: (id: string) => void; downloading: string | null;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, rgba(18,20,32,0.98) 0%, rgba(13,14,24,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 580,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset',
          animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(99,102,241,0.1))',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              boxShadow: '0 0 20px rgba(99,102,241,0.15)',
            }}>💾</div>
            <div>
              <h2 style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Backup Details</h2>
              <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.7)', marginTop: 3, fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}>{backup.id.slice(0, 24)}…</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', color: 'rgba(148,163,184,0.7)', fontSize: 16, lineHeight: 1,
            borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(148,163,184,0.7)'; }}
          >✕</button>
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', gap: 8, padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <StatusBadge status={backup.status} />
          <TypeBadge backup_type={backup.backup_type} />
        </div>

        {/* Info grid */}
        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 28px' }}>
          {([
            ['Triggered by', backup.triggered_by,                   false],
            ['Started',      formatDateTime(backup.started_at),     false],
            ['Completed',    formatDateTime(backup.completed_at),   false],
            ['Duration',     formatDuration(backup.duration_ms),    true ],
            ['File name',    backup.file_name ?? '—',               true ],
            ['File size',    formatBytes(backup.file_size_bytes),   true ],
            ['Total rows',   totalRows(backup.row_counts),          true ],
          ] as [string, string, boolean][]).map(([label, value, mono]) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontFamily: mono ? '"JetBrains Mono", "Fira Code", monospace' : undefined, wordBreak: 'break-all', lineHeight: 1.5 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Error message */}
        {backup.error_message && (
          <div style={{ margin: '0 28px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Error Details</div>
            <div style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.6 }}>{backup.error_message}</div>
          </div>
        )}

        {/* Row counts */}
        {backup.row_counts && Object.keys(backup.row_counts).length > 0 && (
          <div style={{ margin: '0 28px 24px' }}>
            <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Row Counts by Table</div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
              {Object.entries(backup.row_counts).map(([table, count], i, arr) => (
                <div key={table} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', fontSize: 12, borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.1s' }}>
                  <span style={{ color: 'rgba(148,163,184,0.7)', fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}>{table}</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600, background: count > 0 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontFamily: '"JetBrains Mono", monospace' }}>{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
          {backup.status === 'success' && (
            <button
              onClick={() => onDownload(backup.id)}
              disabled={downloading === backup.id}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 11, border: 'none',
                background: downloading === backup.id ? 'rgba(37,99,235,0.4)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff', fontWeight: 600, fontSize: 13, cursor: downloading === backup.id ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', letterSpacing: '0.01em',
                boxShadow: downloading === backup.id ? 'none' : '0 4px 16px rgba(37,99,235,0.3)',
              }}
            >
              {downloading === backup.id ? '⏳ Downloading…' : '⬇ Download Backup'}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flex: backup.status === 'success' ? '0 0 110px' : 1,
              padding: '11px 0', borderRadius: 11,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(148,163,184,0.8)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              transition: 'all 0.15s', letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
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
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, rgba(18,20,32,0.98) 0%, rgba(13,14,24,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, width: '100%', maxWidth: 440,
          boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset',
          animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(79,70,229,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>▶</div>
            <h2 style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Run Backup Now</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: 'rgba(148,163,184,0.7)', fontSize: 16, borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '24px 28px' }}>
          <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>Select a backup type to run immediately on demand.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {([
              ['manual', '⚡', 'Manual',  'Ad-hoc snapshot for any time'],
              ['daily',  '📅', 'Daily',   'Same as nightly automated run'],
              ['weekly', '📆', 'Weekly',  'Same as Sunday automated run'],
            ] as const).map(([val, icon, label, desc]) => (
              <div
                key={val}
                onClick={() => setType(val)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${type === val ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  background: type === val ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.15s',
                  boxShadow: type === val ? '0 0 0 3px rgba(99,102,241,0.08)' : 'none',
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: type === val ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, transition: 'all 0.15s' }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: type === val ? '#a5b4fc' : '#cbd5e1', letterSpacing: '-0.01em' }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', marginTop: 2 }}>{desc}</div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${type === val ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
                  background: type === val ? '#6366f1' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', flexShrink: 0,
                }}>
                  {type === val && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 10, padding: '12px 16px', marginBottom: 22, fontSize: 12, color: 'rgba(251,191,36,0.8)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15 }}>⚠️</span>
            <span>Backup runs synchronously — may take 10–30 seconds.</span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: '12px 0', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.7)', fontWeight: 600, fontSize: 13, cursor: 'pointer', letterSpacing: '0.01em' }}
            >Cancel</button>
            <button
              onClick={() => onConfirm(type)}
              disabled={triggering}
              style={{
                flex: 2, padding: '12px 0', borderRadius: 11, border: 'none',
                background: triggering ? 'rgba(79,70,229,0.4)' : 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: '#fff', fontWeight: 600, fontSize: 13, cursor: triggering ? 'not-allowed' : 'pointer',
                boxShadow: triggering ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
                transition: 'all 0.15s', letterSpacing: '0.01em',
              }}
            >
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
    <div style={{
      background: 'linear-gradient(145deg, rgba(18,20,32,0.9), rgba(13,14,24,0.9))',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '22px 24px', flex: 1, minWidth: 160,
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}>
      <div style={{ fontSize: 22, marginBottom: 12, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 6, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export default function BackupsPage() {
  const t            = useTheme();
  const { employee } = useAuth();
  const isAdmin      = employee?.role === 'admin';
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

  // Styled select
  const selStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 9,
    padding: '8px 12px',
    color: '#cbd5e1',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  };

  const thStyle = {
    padding: '12px 16px',
    fontSize: 10,
    fontWeight: 700 as const,
    color: 'rgba(148,163,184,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: '.08em',
    textAlign: 'left' as const,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.01)',
  };

  const tdStyle = {
    padding: '14px 16px',
    fontSize: 13,
    color: '#cbd5e1',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    verticalAlign: 'middle' as const,
  };

  return (
    <AdminShell activeKey="backups">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px 80px' }}>

        {/* Toast notification */}
        {flash && (
          <div style={{
            position: 'fixed', top: 24, right: 28, zIndex: 300,
            background: flashType === 'ok'
              ? 'linear-gradient(135deg, #059669, #047857)'
              : 'linear-gradient(135deg, #dc2626, #b91c1c)',
            color: '#fff', padding: '12px 22px', borderRadius: 12, fontWeight: 600, fontSize: 13,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'modalIn 0.22s ease',
            border: `1px solid ${flashType === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            letterSpacing: '0.01em',
          }}>
            {flash}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(99,102,241,0.1))',
                border: '1px solid rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                boxShadow: '0 0 24px rgba(99,102,241,0.15)',
              }}>💾</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.03em' }}>Automatic Backups</h1>
            </div>
            <p style={{ color: 'rgba(148,163,184,0.55)', fontSize: 13, margin: 0, paddingLeft: 54 }}>
              {total} backup{total !== 1 ? 's' : ''} recorded · Daily @ 03:00 UTC · Weekly @ Sunday 02:00 UTC
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowTrigger(true)}
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: '#fff', padding: '11px 22px', borderRadius: 11, border: 'none',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                transition: 'all 0.15s', letterSpacing: '0.01em',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(99,102,241,0.5)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(99,102,241,0.35)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
            >
              <span style={{ fontSize: 14 }}>▶</span> Run Backup
            </button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
            <StatCard icon="✅" label="Last Successful" t={t} color="#34d399" value={stats.last_success ? timeAgo(stats.last_success.started_at) : 'Never'} sub={stats.last_success ? formatDateTime(stats.last_success.started_at) : undefined} />
            <StatCard icon="📊" label="Success Rate"    t={t} color="#818cf8" value={`${stats.success_rate}%`} sub={`${stats.successful_backups} of ${stats.total_backups}`} />
            <StatCard icon="📅" label="Next Daily"      t={t} color="#38bdf8" value={timeUntil(stats.next_daily_at)}  sub={formatDateTime(stats.next_daily_at)} />
            <StatCard icon="📆" label="Next Weekly"     t={t} color="#c084fc" value={timeUntil(stats.next_weekly_at)} sub={formatDateTime(stats.next_weekly_at)} />
            {stats.failed_backups > 0 && <StatCard icon="⚠️" label="Failed Backups" t={t} color="#f87171" value={String(stats.failed_backups)} sub={stats.last_failure ? `Last: ${timeAgo(stats.last_failure.started_at)}` : undefined} />}
          </div>
        )}

        {/* Last failure alert */}
        {stats?.last_failure && stats.last_failure.started_at > (stats.last_success?.started_at ?? '') && (
          <div style={{
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 14, padding: '16px 20px', marginBottom: 22,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#f87171', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>Last backup failed</div>
              <div style={{ color: 'rgba(148,163,184,0.6)', fontSize: 12, marginTop: 3 }}>{formatDateTime(stats.last_failure.started_at)} — {stats.last_failure.error_message ?? 'Unknown error'}</div>
            </div>
            <button
              onClick={() => setSelected(stats.last_failure!)}
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
            >View Details</button>
          </div>
        )}

        {/* Filters */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(18,20,32,0.8), rgba(13,14,24,0.8))',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: '14px 20px', marginBottom: 18,
          display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
          backdropFilter: 'blur(20px)',
        }}>
          <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Filter</span>
          <select value={filterType}   onChange={e => { setFilterType(e.target.value);   setPage(1); }} style={{ ...selStyle, minWidth: 130 }}>
            <option value="">All types</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="manual">Manual</option>
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ ...selStyle, minWidth: 140 }}>
            <option value="">All statuses</option><option value="success">Success</option><option value="failed">Failed</option><option value="running">Running</option>
          </select>
          {(filterType || filterStatus) && (
            <button onClick={() => { setFilterType(''); setFilterStatus(''); setPage(1); }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 14px', color: 'rgba(148,163,184,0.6)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              ✕ Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(148,163,184,0.4)', fontWeight: 500 }}>{total} result{total !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(18,20,32,0.9), rgba(13,14,24,0.9))',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(20px)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Started</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>File Size</th>
                <th style={thStyle}>Total Rows</th>
                <th style={thStyle}>Triggered By</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '52px', color: 'rgba(148,163,184,0.4)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 28, opacity: 0.5 }}>⏳</div>
                    <span style={{ fontSize: 13 }}>Loading backups…</span>
                  </div>
                </td></tr>
              ) : backups.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '56px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 38, marginBottom: 4, opacity: 0.4 }}>💾</div>
                    <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>No backups found</div>
                    <div style={{ color: 'rgba(148,163,184,0.45)', fontSize: 12 }}>{isAdmin ? 'Click "Run Backup" to create the first one.' : 'Backups run automatically at 03:00 UTC.'}</div>
                  </div>
                </td></tr>
              ) : backups.map((backup, idx) => (
                <tr
                  key={backup.id}
                  style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                  onClick={() => setSelected(backup)}
                >
                  <td style={tdStyle}><StatusBadge status={backup.status} /></td>
                  <td style={tdStyle}><TypeBadge backup_type={backup.backup_type} /></td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{formatDateTime(backup.started_at)}</div>
                    <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.45)', marginTop: 3 }}>{timeAgo(backup.started_at)}</div>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 12, color: '#94a3b8' }}>{formatDuration(backup.duration_ms)}</td>
                  <td style={{ ...tdStyle, fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 12, color: '#94a3b8' }}>{formatBytes(backup.file_size_bytes)}</td>
                  <td style={{ ...tdStyle, fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 12, color: '#94a3b8' }}>{totalRows(backup.row_counts)}</td>
                  <td style={{ ...tdStyle, color: 'rgba(148,163,184,0.55)', fontSize: 12 }}>{backup.triggered_by}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                      {backup.status === 'success' && canDownload && (
                        <button
                          onClick={() => handleDownload(backup.id)}
                          disabled={downloading === backup.id}
                          title="Download"
                          style={{
                            background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)',
                            color: '#60a5fa', borderRadius: 8, padding: '6px 12px',
                            cursor: downloading === backup.id ? 'not-allowed' : 'pointer',
                            fontSize: 12, fontWeight: 600, transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => { if (downloading !== backup.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,0.22)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,0.12)'; }}
                        >
                          {downloading === backup.id ? '⏳' : '⬇'}
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(backup.id, backup.file_name ?? null)}
                          title="Delete"
                          style={{
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171', borderRadius: 8, padding: '6px 12px',
                            cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.18)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }}
                        >
                          🗑
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
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '8px 16px', borderRadius: 9, cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, opacity: page === 1 ? 0.4 : 1 }}
            >←</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  background: p === page ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${p === page ? 'rgba(37,99,235,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: p === page ? '#fff' : '#94a3b8',
                  padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: 13, minWidth: 40,
                  boxShadow: p === page ? '0 4px 14px rgba(37,99,235,0.3)' : 'none',
                  transition: 'all 0.12s',
                }}
              >{p}</button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '8px 16px', borderRadius: 9, cursor: page === pages ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, opacity: page === pages ? 0.4 : 1 }}
            >→</button>
          </div>
        )}

        {/* Info */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 12, padding: '18px 22px', marginTop: 24, fontSize: 13,
        }}>
          <div style={{ fontWeight: 700, color: '#cbd5e1', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ fontSize: 15 }}>ℹ️</span> How backups work
          </div>
          <p style={{ margin: '0 0 6px', color: 'rgba(148,163,184,0.55)', lineHeight: 1.7 }}>
            <strong style={{ color: '#94a3b8', fontWeight: 600 }}>Daily backups</strong> run at 03:00 UTC and are retained for 30 days.{' '}
            <strong style={{ color: '#94a3b8', fontWeight: 600 }}>Weekly backups</strong> run every Sunday at 02:00 UTC and are retained for 12 weeks.
          </p>
          <p style={{ margin: 0, color: 'rgba(148,163,184,0.55)', lineHeight: 1.7 }}>
            Each backup exports all tables into a compressed JSON file stored in Supabase Storage. Download links expire after{' '}
            <strong style={{ color: '#94a3b8', fontWeight: 600 }}>5 minutes</strong>.
          </p>
        </div>
      </div>

      {showTrigger && <TriggerModal onConfirm={handleTrigger} onClose={() => !triggering && setShowTrigger(false)} triggering={triggering} t={t} />}
      {selected    && <BackupModal  backup={selected} onClose={() => setSelected(null)} onDownload={handleDownload} downloading={downloading} t={t} />}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        select option {
          background: #0f1019;
          color: #cbd5e1;
        }
      `}</style>
    </AdminShell>
  );
}