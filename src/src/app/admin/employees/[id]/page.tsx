'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import {
  employeeApi, commissionApi,
  type EmployeeWithPermissions, type EmployeePerformance, type CommissionSummary,
} from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/formatters';

function tok(isDark: boolean) {
  return {
    page:   isDark ? '#141c2e' : '#dde6f0',
    card:   isDark ? '#1c2538' : '#cdd8ea',
    card2:  isDark ? '#111827' : '#c0d0e0',
    border: isDark ? '#263550' : '#aec2d6',
    text:   isDark ? '#e8f0fc' : '#0f1e32',
    muted:  isDark ? '#5a7295' : '#4a6278',
    input:  isDark ? '#0e1729' : '#b8c8db',
    inputTxt: isDark ? '#d4e2f4' : '#0f1e32',
    label:  isDark ? '#94aec8' : '#2a4260',
    accent: '#f97316',
  };
}

const ROLE_CFG: Record<string, { color: string; bg: string; border: string }> = {
  admin:       { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.3)' },
  manager:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'  },
  salesperson: { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  accountant:  { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)'  },
};

const ALL_PERMISSIONS: { key: string; label: string; desc: string }[] = [
  { key: 'view_profit',        label: 'View Profit',        desc: 'See gross/net profit on deals and reports' },
  { key: 'edit_price',         label: 'Edit Price',         desc: 'Change vehicle asking/selling price' },
  { key: 'delete_records',     label: 'Delete Records',     desc: 'Soft-delete inventory, leads, customers' },
  { key: 'view_reports',       label: 'View Reports',       desc: 'Access all analytics and report pages' },
  { key: 'manage_employees',   label: 'Manage Employees',   desc: 'Create, edit, deactivate employees' },
  { key: 'audit_view',         label: 'Audit View',         desc: 'View full audit log' },
  { key: 'backup_download',    label: 'Backup Download',    desc: 'Download system backup files' },
  { key: 'approve_discount',   label: 'Approve Discount',   desc: 'Apply discounts on deals' },
  { key: 'cancel_deal',        label: 'Cancel Deal',        desc: 'Cancel active or reserved deals' },
  { key: 'blacklist_customer', label: 'Blacklist Customer', desc: 'Mark customers as blacklisted' },
  { key: 'export_reports',     label: 'Export Reports',     desc: 'Export data as PDF, Excel, CSV' },
];

type Tab = 'profile' | 'performance' | 'permissions' | 'commission';

function SCard({ title, t, children }: { title: string; t: ReturnType<typeof tok>; children: React.ReactNode }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}` }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '.05em', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(128,128,128,0.08)', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#5a7295' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: color ?? '#e8f0fc' }}>{value}</span>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { isDark } = useTheme();
  const t = tok(isDark);
  const params = useParams();
  const router = useRouter();
  const { employee: me } = useAuth();

  const empId  = params['id'] as string;
  const isAdmin = me?.role === 'admin';
  const isSelf  = me?.id === empId;

  const [emp,       setEmp]       = useState<EmployeeWithPermissions | null>(null);
  const [perf,      setPerf]      = useState<EmployeePerformance | null>(null);
  const [commSum,   setCommSum]   = useState<CommissionSummary | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<Tab>('profile');
  const [msg,       setMsg]       = useState('');
  const [err,       setErr]       = useState('');
  const [saving,    setSaving]    = useState(false);

  // Permissions state
  const [perms, setPerms] = useState<Record<string, boolean>>({});

  // Commission form
  const [commType,  setCommType]  = useState('');
  const [commValue, setCommValue] = useState('');

  // Reset auth modal
  const [showReset,   setShowReset]   = useState(false);
  const [newTempPass, setNewTempPass] = useState('');

  const flash = (m: string, isErr = false) => {
    if (isErr) setErr(m); else setMsg(m);
    setTimeout(() => { setMsg(''); setErr(''); }, 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const e = await employeeApi.get(empId);
      setEmp(e);
      // Init permissions
      const p = e.employee_permissions;
      if (p) {
        setPerms({
          view_profit: p.view_profit, edit_price: p.edit_price,
          delete_records: p.delete_records, view_reports: p.view_reports,
          manage_employees: p.manage_employees, audit_view: p.audit_view,
          backup_download: p.backup_download, approve_discount: p.approve_discount,
          cancel_deal: p.cancel_deal, blacklist_customer: p.blacklist_customer,
          export_reports: p.export_reports,
        });
      }
      setCommType(e.commission_type ?? '');
      setCommValue(e.commission_value !== null ? String(e.commission_value) : '');
    } finally {
      setLoading(false);
    }
  }, [empId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 'performance') {
      employeeApi.getPerformance(empId).then(setPerf).catch(() => {});
      commissionApi.getEmployeeSummary(empId).then(setCommSum).catch(() => {});
    }
  }, [tab, empId]);

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      await employeeApi.updatePermissions(empId, perms);
      flash('Permissions saved ✓');
      await load();
    } catch (e: any) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const handleSaveCommission = async () => {
    setSaving(true);
    try {
      await employeeApi.updateCommission(empId, {
        commission_type:  commType as any || null,
        commission_value: commValue ? parseFloat(commValue) : null,
      });
      flash('Commission setup saved ✓');
      await load();
    } catch (e: any) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const handleStatusToggle = async () => {
    if (!emp) return;
    const newStatus = emp.status === 'active' ? 'inactive' : 'active';
    setSaving(true);
    try {
      await employeeApi.updateStatus(empId, newStatus);
      flash(`Employee ${newStatus === 'active' ? 'activated' : 'deactivated'} ✓`);
      await load();
    } catch (e: any) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const handleResetAuth = async () => {
    if (!newTempPass || newTempPass.length < 8) return;
    setSaving(true);
    try {
      await employeeApi.resetAuth(empId, newTempPass);
      flash('Auth reset — temp password set, TOTP cleared ✓');
      setShowReset(false);
      setNewTempPass('');
      await load();
    } catch (e: any) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const inp: React.CSSProperties = {
    background: t.input, color: t.inputTxt, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', width: '100%',
  };

  if (loading) {
    return (
      <AdminShell activePage="employees">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: t.muted }}>Loading…</div>
      </AdminShell>
    );
  }

  if (!emp) {
    return (
      <AdminShell activePage="employees">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
          <div style={{ fontSize: 40 }}>🤔</div>
          <div style={{ color: t.text, fontWeight: 700 }}>Employee not found</div>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.muted, borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>← Back</button>
        </div>
      </AdminShell>
    );
  }

  const rc = ROLE_CFG[emp.role] ?? ROLE_CFG.accountant!;
  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile',     label: 'Profile',     icon: '👤' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    ...(isAdmin ? [
      { id: 'permissions' as Tab, label: 'Permissions', icon: '🔑' },
      { id: 'commission'  as Tab, label: 'Commission',  icon: '💸' },
    ] : []),
  ];

  return (
    <AdminShell activePage="employees">
      <div style={{ minHeight: '100vh', background: t.page, padding: '28px 32px' }}>

        {/* Flash */}
        {msg && <div style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, padding: '12px 18px', color: '#34d399', marginBottom: 16, fontSize: 14 }}>{msg}</div>}
        {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 18px', color: '#ef4444', marginBottom: 16, fontSize: 14 }}>{err}</div>}

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/admin/employees" style={{ fontSize: 12, color: t.muted, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            ← Back to Employees
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: rc.bg, border: `2px solid ${rc.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: rc.color }}>
                {emp.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: t.text, margin: 0 }}>{emp.full_name}</h1>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: rc.color, background: rc.bg, border: `1px solid ${rc.border}`, textTransform: 'capitalize' }}>{emp.role}</span>
                  <span style={{ fontSize: 12, color: emp.status === 'active' ? '#34d399' : '#ef4444', fontWeight: 600 }}>{emp.status === 'active' ? '● Active' : '○ Inactive'}</span>
                  <span style={{ fontSize: 12, color: t.muted, fontFamily: 'monospace' }}>{emp.employee_code}</span>
                </div>
              </div>
            </div>
            {isAdmin && !isSelf && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={handleStatusToggle} disabled={saving}
                  style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: emp.status === 'active' ? '#ef4444' : '#34d399', border: `1px solid ${emp.status === 'active' ? 'rgba(239,68,68,0.4)' : 'rgba(52,211,153,0.4)'}`, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  {emp.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => setShowReset(v => !v)}
                  style={{ padding: '8px 16px', borderRadius: 8, background: showReset ? '#f59e0b' : 'transparent', color: showReset ? '#fff' : '#f59e0b', border: '1px solid rgba(245,158,11,0.4)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  🔐 Reset Auth
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reset Auth form */}
        {showReset && (
          <div style={{ background: t.card, border: '1px solid rgba(245,158,11,0.4)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
              🔐 Reset Auth — Sets New Temp Password + Clears TOTP
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, color: t.muted, marginBottom: 6, fontWeight: 600 }}>New Temp Password (min 8 chars)</label>
                <input type="password" value={newTempPass} onChange={e => setNewTempPass(e.target.value)} placeholder="Min. 8 characters" style={inp} />
              </div>
              <button onClick={handleResetAuth} disabled={saving || newTempPass.length < 8}
                style={{ padding: '9px 20px', borderRadius: 8, background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 700, cursor: newTempPass.length >= 8 ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', opacity: newTempPass.length >= 8 ? 1 : 0.5 }}>
                {saving ? 'Resetting…' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === tb.id ? 'rgba(249,115,22,0.18)' : 'transparent',
              color:      tab === tb.id ? '#f97316' : t.muted,
              border:     `1px solid ${tab === tb.id ? 'rgba(249,115,22,0.4)' : 'transparent'}`,
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              {tb.icon} {tb.label}
            </button>
          ))}
        </div>

        {/* ═══ PROFILE ═══ */}
        {tab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <SCard title="Contact Info" t={t}>
              <InfoRow label="Email"     value={emp.email} />
              <InfoRow label="Phone"     value={emp.phone ?? '—'} />
              <InfoRow label="Address"   value={emp.address ?? '—'} />
              <InfoRow label="NIC"       value={emp.nic ?? '—'} />
            </SCard>
            <SCard title="Account" t={t}>
              <InfoRow label="Join Date"   value={new Date(emp.join_date).toLocaleDateString()} />
              <InfoRow label="Last Login"  value={emp.last_login_at ? new Date(emp.last_login_at).toLocaleDateString() : 'Never'} />
              <InfoRow label="TOTP (2FA)"  value={emp.totp_enabled ? '✓ Enabled' : '⚠ Not Set Up'} color={emp.totp_enabled ? '#34d399' : '#f59e0b'} />
              <InfoRow label="Must Change" value={emp.must_change_password ? 'Yes' : 'No'} color={emp.must_change_password ? '#f59e0b' : '#34d399'} />
            </SCard>
            {emp.commission_type && (
              <SCard title="Commission Setup" t={t}>
                <InfoRow label="Type"  value={(emp.commission_type).replace(/_/g, ' ')} />
                <InfoRow label="Value" value={emp.commission_value !== null
                  ? (emp.commission_type === 'fixed' ? formatCurrency(emp.commission_value) : `${emp.commission_value}%`)
                  : '—'} color="#f97316" />
              </SCard>
            )}
          </div>
        )}

        {/* ═══ PERFORMANCE ═══ */}
        {tab === 'performance' && (
          <div>
            {/* Commission summary */}
            {commSum && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
                {[
                  { label: 'Total Earned', val: commSum.total_earned,  color: '#ec4899' },
                  { label: 'Paid',         val: commSum.total_paid,    color: '#34d399' },
                  { label: 'Unpaid',       val: commSum.total_unpaid,  color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '18px 20px' }}>
                    <div style={{ fontSize: 11, color: t.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Commission · {s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: s.color }}>{formatCurrency(s.val)}</div>
                  </div>
                ))}
              </div>
            )}

            {perf ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
                {[
                  { label: 'Deals Closed',     val: perf.deals_closed,     color: '#818cf8', money: false },
                  { label: 'Total Revenue',    val: perf.total_revenue,    color: '#34d399', money: true  },
                  { label: 'Leads Assigned',   val: perf.leads_assigned,   color: '#38bdf8', money: false },
                  { label: 'Conversion Rate',  val: `${perf.conversion_rate}%`, color: '#f59e0b', money: false },
                ].map(s => (
                  <div key={s.label} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '18px 20px' }}>
                    <div style={{ fontSize: 11, color: t.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: s.money ? 'monospace' : 'inherit' }}>
                      {s.money ? formatCurrency(s.val as number) : s.val}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: t.muted, padding: 48 }}>Loading performance…</div>
            )}
          </div>
        )}

        {/* ═══ PERMISSIONS ═══ */}
        {tab === 'permissions' && isAdmin && (
          <SCard title="Permission Flags" t={t}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {ALL_PERMISSIONS.map(p => (
                <div
                  key={p.key}
                  onClick={() => setPerms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                    background: perms[p.key] ? 'rgba(249,115,22,0.08)' : t.card2,
                    border: `1px solid ${perms[p.key] ? 'rgba(249,115,22,0.35)' : t.border}`,
                    borderRadius: 10, cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                    border: `2px solid ${perms[p.key] ? '#f97316' : t.border}`,
                    background: perms[p.key] ? 'rgba(249,115,22,0.2)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {perms[p.key] && <span style={{ color: '#f97316', fontSize: 12, fontWeight: 800 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: perms[p.key] ? '#f97316' : t.text }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSavePermissions} disabled={saving}
                style={{ padding: '10px 24px', borderRadius: 10, background: '#f97316', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {saving ? 'Saving…' : '💾 Save Permissions'}
              </button>
            </div>
          </SCard>
        )}

        {/* ═══ COMMISSION ═══ */}
        {tab === 'commission' && isAdmin && (
          <SCard title="Commission Setup" t={t}>
            <p style={{ color: t.muted, fontSize: 13, marginBottom: 20 }}>
              Commission is auto-calculated when a deal is completed. Changes take effect on the next completed deal.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: t.label, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Commission Type</label>
                <select value={commType} onChange={e => setCommType(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">— None —</option>
                  <option value="fixed">Fixed Amount (usd)</option>
                  <option value="percent_price">% of Selling Price</option>
                  <option value="percent_profit">% of Gross Profit</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: t.label, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  {commType === 'fixed' ? 'Fixed Amount (usd)' : 'Rate (%)'}
                </label>
                <input type="number" min="0" step={commType === 'fixed' ? '1' : '0.01'}
                  value={commValue} onChange={e => setCommValue(e.target.value)}
                  disabled={!commType}
                  style={{ ...inp, opacity: commType ? 1 : 0.5 }} />
              </div>
            </div>
            {commType && commValue && (
              <div style={{ padding: '12px 16px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 10, fontSize: 13, color: '#f97316', marginBottom: 20 }}>
                💸 {commType === 'fixed'
                  ? `usd ${commValue} per deal`
                  : commType === 'percent_price'
                  ? `${commValue}% of selling price`
                  : `${commValue}% of gross profit`}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSaveCommission} disabled={saving}
                style={{ padding: '10px 24px', borderRadius: 10, background: '#f97316', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {saving ? 'Saving…' : '💾 Save Commission'}
              </button>
            </div>
          </SCard>
        )}
      </div>
    </AdminShell>
  );
}
