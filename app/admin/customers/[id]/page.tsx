'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { customerApi, type CustomerDetail } from '@/lib/api';
import { formatPrice } from '@/lib/formatters';
import { useTheme } from '@/lib/theme';

// ── Status/type helpers ────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:      { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Active'      },
  inactive:    { bg: 'rgba(92,112,144,0.15)',  color: '#8097b8', label: 'Inactive'    },
  blacklisted: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Blacklisted' },
};

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  individual:    'Individual',
  business:      'Business',
  dealer_trader: 'Dealer / Trader',
  repeat_buyer:  'Repeat Buyer',
};

const LEAD_STATUS_STYLES: Record<string, { color: string }> = {
  new:         { color: '#8b5cf6' },
  contacted:   { color: '#0ea5e9' },
  interested:  { color: '#10b981' },
  test_drive:  { color: '#f59e0b' },
  negotiation: { color: '#f97316' },
  won:         { color: '#10b981' },
  lost:        { color: '#ef4444' },
};

const DEAL_STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  draft:     { color: '#8097b8', bg: 'rgba(128,151,184,0.1)' },
  reserved:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  active:    { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'  },
  completed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
};

function formatDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Section card ───────────────────────────────────────────────

function SectionCard({ title, children, action, isDark }: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  isDark: boolean;
}) {
  const c = {
    card:   isDark ? '#0d1117' : '#ffffff',
    border: isDark ? '#1f2d45' : '#d0dcea',
    muted:  isDark ? '#5c7090' : '#6b7fa0',
  };
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function KV({ label, value, color, isDark }: { label: string; value: string | null | undefined; color?: string; isDark: boolean }) {
  const c = { muted: isDark ? '#5c7090' : '#6b7fa0', text: isDark ? '#dde4f0' : '#1a2535' };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: c.muted, marginBottom: 3, fontWeight: 600, letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 13, color: color ?? c.text, fontWeight: value ? 500 : 400 }}>{value || '—'}</div>
    </div>
  );
}

// ── Blacklist modal ────────────────────────────────────────────

