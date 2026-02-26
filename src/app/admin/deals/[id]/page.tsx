'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import {
  dealApi,
  type DealDetail, type DealStatus, type PaymentStatus, type PaymentMethod,
  type LoanStatus, type DealPayment, type DealDelivery, type DealProfit,
} from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { formatCurrency } from '@/lib/formatters';
import { useAuth } from '@/hooks/useAuth';

// ── Colour maps ───────────────────────────────────────────────

const STATUS_CFG: Record<DealStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Draft',     color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.28)' },
  reserved:  { label: 'Reserved',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'   },
  active:    { label: 'Active',    color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.32)'  },
  completed: { label: 'Completed', color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.32)'  },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'    },
};
const PAY_CFG: Record<PaymentStatus, { label: string; color: string }> = {
  unpaid:         { label: 'Unpaid',     color: '#ef4444' },
  partially_paid: { label: 'Partial',    color: '#f59e0b' },
  fully_paid:     { label: 'Fully Paid', color: '#34d399' },
};
const LOAN_CFG: Record<LoanStatus, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: '#94a3b8' },
  submitted:   { label: 'Submitted',   color: '#38bdf8' },
  approved:    { label: 'Approved',    color: '#f59e0b' },
  rejected:    { label: 'Rejected',    color: '#ef4444' },
  disbursed:   { label: 'Disbursed',   color: '#34d399' },
};

function tok(isDark: boolean) {
  return {
    page:      isDark ? '#141c2e' : '#dde6f0',
    card:      isDark ? '#1c2538' : '#cdd8ea',
    cardInner: isDark ? '#111827' : '#c8d6e8',
    border:    isDark ? '#263550' : '#aec2d6',
    text:      isDark ? '#e8f0fc' : '#0f1e32',
    muted:     isDark ? '#5a7295' : '#4a6278',
    input:     isDark ? '#0e1729' : '#b8c8db',
    inputText: isDark ? '#d4e2f4' : '#0f1e32',
    accent:    '#ef4444',
    label:     isDark ? '#a0b8d8' : '#2a4a68',
  };
}

type Tab = 'overview' | 'payments' | 'finance' | 'trade_in' | 'delivery' | 'profit';

// ── Small helpers ─────────────────────────────────────────────

