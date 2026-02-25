'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import {
  leadApi,
  type Lead, type LeadStatus, type LeadSource, type Salesperson,
} from '@/lib/api';
import { useTheme } from '@/lib/theme';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<LeadStatus, { label: string; color: string; bg: string; border: string }> = {
  new:         { label: 'New',         color: '#818cf8', bg: 'rgba(129,140,248,0.1)',  border: 'rgba(129,140,248,0.3)'  },
  contacted:   { label: 'Contacted',   color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   border: 'rgba(56,189,248,0.3)'   },
  interested:  { label: 'Interested',  color: '#fb923c', bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.3)'   },
  test_drive:  { label: 'Test Drive',  color: '#c084fc', bg: 'rgba(192,132,252,0.1)',  border: 'rgba(192,132,252,0.3)'  },
  negotiation: { label: 'Negotiation', color: '#f472b6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.3)'  },
  won:         { label: 'Won',         color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.3)'   },
  lost:        { label: 'Lost',        color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)'  },
};

const STATUSES: LeadStatus[] = ['new','contacted','interested','test_drive','negotiation','won','lost'];

const SRC_CFG: Record<LeadSource, { label: string; icon: string }> = {
  walk_in:  { label: 'Walk-in',  icon: '🚶' },
  call:     { label: 'Call',     icon: '📞' },
  website:  { label: 'Website',  icon: '🌐' },
  facebook: { label: 'Facebook', icon: '📘' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  referral: { label: 'Referral', icon: '🤝' },
  other:    { label: 'Other',    icon: '📌' },
};

function tok(isDark: boolean) {
  return {
    page:      isDark ? '#080e1a' : '#eef2f8',
    card:      isDark ? '#0f1623' : '#ffffff',
    cardAlt:   isDark ? '#0b1220' : '#f7fafd',
    border:    isDark ? '#1c2d46' : '#d4e0ee',
    text:      isDark ? '#e4ecf9' : '#0d1e32',
    sub:       isDark ? '#c5d3e8' : '#334155',
    muted:     isDark ? '#4d6580' : '#6b829e',
    label:     isDark ? '#5a7898' : '#5a7898',
    input:     isDark ? '#070d18' : '#eef2f8',
    inputText: isDark ? '#d0dff4' : '#1a2e44',
    accent:    '#10b981',
    accentBg:  'rgba(16,185,129,0.09)',
    accentBdr: 'rgba(16,185,129,0.28)',
    danger:    '#ef4444',
    warn:      '#f59e0b',
    shadow:    isDark ? '0 4px 32px rgba(0,0,0,0.5)' : '0 2px 16px rgba(0,0,0,0.08)',
    rowHov:    isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
  };
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTimeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function isOverdue(date: string | null, status: LeadStatus) {
  if (!date || status === 'won' || status === 'lost') return false;
  return new Date(date) < new Date(new Date().toDateString());
}

function isDueToday(date: string | null, status: LeadStatus) {
  if (!date || status === 'won' || status === 'lost') return false;
  return new Date(date).toDateString() === new Date().toDateString();
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#0ea5e9','#f97316'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color + '22',
      border: `1.5px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color, flexShrink: 0 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: LeadStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
      color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: '3px 9px',
      whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub, onClick }: {
  label: string; value: number; color: string; sub?: string; onClick?: () => void;
}) {
  const isDark = useTheme().isDark;
  const t = tok(isDark);
  return (
    <div onClick={onClick}
      style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '16px 20px',
        cursor: onClick ? 'pointer' : 'default', transition: 'all 0.15s', flex: 1, minWidth: 0,
        borderLeft: `3px solid ${color}` }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}>
      <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: t.sub }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Leads Table ───────────────────────────────────────────────────────────────
function LeadsTable({ leads, salespersons, isDark }: {
  leads: Lead[]; salespersons: Salesperson[]; isDark: boolean;
}) {
  const t = tok(isDark);

  if (leads.length === 0) return (
    <div style={{ padding: '64px 32px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: t.sub, marginBottom: 6 }}>No leads found</div>
      <div style={{ fontSize: 13, color: t.muted }}>Try adjusting your filters or add a new lead.</div>
    </div>
  );

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 1fr 1.2fr 1.4fr 1.3fr',
        padding: '9px 20px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.025)',
        borderBottom: `1px solid ${t.border}`, fontSize: 10, fontWeight: 700, color: t.label,
        letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <div>Customer</div>
        <div>Vehicle Interest</div>
        <div>Source</div>
        <div>Status</div>
        <div>Follow-up</div>
        <div>Assigned</div>
      </div>

      {leads.map((lead, i) => {
        const sp = salespersons.find(s => s.id === lead.assigned_to);
        const overdue = isOverdue(lead.next_followup_date, lead.status);
        const today = isDueToday(lead.next_followup_date, lead.status);
        const fDate = fmtDate(lead.next_followup_date);

        return (
          <Link key={lead.id} href={`/admin/crm/${lead.id}`}
            style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 1fr 1.2fr 1.4fr 1.3fr',
              padding: '13px 20px', borderBottom: `1px solid ${t.border}`, textDecoration: 'none',
              transition: 'background 0.1s', alignItems: 'center',
              background: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)') }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = t.rowHov}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background =
              i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)')}>

            {/* Customer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <Avatar name={lead.customer_name} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.customer_name}
                </div>
                <div style={{ fontSize: 11, color: t.muted }}>{lead.customer_phone}</div>
              </div>
            </div>

            {/* Vehicle */}
            <div style={{ minWidth: 0, paddingRight: 8 }}>
              {lead.interested_vehicle_desc ? (
                <div style={{ fontSize: 12, color: t.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🚗 {lead.interested_vehicle_desc}
                </div>
              ) : (
                <span style={{ fontSize: 12, color: t.muted, fontStyle: 'italic' }}>Not specified</span>
              )}
            </div>

            {/* Source */}
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                color: t.muted, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${t.border}`, borderRadius: 6, padding: '2px 7px' }}>
                {SRC_CFG[lead.source]?.icon} {SRC_CFG[lead.source]?.label ?? lead.source}
              </span>
            </div>

            {/* Status */}
            <div><StatusBadge status={lead.status} /></div>

            {/* Follow-up */}
            <div>
              {fDate ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                  color: overdue ? '#ef4444' : today ? '#f59e0b' : t.muted,
                  background: overdue ? 'rgba(239,68,68,0.08)' : today ? 'rgba(245,158,11,0.08)' : 'transparent',
                  border: `1px solid ${overdue ? 'rgba(239,68,68,0.2)' : today ? 'rgba(245,158,11,0.2)' : 'transparent'}`,
                  borderRadius: 6, padding: overdue || today ? '2px 7px' : '0' }}>
                  {overdue && '⚠️ '}{today && '📅 '}{fDate}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: t.muted }}>—</span>
              )}
            </div>

            {/* Assigned */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {sp ? (
                <>
                  <Avatar name={sp.full_name} size={26} />
                  <span style={{ fontSize: 12, color: t.sub, fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sp.full_name.split(' ')[0]}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 11, color: t.muted, fontStyle: 'italic' }}>Unassigned</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Main CRM Page ──────────────────────────────────────────────────────────────
function CrmPageInner() {
  const { isDark } = useTheme();
  const t = tok(isDark);

  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [page,         setPage]         = useState(1);
  const limit = 25;

  // Filters
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<LeadStatus | ''>('');
  const [filterSource, setFilterSource] = useState<LeadSource | ''>('');
  const [filterSP,     setFilterSP]     = useState('');
  const [overdueOnly,  setOverdueOnly]  = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, overdue: 0, dueToday: 0, won: 0 });

  const totalPages = Math.ceil(totalCount / limit);

  const inputStyle: React.CSSProperties = {
    background: t.input, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: '8px 12px', fontSize: 13, color: t.inputText, outline: 'none',
    appearance: 'none' as const,
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235a7898' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30,
  };

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadApi.list({
        page, limit,
        status: filterStatus || undefined,
        source: filterSource || undefined,
        assigned_to: filterSP || undefined,
        search: search || undefined,
        overdue_only: overdueOnly || undefined,
      });
      setLeads(res.leads);
      setTotalCount(res.pagination.total ?? 0);
    } catch { setLeads([]); } finally { setLoading(false); }
  }, [page, filterStatus, filterSource, filterSP, search, overdueOnly]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  useEffect(() => {
    leadApi.getSalespersons().then(setSalespersons).catch(() => {});
    Promise.all([leadApi.list({ limit: 1 }), leadApi.getOverdue(), leadApi.getDueToday(), leadApi.list({ status: 'won', limit: 1 })])
      .then(([all, ov, dt, won]) => setStats({
        total: all.pagination.total ?? 0,
        overdue: ov.length,
        dueToday: dt.length,
        won: won.pagination.total ?? 0,
      })).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [filterStatus, filterSource, filterSP, search, overdueOnly]);

  const hasFilters = search || filterStatus || filterSource || filterSP || overdueOnly;

  return (
    <div style={{ background: t.page, minHeight: '100%', padding: '28px 32px 60px' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: t.text, margin: 0, letterSpacing: '-0.5px' }}>
            CRM Pipeline
          </h1>
          <p style={{ fontSize: 13, color: t.muted, margin: '4px 0 0' }}>
            Track leads, follow-ups and close deals.
          </p>
        </div>
        <Link href="/admin/crm/new"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: t.accent, color: '#fff',
            border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 800,
            textDecoration: 'none', boxShadow: '0 4px 14px rgba(16,185,129,0.35)', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'; }}>
          + New Lead
        </Link>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total Leads" value={stats.total} color="#818cf8" />
        <StatCard label="Overdue Follow-ups" value={stats.overdue} color="#ef4444"
          sub={stats.overdue > 0 ? 'Click to filter' : undefined}
          onClick={stats.overdue > 0 ? () => setOverdueOnly(true) : undefined} />
        <StatCard label="Due Today" value={stats.dueToday} color="#f59e0b" />
        <StatCard label="Won Deals" value={stats.won} color="#34d399" />
      </div>

      {/* ── Overdue banner ─────────────────────────────────────────────── */}
      {stats.overdue > 0 && !overdueOnly && (
        <button onClick={() => setOverdueOnly(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, padding: '12px 18px', marginBottom: 16,
            cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
              {stats.overdue} overdue follow-up{stats.overdue !== 1 ? 's' : ''} need attention
            </span>
            <span style={{ fontSize: 12, color: t.muted, marginLeft: 8 }}>Click to filter</span>
          </div>
          <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>View →</span>
        </button>
      )}

      {/* ── Main card ─────────────────────────────────────────────────── */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: t.shadow }}>

        {/* Status pills */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
          background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }}>
          {(['', ...STATUSES] as (LeadStatus | '')[]).map(s => {
            const active = filterStatus === s;
            const cfg = s ? STATUS_CFG[s] : null;
            return (
              <button key={s || 'all'} onClick={() => setFilterStatus(active ? '' : s as LeadStatus)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px',
                  borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s',
                  border: `1px solid ${active ? (cfg ? cfg.border : t.accentBdr) : t.border}`,
                  background: active ? (cfg ? cfg.bg : t.accentBg) : 'transparent',
                  color: active ? (cfg ? cfg.color : t.accent) : t.muted }}>
                {cfg && <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? cfg.color : t.muted }} />}
                {s ? STATUS_CFG[s as LeadStatus].label : 'All'}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Search */}
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, color: t.muted, pointerEvents: 'none' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, vehicle…"
              style={{ ...inputStyle, width: '100%', paddingLeft: 34, boxSizing: 'border-box' }} />
          </div>

          {/* Source */}
          <select value={filterSource} onChange={e => setFilterSource(e.target.value as LeadSource | '')}
            style={{ ...selectStyle, minWidth: 130 }}>
            <option value="">All Sources</option>
            {Object.entries(SRC_CFG).map(([v, c]) => (
              <option key={v} value={v}>{c.icon} {c.label}</option>
            ))}
          </select>

          {/* Salesperson */}
          <select value={filterSP} onChange={e => setFilterSP(e.target.value)}
            style={{ ...selectStyle, minWidth: 150 }}>
            <option value="">All Salespersons</option>
            {salespersons.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>

          {/* Overdue filter chip */}
          {overdueOnly && (
            <button onClick={() => setOverdueOnly(false)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '7px 12px',
                fontSize: 12, fontWeight: 700, color: '#ef4444', cursor: 'pointer' }}>
              ⚠️ Overdue ✕
            </button>
          )}

          {/* Clear all */}
          {hasFilters && (
            <button onClick={() => {
              setSearch(''); setFilterStatus(''); setFilterSource(''); setFilterSP(''); setOverdueOnly(false);
            }} style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 8,
              padding: '7px 12px', fontSize: 12, color: t.muted, cursor: 'pointer' }}>
              Clear all
            </button>
          )}

          {/* Count */}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: t.muted, fontWeight: 600 }}>
            {loading ? '…' : `${totalCount} lead${totalCount !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '56px 32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', gap: 6 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent,
                  animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s`, opacity: 0.6 }} />
              ))}
            </div>
            <div style={{ fontSize: 13, color: t.muted, marginTop: 12 }}>Loading leads…</div>
          </div>
        ) : (
          <LeadsTable leads={leads} salespersons={salespersons} isDark={isDark} />
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
            <div style={{ fontSize: 12, color: t.muted }}>
              Page {page} of {totalPages} · {totalCount} total
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${t.border}`, background: t.input, color: page === 1 ? t.muted : t.text,
                  cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
                ← Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: p === page ? 800 : 400,
                      border: `1px solid ${p === page ? t.accent : t.border}`,
                      background: p === page ? t.accent : t.input,
                      color: p === page ? '#fff' : t.text, cursor: 'pointer', minWidth: 32 }}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${t.border}`, background: t.input, color: page === totalPages ? t.muted : t.text,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{transform:scale(0.7);opacity:0.4} 50%{transform:scale(1.1);opacity:1} }`}</style>
    </div>
  );
}

export default function CrmPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div style={{ padding: 40, color: '#4a6278', fontSize: 13 }}>Loading…</div>}>
        <CrmPageInner />
      </Suspense>
    </AdminShell>
  );
}