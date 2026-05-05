'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import StatusBadge from '@/components/admin/StatusBadge';
import WebsiteToggle from '@/components/admin/WebsiteToggle';
import CostTable from '@/components/admin/CostTable';
import PhotoGallery from '@/components/admin/PhotoGallery';
import { useAuth } from '@/hooks/useAuth';
import { adminApi, type AdminVehicle } from '@/lib/api';
import { formatPrice, formatMileage, formatCondition, formatTransmission, formatFuelType, formatLabel } from '@/lib/formatters';

// ─────────────────────────────────────────────────────────────
// STATUS TRANSITION LOGIC — UNTOUCHED
// ─────────────────────────────────────────────────────────────

type VehicleStatus = 'draft' | 'in_repair' | 'available' | 'reserved' | 'sold' | 'written_off';

const ALLOWED_TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  draft:       ['in_repair', 'available'],
  in_repair:   ['available', 'draft'],
  available:   ['in_repair', 'reserved', 'sold', 'written_off'],
  reserved:    ['available', 'sold'],
  sold:        ['available'],
  written_off: ['available'],
};

const PERMISSION_GATED: Record<string, string> = {
  'in_repair→draft':       'delete_records',
  'available→written_off': 'delete_records',
  'sold→available':        'cancel_deal',
  'written_off→available': 'delete_records',
};

interface TransitionOption {
  status:      VehicleStatus;
  label:       string;
  variant:     'normal' | 'danger' | 'warning' | 'recovery';
  confirmMsg:  string;
  canDo:       boolean;
  blockedMsg?: string;
}

const STATUS_META: Record<VehicleStatus, { label: string; variant: TransitionOption['variant']; confirmMsg: string }> = {
  draft:       { label: '↩ Revert to Draft',    variant: 'warning',  confirmMsg: 'Revert this vehicle back to Draft status?' },
  in_repair:   { label: '🔧 Mark as In Repair', variant: 'normal',   confirmMsg: 'Mark this vehicle as In Repair?' },
  available:   { label: '✅ Mark as Available',  variant: 'normal',   confirmMsg: 'Mark this vehicle as Available?' },
  reserved:    { label: '🔒 Mark as Reserved',   variant: 'normal',   confirmMsg: 'Mark this vehicle as Reserved for a customer?' },
  sold:        { label: '💰 Mark as Sold',       variant: 'danger',   confirmMsg: '⚠️ MARK AS SOLD\n\nMake sure a deal has been created first.\n\nContinue?' },
  written_off: { label: '🚫 Write Off Vehicle',  variant: 'danger',   confirmMsg: '⚠️ WRITE OFF VEHICLE\n\nThis removes the vehicle from active inventory permanently (unless recovered).\n\nAre you absolutely sure?' },
};

const REVERSAL_CONFIRM: Partial<Record<string, string>> = {
  'sold→available':        '⚠️ REVERSE SALE\n\nThis undoes the sold status and returns the vehicle to Available.\n\nOnly do this if the sale was entered accidentally. Continue?',
  'written_off→available': '⚠️ RECOVER WRITTEN-OFF VEHICLE\n\nThis returns the vehicle to Available (e.g. after insurance or repair).\n\nContinue?',
};

function getTransitionOptions(
  currentStatus: VehicleStatus,
  role:          string,
  permissions:   Record<string, boolean>,
): TransitionOption[] {
  const transitions = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  return transitions.map(toStatus => {
    const key          = `${currentStatus}→${toStatus}`;
    const requiredPerm = PERMISSION_GATED[key];
    const meta         = STATUS_META[toStatus];
    const isAdmin      = role === 'admin';
    let canDo          = true;
    let blockedMsg: string | undefined;

    if (!isAdmin) {
      if (role !== 'manager') {
        canDo      = false;
        blockedMsg = 'Only managers and admins can change vehicle status';
      } else if (requiredPerm && !permissions[requiredPerm]) {
        const permLabels: Record<string, string> = { delete_records: 'Delete Records', cancel_deal: 'Cancel Deal' };
        canDo      = false;
        blockedMsg = `Requires "${permLabels[requiredPerm] ?? requiredPerm}" permission — ask your admin to enable it`;
      }
    }

    return { status: toStatus, label: meta.label, variant: meta.variant, confirmMsg: REVERSAL_CONFIRM[key] ?? meta.confirmMsg, canDo, blockedMsg };
  });
}

