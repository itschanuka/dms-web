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
    page:     isDark ? '#141c2e' : '#dde6f0',
    card:     isDark ? '#1c2538' : '#cdd8ea',
    card2:    isDark ? '#111827' : '#c0d0e0',
    border:   isDark ? '#263550' : '#aec2d6',
    text:     isDark ? '#e8f0fc' : '#0f1e32',
    muted:    isDark ? '#5a7295' : '#4a6278',
    input:    isDark ? '#0e1729' : '#b8c8db',
    inputTxt: isDark ? '#d4e2f4' : '#0f1e32',
    label:    isDark ? '#94aec8' : '#2a4260',
    accent:   '#f97316',
    surface:  isDark ? '#0e1729' : '#b8cfe0',
  };
}

const ROLE_CFG: Record<string, { color: string; bg: string; border: string }> = {
  admin:       { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.3)' },
  manager:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'  },
  salesperson: { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  accountant:  { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)'  },
};

// ─────────────────────────────────────────────────────────────
// Each nav section mapped to what the role gets by default
// and which extra permission flags can be toggled.
// ─────────────────────────────────────────────────────────────

interface PermFlag {
  key: string;
  label: string;
  desc: string;
  tag: 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'EXPORT' | 'ACTION';
}

interface NavModule {
  id: string;
  label: string;
  icon: string;
  /** What the role already has without any flags */
  roleAccess: Record<string, string>;   // role -> description, '*' for default
  /** Extra toggleable flags for this module */
  flags: PermFlag[];
}

const NAV_MODULES: NavModule[] = [
  {
    id: 'dashboard', label: 'Dashboard', icon: '📊',
    roleAccess: { '*': 'View summary stats' },
    flags: [],
  },
  {
    id: 'inventory', label: 'Inventory', icon: '🚗',
    roleAccess: {
      admin:       'Full access — View · Create · Edit · Delete · Status',
      manager:     'View · Create · Edit · Status changes',
      salesperson: 'View only',
      accountant:  'View only',
    },
    flags: [
      { key: 'edit_price',     label: 'Edit Price',   desc: 'Change vehicle asking / minimum price',   tag: 'EDIT'   },
      { key: 'view_profit',    label: 'View Profit',  desc: 'See cost, profit margin on vehicles',     tag: 'VIEW'   },
      { key: 'delete_records', label: 'Delete',       desc: 'Soft-delete vehicles from inventory',     tag: 'DELETE' },
    ],
  },
  {
    id: 'crm', label: 'CRM', icon: '🎯',
    roleAccess: {
      '*': 'View · Create · Edit leads & follow-ups',
    },
    flags: [
      { key: 'delete_records', label: 'Delete Leads', desc: 'Soft-delete leads from the system', tag: 'DELETE' },
    ],
  },
  {
    id: 'deals', label: 'Deals', icon: '🤝',
    roleAccess: {
      admin:       'Full access — View · Create · Edit · Complete · Cancel',
      manager:     'View · Create · Edit · Complete deals',
      salesperson: 'View · Create deals',
      accountant:  'View deals',
    },
    flags: [
      { key: 'approve_discount', label: 'Approve Discount', desc: 'Apply discounts to any deal',         tag: 'ACTION' },
      { key: 'cancel_deal',      label: 'Cancel Deal',      desc: 'Cancel active or reserved deals',     tag: 'ACTION' },
      { key: 'view_profit',      label: 'View Profit',      desc: 'See profit breakdown on deal detail', tag: 'VIEW'   },
    ],
  },
  {
    id: 'customers', label: 'Customers', icon: '👥',
    roleAccess: {
      '*': 'View · Create · Edit customer records',
    },
    flags: [
      { key: 'blacklist_customer', label: 'Blacklist',  desc: 'Mark / unmark customers as blacklisted', tag: 'ACTION' },
      { key: 'delete_records',     label: 'Delete',     desc: 'Soft-delete customer records',           tag: 'DELETE' },
    ],
  },
  {
    id: 'commissions', label: 'Commissions', icon: '💸',
    roleAccess: {
      admin:       'View all · Mark paid · Override amounts',
      manager:     'View all · Mark paid',
      salesperson: 'View own commissions only',
      accountant:  'No base access',
    },
    flags: [],
  },
  {
    id: 'expenses', label: 'Expenses', icon: '💳',
    roleAccess: {
      admin:       'View · Create · Edit · Delete',
      manager:     'View · Create · Edit',
      salesperson: 'No base access',
      accountant:  'No base access',
    },
    flags: [],
  },
  {
    id: 'employees', label: 'Employees', icon: '👤',
    roleAccess: {
      admin:       'Full access — View all · Create · Edit · Deactivate',
      manager:     'View all employee profiles',
      salesperson: 'View own profile only',
      accountant:  'View own profile only',
    },
    flags: [
      { key: 'manage_employees', label: 'Manage Employees', desc: 'Create, edit, deactivate other employees', tag: 'ACTION' },
    ],
  },
  {
    id: 'reports', label: 'Reports', icon: '📈',
    roleAccess: {
      admin:       'Full access to all reports',
      manager:     'Full access to all reports',
      salesperson: 'No base access',
      accountant:  'No base access',
    },
    flags: [
      { key: 'view_reports',   label: 'View Reports',   desc: 'Access all analytics & report pages', tag: 'VIEW'   },
      { key: 'export_reports', label: 'Export Reports', desc: 'Download reports as PDF / Excel / CSV', tag: 'EXPORT' },
      { key: 'view_profit',    label: 'View Profit',    desc: 'See profit figures inside reports',    tag: 'VIEW'   },
    ],
  },
  {
    id: 'trash', label: 'Trash', icon: '🗑️',
    roleAccess: {
      admin:       'View · Restore · Permanently delete',
      manager:     'View · Restore records',
      salesperson: 'No base access',
      accountant:  'No base access',
    },
    flags: [],
  },
  {
    id: 'audit', label: 'Audit Log', icon: '🔍',
    roleAccess: {
      admin:   'Full access — View & verify chain',
      manager: 'View audit log',
      '*':     'No base access',
    },
    flags: [
      { key: 'audit_view', label: 'View Audit Log', desc: 'Read the full system audit trail', tag: 'VIEW' },
    ],
  },
  {
    id: 'backups', label: 'Backups', icon: '💾',
    roleAccess: {
      admin:   'View · Trigger · Download · Delete backups',
      manager: 'View · Trigger backups',
      '*':     'No base access',
    },
    flags: [
      { key: 'backup_download', label: 'Download Backups', desc: 'Download backup archive files', tag: 'ACTION' },
    ],
  },
];

const TAG_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  VIEW:   { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',   border: 'rgba(56,189,248,0.3)'  },
  CREATE: { color: '#34d399', bg: 'rgba(52,211,153,0.12)',   border: 'rgba(52,211,153,0.3)'  },
  EDIT:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.3)'  },
  DELETE: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.25)'  },
  EXPORT: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',  border: 'rgba(167,139,250,0.3)' },
  ACTION: { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',   border: 'rgba(251,146,60,0.3)'  },
};

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

