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

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE ROUTE-ACCURATE MODULE DEFINITIONS
//
// Every entry is verified against the actual Express routes:
//   - requireRole(...)     → role-gated, no flag can override
//   - requirePermission(.) → flag-gated at API level (marked ★ API)
//   - no guard             → all authenticated roles
//   - Frontend-only gate   → flag only controls UI visibility (marked ★ UI)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CRUD FLAG DEFINITIONS
//
// Each module defines exactly which CRUD operations exist in its UI + API.
// crudFlags maps each CrudOp → the DB permission column key.
// extraFlags are legacy/special flags that still apply to the module.
//
// Admin role ALWAYS bypasses all flag checks.
// Non-admin: flag must be true for that operation to be allowed.
// ─────────────────────────────────────────────────────────────────────────────

type CrudOp = 'READ' | 'CREATE' | 'EDIT' | 'DELETE';

const CRUD_COLORS: Record<CrudOp, { color: string; bg: string; border: string }> = {
  READ:   { color: '#38bdf8', bg: 'rgba(56,189,248,0.13)',  border: 'rgba(56,189,248,0.32)'  },
  CREATE: { color: '#34d399', bg: 'rgba(52,211,153,0.13)',  border: 'rgba(52,211,153,0.32)'  },
  EDIT:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.13)',  border: 'rgba(245,158,11,0.32)'  },
  DELETE: { color: '#ef4444', bg: 'rgba(239,68,68,0.13)',   border: 'rgba(239,68,68,0.28)'   },
};

interface CrudFlagDef {
  op:          CrudOp;
  key:         string;   // DB column name in employee_permissions
  desc:        string;   // tooltip / description
  roleDefault: string[]; // roles that have this by default (for display reference)
}

interface ExtraFlag {
  key:         string;
  label:       string;
  desc:        string;
  apiEnforced: boolean;
}

interface NavModule {
  id:         string;
  label:      string;
  icon:       string;
  crudFlags:  CrudFlagDef[];   // the actual CRUD permission toggles
  extraFlags: ExtraFlag[];     // legacy / special-purpose flags for this module
  roleNote:   Record<string, string>; // short role-specific description
  blockedFor: string[];        // roles blocked entirely at API level (no flags possible)
}

