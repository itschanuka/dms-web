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
// STATUS TRANSITION LOGIC
// Must stay in sync with inventory.service.ts on the API side.
// The API is the source of truth — this is just for UI rendering.
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

// Which employee_permissions key is needed for each gated transition.
// Admin always bypasses this. Others need the specific flag.
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
  canDo:       boolean;   // false = button shown but greyed + tooltip
  blockedMsg?: string;    // shown on hover when canDo = false
}

const STATUS_META: Record<VehicleStatus, { label: string; variant: TransitionOption['variant']; confirmMsg: string }> = {
  draft:       { label: '↩ Revert to Draft',       variant: 'warning',  confirmMsg: 'Revert this vehicle back to Draft status?' },
  in_repair:   { label: '🔧 Mark as In Repair',    variant: 'normal',   confirmMsg: 'Mark this vehicle as In Repair?' },
  available:   { label: '✅ Mark as Available',     variant: 'normal',   confirmMsg: 'Mark this vehicle as Available?' },
  reserved:    { label: '🔒 Mark as Reserved',      variant: 'normal',   confirmMsg: 'Mark this vehicle as Reserved for a customer?' },
  sold:        { label: '💰 Mark as Sold',          variant: 'danger',   confirmMsg: '⚠️ MARK AS SOLD\n\nMake sure a deal has been created first.\n\nContinue?' },
  written_off: { label: '🚫 Write Off Vehicle',     variant: 'danger',   confirmMsg: '⚠️ WRITE OFF VEHICLE\n\nThis removes the vehicle from active inventory permanently (unless recovered).\n\nAre you absolutely sure?' },
};

