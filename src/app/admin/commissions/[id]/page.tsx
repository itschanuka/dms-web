'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { commissionApi, type Commission } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/formatters';

function tok(isDark: boolean) {
  return {
    page:  isDark ? '#141c2e' : '#dde6f0',
    card:  isDark ? '#1c2538' : '#cdd8ea',
    card2: isDark ? '#111827' : '#c0d0e0',
    border: isDark ? '#263550' : '#aec2d6',
    text:  isDark ? '#e8f0fc' : '#0f1e32',
    muted: isDark ? '#5a7295' : '#4a6278',
    input: isDark ? '#0e1729' : '#b8c8db',
    inputTxt: isDark ? '#d4e2f4' : '#0f1e32',
    accent: '#ec4899',
  };
}

function InfoRow({ label, value, mono, color }: { label: string; value: React.ReactNode; mono?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(128,128,128,0.1)', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#5a7295' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: mono ? 'monospace' : undefined, color: color ?? '#e8f0fc' }}>{value}</span>
    </div>
  );
}

export default function CommissionDetailPage() {
  const { isDark } = useTheme();
  const t = tok(isDark);
  const params = useParams();
  const router = useRouter();
  const { employee } = useAuth();

  const commId = params['id'] as string;
  const isAdmin = ['admin', 'manager'].includes(employee?.role ?? '');

  const [comm,     setComm]     = useState<Commission | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [err,      setErr]      = useState('');

  // Override form
  const [overrideAmt,   setOverrideAmt]   = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [showOverride,  setShowOverride]  = useState(false);

  const flash = (m: string, isErr = false) => {
    if (isErr) setErr(m); else setMsg(m);
    setTimeout(() => { setMsg(''); setErr(''); }, 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await commissionApi.get(commId);
      setComm(data);
      setOverrideAmt(String(data.final_amount));
    } finally {
      setLoading(false);
    }
  }, [commId]);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async () => {
    setSaving(true);
    try {
      await commissionApi.markPaid(commId);
      flash('Commission marked as paid ✓');
      await load();
    } catch (e: any) {
      flash(e.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideAmt) return;
    setSaving(true);
    try {
      await commissionApi.override(commId, parseFloat(overrideAmt), overrideNotes || undefined);
      flash('Override applied ✓');
      setShowOverride(false);
      await load();
    } catch (e: any) {
      flash(e.message, true);
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = {
    background: t.input, color: t.inputTxt, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', width: '100%',
  };

  if (loading) {
    return (
      <AdminShell activePage="commissions">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: t.muted }}>Loading…</div>
      </AdminShell>
    );
  }

  if (!comm) {
    return (
      <AdminShell activePage="commissions">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
          <div style={{ fontSize: 40 }}>🤔</div>
          <div style={{ color: t.text, fontWeight: 700 }}>Commission not found</div>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.muted, borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>← Back</button>
        </div>
      </AdminShell>
    );
  }

  const isPaid       = comm.status === 'paid';
  const isOverridden = comm.manual_override_amount !== null;

  return (
    <AdminShell activePage="commissions">
      <div style={{ minHeight: '100vh', background: t.page, padding: '28px 32px', maxWidth: 800, margin: '0 auto' }}>

        {/* Flash */}
        {msg && <div style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, padding: '12px 18px', color: '#34d399', marginBottom: 16, fontSize: 14 }}>{msg}</div>}
        {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 18px', color: '#ef4444', marginBottom: 16, fontSize: 14 }}>{err}</div>}

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/admin/commissions" style={{ fontSize: 12, color: t.muted, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            ← Back to Commissions
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: t.text, margin: 0 }}>Commission Detail</h1>
              <p style={{ color: t.muted, fontSize: 13, margin: '4px 0 0' }}>
                Deal: <Link href={`/admin/deals/${comm.deal_id}`} style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 700 }}>{comm.deal?.deal_code ?? comm.deal_id}</Link>
              </p>
            </div>
            <span style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              color:      isPaid ? '#34d399' : '#ef4444',
              background: isPaid ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.1)',
              border:     `1px solid ${isPaid ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {isPaid ? '✓ Paid' : '⏳ Unpaid'}
            </span>
          </div>
        </div>

        {/* Amount cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Calculated',    val: comm.calculated_amount, color: t.muted },
            { label: 'Final Amount',  val: comm.final_amount,      color: '#ec4899' },
            { label: 'Override',      val: comm.manual_override_amount, color: isOverridden ? '#f59e0b' : t.muted },
          ].map(s => (
            <div key={s.label} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, color: t.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>
                {s.val !== null && s.val !== undefined ? formatCurrency(s.val) : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Info card */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <InfoRow label="Salesperson"     value={comm.employee?.full_name ?? '—'} />
          <InfoRow label="Employee Code"   value={comm.employee?.employee_code ?? '—'} mono />
          <InfoRow label="Commission Type" value={(comm.commission_type ?? '').replace(/_/g, ' ')} />
          {comm.commission_rate   && <InfoRow label="Rate"          value={`${comm.commission_rate}%`} />}
          {comm.fixed_value       && <InfoRow label="Fixed Value"   value={formatCurrency(comm.fixed_value)} mono />}
          {comm.base_amount       && <InfoRow label="Base Amount"   value={formatCurrency(comm.base_amount)} mono />}
          <InfoRow label="Deal Date"       value={comm.deal?.deal_date ? new Date(comm.deal.deal_date).toLocaleDateString() : '—'} />
          <InfoRow label="Vehicle"         value={comm.deal?.vehicle ? `${comm.deal.vehicle.make} ${comm.deal.vehicle.model} ${comm.deal.vehicle.year}` : '—'} />
          {isPaid && <>
            <InfoRow label="Paid At"       value={new Date(comm.paid_at!).toLocaleDateString()} color="#34d399" />
            <InfoRow label="Paid By"       value={comm.paid_by_emp?.full_name ?? '—'} />
          </>}
          {isOverridden && <>
            <InfoRow label="Overridden By" value={comm.override_by_emp?.full_name ?? '—'} color="#f59e0b" />
          </>}
          {comm.notes && (
            <div style={{ marginTop: 12, padding: 12, background: t.card2, borderRadius: 8, color: t.muted, fontSize: 13 }}>
              {comm.notes}
            </div>
          )}
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {!isPaid && (
              <button
                onClick={handleMarkPaid}
                disabled={saving}
                style={{ padding: '10px 20px', borderRadius: 10, background: '#34d399', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                {saving ? 'Marking…' : '✓ Mark as Paid'}
              </button>
            )}
            {!isPaid && employee?.role === 'admin' && (
              <button
                onClick={() => setShowOverride(v => !v)}
                style={{ padding: '10px 20px', borderRadius: 10, background: showOverride ? '#f59e0b' : 'transparent', color: showOverride ? '#fff' : '#f59e0b', border: '1px solid #f59e0b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                ⚡ {showOverride ? 'Cancel Override' : 'Override Amount'}
              </button>
            )}
          </div>
        )}

        {/* Override form */}
        {showOverride && (
          <div style={{ background: t.card, border: '1px solid rgba(245,158,11,0.4)', borderRadius: 14, padding: 20, marginTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
              ⚡ Manual Override (Admin Only)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: t.muted, marginBottom: 6, fontWeight: 600 }}>New Amount (LKR)</label>
                <input type="number" min="0" step="0.01" value={overrideAmt} onChange={e => setOverrideAmt(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: t.muted, marginBottom: 6, fontWeight: 600 }}>Reason / Notes</label>
                <input value={overrideNotes} onChange={e => setOverrideNotes(e.target.value)} placeholder="Reason for override…" style={inp} />
              </div>
            </div>
            <button
              onClick={handleOverride}
              disabled={saving || !overrideAmt}
              style={{ padding: '9px 20px', borderRadius: 8, background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              {saving ? 'Applying…' : '⚡ Apply Override'}
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