const NAV_MODULES: NavModule[] = [
  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  {
    id: 'dashboard', label: 'Dashboard', icon: '📊',
    crudFlags: [
      { op: 'READ', key: 'dashboard_read', desc: 'Access the dashboard page and view stats', roleDefault: ['manager','salesperson','accountant'] },
    ],
    extraFlags: [],
    roleNote: {
      admin:       'Full stats — revenue, inventory, deal pipeline',
      manager:     'Full stats — revenue, inventory, deal pipeline',
      salesperson: 'Own activity — assigned leads and own deals only',
      accountant:  'Summary stats — revenue overview',
    },
    blockedFor: [],
  },

  // ── INVENTORY ──────────────────────────────────────────────────────────────
  {
    id: 'inventory', label: 'Inventory', icon: '🚗',
    crudFlags: [
      { op: 'READ',   key: 'inventory_read',   desc: 'View vehicle listings, details, documents', roleDefault: ['manager','salesperson','accountant'] },
      { op: 'CREATE', key: 'inventory_create', desc: 'Add new vehicles to inventory',             roleDefault: ['manager'] },
      { op: 'EDIT',   key: 'inventory_edit',   desc: 'Edit vehicle details, status, costs, documents, website toggle', roleDefault: ['manager'] },
      { op: 'DELETE', key: 'inventory_delete', desc: 'Soft-delete vehicles (moves to Trash)',     roleDefault: ['manager'] },
    ],
    extraFlags: [
      { key: 'edit_price',  label: 'Edit Asking / Min Price', desc: 'Change asking price and minimum acceptable price — API enforced', apiEnforced: true },
      { key: 'view_profit', label: 'View Cost & Profit Data', desc: 'See purchase cost, repair costs and profit margin — API enforced', apiEnforced: true },
    ],
    roleNote: {
      admin:       'Full access — all CRUD + costs + documents + website',
      manager:     'Full access — all CRUD + costs + documents + website',
      salesperson: 'View listings only — no cost or profit data by default',
      accountant:  'View listings only — no cost or profit data by default',
    },
    blockedFor: [],
  },

  // ── CRM ────────────────────────────────────────────────────────────────────
  {
    id: 'crm', label: 'CRM', icon: '🎯',
    crudFlags: [
      { op: 'READ',   key: 'crm_read',   desc: 'View leads and follow-up history',       roleDefault: ['manager','salesperson','accountant'] },
      { op: 'CREATE', key: 'crm_create', desc: 'Create new leads',                        roleDefault: ['manager','salesperson','accountant'] },
      { op: 'EDIT',   key: 'crm_edit',   desc: 'Edit leads, update status, add follow-ups', roleDefault: ['manager','salesperson','accountant'] },
      { op: 'DELETE', key: 'crm_delete', desc: 'Soft-delete leads (moves to Trash) — also requires Manager+ role', roleDefault: ['manager'] },
    ],
    extraFlags: [],
    roleNote: {
      admin:       'Full access — view all, create, edit, reassign, delete',
      manager:     'Full access — view all, create, edit, reassign, delete',
      salesperson: 'View own assigned leads, create, edit, update status',
      accountant:  'View all leads, create, edit, update status',
    },
    blockedFor: [],
  },

  // ── DEALS ──────────────────────────────────────────────────────────────────
  {
    id: 'deals', label: 'Deals', icon: '🤝',
    crudFlags: [
      { op: 'READ',   key: 'deals_read',   desc: 'View deals, payments, finance, trade-in, delivery', roleDefault: ['manager','salesperson','accountant'] },
      { op: 'CREATE', key: 'deals_create', desc: 'Create new deals',                                   roleDefault: ['manager','salesperson'] },
      { op: 'EDIT',   key: 'deals_edit',   desc: 'Edit deals, add payments, update finance / trade-in / delivery', roleDefault: ['manager','salesperson','accountant'] },
      { op: 'DELETE', key: 'deals_delete', desc: 'Soft-delete deals — also requires Manager+ role',    roleDefault: ['manager'] },
    ],
    extraFlags: [
      { key: 'approve_discount', label: 'Apply Discount',      desc: 'Apply a discount amount to a deal — API enforced',      apiEnforced: true },
      { key: 'cancel_deal',      label: 'Cancel Deal',         desc: 'Cancel active or reserved deals — API enforced',         apiEnforced: true },
      { key: 'view_profit',      label: 'View Profit Breakdown', desc: 'Access gross/net profit on each deal — API enforced', apiEnforced: true },
    ],
    roleNote: {
      admin:       'Full access — create, edit, complete, cancel, delete',
      manager:     'Full access — create, edit, complete, delete (cancel needs flag)',
      salesperson: 'Create, edit, payments, finance, trade-in, delivery (no complete/delete)',
      accountant:  'View and edit payments/finance — cannot create or delete',
    },
    blockedFor: [],
  },

  // ── CUSTOMERS ──────────────────────────────────────────────────────────────
  {
    id: 'customers', label: 'Customers', icon: '👥',
    crudFlags: [
      { op: 'READ',   key: 'customers_read',   desc: 'View customer profiles, notes, deal history', roleDefault: ['manager','salesperson','accountant'] },
      { op: 'CREATE', key: 'customers_create', desc: 'Create new customer records',                  roleDefault: ['manager','salesperson','accountant'] },
      { op: 'EDIT',   key: 'customers_edit',   desc: 'Edit customer details and manage notes',       roleDefault: ['manager','salesperson','accountant'] },
      { op: 'DELETE', key: 'customers_delete', desc: 'Soft-delete customers — also requires delete_records flag', roleDefault: [] },
    ],
    extraFlags: [
      { key: 'blacklist_customer', label: 'Blacklist Customer',      desc: 'Mark customers as blacklisted — API enforced', apiEnforced: true },
      { key: 'delete_records',     label: 'Delete Customer Records', desc: 'Soft-delete customer records (moves to Trash) — API enforced', apiEnforced: true },
    ],
    roleNote: {
      admin:       'Full access — create, edit, blacklist, remove blacklist, delete',
      manager:     'Create, edit, manage notes — blacklist needs flag',
      salesperson: 'Create, edit, manage notes — blacklist needs flag',
      accountant:  'Create, edit, manage notes — blacklist needs flag',
    },
    blockedFor: [],
  },

  // ── COMMISSIONS ────────────────────────────────────────────────────────────
  {
    id: 'commissions', label: 'Commissions', icon: '💸',
    crudFlags: [
      { op: 'READ', key: 'commissions_read', desc: 'View commissions, stats, summaries', roleDefault: ['manager','salesperson','accountant'] },
      { op: 'EDIT', key: 'commissions_edit', desc: 'Mark commissions as paid or override amounts — also requires Manager+ role', roleDefault: ['manager'] },
    ],
    extraFlags: [],
    roleNote: {
      admin:       'View all · Mark paid · Override amounts · View stats',
      manager:     'View all · Mark paid · View stats',
      salesperson: 'View own commissions only',
      accountant:  'View all commissions · View stats',
    },
    blockedFor: [],
  },

  // ── EXPENSES ───────────────────────────────────────────────────────────────
  // router.use(requireRole('manager','admin')) blocks salesperson & accountant entirely
  {
    id: 'expenses', label: 'Expenses', icon: '💳',
    crudFlags: [
      { op: 'READ',   key: 'expenses_read',   desc: 'View expense records and totals', roleDefault: ['manager'] },
      { op: 'CREATE', key: 'expenses_create', desc: 'Create new expense records',      roleDefault: ['manager'] },
      { op: 'EDIT',   key: 'expenses_edit',   desc: 'Edit existing expense records',   roleDefault: ['manager'] },
      { op: 'DELETE', key: 'expenses_delete', desc: 'Delete expense records — also requires Admin role', roleDefault: [] },
    ],
    extraFlags: [],
    roleNote: {
      admin:       'Full access — create, edit, delete',
      manager:     'Create and edit — delete requires Admin',
      salesperson: 'No access — blocked at API level',
      accountant:  'No access — blocked at API level',
    },
    blockedFor: ['salesperson', 'accountant'],
  },

  // ── EMPLOYEES ──────────────────────────────────────────────────────────────
  {
    id: 'employees', label: 'Employees', icon: '👤',
    crudFlags: [
      { op: 'READ',   key: 'employees_read',   desc: 'View employee list and profiles',                    roleDefault: ['manager'] },
      { op: 'CREATE', key: 'employees_create', desc: 'Create new employee accounts — also requires Admin role', roleDefault: [] },
      { op: 'EDIT',   key: 'employees_edit',   desc: 'Edit profiles, permissions, commission, status — also requires Admin role', roleDefault: [] },
      { op: 'DELETE', key: 'employees_delete', desc: 'Deactivate and remove employees — also requires Admin role', roleDefault: [] },
    ],
    extraFlags: [
      { key: 'manage_employees', label: 'Show Employee Management (UI only)', desc: 'Show create/edit controls in UI — API routes still require Admin role', apiEnforced: false },
    ],
    roleNote: {
      admin:       'Full access — create, edit permissions, commission, status, delete',
      manager:     'View all employee profiles and performance',
      salesperson: 'View own profile and performance only',
      accountant:  'View own profile and performance only',
    },
    blockedFor: [],
  },

  // ── REPORTS ────────────────────────────────────────────────────────────────
  // ALL routes → requireRole('manager','admin')
  {
    id: 'reports', label: 'Reports', icon: '📈',
    crudFlags: [
      { op: 'READ', key: 'reports_read', desc: 'Access the reports section — also requires Manager+ role at API', roleDefault: ['manager'] },
    ],
    extraFlags: [
      { key: 'view_reports',   label: 'Show Reports in Nav (UI only)', desc: 'Show Reports in the nav sidebar — API still requires Manager+ for data', apiEnforced: false },
      { key: 'export_reports', label: 'Export Reports',                desc: 'Enable PDF / Excel / CSV export on report pages — API enforced',         apiEnforced: true  },
      { key: 'view_profit',    label: 'Show Profit Columns',           desc: 'Include profit and margin columns in all report data',                    apiEnforced: false },
    ],
    roleNote: {
      admin:       'All reports — inventory, CRM, sales, customers, employees, commissions, expenses',
      manager:     'All reports — export PDF / Excel / CSV',
      salesperson: 'No access — blocked at API level',
      accountant:  'No access — blocked at API level',
    },
    blockedFor: ['salesperson', 'accountant'],
  },

  // ── TRASH ──────────────────────────────────────────────────────────────────
  {
    id: 'trash', label: 'Trash', icon: '🗑️',
    crudFlags: [
      { op: 'READ',   key: 'trash_read',   desc: 'View soft-deleted records — also requires Manager+ role',   roleDefault: ['manager'] },
      { op: 'DELETE', key: 'trash_delete', desc: 'Restore or permanently delete records — also requires Admin role', roleDefault: [] },
    ],
    extraFlags: [],
    roleNote: {
      admin:       'View, restore, and permanently delete records',
      manager:     'View deleted records only — restore & permanent delete require Admin',
      salesperson: 'No access — blocked at API level',
      accountant:  'No access — blocked at API level',
    },
    blockedFor: ['salesperson', 'accountant'],
  },

  // ── AUDIT LOG ──────────────────────────────────────────────────────────────
  {
    id: 'audit', label: 'Audit Log', icon: '🔍',
    crudFlags: [
      { op: 'READ', key: 'audit_read', desc: 'View and search the audit log — also requires Manager+ role at API', roleDefault: ['manager'] },
    ],
    extraFlags: [
      { key: 'audit_view', label: 'Show Audit Log in Nav (UI only)', desc: 'Show Audit Log in navigation — API requires Manager+ for actual data', apiEnforced: false },
    ],
    roleNote: {
      admin:       'Full log — search, filter, verify chain integrity',
      manager:     'Full audit log — search and filter',
      salesperson: 'No access — blocked at API level',
      accountant:  'No access — blocked at API level',
    },
    blockedFor: ['salesperson', 'accountant'],
  },

  // ── BACKUPS ────────────────────────────────────────────────────────────────
  {
    id: 'backups', label: 'Backups', icon: '💾',
    crudFlags: [
      { op: 'READ',   key: 'backups_read',   desc: 'View backup history and stats — also requires Manager+ role', roleDefault: ['manager'] },
      { op: 'CREATE', key: 'backups_create', desc: 'Trigger manual backups — also requires Admin role',            roleDefault: [] },
      { op: 'DELETE', key: 'backups_delete', desc: 'Delete backup records — also requires Admin role',             roleDefault: [] },
    ],
    extraFlags: [
      { key: 'backup_download', label: 'Download Backup Files', desc: 'Download backup archive files — API enforced (works for Manager role)', apiEnforced: true },
    ],
    roleNote: {
      admin:       'View, trigger, download, delete backup records',
      manager:     'View history and stats — trigger & delete require Admin',
      salesperson: 'No access — blocked at API level',
      accountant:  'No access — blocked at API level',
    },
    blockedFor: ['salesperson', 'accountant'],
  },
];

