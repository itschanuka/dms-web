'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

interface Vehicle {
  id?:                     string;
  make?:                   string;
  model?:                  string;
  variant?:                string;
  year?:                   number;
  mileage?:                number;
  engine_capacity?:        string;
  transmission?:           string;
  fuel_type?:              string;
  color?:                  string;
  body_type?:              string;
  condition?:              string;
  location?:               string;
  chassis_vin?:            string;
  registration_number?:    string;
  purchase_date?:          string;
  supplier_name?:          string;
  purchase_type?:          string;
  purchase_price?:         number;
  purchase_payment_status?: string;
  asking_price?:           number;
  minimum_price?:          number;
  notes?:                  string;
}

interface Props {
  initial?: Vehicle;
  mode:     'create' | 'edit';
}

const INPUT: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '10px 13px',
  fontSize: 13,
  color: '#dde4f0',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'DM Mono', 'Fira Mono', 'Courier New', monospace",
  letterSpacing: '0.02em',
  transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
};

const SELECT: React.CSSProperties = {
  ...INPUT,
  appearance: 'none',
  cursor: 'pointer',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  letterSpacing: '0.01em',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 700,
  color: '#3d5272',
  marginBottom: 5,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  fontFamily: "'DM Sans', system-ui, sans-serif",
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={LABEL}>{label}{required && <span style={{ color: '#f87171' }}> *</span>}</label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={SELECT}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#3d5272', pointerEvents: 'none' }}>▼</span>
    </div>
  );
}

