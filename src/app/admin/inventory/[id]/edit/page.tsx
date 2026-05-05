'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import VehicleForm from '@/components/admin/VehicleForm';
import { adminApi, type AdminVehicle } from '@/lib/api';

// ─────────────────────────────────────────────────────────────
// normalizeVehicle — UNTOUCHED
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// SCOPED CSS
// ─────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&family=JetBrains+Mono:wght@500;700&display=swap');

  .evp {
    --bg:          #0b0f1a;
    --surface:     #111827;
    --border:      rgba(255,255,255,0.07);
    --text:        #edf2fc;
    --text-c:      #536880;
    --text-b:      #a8bdd6;
    --accent:      #6366f1;
    --red:         #ef4444;
    --mono:        'JetBrains Mono', monospace;
    --font:        'DM Sans', sans-serif;
    --r-sm:        6px;
    --r-lg:        14px;
  }

  .evp * { box-sizing: border-box; font-family: var(--font); }
  .evp { background: var(--bg); min-height: 100%; padding: 32px 28px; }

  /* back link */
  .evp-back {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 600; color: var(--text-c);
    text-decoration: none; margin-bottom: 16px;
    transition: color 0.15s, gap 0.15s;
  }
  .evp-back:hover { color: var(--text-b); gap: 8px; }

  /* header */
  .evp-title { font-size: 23px; font-weight: 900; color: var(--text); margin: 0 0 26px; letter-spacing: -0.5px; }
  .evp-stock { font-family: var(--mono); color: var(--text-c); font-weight: 600; font-size: 18px; }

  /* states */
  .evp-loading { color: var(--text-c); font-size: 13px; padding: 20px 0; }
  .evp-error   { color: var(--red);    font-size: 13px; padding: 20px 0; }

  /* form card */
  .evp-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 28px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.3);
  }
`;

// ─────────────────────────────────────────────────────────────
// COMPONENT — all state/fetch logic UNTOUCHED
// ─────────────────────────────────────────────────────────────

interface Props { params: Promise<{ id: string }> }

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
      <style>{CSS}</style>

      <div className="evp">
        <Link href={`/admin/inventory/${id}`} className="evp-back">
          ← Back to Vehicle
        </Link>

        <h1 className="evp-title">
          Edit Vehicle{vehicle ? <span className="evp-stock"> — {vehicle.stock_id}</span> : ''}
        </h1>

        {loading && <div className="evp-loading">Loading…</div>}
        {error   && <div className="evp-error">{error}</div>}

        {vehicle && (
          <div className="evp-card">
            <VehicleForm mode="edit" initial={normalizeVehicle(vehicle)} />
          </div>
        )}
      </div>
    </AdminShell>
  );
}