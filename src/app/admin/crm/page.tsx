'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { leadApi, type Lead, type Pagination } from '@/lib/api';
import { useTheme } from '@/lib/theme';

// ── Constants ──────────────────────────────────────────────────

const PIPELINE_STAGES: Array<{ value: string; label: string; color: string }> = [
  { value: 'new',         label: 'New',         color: '#8b5cf6' },
  { value: 'contacted',   label: 'Contacted',   color: '#0ea5e9' },
  { value: 'interested',  label: 'Interested',  color: '#10b981' },
  { value: 'test_drive',  label: 'Test Drive',  color: '#f59e0b' },
  { value: 'negotiation', label: 'Negotiation', color: '#f97316' },
  { value: 'won',         label: 'Won',         color: '#10b981' },
  { value: 'lost',        label: 'Lost',        color: '#ef4444' },
];

const SOURCE_LABELS: Record<string, string> = {
  walk_in: 'Walk-in', call: 'Call', website: 'Website',
  facebook: 'Facebook', whatsapp: 'WhatsApp', referral: 'Referral', other: 'Other',
};

function StatusPill({ status }: { status: string }) {
  const s = PIPELINE_STAGES.find(p => p.value === status);
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: s ? `${s.color}18` : 'rgba(92,112,144,0.15)',
      color: s?.color ?? '#8097b8', whiteSpace: 'nowrap', textTransform: 'capitalize',
    }}>
      {s?.label ?? status}
    </span>
  );
}

function isOverdue(lead: Lead): boolean {
  if (!lead.next_followup_date) return false;
  if (lead.status === 'won' || lead.status === 'lost') return false;
  return lead.next_followup_date < new Date().toISOString().split('T')[0]!;
}

function isDueToday(lead: Lead): boolean {
  if (!lead.next_followup_date) return false;
  if (lead.status === 'won' || lead.status === 'lost') return false;
  return lead.next_followup_date === new Date().toISOString().split('T')[0]!;
}

function formatDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Due-today banner ───────────────────────────────────────────