export default function VehicleForm({ initial = {}, mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const [form, setForm] = useState({
    make:                    initial.make                    ?? '',
    model:                   initial.model                   ?? '',
    variant:                 initial.variant                 ?? '',
    year:                    String(initial.year             ?? new Date().getFullYear()),
    mileage:                 String(initial.mileage          ?? ''),
    engine_capacity:         initial.engine_capacity         ?? '',
    transmission:            initial.transmission            ?? 'automatic',
    fuel_type:               initial.fuel_type               ?? 'petrol',
    color:                   initial.color                   ?? '',
    body_type:               initial.body_type               ?? 'sedan',
    condition:               initial.condition               ?? 'used',
    location:                initial.location                ?? 'Main Yard',
    chassis_vin:             initial.chassis_vin             ?? '',
    registration_number:     initial.registration_number     ?? '',
    purchase_date:           initial.purchase_date           ?? '',
    supplier_name:           initial.supplier_name           ?? '',
    purchase_type:           initial.purchase_type           ?? 'auction',
    purchase_price:          String(initial.purchase_price   ?? ''),
    purchase_payment_status: initial.purchase_payment_status ?? 'paid',
    asking_price:            String(initial.asking_price     ?? ''),
    minimum_price:           String(initial.minimum_price    ?? ''),
    notes:                   initial.notes                   ?? '',
  });

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Basic required checks
    if (!form.make || !form.model || !form.chassis_vin || !form.purchase_date || !form.purchase_price || !form.asking_price) {
      setError('Please fill in all required fields');
      return;
    }

    const payload = {
      make:                    form.make,
      model:                   form.model,
      variant:                 form.variant     || undefined,
      year:                    parseInt(form.year, 10),
      mileage:                 parseInt(form.mileage, 10) || 0,
      engine_capacity:         form.engine_capacity  || undefined,
      transmission:            form.transmission  as 'manual' | 'automatic' | 'cvt',
      fuel_type:               form.fuel_type     as 'petrol' | 'diesel' | 'hybrid' | 'electric',
      color:                   form.color,
      body_type:               form.body_type,
      condition:               form.condition,
      location:                form.location,
      chassis_vin:             form.chassis_vin,
      registration_number:     form.registration_number || undefined,
      purchase_date:           form.purchase_date,
      supplier_name:           form.supplier_name  || undefined,
      purchase_type:           form.purchase_type,
      purchase_price:          parseFloat(form.purchase_price),
      purchase_payment_status: form.purchase_payment_status,
      asking_price:            parseFloat(form.asking_price),
      minimum_price:           form.minimum_price ? parseFloat(form.minimum_price) : undefined,
      notes:                   form.notes         || undefined,
    };

    setSaving(true);
    try {
      if (mode === 'create') {
        const vehicle = await adminApi.createVehicle(payload);
        router.push(`/admin/inventory/${vehicle.id}`);
      } else {
        await adminApi.updateVehicle(initial.id!, payload);
        router.push(`/admin/inventory/${initial.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vehicle');
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .vf-input:focus {
          border-color: rgba(99,102,241,0.55) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important;
          background: rgba(99,102,241,0.04) !important;
        }
        .vf-input::placeholder { color: #253347; }
        .vf-input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.35); cursor: pointer; }
        .vf-input[type="number"]::-webkit-inner-spin-button { opacity: 0.25; }

        .vf-select:focus {
          border-color: rgba(99,102,241,0.55) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important;
          background: rgba(99,102,241,0.04) !important;
        }
        .vf-select option { background: #080d18; color: #dde4f0; }

        .vf-textarea:focus {
          border-color: rgba(99,102,241,0.55) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important;
          background: rgba(99,102,241,0.04) !important;
        }
        .vf-textarea::placeholder { color: #253347; }

        .vf-submit { transition: background 0.18s, box-shadow 0.18s, transform 0.12s; }
        .vf-submit:hover:not(:disabled) {
          background: #4f52e0 !important;
          box-shadow: 0 6px 20px rgba(99,102,241,0.3) !important;
          transform: translateY(-1px);
        }
        .vf-submit:active:not(:disabled) { transform: translateY(0); }

        .vf-cancel { transition: border-color 0.18s, color 0.18s; }
        .vf-cancel:hover { border-color: rgba(255,255,255,0.2) !important; color: #7a9ab8 !important; }
      `}</style>

      <form onSubmit={handleSubmit} style={{ maxWidth: 900, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 24 }}>
            {error}
          </div>
        )}

        {/* ── Section: Basic Info ─────────────────────────── */}
        <Section title="Basic Information">
          <Grid>
            <Field label="Make" required><input className="vf-input" type="text" value={form.make} onChange={e => set('make', e.target.value)} placeholder="Toyota" style={INPUT} /></Field>
            <Field label="Model" required><input className="vf-input" type="text" value={form.model} onChange={e => set('model', e.target.value)} placeholder="Aqua" style={INPUT} /></Field>
            <Field label="Variant"><input className="vf-input" type="text" value={form.variant} onChange={e => set('variant', e.target.value)} placeholder="S Grade" style={INPUT} /></Field>
            <Field label="Year" required>
              <SelectField value={form.year} onChange={v => set('year', v)} options={
                Array.from({ length: 36 }, (_, i) => {
                  const y = new Date().getFullYear() + 1 - i;
                  return { value: String(y), label: String(y) };
                })
              } />
            </Field>
            <Field label="Color" required><input className="vf-input" type="text" value={form.color} onChange={e => set('color', e.target.value)} placeholder="Pearl White" style={INPUT} /></Field>
            <Field label="Body Type" required>
              <SelectField value={form.body_type} onChange={v => set('body_type', v)} options={[
                { value: 'sedan',       label: 'Sedan'       },
                { value: 'suv',         label: 'SUV'         },
                { value: 'hatchback',   label: 'Hatchback'   },
                { value: 'van',         label: 'Van'         },
                { value: 'pickup',      label: 'Pickup'      },
                { value: 'coupe',       label: 'Coupe'       },
                { value: 'convertible', label: 'Convertible' },
                { value: 'wagon',       label: 'Wagon'       },
                { value: 'other',       label: 'Other'       },
              ]} />
            </Field>
          </Grid>
        </Section>

        {/* ── Section: Specs ──────────────────────────────── */}
        <Section title="Specifications">
          <Grid>
            <Field label="Condition" required>
              <SelectField value={form.condition} onChange={v => set('condition', v)} options={[
                { value: 'used',          label: 'Used'          },
                { value: 'reconditioned', label: 'Reconditioned' },
                { value: 'brand_new',     label: 'Brand New'     },
              ]} />
            </Field>
            <Field label="Mileage (km)" required><input className="vf-input" type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="42000" style={INPUT} /></Field>
            <Field label="Engine Capacity"><input className="vf-input" type="text" value={form.engine_capacity} onChange={e => set('engine_capacity', e.target.value)} placeholder="1500cc" style={INPUT} /></Field>
            <Field label="Transmission" required>
              <SelectField value={form.transmission} onChange={v => set('transmission', v)} options={[
                { value: 'automatic', label: 'Automatic' },
                { value: 'manual',    label: 'Manual'    },
                { value: 'cvt',       label: 'CVT'       },
              ]} />
            </Field>
            <Field label="Fuel Type" required>
              <SelectField value={form.fuel_type} onChange={v => set('fuel_type', v)} options={[
                { value: 'petrol',   label: 'Petrol'   },
                { value: 'diesel',   label: 'Diesel'   },
                { value: 'hybrid',   label: 'Hybrid'   },
                { value: 'electric', label: 'Electric' },
              ]} />
            </Field>
            <Field label="Location" required><input className="vf-input" type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Main Yard" style={INPUT} /></Field>
          </Grid>
        </Section>

        {/* ── Section: Identification ─────────────────────── */}
        <Section title="Identification">
          <Grid>
            <Field label="Chassis / VIN" required><input className="vf-input" type="text" value={form.chassis_vin} onChange={e => set('chassis_vin', e.target.value)} placeholder="NHP10-1234567" style={INPUT} /></Field>
            <Field label="Registration Number"><input className="vf-input" type="text" value={form.registration_number} onChange={e => set('registration_number', e.target.value)} placeholder="CBB-1234" style={INPUT} /></Field>
          </Grid>
        </Section>

        {/* ── Section: Purchase Info ──────────────────────── */}
        <Section title="Purchase Information">
          <Grid>
            <Field label="Purchase Date" required><input className="vf-input" type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} style={INPUT} /></Field>
            <Field label="Purchase Type" required>
              <SelectField value={form.purchase_type} onChange={v => set('purchase_type', v)} options={[
                { value: 'auction',  label: 'Auction'  },
                { value: 'private',  label: 'Private'  },
                { value: 'trade_in', label: 'Trade In' },
                { value: 'dealer',   label: 'Dealer'   },
                { value: 'other',    label: 'Other'    },
              ]} />
            </Field>
            <Field label="Supplier / Source"><input className="vf-input" type="text" value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)} placeholder="ABC Auctions" style={INPUT} /></Field>
            <Field label="Purchase Price (LKR)" required><input className="vf-input" type="number" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} placeholder="3200000" style={INPUT} /></Field>
            <Field label="Payment Status" required>
              <SelectField value={form.purchase_payment_status} onChange={v => set('purchase_payment_status', v)} options={[
                { value: 'paid',    label: 'Paid'    },
                { value: 'pending', label: 'Pending' },
                { value: 'partial', label: 'Partial' },
              ]} />
            </Field>
          </Grid>
        </Section>

        {/* ── Section: Pricing ────────────────────────────── */}
        <Section title="Pricing">
          <Grid>
            <Field label="Asking Price (LKR)" required><input className="vf-input" type="number" value={form.asking_price} onChange={e => set('asking_price', e.target.value)} placeholder="3950000" style={INPUT} /></Field>
            <Field label="Minimum Price (LKR)"><input className="vf-input" type="number" value={form.minimum_price} onChange={e => set('minimum_price', e.target.value)} placeholder="3700000" style={INPUT} /></Field>
          </Grid>
          <div style={{ fontSize: 11, color: '#3d5272', marginTop: 10, display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: 8 }}>
            ⚠️ Minimum price is confidential — only visible to Managers and Admins
          </div>
        </Section>

        {/* ── Section: Notes ──────────────────────────────── */}
        <Section title="Notes">
          <textarea className="vf-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes about this vehicle…" rows={3} style={{ ...INPUT, resize: 'vertical', fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.6 }} />
        </Section>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
          <button className="vf-submit" type="submit" disabled={saving} style={{
            background: saving ? '#131c30' : '#6366f1',
            color: saving ? '#2e4060' : '#fff',
            border: 'none', borderRadius: 10,
            padding: '12px 28px', fontSize: 14, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.22)',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            letterSpacing: '0.01em',
          }}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create Vehicle →' : 'Save Changes →'}
          </button>
          <button className="vf-cancel" type="button" onClick={() => router.back()} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '12px 20px',
            fontSize: 14, color: '#3d5272', cursor: 'pointer',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20, borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)', overflow: 'hidden' }}>
      <h3 style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3d5272', margin: 0, padding: '11px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {title}
      </h3>
      <div style={{ padding: '16px 18px' }}>
        {children}
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
      {children}
    </div>
  );
}