function BlacklistModal({ onConfirm, onCancel, isDark }: {
  onConfirm: (reason: string) => void;
  onCancel:  () => void;
  isDark:    boolean;
}) {
  const [reason, setReason] = useState('');
  const c = {
    bg: isDark ? '#0d1117' : '#fff', border: isDark ? '#1f2d45' : '#d0dcea',
    text: isDark ? '#dde4f0' : '#1a2535', muted: isDark ? '#5c7090' : '#6b7fa0',
  };
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 28, width: 420, maxWidth: '90vw' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', margin: '0 0 8px' }}>Blacklist Customer</h3>
        <p style={{ fontSize: 13, color: c.muted, marginBottom: 20 }}>
          This will block this customer from being used in new deals. Provide a reason.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for blacklisting (min 5 characters)…"
          style={{
            width: '100%', background: isDark ? '#07090f' : '#f0f4f8',
            border: `1px solid ${c.border}`, borderRadius: 8, padding: '9px 12px',
            fontSize: 13, color: c.text, resize: 'vertical', minHeight: 80,
            boxSizing: 'border-box', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={() => { if (reason.trim().length >= 5) onConfirm(reason.trim()); }}
            disabled={reason.trim().length < 5}
            style={{
              background: reason.trim().length >= 5 ? '#ef4444' : '#4a2020',
              color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px',
              fontSize: 13, fontWeight: 700, cursor: reason.trim().length >= 5 ? 'pointer' : 'not-allowed',
            }}
          >
            Confirm Blacklist
          </button>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 8, padding: '9px 16px', fontSize: 13, color: c.muted, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { isDark } = useTheme();
  const id = params['id'] as string;

  const [customer,     setCustomer]     = useState<CustomerDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [noteText,     setNoteText]     = useState('');
  const [savingNote,   setSavingNote]   = useState(false);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [actionError,  setActionError]  = useState('');
  const [actionWorking, setActionWorking] = useState(false);

  const c = {
    bg:     isDark ? '#07090f' : '#f0f4f8',
    card:   isDark ? '#0d1117' : '#ffffff',
    border: isDark ? '#1f2d45' : '#d0dcea',
    text:   isDark ? '#dde4f0' : '#1a2535',
    muted:  isDark ? '#5c7090' : '#6b7fa0',
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await customerApi.get(id);
      setCustomer(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await customerApi.addNote(id, noteText.trim());
      setNoteText('');
      await load();
    } catch (err) {
      setActionError(String(err));
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm('Delete this note?')) return;
    try {
      await customerApi.deleteNote(id, noteId);
      await load();
    } catch (err) {
      setActionError(String(err));
    }
  }

  async function handleBlacklist(reason: string) {
    setShowBlacklist(false);
    setActionWorking(true);
    try {
      await customerApi.blacklist(id, reason);
      await load();
    } catch (err) {
      setActionError(String(err));
    } finally {
      setActionWorking(false);
    }
  }

  async function handleRemoveBlacklist() {
    if (!confirm('Remove blacklist status from this customer?')) return;
    setActionWorking(true);
    try {
      await customerApi.removeBlacklist(id);
      await load();
    } catch (err) {
      setActionError(String(err));
    } finally {
      setActionWorking(false);
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <div style={{ padding: 40, textAlign: 'center', color: c.muted }}>Loading customer…</div>
      </AdminShell>
    );
  }

  if (error || !customer) {
    return (
      <AdminShell>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Customer not found'}</div>
          <Link href="/admin/customers" style={{ color: '#8b5cf6', textDecoration: 'none' }}>← Back to Customers</Link>
        </div>
      </AdminShell>
    );
  }

  const statusStyle = STATUS_STYLES[customer.status] ?? STATUS_STYLES['inactive']!;
  const fs          = customer.financial_summary;

  return (
    <AdminShell>
      {showBlacklist && (
        <BlacklistModal
          onConfirm={handleBlacklist}
          onCancel={() => setShowBlacklist(false)}
          isDark={isDark}
        />
      )}

      <div style={{ padding: '28px 32px', maxWidth: 1100 }}>

        {/* ── Back + Edit ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Link href="/admin/customers" style={{ fontSize: 12, color: c.muted, textDecoration: 'none' }}>
            ← Back to Customers
          </Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              href={`/admin/customers/${id}/edit`}
              style={{
                background: 'none', border: `1px solid ${c.border}`, borderRadius: 7,
                padding: '7px 14px', fontSize: 13, color: c.text, textDecoration: 'none',
              }}
            >
              ✏️ Edit
            </Link>
            {customer.status !== 'blacklisted' ? (
              <button
                onClick={() => setShowBlacklist(true)}
                disabled={actionWorking}
                style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 7, padding: '7px 14px', fontSize: 13, color: '#ef4444',
                  cursor: 'pointer', fontWeight: 600,
                }}
              >
                🚫 Blacklist
              </button>
            ) : (
              <button
                onClick={handleRemoveBlacklist}
                disabled={actionWorking}
                style={{
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 7, padding: '7px 14px', fontSize: 13, color: '#10b981',
                  cursor: 'pointer', fontWeight: 600,
                }}
              >
                ✓ Remove Blacklist
              </button>
            )}
          </div>
        </div>

        {/* ── Action error ── */}
        {actionError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
            {actionError}
            <button onClick={() => setActionError('')} style={{ background: 'none', border: 'none', color: '#ef4444', float: 'right', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </div>
        )}

        {/* ── Hero header ── */}
        <div style={{
          background: c.card, border: `1px solid ${c.border}`, borderRadius: 14,
          padding: '22px 24px', marginBottom: 16,
          display: 'flex', alignItems: 'flex-start', gap: 18,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(139,92,246,0.15)', border: '2px solid rgba(139,92,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>
            {customer.customer_type === 'business' ? '🏢' : '👤'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: c.text, margin: 0 }}>{customer.full_name}</h1>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                background: statusStyle.bg, color: statusStyle.color,
              }}>
                {statusStyle.label}
              </span>
            </div>
            <div style={{ fontSize: 13, color: c.muted, marginTop: 4 }}>
              {customer.customer_code} · {CUSTOMER_TYPE_LABELS[customer.customer_type] ?? customer.customer_type}
              {customer.business_name && ` · ${customer.business_name}`}
            </div>
            {customer.status === 'blacklisted' && customer.blacklist_reason && (
              <div style={{
                marginTop: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 7, padding: '6px 12px', fontSize: 12, color: '#ef4444',
              }}>
                Blacklist reason: {customer.blacklist_reason}
              </div>
            )}
          </div>

          {/* Financial KPIs */}
          <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
            {[
              { label: 'Total Deals',  value: String(fs.total_deals),       color: '#8b5cf6' },
              { label: 'Total Spend',  value: formatPrice(fs.total_spend),  color: '#10b981' },
              { label: 'Active Deals', value: String(fs.active_deals),      color: '#f59e0b' },
            ].map(k => (
              <div key={k.label} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* LEFT: Identity */}
          <SectionCard title="Identity" isDark={isDark}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <KV label="NIC / Passport" value={customer.nic_passport} isDark={isDark} />
              <KV label="Customer Type"  value={CUSTOMER_TYPE_LABELS[customer.customer_type]} isDark={isDark} />
              {customer.business_name    && <KV label="Business Name"   value={customer.business_name}   isDark={isDark} />}
              {customer.business_reg_no  && <KV label="Business Reg."   value={customer.business_reg_no} isDark={isDark} />}
              <KV label="Member Since"   value={formatDate(customer.created_at)} isDark={isDark} />
            </div>
          </SectionCard>

          {/* RIGHT: Contact */}
          <SectionCard title="Contact" isDark={isDark}>
            <KV label="Primary Phone"   value={customer.phone_primary}   isDark={isDark} />
            <KV label="Secondary Phone" value={customer.phone_secondary} isDark={isDark} />
            <KV label="Email"           value={customer.email}           isDark={isDark} />
            <KV label="City"            value={customer.city}            isDark={isDark} />
            <KV label="Address"         value={customer.address}         isDark={isDark} />
          </SectionCard>
        </div>

        {/* ── Notes ── */}
        <SectionCard title={`Notes (${customer.notes.length})`} isDark={isDark}>
          <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note about this customer…"
              style={{
                flex: 1, background: isDark ? '#07090f' : '#f0f4f8',
                border: `1px solid ${c.border}`, borderRadius: 7, padding: '8px 11px',
                fontSize: 13, color: c.text, outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!noteText.trim() || savingNote}
              style={{
                background: noteText.trim() ? '#8b5cf6' : '#2a1f4a', color: '#fff',
                border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13,
                fontWeight: 600, cursor: noteText.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              {savingNote ? 'Saving…' : '+ Add Note'}
            </button>
          </form>

          {customer.notes.length === 0 ? (
            <div style={{ fontSize: 13, color: c.muted, textAlign: 'center', padding: '16px 0' }}>No notes yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {customer.notes.map(note => (
                <div key={note.id} style={{
                  background: isDark ? '#111827' : '#f0f4f8',
                  border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 14px',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: c.text, lineHeight: 1.6 }}>{note.note}</div>
                    <div style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>{formatDate(note.created_at)}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    style={{ background: 'none', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 13, padding: '2px 4px', flexShrink: 0 }}
                    title="Delete note"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Linked Leads ── */}
        <SectionCard
          title={`Leads (${customer.leads.length})`}
          isDark={isDark}
          action={
            <Link href={`/admin/crm/new?customer_id=${id}`} style={{ fontSize: 12, color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>
              + New Lead
            </Link>
          }
        >
          {customer.leads.length === 0 ? (
            <div style={{ fontSize: 13, color: c.muted, textAlign: 'center', padding: '12px 0' }}>No leads yet</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Code', 'Status', 'Source', 'Vehicle', 'Date'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: c.muted, borderBottom: `1px solid ${c.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customer.leads.map((lead, i) => {
                  const ls = LEAD_STATUS_STYLES[lead.status] ?? { color: c.muted };
                  return (
                    <tr key={lead.id} style={{ borderTop: i > 0 ? `1px solid ${c.border}` : 'none' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12, color: c.muted }}>{lead.lead_code}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ls.color, textTransform: 'capitalize' }}>{lead.status}</span>
                      </td>
                      <td style={{ padding: '8px 10px', color: c.muted, textTransform: 'capitalize' }}>{lead.source}</td>
                      <td style={{ padding: '8px 10px', color: c.text }}>{lead.interested_vehicle_desc || '—'}</td>
                      <td style={{ padding: '8px 10px', color: c.muted }}>{formatDate(lead.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* ── Linked Deals ── */}
        <SectionCard
          title={`Deals (${customer.deals.length})`}
          isDark={isDark}
          action={
            <Link href={`/admin/deals/new?customer_id=${id}`} style={{ fontSize: 12, color: '#f59e0b', textDecoration: 'none', fontWeight: 600 }}>
              + New Deal
            </Link>
          }
        >
          {customer.deals.length === 0 ? (
            <div style={{ fontSize: 13, color: c.muted, textAlign: 'center', padding: '12px 0' }}>No deals yet</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Code', 'Status', 'Selling Price', 'Payment', 'Date'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: c.muted, borderBottom: `1px solid ${c.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customer.deals.map((deal, i) => {
                  const ds = DEAL_STATUS_STYLES[deal.status] ?? DEAL_STATUS_STYLES['draft']!;
                  return (
                    <tr key={deal.id} style={{ borderTop: i > 0 ? `1px solid ${c.border}` : 'none' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12, color: c.muted }}>{deal.deal_code}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: ds.bg, color: ds.color, textTransform: 'capitalize' }}>
                          {deal.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#f59e0b' }}>{formatPrice(Number(deal.selling_price))}</td>
                      <td style={{ padding: '8px 10px', color: c.muted, textTransform: 'capitalize' }}>{deal.payment_status.replace('_', ' ')}</td>
                      <td style={{ padding: '8px 10px', color: c.muted }}>{formatDate(deal.deal_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SectionCard>

      </div>
    </AdminShell>
  );
}