// ─────────────────────────────────────────────────────────────
// Toggle switch
// ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div
      onClick={disabled ? undefined : (e) => { e.stopPropagation(); onChange(); }}
      style={{
        width: 42, height: 23, borderRadius: 12, flexShrink: 0,
        background: on ? '#f97316' : 'rgba(128,128,128,0.2)',
        border: `1px solid ${on ? 'rgba(249,115,22,0.5)' : 'rgba(128,128,128,0.25)'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background .18s, border .18s',
        boxShadow: on ? '0 0 0 3px rgba(249,115,22,0.18)' : 'none',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: on ? 21 : 2,
        width: 17, height: 17, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        transition: 'left .18s',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Module accordion card
// ─────────────────────────────────────────────────────────────
function ModuleCard({
  mod, role, perms, onChange, t, isAdmin,
}: {
  mod: NavModule;
  role: string;
  perms: Record<string, boolean>;
  onChange: (key: string) => void;
  t: ReturnType<typeof tok>;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  const roleDesc = mod.roleAccess[role] ?? mod.roleAccess['*'] ?? 'No base access';
  const noAccess = roleDesc === 'No base access';
  const activeFlags = mod.flags.filter(f => perms[f.key]).length;
  const hasFlags = mod.flags.length > 0;

  // Accent the card header if any flag is active
  const anyActive = activeFlags > 0;

  return (
    <div style={{
      border: `1px solid ${anyActive ? 'rgba(249,115,22,0.35)' : t.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      background: t.card,
      transition: 'border-color .15s',
    }}>
      {/* ── Header row ── */}
      <div
        onClick={() => hasFlags && setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 16px',
          cursor: hasFlags ? 'pointer' : 'default',
          background: anyActive ? 'rgba(249,115,22,0.04)' : 'transparent',
          borderBottom: open ? `1px solid ${t.border}` : 'none',
          userSelect: 'none',
        }}
      >
        {/* Icon + name */}
        <span style={{ fontSize: 18, lineHeight: 1 }}>{mod.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: anyActive ? '#f97316' : t.text }}>
            {mod.label}
          </div>
          <div style={{
            fontSize: 11, marginTop: 2,
            color: noAccess ? 'rgba(239,68,68,0.7)' : 'rgba(52,211,153,0.8)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>{noAccess ? '🔒' : '✓'}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roleDesc}</span>
          </div>
        </div>

        {/* Flag count badge */}
        {hasFlags && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: anyActive ? 'rgba(249,115,22,0.15)' : 'rgba(128,128,128,0.1)',
            color: anyActive ? '#f97316' : t.muted,
            border: `1px solid ${anyActive ? 'rgba(249,115,22,0.3)' : 'transparent'}`,
            whiteSpace: 'nowrap',
          }}>
            {activeFlags}/{mod.flags.length}
          </span>
        )}

        {/* Expand chevron */}
        {hasFlags && (
          <span style={{
            color: t.muted, fontSize: 10, transition: 'transform .2s',
            transform: open ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
          }}>▼</span>
        )}
        {!hasFlags && (
          <span style={{ fontSize: 10, color: t.muted, whiteSpace: 'nowrap' }}>
            no extra flags
          </span>
        )}
      </div>

      {/* ── Flag rows (expanded) ── */}
      {open && hasFlags && (
        <div onClick={e => e.stopPropagation()} style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mod.flags.map(flag => {
            const tc = TAG_COLORS[flag.tag]!;
            const active = perms[flag.key] ?? false;
            return (
              <div
                key={flag.key}
                onClick={() => isAdmin && onChange(flag.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 9,
                  background: active ? 'rgba(249,115,22,0.07)' : t.card2,
                  border: `1px solid ${active ? 'rgba(249,115,22,0.28)' : t.border}`,
                  cursor: isAdmin ? 'pointer' : 'default',
                  transition: 'all .14s',
                }}
              >
                {/* Tag pill */}
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.1em',
                  padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                  color: tc.color, background: tc.bg, border: `1px solid ${tc.border}`,
                  textTransform: 'uppercase',
                }}>{flag.tag}</span>

                {/* Label + desc */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#f97316' : t.text }}>
                    {flag.label}
                  </div>
                  <div style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>{flag.desc}</div>
                </div>

                {/* Toggle */}
                <Toggle on={active} onChange={() => onChange(flag.key)} disabled={!isAdmin} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const { isDark } = useTheme();
  const t = tok(isDark);
  const params = useParams();
  const router = useRouter();
  const { employee: me } = useAuth();

  const empId   = params['id'] as string;
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
  const [perms,     setPerms]     = useState<Record<string, boolean>>({});
  const [savedPerms,setSavedPerms]= useState<Record<string, boolean>>({});
  const [commType,  setCommType]  = useState('');
  const [commValue, setCommValue] = useState('');
  const [showReset,    setShowReset]    = useState(false);
  const [newTempPass,  setNewTempPass]  = useState('');

  const hasUnsaved = Object.keys(perms).some(k => perms[k] !== savedPerms[k]);

  const flash = (m: string, isErr = false) => {
    if (isErr) setErr(m); else setMsg(m);
    setTimeout(() => { setMsg(''); setErr(''); }, 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const e = await employeeApi.get(empId);
      setEmp(e);
      const p = e.employee_permissions;
      if (p) {
        const mapped = {
          view_profit: p.view_profit, edit_price: p.edit_price,
          delete_records: p.delete_records, view_reports: p.view_reports,
          manage_employees: p.manage_employees, audit_view: p.audit_view,
          backup_download: p.backup_download, approve_discount: p.approve_discount,
          cancel_deal: p.cancel_deal, blacklist_customer: p.blacklist_customer,
          export_reports: p.export_reports,
        };
        setPerms(mapped);
        setSavedPerms(mapped);
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

  const handleToggle = (key: string) =>
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      await employeeApi.updatePermissions(empId, perms);
      setSavedPerms({ ...perms });
      flash('Permissions saved ✓');
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

  // Total granted flags
  const totalGranted = Object.values(perms).filter(Boolean).length;
  const totalFlags   = Object.keys(perms).length;

  return (
    <AdminShell activePage="employees">
      <div style={{ minHeight: '100vh', background: t.page, padding: '28px 32px' }}>

        {/* Flash messages */}
        {msg && <div style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, padding: '12px 18px', color: '#34d399', marginBottom: 16, fontSize: 14 }}>{msg}</div>}
        {err && <div style={{ background: 'rgba(239,68,68,0.1)',  border: '1px solid rgba(239,68,68,0.3)',  borderRadius: 10, padding: '12px 18px', color: '#ef4444', marginBottom: 16, fontSize: 14 }}>{err}</div>}

        {/* ── Employee header ── */}
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

        {/* Reset Auth panel */}
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

        {/* ── Tabs ── */}
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

        {/* ══════════════════════════════
            PROFILE TAB
        ══════════════════════════════ */}
        {tab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <SCard title="Contact Info" t={t}>
              <InfoRow label="Email"   value={emp.email} />
              <InfoRow label="Phone"   value={emp.phone ?? '—'} />
              <InfoRow label="Address" value={emp.address ?? '—'} />
              <InfoRow label="NIC"     value={emp.nic ?? '—'} />
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

        {/* ══════════════════════════════
            PERFORMANCE TAB
        ══════════════════════════════ */}
        {tab === 'performance' && (
          <div>
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
                  { label: 'Deals Closed',    val: perf.deals_closed,    color: '#818cf8', money: false },
                  { label: 'Total Revenue',   val: perf.total_revenue,   color: '#34d399', money: true  },
                  { label: 'Leads Assigned',  val: perf.leads_assigned,  color: '#38bdf8', money: false },
                  { label: 'Conversion Rate', val: `${perf.conversion_rate}%`, color: '#f59e0b', money: false },
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

        {/* ══════════════════════════════════════════════════════
            PERMISSIONS TAB — nav-module-based layout
        ══════════════════════════════════════════════════════ */}
        {tab === 'permissions' && isAdmin && (
          <div>
            {/* ── Summary strip ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: t.card, border: `1px solid ${t.border}`,
              borderRadius: 12, padding: '14px 20px', marginBottom: 18,
              flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                {/* Stat */}
                <div>
                  <div style={{ fontSize: 10, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>
                    Extra flags granted
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: totalGranted > 0 ? '#f97316' : t.muted, lineHeight: 1 }}>
                      {totalGranted}
                    </span>
                    <span style={{ fontSize: 13, color: t.muted }}>/ {totalFlags}</span>
                  </div>
                </div>
                {/* Progress */}
                <div style={{ width: 140, height: 5, background: t.surface, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${totalFlags > 0 ? (totalGranted / totalFlags) * 100 : 0}%`,
                    background: 'linear-gradient(90deg,#f97316,#fb923c)',
                    transition: 'width .3s',
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
                  color: rc.color, background: rc.bg, border: `1px solid ${rc.border}`,
                }}>
                  🎭 {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                  {emp.role === 'admin' ? ' — full access by default' : ''}
                </span>
                {hasUnsaved && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                    Unsaved changes
                  </span>
                )}
              </div>
            </div>

            {/* ── How to use hint ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              marginBottom: 16, padding: '10px 14px',
              background: 'rgba(56,189,248,0.06)', borderRadius: 8,
              border: '1px solid rgba(56,189,248,0.15)',
            }}>
              <span style={{ fontSize: 12, color: '#38bdf8' }}>
                ℹ️ Click any <strong>navigation section</strong> to expand its extra permissions. Green lock = role has base access. Red lock = role has no access by default.
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
                {Object.entries(TAG_COLORS).map(([tag, s]) => (
                  <span key={tag} style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                    padding: '2px 6px', borderRadius: 3,
                    color: s.color, background: s.bg, border: `1px solid ${s.border}`,
                    textTransform: 'uppercase',
                  }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Admin shortcut note */}
            {emp.role === 'admin' && (
              <div style={{
                background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.25)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                fontSize: 13, color: '#818cf8',
              }}>
                👑 This employee is an <strong>Admin</strong>. Admins have full access to everything — permission flags are not evaluated for admin accounts.
              </div>
            )}

            {/* ── Module grid ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 22,
            }}>
              {NAV_MODULES.map(mod => (
                <ModuleCard
                  key={mod.id}
                  mod={mod}
                  role={emp.role}
                  perms={perms}
                  onChange={handleToggle}
                  t={t}
                  isAdmin={isAdmin}
                />
              ))}
            </div>

            {/* Shared-flag footnote */}
            <div style={{
              fontSize: 12, color: t.muted, padding: '10px 14px',
              background: t.card, borderRadius: 8, border: `1px solid ${t.border}`,
              marginBottom: 20,
            }}>
              ℹ️ <strong style={{ color: t.text }}>Shared flags:</strong> <em>Delete Records</em> and <em>View Profit</em> appear in multiple sections but share one underlying DB flag — toggling it anywhere updates it everywhere.
            </div>

            {/* ── Sticky save bar ── */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12,
              position: 'sticky', bottom: 20,
              background: t.card,
              border: `1px solid ${hasUnsaved ? 'rgba(249,115,22,0.45)' : t.border}`,
              borderRadius: 12, padding: '12px 18px',
              boxShadow: hasUnsaved ? '0 4px 28px rgba(249,115,22,0.18)' : '0 2px 8px rgba(0,0,0,0.12)',
              transition: 'all .2s',
            }}>
              <span style={{ flex: 1, fontSize: 13, color: hasUnsaved ? '#f59e0b' : t.muted }}>
                {hasUnsaved ? '⚠️ You have unsaved changes' : '✓ All permissions saved'}
              </span>
              <button
                onClick={() => setPerms({ ...savedPerms })}
                disabled={saving || !hasUnsaved}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'transparent', color: t.muted, border: `1px solid ${t.border}`,
                  cursor: hasUnsaved ? 'pointer' : 'not-allowed',
                  opacity: hasUnsaved ? 1 : 0.4,
                }}
              >
                Discard
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={saving || !hasUnsaved}
                style={{
                  padding: '9px 22px', borderRadius: 9, fontSize: 14, fontWeight: 700,
                  background: hasUnsaved ? '#f97316' : 'rgba(249,115,22,0.3)',
                  color: hasUnsaved ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: 'none',
                  cursor: hasUnsaved ? 'pointer' : 'not-allowed',
                  transition: 'all .18s',
                }}
              >
                {saving ? 'Saving…' : '💾 Save Permissions'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            COMMISSION TAB
        ══════════════════════════════ */}
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
                  <option value="fixed">Fixed Amount (LKR)</option>
                  <option value="percent_price">% of Selling Price</option>
                  <option value="percent_profit">% of Gross Profit</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: t.label, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  {commType === 'fixed' ? 'Fixed Amount (LKR)' : 'Rate (%)'}
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
                  ? `LKR ${commValue} per deal`
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