// Special override confirm messages for reversals
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
    const key         = `${currentStatus}→${toStatus}`;
    const requiredPerm = PERMISSION_GATED[key];
    const meta        = STATUS_META[toStatus];
    const isAdmin     = role === 'admin';

    let canDo       = true;
    let blockedMsg: string | undefined;

    if (!isAdmin) {
      // Non-admin must be at least manager
      if (role !== 'manager') {
        canDo       = false;
        blockedMsg  = 'Only managers and admins can change vehicle status';
      } else if (requiredPerm && !permissions[requiredPerm]) {
        // Manager but missing the required permission
        const permLabels: Record<string, string> = {
          delete_records: 'Delete Records',
          cancel_deal:    'Cancel Deal',
        };
        canDo       = false;
        blockedMsg  = `Requires "${permLabels[requiredPerm] ?? requiredPerm}" permission — ask your admin to enable it`;
      }
    }

    const confirmMsg = REVERSAL_CONFIRM[key] ?? meta.confirmMsg;

    return {
      status:   toStatus,
      label:    meta.label,
      variant:  meta.variant,
      confirmMsg,
      canDo,
      blockedMsg,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// BUTTON STYLES
// ─────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<TransitionOption['variant'], React.CSSProperties> = {
  normal:   { background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',  color: '#818cf8' },
  danger:   { background: 'rgba(239,68,68,0.08)',  border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' },
  warning:  { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' },
  recovery: { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' },
};

// ─────────────────────────────────────────────────────────────
// COMPONENT
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
    if (!option.canDo) return; // blocked — button should be disabled anyway

    if (!confirm(option.confirmMsg)) return;

    setStatusLoading(true);
    try {
      const updated = await adminApi.changeStatus(id, option.status);
      setVehicle(prev => prev ? { ...prev, status: updated.status } : null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to change status';
      // Show a friendlier message for permission errors
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
      <div style={{ padding: 40, textAlign: 'center', color: '#5c7090', fontSize: 13 }}>Loading vehicle…</div>
    </AdminShell>
  );

  if (error || !vehicle) return (
    <AdminShell>
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: '#ef4444', fontSize: 14, marginBottom: 16 }}>{error || 'Vehicle not found'}</div>
        <Link href="/admin/inventory" style={{ color: '#6366f1', fontSize: 13 }}>← Back to Inventory</Link>
      </div>
    </AdminShell>
  );

  const role        = employee?.role ?? 'salesperson';
  const permissions = (employee?.permissions ?? {}) as Record<string, boolean>;
  const canEdit     = isAdmin || role === 'manager';

  const transitionOptions = getTransitionOptions(
    vehicle.status as VehicleStatus,
    role,
    permissions,
  );

  return (
    <AdminShell>
      <div style={{ padding: '28px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 12, color: '#5c7090' }}>
          <Link href="/admin/inventory" style={{ color: '#5c7090', textDecoration: 'none' }}>Inventory</Link>
          <span>/</span>
          <span style={{ color: '#8097b8' }}>{vehicle.stock_id}</span>
        </div>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
                {vehicle.variant && <span style={{ fontWeight: 500, color: '#8097b8', fontSize: 16 }}> {vehicle.variant}</span>}
              </h1>
              <StatusBadge status={vehicle.status} />
            </div>
            <div style={{ fontSize: 13, color: '#5c7090' }}>
              {vehicle.stock_id} · {vehicle.days_in_stock} days in stock · {vehicle.location}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {canEdit && (
              <Link href={`/admin/inventory/${id}/edit`} style={{
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                color: '#818cf8', textDecoration: 'none',
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              }}>
                ✏️ Edit
              </Link>
            )}
            {can('delete_records') && (
              <button onClick={handleDelete} disabled={deleteLoading} style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444', padding: '8px 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
                🗑 Delete
              </button>
            )}
          </div>
        </div>

        {/* Top KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <KpiCard label="Asking Price" value={formatPrice(vehicle.asking_price)} color="#fff" />
          <KpiCard label="Total Cost"   value={formatPrice(vehicle.total_cost_cache ?? vehicle.purchase_price)} color="#f59e0b" />
          <KpiCard
            label="Est. Profit"
            value={(vehicle.estimated_profit >= 0 ? '+' : '') + formatPrice(vehicle.estimated_profit)}
            color={vehicle.estimated_profit >= 0 ? '#10b981' : '#ef4444'}
            // Only show profit to those with view_profit permission (or admin)
            hidden={!can('view_profit')}
          />
          {vehicle.minimum_price && can('view_profit') && (
            <KpiCard label="Min Price" value={formatPrice(vehicle.minimum_price)} color="#5c7090" />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

          {/* ── Left column ─────────────────────────────── */}
          <div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #1f2d45', paddingBottom: 0 }}>
              {(['details', 'costs', 'media'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: '9px 18px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 600,
                  background: activeTab === tab ? '#0d1117' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                  color: activeTab === tab ? '#fff' : '#5c7090',
                  marginBottom: -1,
                }}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 12, padding: 24 }}>
              {activeTab === 'details' && <DetailsTab vehicle={vehicle} />}
              {activeTab === 'costs'   && <CostTable vehicleId={vehicle.id} canEdit={canEdit} />}
              {activeTab === 'media'   && <PhotoGallery vehicleId={vehicle.id} stockId={vehicle.stock_id} canEdit={canEdit} />}
            </div>
          </div>

          {/* ── Right sidebar ────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Website toggle */}
            {canEdit && (
              <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#5c7090', letterSpacing: '0.08em', marginBottom: 12 }}>WEBSITE VISIBILITY</div>
                <WebsiteToggle vehicleId={vehicle.id} initialValue={vehicle.show_on_website} vehicleStatus={vehicle.status} />
              </div>
            )}

            {/* Status change */}
            {transitionOptions.length > 0 && (
              <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#5c7090', letterSpacing: '0.08em', marginBottom: 12 }}>
                  CHANGE STATUS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {transitionOptions.map(opt => (
                    <div key={opt.status} title={!opt.canDo ? opt.blockedMsg : undefined}>
                      <button
                        onClick={() => void handleStatusChange(opt)}
                        disabled={statusLoading || !opt.canDo}
                        style={{
                          width: '100%', padding: '9px 14px', borderRadius: 8,
                          fontSize: 12, fontWeight: 700, textAlign: 'left',
                          cursor: (statusLoading || !opt.canDo) ? 'not-allowed' : 'pointer',
                          opacity: (statusLoading || !opt.canDo) ? 0.45 : 1,
                          ...VARIANT_STYLES[opt.variant],
                        }}
                      >
                        {opt.label}
                        {!opt.canDo && <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.7 }}>🔒 No permission</span>}
                      </button>
                      {!opt.canDo && opt.blockedMsg && (
                        <div style={{ fontSize: 10, color: '#5c7090', marginTop: 3, paddingLeft: 4 }}>
                          {opt.blockedMsg}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick info */}
            <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5c7090', letterSpacing: '0.08em', marginBottom: 12 }}>QUICK INFO</div>
              {[
                { label: 'Condition',    value: formatCondition(vehicle.condition)       },
                { label: 'Fuel',         value: formatFuelType(vehicle.fuel_type)         },
                { label: 'Transmission', value: formatTransmission(vehicle.transmission)  },
                { label: 'Mileage',      value: formatMileage(vehicle.mileage)            },
                { label: 'Color',        value: vehicle.color                             },
                { label: 'Purchase',     value: formatLabel(vehicle.purchase_type)        },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #111827', fontSize: 12 }}>
                  <span style={{ color: '#5c7090' }}>{item.label}</span>
                  <span style={{ color: '#dde4f0', fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="gridTemplateColumns: 1fr 320px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AdminShell>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, hidden }: { label: string; value: string; color: string; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#5c7090', letterSpacing: '0.08em', marginBottom: 6 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

function DetailsTab({ vehicle }: { vehicle: AdminVehicle }) {
  const sections = [
    {
      title: 'Basic Information',
      fields: [
        { label: 'Make',      value: vehicle.make               },
        { label: 'Model',     value: vehicle.model              },
        { label: 'Variant',   value: vehicle.variant            },
        { label: 'Year',      value: String(vehicle.year)       },
        { label: 'Color',     value: vehicle.color              },
        { label: 'Body Type', value: formatLabel(vehicle.body_type) },
        { label: 'Condition', value: formatCondition(vehicle.condition) },
        { label: 'Location',  value: vehicle.location           },
      ],
    },
    {
      title: 'Specifications',
      fields: [
        { label: 'Mileage',      value: formatMileage(vehicle.mileage)             },
        { label: 'Engine',       value: vehicle.engine_capacity                    },
        { label: 'Transmission', value: formatTransmission(vehicle.transmission)   },
        { label: 'Fuel Type',    value: formatFuelType(vehicle.fuel_type)          },
      ],
    },
    {
      title: 'Identification',
      fields: [
        { label: 'Chassis / VIN', value: vehicle.chassis_vin          },
        { label: 'Reg. Number',   value: vehicle.registration_number  },
      ],
    },
    {
      title: 'Purchase Information',
      fields: [
        { label: 'Purchase Date',   value: vehicle.purchase_date ? new Date(vehicle.purchase_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
        { label: 'Supplier',        value: vehicle.supplier_name                     },
        { label: 'Purchase Type',   value: formatLabel(vehicle.purchase_type)        },
        { label: 'Purchase Price',  value: formatPrice(vehicle.purchase_price)       },
        { label: 'Payment Status',  value: formatLabel(vehicle.purchase_payment_status) },
      ],
    },
  ];

  return (
    <div>
      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: '#5c7090', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px', paddingBottom: 8, borderBottom: '1px solid #1f2d45' }}>
            {section.title}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {section.fields.filter(f => f.value).map(field => (
              <div key={field.label} style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 11, color: '#5c7090', marginBottom: 3 }}>{field.label}</div>
                <div style={{ fontSize: 13, color: '#dde4f0', fontWeight: 500 }}>{field.value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {vehicle.notes && (
        <div>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: '#5c7090', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px', paddingBottom: 8, borderBottom: '1px solid #1f2d45' }}>Notes</h3>
          <p style={{ fontSize: 13, color: '#8097b8', lineHeight: 1.6, margin: 0 }}>{vehicle.notes}</p>
        </div>
      )}
    </div>
  );
}