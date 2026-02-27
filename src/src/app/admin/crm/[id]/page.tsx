'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import {
  leadApi, type LeadDetail, type LeadStatus, type LostReason,
} from '@/lib/api';
import { formatPrice } from '@/lib/formatters';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';

// ── Constants ──────────────────────────────────────────────────

const PIPELINE: Array<{ value: LeadStatus; label: string; color: string }> = [
  { value: 'new',         label: 'New',         color: '#8b5cf6' },
  { value: 'contacted',   label: 'Contacted',   color: '#0ea5e9' },
  { value: 'interested',  label: 'Interested',  color: '#10b981' },
  { value: 'test_drive',  label: 'Test Drive',  color: '#f59e0b' },
  { value: 'negotiation', label: 'Negotiation', color: '#f97316' },
  { value: 'won',         label: 'Won ✓',       color: '#10b981' },
  { value: 'lost',        label: 'Lost ✗',      color: '#ef4444' },
];

const LOST_REASONS: Array<{ value: LostReason; label: string }> = [
  { value: 'price_too_high',       label: 'Price too high'        },
  { value: 'competitor',           label: 'Went to competitor'    },
  { value: 'not_interested',       label: 'Not interested'        },
  { value: 'financing_rejected',   label: 'Financing rejected'    },
  { value: 'other',                label: 'Other'                 },
];

const SOURCE_LABELS: Record<string, string> = {
  walk_in: 'Walk-in', call: 'Call', website: 'Website',
  facebook: 'Facebook', whatsapp: 'WhatsApp', referral: 'Referral', other: 'Other',
};

function formatDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(s: string) {
  return new Date(s).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Lost Modal ────────────────────────────────────────────────

function LostModal({ onConfirm, onCancel, isDark }: {
  onConfirm: (reason: LostReason, note: string) => void;
  onCancel:  () => void;
  isDark:    boolean;
}) {
  const [reason, setReason] = useState<LostReason | ''>('');
  const [note,   setNote]   = useState('');
  const c = { bg: isDark ? '#0d1117' : '#fff', border: isDark ? '#1f2d45' : '#d0dcea', text: isDark ? '#dde4f0' : '#1a2535', muted: isDark ? '#5c7090' : '#6b7fa0' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 28, width: 420, maxWidth: '90vw' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', margin: '0 0 6px' }}>Mark as Lost</h3>
        <p style={{ fontSize: 13, color: c.muted, marginBottom: 20 }}>Select the reason this lead was lost.</p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: 'block', marginBottom: 5 }}>Reason *</label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value as LostReason)}
            style={{ width: '100%', background: isDark ? '#07090f' : '#f0f4f8', border: `1px solid ${c.border}`, borderRadius: 7, padding: '8px 11px', fontSize: 13, color: c.text, outline: 'none' }}
          >
            <option value="">— Select reason —</option>
            {LOST_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: 'block', marginBottom: 5 }}>Note (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Any additional context…"
            style={{ width: '100%', background: isDark ? '#07090f' : '#f0f4f8', border: `1px solid ${c.border}`, borderRadius: 7, padding: '8px 11px', fontSize: 13, color: c.text, resize: 'vertical', minHeight: 72, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { if (reason) onConfirm(reason as LostReason, note); }}
            disabled={!reason}
            style={{ background: reason ? '#ef4444' : '#4a2020', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: reason ? 'pointer' : 'not-allowed' }}
          >
            Confirm Lost
          </button>
          <button onClick={onCancel} style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 8, padding: '9px 16px', fontSize: 13, color: c.muted, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function LeadDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const { isDark } = useTheme();
  const { isAdmin, isManager } = useAuth();
  const id = params['id'] as string;

  const [lead,         setLead]         = useState<LeadDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [actionError,  setActionError]  = useState('');
  const [working,      setWorking]      = useState(false);
  const [showLost,     setShowLost]     = useState(false);

  // Follow-up form
  const [fuDate,  setFuDate]  = useState('');
  const [fuNote,  setFuNote]  = useState('');
  const [fuNext,  setFuNext]  = useState('');
  const [fuSaving, setFuSaving] = useState(false);

  const c = {
    bg:     isDark ? '#07090f' : '#f0f4f8',
    card:   isDark ? '#0d1117' : '#ffffff',
    border: isDark ? '#1f2d45' : '#d0dcea',
    text:   isDark ? '#dde4f0' : '#1a2535',
    muted:  isDark ? '#5c7090' : '#6b7fa0',
    header: isDark ? '#111827' : '#e8f2fb',
  };

  const F: React.CSSProperties = {
    background: c.bg, border: `1px solid ${c.border}`, borderRadius: 7,
    padding: '8px 11px', fontSize: 13, color: c.text, outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setLead(await leadApi.get(id));
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  // Set today as default follow-up date
  useEffect(() => {
    setFuDate(new Date().toISOString().split('T')[0]!);
  }, []);

  async function handleStatusChange(newStatus: LeadStatus) {
    if (newStatus === 'lost') { setShowLost(true); return; }
    setWorking(true); setActionError('');
    try {
      await leadApi.patchStatus(id, newStatus);
      await load();
    } catch (err) { setActionError(String(err)); }
    finally { setWorking(false); }
  }

  async function handleLostConfirm(reason: LostReason, note: string) {
    setShowLost(false); setWorking(true); setActionError('');
    try {
      await leadApi.patchStatus(id, 'lost', reason, note);
      await load();
    } catch (err) { setActionError(String(err)); }
    finally { setWorking(false); }
  }

  async function handleAddFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!fuNote.trim()) return;
    setFuSaving(true); setActionError('');
    try {
      await leadApi.addFollowUp(id, {
        follow_up_date:     fuDate,
        notes:              fuNote.trim(),
        next_followup_date: fuNext || undefined,
      });
      setFuNote(''); setFuNext('');
      await load();
    } catch (err) { setActionError(String(err)); }
    finally { setFuSaving(false); }
  }

  async function handleDelete() {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    setWorking(true);
    try {
      await leadApi.softDelete(id);
      router.push('/admin/crm');
    } catch (err) { setActionError(String(err)); setWorking(false); }
  }

  if (loading) return <AdminShell><div style={{ padding: 40, textAlign: 'center', color: '#5c7090' }}>Loading lead…</div></AdminShell>;
  if (error || !lead) return (
    <AdminShell>
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Lead not found'}</div>
        <Link href="/admin/crm" style={{ color: '#10b981', textDecoration: 'none' }}>← Back to CRM</Link>
      </div>
    </AdminShell>
  );

  const currentStage = PIPELINE.find(p => p.value === lead.status);
  const currentIndex = PIPELINE.findIndex(p => p.value === lead.status);
  const isTerminal   = lead.status === 'won' || lead.status === 'lost';
  const today        = new Date().toISOString().split('T')[0]!;
  const isOverdue    = lead.next_followup_date && lead.next_followup_date < today && !isTerminal;

  return (
    <AdminShell>
      {showLost && <LostModal onConfirm={handleLostConfirm} onCancel={() => setShowLost(false)} isDark={isDark} />}

      <div style={{ padding: '28px 32px', maxWidth: 1100 }}>

        {/* ── Nav ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Link href="/admin/crm" style={{ fontSize: 12, color: c.muted, textDecoration: 'none' }}>← Back to CRM</Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/admin/crm/${id}/edit`} style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 7, padding: '7px 14px', fontSize: 13, color: c.text, textDecoration: 'none' }}>
              ✏️ Edit
            </Link>
            {(isAdmin || isManager) && (
              <button onClick={handleDelete} disabled={working} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '7px 14px', fontSize: 13, color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
                🗑 Delete
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
            {actionError}
            <button onClick={() => setActionError('')} style={{ background: 'none', border: 'none', color: '#ef4444', float: 'right', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* ── Hero card ── */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: '22px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: c.muted }}>{lead.lead_code}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                  background: `${currentStage?.color ?? '#8097b8'}18`, color: currentStage?.color ?? '#8097b8',
                }}>
                  {currentStage?.label ?? lead.status}
                </span>
                {isOverdue && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 20, padding: '2px 8px' }}>
                    ⚠ Overdue
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: c.text, margin: '0 0 4px' }}>{lead.customer_name}</h1>
              <div style={{ fontSize: 13, color: c.muted }}>{lead.customer_phone}</div>
            </div>
            <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: c.muted }}>Source</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{SOURCE_LABELS[lead.source] ?? lead.source}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: c.muted }}>Created</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{formatDate(lead.created_at)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: c.muted }}>Next Follow-up</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isOverdue ? '#ef4444' : c.text }}>
                  {formatDate(lead.next_followup_date)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Pipeline control ── */}
        {!isTerminal && (
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Pipeline Stage
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PIPELINE.map((stage, idx) => {
                const isCurrent = stage.value === lead.status;
                const isPast    = idx < currentIndex;
                return (
                  <button
                    key={stage.value}
                    onClick={() => !isCurrent && !working && handleStatusChange(stage.value)}
                    disabled={isCurrent || working}
                    style={{
                      fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, cursor: isCurrent ? 'default' : 'pointer',
                      border: `1px solid ${isCurrent ? stage.color : (isDark ? '#1f2d45' : '#d0dcea')}`,
                      background: isCurrent ? `${stage.color}20` : isPast ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'none',
                      color: isCurrent ? stage.color : isPast ? c.muted : c.text,
                      opacity: working ? 0.5 : 1,
                    }}
                  >
                    {isCurrent && '● '}{stage.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Lost display ── */}
        {lead.status === 'lost' && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>LOST</div>
            <div style={{ fontSize: 13, color: c.muted }}>
              Reason: <strong style={{ color: c.text }}>{LOST_REASONS.find(r => r.value === lead.lost_reason)?.label ?? lead.lost_reason}</strong>
              {(lead as any).lost_note && <span> — {(lead as any).lost_note}</span>}
            </div>
          </div>
        )}

        {/* ── Won display ── */}
        {lead.status === 'won' && (
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>WON 🎉</div>
            {lead.won_deal_id && (
              <Link href={`/admin/deals/${lead.won_deal_id}`} style={{ fontSize: 13, color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>
                View linked deal →
              </Link>
            )}
          </div>
        )}

        {/* ── Two column: left detail | right follow-up ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* ── Left: details + vehicle + customer ── */}
          <div>
            {/* Vehicle interest */}
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.border}`, fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Vehicle Interest</div>
              <div style={{ padding: 18 }}>
                {lead.vehicle ? (
                  <div>
                    <Link href={`/admin/inventory/${lead.vehicle.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>{lead.vehicle.year} {lead.vehicle.make} {lead.vehicle.model}</div>
                      <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{lead.vehicle.stock_id} · {formatPrice(lead.vehicle.asking_price)}</div>
                    </Link>
                  </div>
                ) : lead.interested_vehicle_desc ? (
                  <div style={{ fontSize: 13, color: c.text }}>{lead.interested_vehicle_desc}</div>
                ) : (
                  <div style={{ fontSize: 13, color: c.muted }}>No vehicle specified</div>
                )}
              </div>
            </div>

            {/* Linked customer */}
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.border}`, fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Customer</div>
              <div style={{ padding: 18 }}>
                {lead.customer ? (
                  <div>
                    <Link href={`/admin/customers/${lead.customer.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#8b5cf6' }}>{lead.customer.full_name}</div>
                      <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{lead.customer.phone_primary} · {lead.customer.customer_code}</div>
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{lead.customer_name}</div>
                    <div style={{ fontSize: 12, color: c.muted }}>{lead.customer_phone}</div>
                    <div style={{ fontSize: 11, color: c.muted, marginTop: 6 }}>Not linked to a customer profile</div>
                  </div>
                )}
              </div>
            </div>

            {/* Follow-up note */}
            {lead.next_followup_note && (
              <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 5 }}>NEXT FOLLOW-UP NOTE</div>
                <div style={{ fontSize: 13, color: c.text }}>{lead.next_followup_note}</div>
              </div>
            )}
          </div>

          {/* ── Right: log follow-up + history ── */}
          <div>
            {/* Log follow-up form */}
            {!isTerminal && (
              <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.border}`, fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Log Follow-up
                </div>
                <form onSubmit={handleAddFollowUp} style={{ padding: 18 }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: 'block', marginBottom: 4 }}>Date *</label>
                    <input type="date" value={fuDate} onChange={e => setFuDate(e.target.value)} style={{ ...F, width: '100%' }} required />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: 'block', marginBottom: 4 }}>Notes *</label>
                    <textarea
                      value={fuNote}
                      onChange={e => setFuNote(e.target.value)}
                      placeholder="What happened on this follow-up…"
                      style={{ ...F, width: '100%', resize: 'vertical', minHeight: 80 }}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: 'block', marginBottom: 4 }}>Next Follow-up Date</label>
                    <input type="date" value={fuNext} onChange={e => setFuNext(e.target.value)} style={{ ...F, width: '100%' }} />
                  </div>
                  <button
                    type="submit"
                    disabled={fuSaving || !fuNote.trim()}
                    style={{
                      width: '100%', background: fuNote.trim() ? '#10b981' : '#0a3d2e', color: '#fff',
                      border: 'none', borderRadius: 8, padding: '9px', fontSize: 13,
                      fontWeight: 700, cursor: fuNote.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {fuSaving ? 'Saving…' : '+ Log Follow-up'}
                  </button>
                </form>
              </div>
            )}

            {/* Follow-up history */}
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.border}`, fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Follow-up History ({lead.follow_ups.length})
              </div>
              <div style={{ padding: lead.follow_ups.length > 0 ? '12px 18px' : 18 }}>
                {lead.follow_ups.length === 0 ? (
                  <div style={{ fontSize: 13, color: c.muted, textAlign: 'center', padding: '12px 0' }}>No follow-ups logged yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {lead.follow_ups.map((fu, i) => {
                      const stageInfo = PIPELINE.find(p => p.value === fu.status_at_time);
                      return (
                        <div
                          key={fu.id}
                          style={{
                            paddingLeft: 14,
                            borderLeft: `3px solid ${stageInfo?.color ?? '#1f2d45'}`,
                            paddingBottom: i < lead.follow_ups.length - 1 ? 10 : 0,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: stageInfo?.color ?? c.muted, textTransform: 'capitalize' }}>
                              {stageInfo?.label ?? fu.status_at_time}
                            </span>
                            <span style={{ fontSize: 11, color: c.muted }}>· {formatDate(fu.follow_up_date)}</span>
                          </div>
                          <div style={{ fontSize: 13, color: c.text, lineHeight: 1.6 }}>{fu.notes}</div>
                          {fu.next_followup_date && (
                            <div style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>
                              Next: {formatDate(fu.next_followup_date)}
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>{formatDateTime(fu.created_at)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