function DueTodayBanner({ isDark }: { isDark: boolean }) {
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leadApi.getDueToday()
      .then(setLeads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || leads.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
      borderRadius: 10, padding: '12px 18px', marginBottom: 20,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>
        📅 {leads.length} follow-up{leads.length > 1 ? 's' : ''} due today
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {leads.map(l => (
          <Link key={l.id} href={`/admin/crm/${l.id}`} style={{
            fontSize: 12, color: '#f59e0b', textDecoration: 'none',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 6, padding: '4px 10px',
          }}>
            {l.lead_code} — {l.customer_name}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Overdue count badge ────────────────────────────────────────

function OverdueBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    leadApi.getOverdue().then(l => setCount(l.length)).catch(() => {});
  }, []);
  if (count === 0) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, background: '#ef4444', color: '#fff',
      borderRadius: 20, padding: '1px 7px', marginLeft: 6,
    }}>
      {count}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function CrmPage() {
  const router   = useRouter();
  const { isDark } = useTheme();

  const [leads,      setLeads]      = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search,       setSearch]       = useState('');
  const [overdueOnly,  setOverdueOnly]  = useState(false);
  const [page,         setPage]         = useState(1);

  const c = {
    bg:     isDark ? '#07090f' : '#f0f4f8',
    card:   isDark ? '#0d1117' : '#ffffff',
    border: isDark ? '#1f2d45' : '#d0dcea',
    text:   isDark ? '#dde4f0' : '#1a2535',
    muted:  isDark ? '#5c7090' : '#6b7fa0',
    header: isDark ? '#111827' : '#e8f2fb',
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await leadApi.list({
        page, limit: 25,
        status:       statusFilter || undefined,
        source:       sourceFilter || undefined,
        search:       search       || undefined,
        overdue_only: overdueOnly  || undefined,
      });
      setLeads(result.leads);
      setPagination(result.pagination);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, sourceFilter, search, overdueOnly]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusFilter, sourceFilter, search, overdueOnly]);

  const SEL: React.CSSProperties = {
    background: c.bg, border: `1px solid ${c.border}`, borderRadius: 7,
    padding: '7px 10px', fontSize: 13, color: c.text, outline: 'none',
  };

  return (
    <AdminShell>
      <div style={{ padding: '28px 32px', maxWidth: 1400 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, margin: 0, display: 'flex', alignItems: 'center' }}>
              CRM — Leads
              <OverdueBadge />
            </h1>
            <p style={{ fontSize: 13, color: c.muted, marginTop: 4 }}>
              {pagination ? `${pagination.total} total leads` : 'Loading…'}
            </p>
          </div>
          <Link href="/admin/crm/new" style={{
            background: '#10b981', color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px 18px', fontSize: 13,
            fontWeight: 700, textDecoration: 'none',
          }}>
            + New Lead
          </Link>
        </div>

        {/* ── Due Today Banner ── */}
        <DueTodayBanner isDark={isDark} />

        {/* ── Pipeline stage tabs ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setStatusFilter('')}
            style={{
              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', border: 'none',
              background: statusFilter === '' ? '#10b981' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
              color: statusFilter === '' ? '#fff' : c.muted,
            }}
          >
            All
          </button>
          {PIPELINE_STAGES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              style={{
                fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', border: 'none',
                background: statusFilter === s.value ? `${s.color}22` : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                color: statusFilter === s.value ? s.color : c.muted,
                outline: statusFilter === s.value ? `1px solid ${s.color}44` : 'none',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Filters row ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search name, phone, code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...SEL, minWidth: 220 }}
          />
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={SEL}>
            <option value="">All Sources</option>
            {Object.entries(SOURCE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button
            onClick={() => setOverdueOnly(o => !o)}
            style={{
              fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, cursor: 'pointer',
              border: `1px solid ${overdueOnly ? 'rgba(239,68,68,0.4)' : c.border}`,
              background: overdueOnly ? 'rgba(239,68,68,0.1)' : 'none',
              color: overdueOnly ? '#ef4444' : c.muted,
            }}
          >
            🔴 Overdue only
          </button>
          {(search || sourceFilter || overdueOnly) && (
            <button
              onClick={() => { setSearch(''); setSourceFilter(''); setOverdueOnly(false); }}
              style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 7, padding: '7px 12px', fontSize: 12, color: c.muted, cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* ── Table ── */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: c.muted }}>Loading leads…</div>
          ) : leads.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>No leads found</div>
              <div style={{ fontSize: 13, color: c.muted, marginBottom: 20 }}>
                {search || statusFilter || sourceFilter ? 'Try different filters' : 'Create your first lead to start tracking inquiries'}
              </div>
              {!search && !statusFilter && !sourceFilter && (
                <Link href="/admin/crm/new" style={{ background: '#10b981', color: '#fff', padding: '8px 18px', borderRadius: 7, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                  + New Lead
                </Link>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: c.header }}>
                  {['Code', 'Customer', 'Vehicle Interest', 'Source', 'Status', 'Salesperson', 'Follow-up', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: c.muted, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => {
                  const overdue  = isOverdue(lead);
                  const dueToday = isDueToday(lead);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(`/admin/crm/${lead.id}`)}
                      style={{
                        borderTop: i > 0 ? `1px solid ${c.border}` : 'none',
                        cursor: 'pointer', transition: 'background 0.12s',
                        background: overdue ? 'rgba(239,68,68,0.03)' : 'transparent',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = overdue ? 'rgba(239,68,68,0.03)' : 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: c.muted }}>{lead.lead_code}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: c.text }}>{lead.customer_name}</div>
                        <div style={{ fontSize: 11, color: c.muted }}>{lead.customer_phone}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: c.muted, maxWidth: 180 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lead.interested_vehicle_desc || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: c.muted }}>{SOURCE_LABELS[lead.source] ?? lead.source}</td>
                      <td style={{ padding: '10px 14px' }}><StatusPill status={lead.status} /></td>
                      <td style={{ padding: '10px 14px', color: c.muted, fontSize: 12 }}>{lead.assigned_to.slice(0, 8)}…</td>
                      <td style={{ padding: '10px 14px' }}>
                        {lead.next_followup_date ? (
                          <span style={{
                            fontSize: 12, fontWeight: overdue ? 700 : 500,
                            color: overdue ? '#ef4444' : dueToday ? '#f59e0b' : c.muted,
                          }}>
                            {overdue && '⚠ '}{dueToday && '📅 '}{formatDate(lead.next_followup_date)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: c.muted }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Link href={`/admin/crm/${lead.id}`} onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {pagination && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: c.muted }}>Page {pagination.page} of {pagination.totalPages} · {pagination.total} leads</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => p - 1)} disabled={!pagination.hasPrev} style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 7, padding: '6px 14px', fontSize: 13, color: pagination.hasPrev ? c.text : c.muted, cursor: pagination.hasPrev ? 'pointer' : 'not-allowed' }}>← Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext} style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 7, padding: '6px 14px', fontSize: 13, color: pagination.hasNext ? c.text : c.muted, cursor: pagination.hasNext ? 'pointer' : 'not-allowed' }}>Next →</button>
            </div>
          </div>
        )}

      </div>
    </AdminShell>
  );
}