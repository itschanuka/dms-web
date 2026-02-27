import AdminShell from '@/components/admin/AdminShell';
import VehicleForm from '@/components/admin/VehicleForm';
import Link from 'next/link';

export default function NewVehiclePage() {
  return (
    <AdminShell>
      <div style={{ padding: '28px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link href="/admin/inventory" style={{ fontSize: 12, color: '#5c7090', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            ← Back to Inventory
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>Add New Vehicle</h1>
          <p style={{ fontSize: 13, color: '#5c7090', margin: '6px 0 0' }}>
            Stock ID will be auto-generated when you save.
          </p>
        </div>

        <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 14, padding: '28px 28px' }}>
          <VehicleForm mode="create" />
        </div>
      </div>
    </AdminShell>
  );
}