function SCard({ title, children, t }: { title: string; children: React.ReactNode; t: ReturnType<typeof tok> }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.border}` }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '.05em', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono, color }: { label: string; value: React.ReactNode; mono?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#5a7295' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: mono ? 'monospace' : undefined, color: color ?? '#e8f0fc' }}>{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function DealDetailPage() {
  const { isDark } = useTheme();
  const t = tok(isDark);
  const params   = useParams();
  const router   = useRouter();
  const { employee } = useAuth();
  const dealId   = params['id'] as string;

  const [deal,    setDeal]    = useState<DealDetail | null>(null);
  const [profit,  setProfit]  = useState<DealProfit | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<Tab>('overview');
  const [msg,     setMsg]     = useState('');
  const [err,     setErr]     = useState('');
  const [saving,  setSaving]  = useState(false);

  // Payment form
  const [pmtDate, setPmtDate] = useState(new Date().toISOString().split('T')[0]!);
  const [pmtAmt,  setPmtAmt]  = useState('');
  const [pmtMeth, setPmtMeth] = useState<PaymentMethod>('cash');
  const [pmtRef,  setPmtRef]  = useState('');

  // Finance form
  const [finProvType,   setFinProvType]   = useState<'bank' | 'finance_company'>('bank');
  const [finProvName,   setFinProvName]   = useState('');
  const [finBranch,     setFinBranch]     = useState('');
  const [finOfficer,    setFinOfficer]    = useState('');
  const [finContact,    setFinContact]    = useState('');
  const [finAppDate,    setFinAppDate]    = useState('');
  const [finLoanStatus, setFinLoanStatus] = useState<LoanStatus>('not_started');
  const [finPriceRef,   setFinPriceRef]   = useState('');
  const [finDownPay,    setFinDownPay]    = useState('0');
  const [finRequested,  setFinRequested]  = useState('');
  const [finApproved,   setFinApproved]   = useState('');
  const [finNotes,      setFinNotes]      = useState('');
  const [disbAmt,       setDisbAmt]       = useState('');
  const [disbDate,      setDisbDate]      = useState(new Date().toISOString().split('T')[0]!);
  const [disbRef,       setDisbRef]       = useState('');

  // Trade-in form
  const [tiMake,  setTiMake]  = useState('');
  const [tiModel, setTiModel] = useState('');
  const [tiYear,  setTiYear]  = useState('');
  const [tiMile,  setTiMile]  = useState('');
  const [tiReg,   setTiReg]   = useState('');
  const [tiNotes, setTiNotes] = useState('');
  const [tiValue, setTiValue] = useState('');

  // Delivery form
  const [delDate,    setDelDate]    = useState('');
  const [delStatus,  setDelStatus]  = useState<'pending' | 'delivered'>('pending');
  const [delPaid,    setDelPaid]    = useState(false);
  const [delSigned,  setDelSigned]  = useState(false);
  const [delDocs,    setDelDocs]    = useState(false);
  const [delVehicle, setDelVehicle] = useState(false);
  const [delNotes,   setDelNotes]   = useState('');

  // Modals
  const [showCancel,   setShowCancel]   = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelRefund, setCancelRefund] = useState('');
  const [overridePay,  setOverridePay]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await dealApi.get(dealId);
      {
        setDeal(d);
        if (d.finance) {
          setFinProvType(d.finance.provider_type);
          setFinProvName(d.finance.provider_name);
          setFinBranch(d.finance.branch ?? '');
          setFinOfficer(d.finance.officer_name ?? '');
          setFinContact(d.finance.officer_contact ?? '');
          setFinAppDate(d.finance.application_date ?? '');
          setFinLoanStatus(d.finance.loan_status);
          setFinPriceRef(String(d.finance.selling_price_ref));
          setFinDownPay(String(d.finance.customer_down_payment ?? 0));
          setFinRequested(String(d.finance.loan_amount_requested ?? ''));
          setFinApproved(String(d.finance.loan_amount_approved ?? ''));
          setFinNotes(d.finance.notes ?? '');
        } else {
          setFinPriceRef(String(d.selling_price));
        }
        if (d.trade_in) {
          setTiMake(d.trade_in.make);
          setTiModel(d.trade_in.model);
          setTiYear(String(d.trade_in.year ?? ''));
          setTiMile(String(d.trade_in.mileage ?? ''));
          setTiReg(d.trade_in.registration_number ?? '');
          setTiNotes(d.trade_in.condition_notes ?? '');
          setTiValue(String(d.trade_in.trade_in_value));
        }
        if (d.delivery) {
          setDelDate(d.delivery.delivery_date ?? '');
          setDelStatus(d.delivery.delivery_status);
          setDelPaid(d.delivery.check_payment_received);
          setDelSigned(d.delivery.check_agreement_signed);
          setDelDocs(d.delivery.check_docs_handed_over);
          setDelVehicle(d.delivery.check_vehicle_handed_over);
          setDelNotes(d.delivery.delivery_notes ?? '');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 'profit' && !profit && employee?.permissions?.view_profit) {
      dealApi.getProfit(dealId).then(setProfit).catch(() => {});
    }
  }, [tab, profit, dealId, employee]);

  const flash = (m: string, isErr = false) => {
    if (isErr) setErr(m); else setMsg(m);
    setTimeout(() => { setMsg(''); setErr(''); }, 4000);
  };

  // ── Handlers ──────────────────────────────────────────────────

  const handleAddPayment = async () => {
    if (!pmtAmt || !pmtDate) return;
    setSaving(true);
    const r = await dealApi.addPayment(dealId, { payment_date: pmtDate, amount: parseFloat(pmtAmt), method: pmtMeth, reference_number: pmtRef || undefined });
    flash('Payment added ✓'); setPmtAmt(''); setPmtRef(''); await load();
    setSaving(false);
  };

  const handleSaveFinance = async () => {
    if (!finProvName) return;
    setSaving(true);
    const r = await dealApi.upsertFinance(dealId, {
      provider_type: finProvType, provider_name: finProvName,
      branch: finBranch || undefined, officer_name: finOfficer || undefined,
      officer_contact: finContact || undefined, application_date: finAppDate || undefined,
      loan_status: finLoanStatus, selling_price_ref: parseFloat(finPriceRef || '0'),
      customer_down_payment: parseFloat(finDownPay || '0'),
      loan_amount_requested: finRequested ? parseFloat(finRequested) : undefined,
      loan_amount_approved:  finApproved  ? parseFloat(finApproved)  : undefined,
      notes: finNotes || undefined,
    });
    flash('Finance saved ✓'); await load();
    setSaving(false);
  };

  const handleDisburse = async () => {
    if (!disbAmt || !disbDate) return;
    setSaving(true);
    const r = await dealApi.disburse(dealId, { loan_amount_disbursed: parseFloat(disbAmt), disbursement_date: disbDate, reference_number: disbRef || undefined });
    flash('Disbursement recorded ✓'); setDisbAmt(''); setDisbRef(''); await load();
    setSaving(false);
  };

  const handleSaveTradeIn = async () => {
    if (!tiMake || !tiModel || !tiValue) return;
    setSaving(true);
    const r = await dealApi.upsertTradeIn(dealId, {
      make: tiMake, model: tiModel,
      year:    tiYear ? parseInt(tiYear)  : undefined,
      mileage: tiMile ? parseInt(tiMile)  : undefined,
      registration_number: tiReg   || undefined,
      condition_notes:     tiNotes || undefined,
      trade_in_value: parseFloat(tiValue),
    });
    flash('Trade-in saved ✓'); await load();
    setSaving(false);
  };

  const handleSaveDelivery = async () => {
    setSaving(true);
    const r = await dealApi.updateDelivery(dealId, {
      delivery_date:             delDate   || undefined,
      delivery_status:           delStatus,
      check_payment_received:    delPaid,
      check_agreement_signed:    delSigned,
      check_docs_handed_over:    delDocs,
      check_vehicle_handed_over: delVehicle,
      delivery_notes:            delNotes  || undefined,
    } as Partial<DealDelivery>);
    flash('Delivery updated ✓'); await load();
    setSaving(false);
  };

  const handleComplete = async () => {
    setSaving(true);
    const r = await dealApi.complete(dealId, overridePay);
    flash('Deal completed ✓'); setShowComplete(false); await load();
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!cancelReason) return;
    setSaving(true);
    const r = await dealApi.cancel(dealId, cancelReason, cancelRefund ? parseFloat(cancelRefund) : undefined);
    flash('Deal cancelled'); setShowCancel(false); await load();
    setSaving(false);
  };

  // ── Shared styles ─────────────────────────────────────────────
  const inputSt: React.CSSProperties = {
    background: t.input, color: t.inputText, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', width: '100%',
  };
  const selSt: React.CSSProperties = { ...inputSt, cursor: 'pointer' };
  const labelSt: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: t.label,
    textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 5,
  };
  const btnPrimary: React.CSSProperties = {
    background: t.accent, color: '#fff', border: 'none', borderRadius: 8,
    padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  const btnSecondary: React.CSSProperties = {
    background: 'transparent', color: t.muted, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };

  // ── Loading / not found ───────────────────────────────────────
  if (loading) {
    return (
      <AdminShell activePage="deals">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: t.muted, fontSize: 16 }}>
          Loading deal…
        </div>
      </AdminShell>
    );
  }
  if (!deal) {
    return (
      <AdminShell activePage="deals">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
          <div style={{ fontSize: 40 }}>🤔</div>
          <div style={{ color: t.text, fontWeight: 700 }}>Deal not found</div>
          <button onClick={() => router.back()} style={{ ...btnSecondary, marginTop: 8 }}>← Back</button>
        </div>
      </AdminShell>
    );
  }

  // ── Derived values ────────────────────────────────────────────
  const sc  = STATUS_CFG[deal.status];
  const pc  = PAY_CFG[deal.payment_status];
  const sp  = deal.selling_price;
  const disc= deal.discount_amount ?? 0;
  const eff = sp - disc;
  const paid= deal.total_paid_cache ?? 0;
  const bal = Math.max(0, eff - paid);
  const isEditable = !['completed', 'cancelled'].includes(deal.status);
  const isAdmin    = employee?.role === 'admin';
  const isManager  = ['admin', 'manager'].includes(employee?.role ?? '');
  const canViewProfit = employee?.permissions?.view_profit;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview',  label: 'Overview',  icon: '📋' },
    { id: 'payments',  label: 'Payments',  icon: '💳' },
    { id: 'finance',   label: 'Finance',   icon: '🏦' },
    { id: 'trade_in',  label: 'Trade-In',  icon: '🔄' },
    { id: 'delivery',  label: 'Delivery',  icon: '🚗' },
    ...(canViewProfit ? [{ id: 'profit' as Tab, label: 'Profit', icon: '📈' }] : []),
  ];

  return (
    <AdminShell activePage="deals">
      <div style={{ minHeight: '100vh', background: t.page, padding: '32px 40px' }}>

        {/* Flash */}
        {msg && (
          <div style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, padding: '12px 18px', color: '#34d399', marginBottom: 16, fontSize: 14 }}>
            {msg}
          </div>
        )}
        {err && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 18px', color: '#ef4444', marginBottom: 16, fontSize: 14 }}>
            {err}
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 13, marginBottom: 10, padding: 0 }}>
            ← Back to Deals
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: t.text, margin: 0, fontFamily: 'monospace' }}>
                {deal.deal_code}
              </h1>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>
                {sc.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: pc.color }}>{pc.label}</span>
            </div>
            {isEditable && isManager && (
              <div style={{ display: 'flex', gap: 10 }}>
                {employee?.permissions?.cancel_deal && (
                  <button onClick={() => setShowCancel(true)}
                    style={{ ...btnSecondary, borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}>
                    ✕ Cancel Deal
                  </button>
                )}
                <button onClick={() => setShowComplete(true)}
                  style={{ ...btnPrimary, background: '#34d399' }}>
                  ✓ Complete Deal
                </button>
              </div>
            )}
          </div>
          <p style={{ color: t.muted, fontSize: 14, margin: '6px 0 0' }}>
            Created {new Date(deal.created_at).toLocaleDateString()}
            {deal.completed_at && ` · Completed ${new Date(deal.completed_at).toLocaleDateString()}`}
          </p>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Selling Price',   value: formatCurrency(sp),   sub: disc > 0 ? `− ${formatCurrency(disc)} discount` : deal.payment_type, clr: t.text },
            { label: 'Effective Price', value: formatCurrency(eff),  sub: deal.payment_type, clr: '#e8f0fc' },
            { label: 'Total Paid',      value: formatCurrency(paid), sub: pc.label, clr: '#34d399' },
            { label: 'Balance Due',     value: formatCurrency(bal),  sub: bal === 0 ? 'Settled ✓' : 'Outstanding', clr: bal > 0 ? '#ef4444' : '#34d399' },
          ].map(s => (
            <div key={s.label} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, color: t.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.clr, fontFamily: 'monospace' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: t.muted, marginTop: 4, textTransform: 'capitalize' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === tb.id ? 'rgba(239,68,68,0.18)' : 'transparent',
              color:      tab === tb.id ? '#ef4444' : t.muted,
              border:     `1px solid ${tab === tb.id ? 'rgba(239,68,68,0.4)' : 'transparent'}`,
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              {tb.icon} {tb.label}
            </button>
          ))}
        </div>

        {/* ════ OVERVIEW ════ */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <SCard title="Vehicle" t={t}>
              {deal.vehicle ? (
                <>
                  <InfoRow label="Make / Model"  value={`${deal.vehicle.make} ${deal.vehicle.model}`} />
                  <InfoRow label="Year"          value={String(deal.vehicle.year)} />
                  <InfoRow label="Stock ID"      value={deal.vehicle.stock_id} mono />
                  <InfoRow label="Color"         value={deal.vehicle.color ?? '—'} />
                  <InfoRow label="Mileage"       value={deal.vehicle.mileage ? `${deal.vehicle.mileage.toLocaleString()} km` : '—'} />
                  <InfoRow label="Asking Price"  value={formatCurrency(deal.vehicle.asking_price)} mono />
                  <InfoRow label="Total Cost"    value={formatCurrency(deal.vehicle.total_cost_cache)} mono />
                </>
              ) : <div style={{ color: t.muted }}>No vehicle linked</div>}
            </SCard>

            <SCard title="Customer" t={t}>
              {deal.customer ? (
                <>
                  <InfoRow label="Name"   value={deal.customer.full_name} />
                  <InfoRow label="Code"   value={deal.customer.customer_code} mono />
                  <InfoRow label="Phone"  value={deal.customer.phone_primary} />
                  <InfoRow label="Email"  value={deal.customer.email ?? '—'} />
                  <InfoRow label="City"   value={deal.customer.city ?? '—'} />
                  <InfoRow label="Status" value={deal.customer.status} />
                </>
              ) : <div style={{ color: t.muted }}>No customer linked</div>}
            </SCard>

            <SCard title="Salesperson" t={t}>
              {deal.salesperson ? (
                <>
                  <InfoRow label="Name"             value={deal.salesperson.full_name} />
                  <InfoRow label="Code"             value={deal.salesperson.employee_code} mono />
                  <InfoRow label="Role"             value={deal.salesperson.role} />
                  <InfoRow label="Commission Type"  value={deal.salesperson.commission_type ?? 'None'} />
                  <InfoRow label="Commission Value" value={deal.salesperson.commission_value ? String(deal.salesperson.commission_value) : '—'} />
                </>
              ) : <div style={{ color: t.muted }}>No salesperson linked</div>}
            </SCard>

            <SCard title="Deal Info" t={t}>
              <InfoRow label="Deal Date"    value={new Date(deal.deal_date).toLocaleDateString()} />
              <InfoRow label="Payment Type" value={deal.payment_type} />
              {deal.reservation_amount && (
                <>
                  <InfoRow label="Reservation Deposit" value={formatCurrency(deal.reservation_amount)} mono />
                  <InfoRow label="Reservation Date"    value={deal.reservation_date ? new Date(deal.reservation_date).toLocaleDateString() : '—'} />
                  <InfoRow label="Expiry"              value={deal.reservation_expiry ? new Date(deal.reservation_expiry).toLocaleDateString() : '—'} />
                </>
              )}
              {deal.notes && (
                <div style={{ marginTop: 12, padding: 12, background: t.cardInner, borderRadius: 8, color: t.muted, fontSize: 13 }}>
                  {deal.notes}
                </div>
              )}
            </SCard>

            {deal.commission && (
              <SCard title="Commission" t={t}>
                <InfoRow label="Type"   value={deal.commission.commission_type} />
                <InfoRow label="Rate"   value={deal.commission.commission_rate ? `${deal.commission.commission_rate}%` : '—'} />
                <InfoRow label="Amount" value={formatCurrency(deal.commission.final_amount)} mono color="#f59e0b" />
                <InfoRow label="Status" value={deal.commission.status} color={deal.commission.status === 'paid' ? '#34d399' : '#ef4444'} />
                {deal.commission.paid_at && (
                  <InfoRow label="Paid At" value={new Date(deal.commission.paid_at).toLocaleDateString()} />
                )}
              </SCard>
            )}
          </div>
        )}

        {/* ════ PAYMENTS ════ */}
        {tab === 'payments' && (
          <SCard title={`Payments — Balance: ${formatCurrency(bal)}`} t={t}>
            {/* Progress */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: t.muted, marginBottom: 6 }}>
                <span>Paid: {formatCurrency(paid)}</span>
                <span>Total: {formatCurrency(eff)}</span>
              </div>
              <div style={{ height: 8, background: t.cardInner, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, transition: 'width .3s',
                  background: paid >= eff ? '#34d399' : '#f59e0b',
                  width: `${Math.min(100, eff > 0 ? (paid / eff) * 100 : 0)}%`,
                }} />
              </div>
            </div>

            {/* Table */}
            {deal.payments.length === 0 ? (
              <div style={{ color: t.muted, textAlign: 'center', padding: '20px 0', fontSize: 14 }}>No payments recorded yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    {['Date', 'Amount', 'Method', 'Reference', 'By'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: t.muted, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deal.payments.map((pmt: DealPayment) => (
                    <tr key={pmt.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: '10px 12px', color: t.text }}>{new Date(pmt.payment_date).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 12px', color: '#34d399', fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(pmt.amount)}</td>
                      <td style={{ padding: '10px 12px', color: t.muted, textTransform: 'capitalize' }}>{pmt.method.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '10px 12px', color: t.muted }}>{pmt.reference_number ?? '—'}</td>
                      <td style={{ padding: '10px 12px', color: t.muted }}>{pmt.created_by_emp?.full_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Add payment */}
            {isEditable && (
              <div style={{ background: t.cardInner, border: `1px solid ${t.border}`, borderRadius: 12, padding: 16 }}>
                <p style={{ ...labelSt, marginBottom: 14 }}>Add Payment</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
                  <div>
                    <label style={labelSt}>Date</label>
                    <input type="date" value={pmtDate} onChange={e => setPmtDate(e.target.value)} style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>Amount (LKR)</label>
                    <input type="number" value={pmtAmt} onChange={e => setPmtAmt(e.target.value)} placeholder="0.00" style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>Method</label>
                    <select value={pmtMeth} onChange={e => setPmtMeth(e.target.value as PaymentMethod)} style={selSt}>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>Reference</label>
                    <input value={pmtRef} onChange={e => setPmtRef(e.target.value)} placeholder="Optional" style={inputSt} />
                  </div>
                  <button onClick={handleAddPayment} disabled={saving || !pmtAmt}
                    style={{ ...btnPrimary, background: '#34d399', padding: '9px 18px', whiteSpace: 'nowrap' }}>
                    + Add
                  </button>
                </div>
              </div>
            )}
          </SCard>
        )}

        {/* ════ FINANCE ════ */}
        {tab === 'finance' && (
          <SCard title="Finance Provider & Loan" t={t}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelSt}>Provider Type</label>
                <select value={finProvType} onChange={e => setFinProvType(e.target.value as 'bank' | 'finance_company')} style={selSt} disabled={!isEditable}>
                  <option value="bank">Bank</option>
                  <option value="finance_company">Finance Company</option>
                </select>
              </div>
              <div>
                <label style={labelSt}>Provider Name *</label>
                <input value={finProvName} onChange={e => setFinProvName(e.target.value)} style={inputSt} disabled={!isEditable} />
              </div>
              <div>
                <label style={labelSt}>Branch</label>
                <input value={finBranch} onChange={e => setFinBranch(e.target.value)} style={inputSt} disabled={!isEditable} />
              </div>
              <div>
                <label style={labelSt}>Officer Name</label>
                <input value={finOfficer} onChange={e => setFinOfficer(e.target.value)} style={inputSt} disabled={!isEditable} />
              </div>
              <div>
                <label style={labelSt}>Officer Contact</label>
                <input value={finContact} onChange={e => setFinContact(e.target.value)} style={inputSt} disabled={!isEditable} />
              </div>
              <div>
                <label style={labelSt}>Application Date</label>
                <input type="date" value={finAppDate} onChange={e => setFinAppDate(e.target.value)} style={inputSt} disabled={!isEditable} />
              </div>
              <div>
                <label style={labelSt}>Loan Status</label>
                <select value={finLoanStatus} onChange={e => setFinLoanStatus(e.target.value as LoanStatus)} style={selSt} disabled={!isEditable}>
                  {(Object.keys(LOAN_CFG) as LoanStatus[]).map(s => (
                    <option key={s} value={s}>{LOAN_CFG[s].label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '9px 12px', background: t.cardInner, borderRadius: 8, border: `1px solid ${t.border}` }}>
                <span style={{ color: LOAN_CFG[finLoanStatus].color, fontWeight: 700, fontSize: 14 }}>
                  ● {LOAN_CFG[finLoanStatus].label}
                </span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Selling Price Ref',   val: finPriceRef,  set: setFinPriceRef },
                { label: 'Down Payment',         val: finDownPay,   set: setFinDownPay  },
                { label: 'Loan Requested',       val: finRequested, set: setFinRequested},
                { label: 'Loan Approved',        val: finApproved,  set: setFinApproved },
              ].map(f => (
                <div key={f.label}>
                  <label style={labelSt}>{f.label}</label>
                  <input type="number" value={f.val} onChange={e => f.set(e.target.value)} style={inputSt} disabled={!isEditable} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>Notes</label>
              <textarea value={finNotes} onChange={e => setFinNotes(e.target.value)} rows={3}
                style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit' }} disabled={!isEditable} />
            </div>
            {isEditable && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <button onClick={handleSaveFinance} disabled={saving || !finProvName} style={btnPrimary}>
                  {saving ? 'Saving…' : '💾 Save Finance'}
                </button>
              </div>
            )}

            {/* Disbursement */}
            {isEditable && deal.finance && !['not_started', 'disbursed', 'rejected'].includes(deal.finance.loan_status) && (
              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 20 }}>
                <p style={{ ...labelSt, color: '#f59e0b', marginBottom: 14 }}>Record Disbursement</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
                  <div>
                    <label style={labelSt}>Amount (LKR)</label>
                    <input type="number" value={disbAmt} onChange={e => setDisbAmt(e.target.value)} placeholder="0.00" style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>Date</label>
                    <input type="date" value={disbDate} onChange={e => setDisbDate(e.target.value)} style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>Reference</label>
                    <input value={disbRef} onChange={e => setDisbRef(e.target.value)} placeholder="Optional" style={inputSt} />
                  </div>
                  <button onClick={handleDisburse} disabled={saving || !disbAmt}
                    style={{ ...btnPrimary, background: '#f59e0b', padding: '9px 18px', whiteSpace: 'nowrap' }}>
                    📥 Disburse
                  </button>
                </div>
              </div>
            )}
          </SCard>
        )}

        {/* ════ TRADE-IN ════ */}
        {tab === 'trade_in' && (
          <SCard title="Trade-In Vehicle" t={t}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Make *',            val: tiMake,  set: setTiMake,  type: 'text'   },
                { label: 'Model *',           val: tiModel, set: setTiModel, type: 'text'   },
                { label: 'Year',              val: tiYear,  set: setTiYear,  type: 'number' },
                { label: 'Mileage (km)',       val: tiMile,  set: setTiMile,  type: 'number' },
                { label: 'Registration No.',  val: tiReg,   set: setTiReg,   type: 'text'   },
                { label: 'Trade-In Value *',  val: tiValue, set: setTiValue, type: 'number' },
              ].map(f => (
                <div key={f.label}>
                  <label style={labelSt}>{f.label}</label>
                  <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} style={inputSt} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Condition Notes</label>
              <textarea value={tiNotes} onChange={e => setTiNotes(e.target.value)} rows={3}
                style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            {tiValue && (
              <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: t.muted }}>After trade-in, customer pays:</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                  {formatCurrency(Math.max(0, eff - parseFloat(tiValue || '0')))}
                </div>
                <div style={{ fontSize: 12, color: t.muted }}>
                  ({formatCurrency(eff)} − {formatCurrency(parseFloat(tiValue))} trade-in)
                </div>
              </div>
            )}
            {isEditable && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleSaveTradeIn} disabled={saving || !tiMake || !tiModel || !tiValue} style={btnPrimary}>
                  {saving ? 'Saving…' : '💾 Save Trade-In'}
                </button>
              </div>
            )}
          </SCard>
        )}

        {/* ════ DELIVERY ════ */}
        {tab === 'delivery' && (
          <SCard title="Delivery Checklist" t={t}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div>
                <label style={labelSt}>Delivery Date</label>
                <input type="date" value={delDate} onChange={e => setDelDate(e.target.value)} style={inputSt} disabled={!isEditable} />
              </div>
              <div>
                <label style={labelSt}>Status</label>
                <select value={delStatus} onChange={e => setDelStatus(e.target.value as 'pending' | 'delivered')} style={selSt} disabled={!isEditable}>
                  <option value="pending">Pending</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Payment fully received',                    checked: delPaid,    set: setDelPaid    },
                { label: 'Sales agreement signed',                    checked: delSigned,  set: setDelSigned  },
                { label: 'Documents handed over (CR copy, etc.)',     checked: delDocs,    set: setDelDocs    },
                { label: 'Vehicle handed over to customer',           checked: delVehicle, set: setDelVehicle },
              ].map(item => (
                <div key={item.label}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: isEditable ? 'pointer' : 'default' }}
                  onClick={() => isEditable && item.set(!item.checked)}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${item.checked ? '#34d399' : t.border}`,
                    background: item.checked ? 'rgba(52,211,153,0.2)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.checked && <span style={{ color: '#34d399', fontSize: 13, fontWeight: 800 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 14, color: item.checked ? '#34d399' : t.text }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, alignItems: 'center' }}>
              {[delPaid, delSigned, delDocs, delVehicle].map((c, i) => (
                <div key={i} style={{ width: 40, height: 5, borderRadius: 3, background: c ? '#34d399' : t.border }} />
              ))}
              <span style={{ fontSize: 12, color: t.muted, marginLeft: 4 }}>
                {[delPaid, delSigned, delDocs, delVehicle].filter(Boolean).length}/4 complete
              </span>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>Delivery Notes</label>
              <textarea value={delNotes} onChange={e => setDelNotes(e.target.value)} rows={3}
                style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit' }} disabled={!isEditable} />
            </div>
            {isEditable && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleSaveDelivery} disabled={saving} style={btnPrimary}>
                  {saving ? 'Saving…' : '💾 Save Delivery'}
                </button>
              </div>
            )}
          </SCard>
        )}

        {/* ════ PROFIT ════ */}
        {tab === 'profit' && (
          <div>
            {profit ? (
              <SCard title="Profit Analysis" t={t}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { label: 'Gross Profit', val: profit.gross_profit,    clr: profit.gross_profit > 0    ? '#34d399' : '#ef4444' },
                    { label: 'Commission',   val: profit.commission_amount, clr: '#f59e0b' },
                    { label: 'Net Profit',   val: profit.net_profit,       clr: profit.net_profit > 0     ? '#34d399' : '#ef4444' },
                  ].map(s => (
                    <div key={s.label} style={{ background: t.cardInner, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
                      <div style={{ fontSize: 11, color: t.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>{s.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace', color: s.clr }}>{formatCurrency(s.val)}</div>
                    </div>
                  ))}
                </div>
                <InfoRow label="Selling Price"   value={formatCurrency(profit.selling_price)} mono />
                <InfoRow label="Discount"        value={`− ${formatCurrency(profit.discount_amount)}`} mono color="#ef4444" />
                <InfoRow label="Effective Price" value={formatCurrency(profit.effective_price)} mono />
                <InfoRow label="Total Cost"      value={`− ${formatCurrency(profit.total_cost)}`} mono color="#ef4444" />
                <InfoRow label="Gross Profit"    value={formatCurrency(profit.gross_profit)} mono color={profit.gross_profit > 0 ? '#34d399' : '#ef4444'} />
                <InfoRow label="Commission"      value={`− ${formatCurrency(profit.commission_amount)}`} mono color="#f59e0b" />
                <div style={{ borderTop: `2px solid ${t.border}`, marginTop: 8, paddingTop: 12 }}>
                  <InfoRow label="Net Profit" value={formatCurrency(profit.net_profit)} mono color={profit.net_profit > 0 ? '#34d399' : '#ef4444'} />
                </div>
              </SCard>
            ) : (
              <div style={{ textAlign: 'center', color: t.muted, padding: 48 }}>Loading profit…</div>
            )}
          </div>
        )}

        {/* ════ MODAL: Complete ════ */}
        {showComplete && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 32, width: 480 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text, marginBottom: 12 }}>✓ Complete Deal?</h2>
              <p style={{ color: t.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                Completing will mark the vehicle as <strong style={{ color: '#34d399' }}>SOLD</strong> and
                auto-create a commission entry. This cannot be undone.
              </p>
              {deal.payment_status !== 'fully_paid' && (
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>
                    ⚠ Balance outstanding: {formatCurrency(bal)}
                  </div>
                  {isAdmin && (
                    <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, cursor: 'pointer', fontSize: 13, color: t.text }}>
                      <input type="checkbox" checked={overridePay} onChange={e => setOverridePay(e.target.checked)} />
                      Override payment requirement (Admin only)
                    </label>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowComplete(false)} style={btnSecondary}>Cancel</button>
                <button
                  onClick={handleComplete}
                  disabled={saving || (deal.payment_status !== 'fully_paid' && !overridePay)}
                  style={{ ...btnPrimary, background: '#34d399' }}
                >
                  {saving ? 'Completing…' : '✓ Complete Deal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ MODAL: Cancel ════ */}
        {showCancel && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 32, width: 480 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', marginBottom: 12 }}>✕ Cancel Deal?</h2>
              <p style={{ color: t.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                Cancelling will revert the vehicle to <strong style={{ color: t.text }}>Available</strong> and remove any unpaid commission.
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={labelSt}>Cancellation Reason *</label>
                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3}
                  placeholder="Enter reason…"
                  style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelSt}>Refund Amount (LKR)</label>
                <input type="number" value={cancelRefund} onChange={e => setCancelRefund(e.target.value)} placeholder="0.00" style={inputSt} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCancel(false)} style={btnSecondary}>Back</button>
                <button onClick={handleCancel} disabled={saving || !cancelReason} style={btnPrimary}>
                  {saving ? 'Cancelling…' : '✕ Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminShell>
  );
}