// ─────────────────────────────────────────────────────────────
// Tag colour config (for extra flags)
// ─────────────────────────────────────────────────────────────
type FlagTag = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'EXPORT' | 'ACTION';
const TAG_COLORS: Record<FlagTag, { color: string; bg: string; border: string }> = {
  VIEW:   { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',   border: 'rgba(56,189,248,0.3)'  },
  CREATE: { color: '#34d399', bg: 'rgba(52,211,153,0.12)',   border: 'rgba(52,211,153,0.3)'  },
  EDIT:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.3)'  },
  DELETE: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.25)'  },
  EXPORT: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',  border: 'rgba(167,139,250,0.3)' },
  ACTION: { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',   border: 'rgba(251,146,60,0.3)'  },
};

type Tab = 'profile' | 'performance' | 'permissions' | 'commission';

// ─────────────────────────────────────────────────────────────
// Shared layout components
// ─────────────────────────────────────────────────────────────
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
// Toggle switch (stop propagation built in)
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
        position: 'absolute', top: 2, left: on ? 21 : 2,
        width: 17, height: 17, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left .18s',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Module Card — accordion with accurate role + flag info
// ─────────────────────────────────────────────────────────────
function ModuleCard({
  mod, role, perms, onChange, t, canEdit,
}: {
  mod: NavModule;
  role: string;
  perms: Record<string, boolean>;
  onChange: (key: string) => void;
  t: ReturnType<typeof tok>;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);

  const isBlocked   = mod.blockedFor.includes(role);
  const allKeys     = [...mod.crudFlags.map(f => f.key), ...mod.extraFlags.map(f => f.key)];
  const hasToggles  = allKeys.length > 0;
  const activeCount = allKeys.filter(k => perms[k]).length;
  const anyActive   = activeCount > 0;

  const ALL_OPS: CrudOp[] = ['READ', 'CREATE', 'EDIT', 'DELETE'];
  const moduleOps = mod.crudFlags.map(f => f.op);

  return (
    <div style={{
      border: `1px solid ${isBlocked ? 'rgba(239,68,68,0.22)' : anyActive ? 'rgba(249,115,22,0.4)' : t.border}`,
      borderRadius: 12, background: t.card, overflow: 'hidden', transition: 'border-color .15s',
    }}>
      {/* ── Header ── */}
      <div
        onClick={() => { if (hasToggles && !isBlocked) setOpen(v => !v); }}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '11px 13px',
          cursor: (hasToggles && !isBlocked) ? 'pointer' : 'default',
          background: isBlocked ? 'rgba(239,68,68,0.04)' : anyActive ? 'rgba(249,115,22,0.04)' : 'transparent',
          borderBottom: open ? `1px solid ${t.border}` : 'none',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 3 }}>{mod.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + CRUD indicator badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: isBlocked ? 'rgba(239,68,68,0.8)' : anyActive ? '#f97316' : t.text,
            }}>
              {mod.label}
            </span>

            {isBlocked ? (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
                color: '#ef4444', background: 'rgba(239,68,68,0.13)', border: '1px solid rgba(239,68,68,0.3)',
              }}>🔒 NO ACCESS</span>
            ) : (
              ALL_OPS.map(op => {
                const def = mod.crudFlags.find(f => f.op === op);
                if (!moduleOps.includes(op)) {
                  return (
                    <span key={op} style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                      color: 'rgba(128,128,128,0.2)', border: '1px solid rgba(128,128,128,0.07)',
                    }}>{op}</span>
                  );
                }
                if (!def) return null;
                const active = perms[def.key] ?? false;
                const cc = CRUD_COLORS[op];
                return (
                  <span key={op} style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 3,
                    color:      active ? cc.color : 'rgba(128,128,128,0.4)',
                    background: active ? cc.bg    : 'transparent',
                    border:    `1px solid ${active ? cc.border : 'rgba(128,128,128,0.12)'}`,
                  }}>{op}</span>
                );
              })
            )}

            {!isBlocked && hasToggles && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, marginLeft: 2,
                background: anyActive ? 'rgba(249,115,22,0.14)' : 'rgba(128,128,128,0.08)',
                color: anyActive ? '#f97316' : t.muted,
                border: `1px solid ${anyActive ? 'rgba(249,115,22,0.28)' : 'transparent'}`,
              }}>
                {activeCount}/{allKeys.length}
              </span>
            )}
          </div>

          {/* Role note */}
          <div style={{ fontSize: 11, color: isBlocked ? 'rgba(239,68,68,0.6)' : t.muted, lineHeight: 1.4 }}>
            {mod.roleNote[role] ?? mod.roleNote['admin']}
          </div>
        </div>

        {hasToggles && !isBlocked && (
          <span style={{
            color: t.muted, fontSize: 10, flexShrink: 0, marginTop: 4,
            transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none',
          }}>▼</span>
        )}
      </div>

      {/* ── Toggle rows (expanded) ── */}
      {open && !isBlocked && (
        <div onClick={e => e.stopPropagation()} style={{ padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* CRUD flag rows */}
          {mod.crudFlags.map(flag => {
            const active = perms[flag.key] ?? false;
            const cc = CRUD_COLORS[flag.op];
            return (
              <div
                key={flag.key}
                onClick={() => canEdit && onChange(flag.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 9,
                  background: active ? 'rgba(249,115,22,0.07)' : t.card2,
                  border: `1px solid ${active ? 'rgba(249,115,22,0.28)' : t.border}`,
                  cursor: canEdit ? 'pointer' : 'default', transition: 'all .14s',
                }}
              >
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                  color: cc.color, background: cc.bg, border: `1px solid ${cc.border}`, letterSpacing: '.05em',
                }}>{flag.op}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#f97316' : t.text, marginBottom: 1 }}>
                    {flag.op.charAt(0) + flag.op.slice(1).toLowerCase()} Access
                  </div>
                  <div style={{ fontSize: 11, color: t.muted, lineHeight: 1.35 }}>{flag.desc}</div>
                </div>

                <Toggle on={active} onChange={() => onChange(flag.key)} disabled={!canEdit} />
              </div>
            );
          })}

          {/* Extra / special flags */}
          {mod.extraFlags.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: '.06em', textTransform: 'uppercase', padding: '4px 2px 2px' }}>
                Special Permissions
              </div>
              {mod.extraFlags.map(flag => {
                const active = perms[flag.key] ?? false;
                return (
                  <div
                    key={flag.key}
                    onClick={() => canEdit && onChange(flag.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 9,
                      background: active ? 'rgba(249,115,22,0.07)' : t.card2,
                      border: `1px solid ${active ? 'rgba(249,115,22,0.28)' : t.border}`,
                      cursor: canEdit ? 'pointer' : 'default', transition: 'all .14s',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#f97316' : t.text }}>{flag.label}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                          background: flag.apiEnforced ? 'rgba(52,211,153,0.1)' : 'rgba(148,174,200,0.15)',
                          color: flag.apiEnforced ? '#34d399' : t.muted,
                          border: `1px solid ${flag.apiEnforced ? 'rgba(52,211,153,0.25)' : 'rgba(148,174,200,0.2)'}`,
                        }}>{flag.apiEnforced ? '★ API' : '★ UI'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: t.muted, lineHeight: 1.35 }}>{flag.desc}</div>
                    </div>
                    <Toggle on={active} onChange={() => onChange(flag.key)} disabled={!canEdit} />
                  </div>
                );
              })}
            </>
          )}
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
  const t          = tok(isDark);
  const params     = useParams();
  const router     = useRouter();
  const { employee: me } = useAuth();

  const empId   = params['id'] as string;
  const isAdmin = me?.role === 'admin';
  const isSelf  = me?.id === empId;

  const [emp,        setEmp]        = useState<EmployeeWithPermissions | null>(null);
  const [perf,       setPerf]       = useState<EmployeePerformance | null>(null);
  const [commSum,    setCommSum]    = useState<CommissionSummary | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<Tab>('profile');
  const [msg,        setMsg]        = useState('');
  const [err,        setErr]        = useState('');
  const [saving,     setSaving]     = useState(false);
  const [perms,      setPerms]      = useState<Record<string, boolean>>({});
  const [savedPerms, setSavedPerms] = useState<Record<string, boolean>>({});
  const [commType,   setCommType]   = useState('');
  const [commValue,  setCommValue]  = useState('');
  const [showReset,   setShowReset]   = useState(false);
  const [newTempPass, setNewTempPass] = useState('');

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
          view_profit:        p.view_profit,
          edit_price:         p.edit_price,
          delete_records:     p.delete_records,
          view_reports:       p.view_reports,
          manage_employees:   p.manage_employees,
          audit_view:         p.audit_view,
          backup_download:    p.backup_download,
          approve_discount:   p.approve_discount,
          cancel_deal:        p.cancel_deal,
          blacklist_customer: p.blacklist_customer,
          export_reports:     p.export_reports,
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

  const handleToggle = (key: string) => setPerms(prev => ({ ...prev, [key]: !prev[key] }));

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
      setShowReset(false); setNewTempPass(''); await load();
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

  const totalGranted = Object.values(perms).filter(Boolean).length;
  const totalFlags   = Object.keys(perms).length;

  return (
    <AdminShell activePage="employees">
      <div style={{ minHeight: '100vh', background: t.page, padding: '28px 32px' }}>

        {msg && <div style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, padding: '12px 18px', color: '#34d399', marginBottom: 16, fontSize: 14 }}>{msg}</div>}
        {err && <div style={{ background: 'rgba(239,68,68,0.1)',  border: '1px solid rgba(239,68,68,0.3)',  borderRadius: 10, padding: '12px 18px', color: '#ef4444', marginBottom: 16, fontSize: 14 }}>{err}</div>}

        {/* ── Header ── */}
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
            <p style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>🔐 Reset Auth — Sets New Temp Password + Clears TOTP</p>
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

        {/* ══ PROFILE ══ */}
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
                  ? (emp.commission_type === 'fixed' ? formatCurrency(emp.commission_value) : `${emp.commission_value}%`) : '—'} color="#f97316" />
              </SCard>
            )}
          </div>
        )}

        {/* ══ PERFORMANCE ══ */}
        {tab === 'performance' && (
          <div>
            {commSum && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
                {[
                  { label: 'Total Earned', val: commSum.total_earned, color: '#ec4899' },
                  { label: 'Paid',         val: commSum.total_paid,   color: '#34d399' },
                  { label: 'Unpaid',       val: commSum.total_unpaid, color: '#ef4444' },
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
                  { label: 'Deals Closed',    val: perf.deals_closed,         color: '#818cf8', money: false },
                  { label: 'Total Revenue',   val: perf.total_revenue,        color: '#34d399', money: true  },
                  { label: 'Leads Assigned',  val: perf.leads_assigned,       color: '#38bdf8', money: false },
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

        {/* ══════════════════════════════════════════════════
            PERMISSIONS TAB
        ══════════════════════════════════════════════════ */}
        {tab === 'permissions' && isAdmin && (
          <div>

            {/* ── Summary bar ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: t.card, border: `1px solid ${t.border}`,
              borderRadius: 12, padding: '14px 20px', marginBottom: 16,
              flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 10, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>Extra flags granted</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: totalGranted > 0 ? '#f97316' : t.muted, lineHeight: 1 }}>{totalGranted}</span>
                    <span style={{ fontSize: 13, color: t.muted }}>/ {totalFlags}</span>
                  </div>
                </div>
                <div style={{ width: 140, height: 5, background: t.surface, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${totalFlags > 0 ? (totalGranted / totalFlags) * 100 : 0}%`,
                    background: 'linear-gradient(90deg,#f97316,#fb923c)', transition: 'width .3s',
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, color: rc.color, background: rc.bg, border: `1px solid ${rc.border}` }}>
                  🎭 {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                  {emp.role === 'admin' ? ' — all access by default' : ''}
                </span>
                {hasUnsaved && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                    Unsaved changes
                  </span>
                )}
              </div>
            </div>

            {/* ── Legend ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              marginBottom: 14, padding: '9px 14px',
              background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 8,
            }}>
              <span style={{ fontSize: 12, color: '#38bdf8' }}>
                Click any module to expand its extra permission flags. 
                ✓ green = role has access · 🔒 red = role is blocked at API level.
              </span>
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
                {(Object.entries(TAG_COLORS) as [FlagTag, any][]).map(([tag, s]) => (
                  <span key={tag} style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.1em', padding: '2px 6px', borderRadius: 3, color: s.color, background: s.bg, border: `1px solid ${s.border}`, textTransform: 'uppercase' }}>{tag}</span>
                ))}
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>★ API</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, color: '#94aec8', background: 'rgba(148,174,200,0.15)', border: '1px solid rgba(148,174,200,0.2)' }}>★ UI</span>
              </div>
            </div>

            {/* Admin note */}
            {emp.role === 'admin' && (
              <div style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#818cf8' }}>
                👑 <strong>Admin</strong> accounts have full access to every module and endpoint by default. Permission flags are not evaluated for admin roles.
              </div>
            )}

            {/* ── Module grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {NAV_MODULES.map(mod => (
                <ModuleCard
                  key={mod.id}
                  mod={mod}
                  role={emp.role}
                  perms={perms}
                  onChange={handleToggle}
                  t={t}
                  canEdit={isAdmin}
                />
              ))}
            </div>

            {/* Shared-flag note */}
            <div style={{ fontSize: 12, color: t.muted, padding: '10px 14px', background: t.card, borderRadius: 8, border: `1px solid ${t.border}`, marginBottom: 18 }}>
              ℹ️ <strong style={{ color: t.text }}>Shared flags:</strong> <em>view_profit</em> appears under Inventory, Deals, and Reports — it is one DB flag. Toggling it in any section updates all three. Same for <em>delete_records</em> (Customers only at API level).
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
                {hasUnsaved ? '⚠️ You have unsaved permission changes' : '✓ All permissions saved'}
              </span>
              <button
                onClick={() => setPerms({ ...savedPerms })}
                disabled={saving || !hasUnsaved}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'transparent', color: t.muted, border: `1px solid ${t.border}`, cursor: hasUnsaved ? 'pointer' : 'not-allowed', opacity: hasUnsaved ? 1 : 0.4 }}
              >
                Discard
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={saving || !hasUnsaved}
                style={{ padding: '9px 22px', borderRadius: 9, fontSize: 14, fontWeight: 700, background: hasUnsaved ? '#f97316' : 'rgba(249,115,22,0.3)', color: hasUnsaved ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', cursor: hasUnsaved ? 'pointer' : 'not-allowed', transition: 'all .18s' }}
              >
                {saving ? 'Saving…' : '💾 Save Permissions'}
              </button>
            </div>
          </div>
        )}

        {/* ══ COMMISSION ══ */}
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
                  disabled={!commType} style={{ ...inp, opacity: commType ? 1 : 0.5 }} />
              </div>
            </div>
            {commType && commValue && (
              <div style={{ padding: '12px 16px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 10, fontSize: 13, color: '#f97316', marginBottom: 20 }}>
                💸 {commType === 'fixed' ? `usd ${commValue} per deal` : commType === 'percent_price' ? `${commValue}% of selling price` : `${commValue}% of gross profit`}
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