'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import StatusBadge from '@/components/admin/StatusBadge';
import WebsiteToggle from '@/components/admin/WebsiteToggle';
import CostTable from '@/components/admin/CostTable';
import PhotoGallery from '@/components/admin/PhotoGallery';
import { adminApi, type AdminVehicle } from '@/lib/api';
import { formatPrice, formatMileage, formatCondition, formatTransmission, formatFuelType, formatLabel } from '@/lib/formatters';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft:       ['available'],
  available:   ['reserved', 'sold', 'written_off'],
  reserved:    ['available', 'sold'],
  sold:        [],
  written_off: [],
};

const STATUS_LABELS: Record<string, string> = {
  available:   'Mark as Available',
  reserved:    'Mark as Reserved',
  sold:        'Mark as Sold',
  written_off: 'Write Off',
  draft:       'Revert to Draft',
};

interface Props { params: Promise<{ id: string }> }

export default function VehicleDetailPage({ params }: Props) {
  const { id }   = use(params);
  const router   = useRouter();
  const [vehicle,   setVehicle]   = useState<AdminVehicle | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'costs' | 'media'>('details');

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

  async function handleStatusChange(newStatus: string) {
    if (!confirm(`Change status to "${newStatus}"?`)) return;
    setStatusLoading(true);
    try {
      const updated = await adminApi.changeStatus(id, newStatus);
      setVehicle(prev => prev ? { ...prev, status: updated.status } : null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to change status');
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

  const transitions = ALLOWED_TRANSITIONS[vehicle.status] ?? [];
  const isManager   = true; // TODO: use real role from useAuth when available

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
            <Link href={`/admin/inventory/${id}/edit`} style={{
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
              color: '#818cf8', textDecoration: 'none',
              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            }}>
              ✏️ Edit
            </Link>
            <button onClick={handleDelete} disabled={deleteLoading} style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', padding: '8px 16px', borderRadius: 8,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              🗑 Delete
            </button>
          </div>
        </div>

        {/* Top cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <KpiCard label="Asking Price"  value={formatPrice(vehicle.asking_price)}                        color="#fff" />
          <KpiCard label="Total Cost"    value={formatPrice(vehicle.total_cost_cache ?? vehicle.purchase_price)} color="#f59e0b" />
          <KpiCard label="Est. Profit"   value={(vehicle.estimated_profit >= 0 ? '+' : '') + formatPrice(vehicle.estimated_profit)} color={vehicle.estimated_profit >= 0 ? '#10b981' : '#ef4444'} />
          {vehicle.minimum_price && <KpiCard label="Min Price" value={formatPrice(vehicle.minimum_price)} color="#5c7090" />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

          {/* ── Left column ─────────────────────────────── */}
          <div>
            {/* Tabs */}
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
              {activeTab === 'costs'   && <CostTable vehicleId={vehicle.id} canEdit={isManager} />}
              {activeTab === 'media'   && <PhotoGallery vehicleId={vehicle.id} stockId={vehicle.stock_id} canEdit={isManager} />}
            </div>
          </div>

          {/* ── Right sidebar ────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Website toggle */}
            <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5c7090', letterSpacing: '0.08em', marginBottom: 12 }}>WEBSITE VISIBILITY</div>
              <WebsiteToggle vehicleId={vehicle.id} initialValue={vehicle.show_on_website} vehicleStatus={vehicle.status} />
            </div>

            {/* Status change */}
            {transitions.length > 0 && isManager && (
              <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#5c7090', letterSpacing: '0.08em', marginBottom: 12 }}>CHANGE STATUS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {transitions.map(s => (
                    <button key={s} onClick={() => void handleStatusChange(s)} disabled={statusLoading} style={{
                      width: '100%', padding: '9px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                      color: '#818cf8', cursor: statusLoading ? 'not-allowed' : 'pointer',
                      opacity: statusLoading ? 0.7 : 1, textAlign: 'left',
                    }}>
                      {STATUS_LABELS[s] ?? s}
                    </button>
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
                { label: 'Purchase',     value: vehicle.purchase_type                     },
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

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
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
        { label: 'Make',            value: vehicle.make             },
        { label: 'Model',           value: vehicle.model            },
        { label: 'Variant',         value: vehicle.variant          },
        { label: 'Year',            value: String(vehicle.year)     },
        { label: 'Color',           value: vehicle.color            },
        { label: 'Body Type',       value: formatLabel(vehicle.body_type) },
        { label: 'Condition',       value: formatCondition(vehicle.condition) },
        { label: 'Location',        value: vehicle.location         },
      ],
    },
    {
      title: 'Specifications',
      fields: [
        { label: 'Mileage',         value: formatMileage(vehicle.mileage) },
        { label: 'Engine',          value: vehicle.engine_capacity   },
        { label: 'Transmission',    value: formatTransmission(vehicle.transmission) },
        { label: 'Fuel Type',       value: formatFuelType(vehicle.fuel_type) },
      ],
    },
    {
      title: 'Identification',
      fields: [
        { label: 'Chassis / VIN',   value: vehicle.chassis_vin      },
        { label: 'Reg. Number',     value: vehicle.registration_number },
      ],
    },
    {
      title: 'Purchase Information',
      fields: [
        { label: 'Purchase Date',   value: vehicle.purchase_date    },
        { label: 'Supplier',        value: vehicle.supplier_name    },
        { label: 'Purchase Type',   value: formatLabel(vehicle.purchase_type) },
        { label: 'Purchase Price',  value: formatPrice(vehicle.purchase_price) },
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