// ─────────────────────────────────────────────────────────────
// SCOPED CSS
// ─────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&family=JetBrains+Mono:wght@500;700&display=swap');

  .vdp {
    --bg:          #0b0f1a;
    --surface:     #111827;
    --surface-2:   #161d2e;
    --border:      rgba(255,255,255,0.07);
    --border-soft: rgba(255,255,255,0.04);
    --text:        #edf2fc;
    --text-b:      #a8bdd6;
    --text-c:      #536880;
    --text-d:      #2e4258;
    --accent:      #6366f1;
    --accent-glow: rgba(99,102,241,0.22);
    --green:       #10b981;
    --amber:       #f59e0b;
    --red:         #ef4444;
    --mono:        'JetBrains Mono', monospace;
    --font:        'DM Sans', sans-serif;
    --r-sm:        6px;
    --r:           10px;
    --r-lg:        14px;
  }

  .vdp * { box-sizing: border-box; font-family: var(--font); }
  .vdp { background: var(--bg); min-height: 100%; padding: 32px 28px; }

  /* loading / error states */
  .vdp-center { padding: 48px; text-align: center; }
  .vdp-loading-txt { color: var(--text-c); font-size: 13px; }
  .vdp-error-txt   { color: var(--red); font-size: 14px; margin-bottom: 16px; }
  .vdp-back-plain  { color: var(--accent); font-size: 13px; text-decoration: none; }
  .vdp-back-plain:hover { opacity: 0.7; }

  /* breadcrumb */
  .vdp-crumb { display: flex; align-items: center; gap: 8px; margin-bottom: 22px; font-size: 12px; color: var(--text-c); }
  .vdp-crumb-link { color: var(--text-c); text-decoration: none; transition: color 0.15s; }
  .vdp-crumb-link:hover { color: var(--text); }
  .vdp-crumb-sep { color: var(--text-d); }
  .vdp-crumb-cur { color: var(--text-b); font-family: var(--mono); font-weight: 600; }

  /* page header */
  .vdp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 26px; flex-wrap: wrap; gap: 12px; }
  .vdp-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
  .vdp-title { font-size: 23px; font-weight: 900; color: var(--text); margin: 0; letter-spacing: -0.5px; }
  .vdp-variant { font-weight: 500; color: var(--text-c); font-size: 16px; }
  .vdp-meta { font-size: 13px; color: var(--text-c); font-family: var(--mono); }

  /* action buttons (header) */
  .vdp-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .vdp-btn-edit {
    background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2);
    color: #818cf8; text-decoration: none;
    padding: 8px 16px; border-radius: var(--r-sm); font-size: 12px; font-weight: 700;
    transition: background 0.15s, border-color 0.15s, transform 0.15s, box-shadow 0.15s;
    display: inline-flex; align-items: center; gap: 5px;
  }
  .vdp-btn-edit:hover { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.4); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(99,102,241,0.15); }
  .vdp-btn-delete {
    background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.18);
    color: var(--red); padding: 8px 16px; border-radius: var(--r-sm);
    font-size: 12px; font-weight: 700; cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
    display: inline-flex; align-items: center; gap: 5px;
  }
  .vdp-btn-delete:hover:not(:disabled) { background: rgba(239,68,68,0.13); border-color: rgba(239,68,68,0.35); transform: translateY(-1px); }
  .vdp-btn-delete:disabled { opacity: 0.45; cursor: not-allowed; }

  /* KPI row */
  .vdp-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 26px; }
  .vdp-kpi {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r); padding: 16px 18px;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .vdp-kpi:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
  .vdp-kpi-label { font-size: 10px; font-weight: 700; color: var(--text-c); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
  .vdp-kpi-value { font-size: 18px; font-weight: 900; font-family: var(--mono); }

  /* main grid */
  .vdp-grid { display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start; }
  @media (max-width: 900px) { .vdp-grid { grid-template-columns: 1fr; } }

  /* tabs */
  .vdp-tabs { display: flex; gap: 2px; margin-bottom: 0; border-bottom: 1px solid var(--border); }
  .vdp-tab {
    padding: 10px 20px; border-radius: 8px 8px 0 0; font-size: 13px; font-weight: 600;
    background: transparent; border: none; cursor: pointer; color: var(--text-c);
    border-bottom: 2px solid transparent; margin-bottom: -1px;
    transition: color 0.15s, background 0.15s;
  }
  .vdp-tab:hover { color: var(--text-b); background: rgba(255,255,255,0.03); }
  .vdp-tab.active { background: var(--surface); color: var(--text); border-bottom-color: var(--accent); }

  /* tab content panel */
  .vdp-panel {
    background: var(--surface); border: 1px solid var(--border);
    border-top: none; border-radius: 0 0 var(--r-lg) var(--r-lg);
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  }

  /* sidebar */
  .vdp-sidebar { display: flex; flex-direction: column; gap: 14px; }
  .vdp-sidebar-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 18px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }
  .vdp-sidebar-label {
    font-size: 10px; font-weight: 700; color: var(--text-c);
    letter-spacing: 0.09em; text-transform: uppercase; margin-bottom: 14px;
  }

  /* status transition buttons */
  .vdp-status-btns { display: flex; flex-direction: column; gap: 7px; }
  .vdp-status-btn {
    width: 100%; padding: 9px 14px; border-radius: var(--r-sm);
    font-size: 12px; font-weight: 700; text-align: left; cursor: pointer;
    transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s, filter 0.15s;
  }
  .vdp-status-btn:hover:not(:disabled) { transform: translateX(2px); filter: brightness(1.15); }
  .vdp-status-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .vdp-status-btn.normal   { background: rgba(99,102,241,0.08);  border: 1px solid rgba(99,102,241,0.2);  color: #818cf8; }
  .vdp-status-btn.danger   { background: rgba(239,68,68,0.08);   border: 1px solid rgba(239,68,68,0.22); color: #ef4444; }
  .vdp-status-btn.warning  { background: rgba(245,158,11,0.08);  border: 1px solid rgba(245,158,11,0.25);color: #f59e0b; }
  .vdp-status-btn.recovery { background: rgba(16,185,129,0.08);  border: 1px solid rgba(16,185,129,0.25);color: #10b981; }
  .vdp-blocked-msg { font-size: 10px; color: var(--text-c); margin-top: 3px; padding-left: 4px; }
  .vdp-lock-tag { font-size: 10px; margin-left: 6px; opacity: 0.65; }

  /* quick info rows */
  .vdp-info-row {
    display: flex; justify-content: space-between;
    padding: 8px 0; border-bottom: 1px solid var(--border-soft); font-size: 12px;
  }
  .vdp-info-row:last-child { border-bottom: none; padding-bottom: 0; }
  .vdp-info-label { color: var(--text-c); }
  .vdp-info-val   { color: var(--text-b); font-weight: 600; font-family: var(--mono); font-size: 11px; }

  /* details tab */
  .vdp-section { margin-bottom: 26px; }
  .vdp-section:last-child { margin-bottom: 0; }
  .vdp-section-title {
    font-size: 10px; font-weight: 700; color: var(--text-c); letter-spacing: 0.1em;
    text-transform: uppercase; margin: 0 0 14px;
    padding-bottom: 9px; border-bottom: 1px solid var(--border);
  }
  .vdp-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; }
  .vdp-field { padding: 8px 0; }
  .vdp-field-label { font-size: 11px; color: var(--text-c); margin-bottom: 4px; }
  .vdp-field-val   { font-size: 13px; color: var(--text-b); font-weight: 500; }
  .vdp-notes { font-size: 13px; color: var(--text-b); line-height: 1.65; margin: 0; }
`;

// ─────────────────────────────────────────────────────────────
// COMPONENT — all state/logic UNTOUCHED
// ─────────────────────────────────────────────────────────────

interface Props { params: Promise<{ id: string }> }

export default function VehicleDetailPage({ params }: Props) {
  const { id }  = use(params);
  const router  = useRouter();
  const { employee, isAdmin, can } = useAuth();

  const [vehicle,       setVehicle]       = useState<AdminVehicle | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab,     setActiveTab]     = useState<'details' | 'costs' | 'media'>('details');

  useEffect(() => { void load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.getVehicle(id);
      setVehicle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicle');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(option: TransitionOption) {
    if (!option.canDo) return;
    if (!confirm(option.confirmMsg)) return;
    setStatusLoading(true);
    try {
      const updated = await adminApi.changeStatus(id, option.status);
      setVehicle(prev => prev ? { ...prev, status: updated.status } : null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to change status';
      if (msg.includes('permission') || msg.includes('Permission')) {
        alert(`❌ Permission denied\n\n${msg}`);
      } else {
        alert(msg);
      }
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this vehicle? It will be moved to trash.')) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteVehicle(id);
      router.push('/admin/inventory');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cannot delete this vehicle');
      setDeleteLoading(false);
    }
  }

  if (loading) return (
    <AdminShell>
      <style>{CSS}</style>
      <div className="vdp"><div className="vdp-center"><div className="vdp-loading-txt">Loading vehicle…</div></div></div>
    </AdminShell>
  );

  if (error || !vehicle) return (
    <AdminShell>
      <style>{CSS}</style>
      <div className="vdp">
        <div className="vdp-center">
          <div className="vdp-error-txt">{error || 'Vehicle not found'}</div>
          <Link href="/admin/inventory" className="vdp-back-plain">← Back to Inventory</Link>
        </div>
      </div>
    </AdminShell>
  );

  const role        = employee?.role ?? 'salesperson';
  const permissions = (employee?.permissions ?? {}) as Record<string, boolean>;
  const canEdit     = isAdmin || role === 'manager';

  const transitionOptions = getTransitionOptions(vehicle.status as VehicleStatus, role, permissions);

  return (
    <AdminShell>
      <style>{CSS}</style>
      <div className="vdp">

        {/* Breadcrumb */}
        <div className="vdp-crumb">
          <Link href="/admin/inventory" className="vdp-crumb-link">Inventory</Link>
          <span className="vdp-crumb-sep">/</span>
          <span className="vdp-crumb-cur">{vehicle.stock_id}</span>
        </div>

        {/* Header */}
        <div className="vdp-header">
          <div>
            <div className="vdp-title-row">
              <h1 className="vdp-title">
                {vehicle.year} {vehicle.make} {vehicle.model}
                {vehicle.variant && <span className="vdp-variant"> {vehicle.variant}</span>}
              </h1>
              <StatusBadge status={vehicle.status} />
            </div>
            <div className="vdp-meta">
              {vehicle.stock_id} · {vehicle.days_in_stock}d in stock · {vehicle.location}
            </div>
          </div>

          <div className="vdp-actions">
            {canEdit && (
              <Link href={`/admin/inventory/${id}/edit`} className="vdp-btn-edit">
                ✏️ Edit
              </Link>
            )}
            {can('delete_records') && (
              <button onClick={handleDelete} disabled={deleteLoading} className="vdp-btn-delete">
                🗑 Delete
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="vdp-kpis">
          <KpiCard label="Asking Price" value={formatPrice(vehicle.asking_price)} color="var(--text)" />
          <KpiCard label="Total Cost"   value={formatPrice(vehicle.total_cost_cache ?? vehicle.purchase_price)} color="var(--amber)" />
          <KpiCard
            label="Est. Profit"
            value={(vehicle.estimated_profit >= 0 ? '+' : '') + formatPrice(vehicle.estimated_profit)}
            color={vehicle.estimated_profit >= 0 ? 'var(--green)' : 'var(--red)'}
            hidden={!can('view_profit')}
          />
          {vehicle.minimum_price && can('view_profit') && (
            <KpiCard label="Min Price" value={formatPrice(vehicle.minimum_price)} color="var(--text-c)" />
          )}
        </div>

        {/* Main grid */}
        <div className="vdp-grid">

          {/* Left — tabs + panel */}
          <div>
            <div className="vdp-tabs">
              {(['details', 'costs', 'media'] as const).map(tab => (
                <button
                  key={tab}
                  className={`vdp-tab${activeTab === tab ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <div className="vdp-panel">
              {activeTab === 'details' && <DetailsTab vehicle={vehicle} />}
              {activeTab === 'costs'   && <CostTable vehicleId={vehicle.id} stockId={vehicle.stock_id} canEdit={canEdit} />}
              {activeTab === 'media'   && <PhotoGallery vehicleId={vehicle.id} stockId={vehicle.stock_id} canEdit={canEdit} />}
            </div>
          </div>

          {/* Right — sidebar */}
          <div className="vdp-sidebar">

            {/* Website toggle */}
            {canEdit && (
              <div className="vdp-sidebar-card">
                <div className="vdp-sidebar-label">Website Visibility</div>
                <WebsiteToggle vehicleId={vehicle.id} initialValue={vehicle.show_on_website} vehicleStatus={vehicle.status} />
              </div>
            )}

            {/* Status transitions */}
            {transitionOptions.length > 0 && (
              <div className="vdp-sidebar-card">
                <div className="vdp-sidebar-label">Change Status</div>
                <div className="vdp-status-btns">
                  {transitionOptions.map(opt => (
                    <div key={opt.status} title={!opt.canDo ? opt.blockedMsg : undefined}>
                      <button
                        className={`vdp-status-btn ${opt.variant}`}
                        onClick={() => void handleStatusChange(opt)}
                        disabled={statusLoading || !opt.canDo}
                      >
                        {opt.label}
                        {!opt.canDo && <span className="vdp-lock-tag">🔒 No permission</span>}
                      </button>
                      {!opt.canDo && opt.blockedMsg && (
                        <div className="vdp-blocked-msg">{opt.blockedMsg}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick info */}
            <div className="vdp-sidebar-card">
              <div className="vdp-sidebar-label">Quick Info</div>
              {[
                { label: 'Condition',    value: formatCondition(vehicle.condition)      },
                { label: 'Fuel',         value: formatFuelType(vehicle.fuel_type)        },
                { label: 'Transmission', value: formatTransmission(vehicle.transmission) },
                { label: 'Mileage',      value: formatMileage(vehicle.mileage)           },
                { label: 'Color',        value: vehicle.color                            },
                { label: 'Purchase',     value: formatLabel(vehicle.purchase_type)       },
              ].map(item => (
                <div key={item.label} className="vdp-info-row">
                  <span className="vdp-info-label">{item.label}</span>
                  <span className="vdp-info-val">{item.value}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </AdminShell>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS — logic untouched, classNames only
// ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, hidden }: { label: string; value: string; color: string; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <div className="vdp-kpi">
      <div className="vdp-kpi-label">{label}</div>
      <div className="vdp-kpi-value" style={{ color }}>{value}</div>
    </div>
  );
}

function DetailsTab({ vehicle }: { vehicle: AdminVehicle }) {
  const sections = [
    {
      title: 'Basic Information',
      fields: [
        { label: 'Make',      value: vehicle.make },
        { label: 'Model',     value: vehicle.model },
        { label: 'Variant',   value: vehicle.variant },
        { label: 'Year',      value: String(vehicle.year) },
        { label: 'Color',     value: vehicle.color },
        { label: 'Body Type', value: formatLabel(vehicle.body_type) },
        { label: 'Condition', value: formatCondition(vehicle.condition) },
        { label: 'Location',  value: vehicle.location },
      ],
    },
    {
      title: 'Specifications',
      fields: [
        { label: 'Mileage',      value: formatMileage(vehicle.mileage) },
        { label: 'Engine',       value: vehicle.engine_capacity },
        { label: 'Transmission', value: formatTransmission(vehicle.transmission) },
        { label: 'Fuel Type',    value: formatFuelType(vehicle.fuel_type) },
      ],
    },
    {
      title: 'Identification',
      fields: [
        { label: 'Chassis / VIN', value: vehicle.chassis_vin },
        { label: 'Reg. Number',   value: vehicle.registration_number },
      ],
    },
    {
      title: 'Purchase Information',
      fields: [
        { label: 'Purchase Date',   value: vehicle.purchase_date ? new Date(vehicle.purchase_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
        { label: 'Supplier',        value: vehicle.supplier_name },
        { label: 'Purchase Type',   value: formatLabel(vehicle.purchase_type) },
        { label: 'Purchase Price',  value: formatPrice(vehicle.purchase_price) },
        { label: 'Payment Status',  value: formatLabel(vehicle.purchase_payment_status) },
      ],
    },
  ];

  return (
    <div>
      {sections.map(section => (
        <div key={section.title} className="vdp-section">
          <h3 className="vdp-section-title">{section.title}</h3>
          <div className="vdp-fields">
            {section.fields.filter(f => f.value).map(field => (
              <div key={field.label} className="vdp-field">
                <div className="vdp-field-label">{field.label}</div>
                <div className="vdp-field-val">{field.value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {vehicle.notes && (
        <div className="vdp-section">
          <h3 className="vdp-section-title">Notes</h3>
          <p className="vdp-notes">{vehicle.notes}</p>
        </div>
      )}
    </div>
  );
}