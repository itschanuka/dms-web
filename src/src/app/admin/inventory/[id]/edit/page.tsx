'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import VehicleForm from '@/components/admin/VehicleForm';
import { adminApi, type AdminVehicle } from '@/lib/api';

interface Props { params: Promise<{ id: string }> }

/**
 * Converts all nullable string/number fields from AdminVehicle
 * into undefined so they are compatible with VehicleForm's Vehicle type.
 */
function normalizeVehicle(v: AdminVehicle) {
  return {
    id:                      v.id,
    make:                    v.make,
    model:                   v.model,
    variant:                 v.variant                 ?? undefined,
    year:                    v.year,
    mileage:                 v.mileage,
    engine_capacity:         v.engine_capacity         ?? undefined,
    transmission:            v.transmission,
    fuel_type:               v.fuel_type,
    color:                   v.color,
    body_type:               v.body_type,
    condition:               v.condition,
    location:                v.location,
    chassis_vin:             v.chassis_vin,
    registration_number:     v.registration_number     ?? undefined,
    purchase_date:           v.purchase_date,
    supplier_name:           v.supplier_name           ?? undefined,
    purchase_type:           v.purchase_type,
    purchase_price:          v.purchase_price,
    purchase_payment_status: v.purchase_payment_status,
    asking_price:            v.asking_price,
    minimum_price:           v.minimum_price           ?? undefined,
    notes:                   v.notes                   ?? undefined,
  };
}

export default function EditVehiclePage({ params }: Props) {
  const { id } = use(params);
  const [vehicle, setVehicle] = useState<AdminVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    adminApi.getVehicle(id)
      .then(setVehicle)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AdminShell>
      <div style={{ padding: '28px' }}>
        <Link
          href={`/admin/inventory/${id}`}
          style={{
            fontSize: 12, color: '#5c7090', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16,
          }}
        >
          ← Back to Vehicle
        </Link>

        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 24px' }}>
          Edit Vehicle {vehicle ? `— ${vehicle.stock_id}` : ''}
        </h1>

        {loading && <div style={{ color: '#5c7090', fontSize: 13 }}>Loading…</div>}
        {error   && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}

        {vehicle && (
          <div style={{
            background: '#0d1117', border: '1px solid #1f2d45',
            borderRadius: 14, padding: '28px',
          }}>
            {/* normalizeVehicle converts null → undefined to satisfy VehicleForm's type */}
            <VehicleForm mode="edit" initial={normalizeVehicle(vehicle)} />
          </div>
        )}
      </div>
    </AdminShell>
  );
}