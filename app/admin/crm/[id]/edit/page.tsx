'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import {
  leadApi, type LeadSource, type Salesperson, type VehicleSearchResult,
} from '@/lib/api';
import { formatPrice } from '@/lib/formatters';
import { useTheme } from '@/lib/theme';

const SOURCE_LABELS: Record<string, string> = {
  walk_in: 'Walk-in', call: 'Call', website: 'Website',
  facebook: 'Facebook', whatsapp: 'WhatsApp', referral: 'Referral', other: 'Other',
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8097b8', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function EditLeadPage() {
  const params   = useParams();
  const router   = useRouter();
  const { isDark } = useTheme();
  const id = params['id'] as string;

  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);

  // Vehicle search
  const [vehicleQuery,    setVehicleQuery]    = useState('');
  const [vehicleResults,  setVehicleResults]  = useState<VehicleSearchResult[]>([]);
  const [vehicleSearching, setVehicleSearching] = useState(false);
  const [selectedVehicle, setSelectedVehicle]  = useState<VehicleSearchResult | null>(null);
  const vehicleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    customer_name:           '',
    customer_phone:          '',
    interested_vehicle_id:   '' as string | null,
    interested_vehicle_desc: '',
    source:                  'walk_in' as LeadSource,
    assigned_to:             '',
    next_followup_date:      '',
    next_followup_note:      '',
  });

  const c = {
    bg: isDark ? '#07090f' : '#f0f4f8', card: isDark ? '#0d1117' : '#ffffff',
    border: isDark ? '#1f2d45' : '#d0dcea', text: isDark ? '#dde4f0' : '#1a2535',
    muted: isDark ? '#5c7090' : '#6b7fa0', drop: isDark ? '#111827' : '#f8fafc',
  };

  const F: React.CSSProperties = {
    width: '100%', background: c.bg, border: `1px solid ${c.border}`,
    borderRadius: 7, padding: '8px 11px', fontSize: 13, color: c.text,
    outline: 'none', boxSizing: 'border-box',
  };

  useEffect(() => {
    Promise.all([leadApi.get(id), leadApi.getSalespersons()])
      .then(([lead, sp]) => {
        setSalespersons(sp);
        setForm({
          customer_name:           lead.customer_name,
          customer_phone:          lead.customer_phone,
          interested_vehicle_id:   lead.interested_vehicle_id,
          interested_vehicle_desc: lead.interested_vehicle_desc ?? '',
          source:                  lead.source,
          assigned_to:             lead.assigned_to,
          next_followup_date:      lead.next_followup_date ?? '',
          next_followup_note:      lead.next_followup_note ?? '',
        });
        if (lead.vehicle) setSelectedVehicle(lead.vehicle as VehicleSearchResult);
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [id]);

  // Debounced vehicle search
  useEffect(() => {
    if (!vehicleQuery || vehicleQuery.length < 2) { setVehicleResults([]); return; }
    if (vehicleTimerRef.current) clearTimeout(vehicleTimerRef.current);
    vehicleTimerRef.current = setTimeout(async () => {
      setVehicleSearching(true);
      try { setVehicleResults(await leadApi.searchVehicles(vehicleQuery)); }
      catch { /* ignore */ } finally { setVehicleSearching(false); }
    }, 400);
    return () => { if (vehicleTimerRef.current) clearTimeout(vehicleTimerRef.current); };
  }, [vehicleQuery]);

  function set(key: string, value: string) { setForm(f => ({ ...f, [key]: value })); }

  function pickVehicle(v: VehicleSearchResult) {
    setSelectedVehicle(v);
    setVehicleResults([]);
    setVehicleQuery('');
    setForm(f => ({ ...f, interested_vehicle_id: v.id, interested_vehicle_desc: `${v.year} ${v.make} ${v.model} (${v.stock_id})` }));
  }

  function clearVehicle() {
    setSelectedVehicle(null);
    setForm(f => ({ ...f, interested_vehicle_id: null, interested_vehicle_desc: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name.trim())  { setError('Customer name is required');  return; }
    if (!form.customer_phone.trim()) { setError('Customer phone is required'); return; }
    if (!form.assigned_to)           { setError('Salesperson is required');     return; }

    setSaving(true); setError('');
    try {
      await leadApi.update(id, {
        customer_name:           form.customer_name,
        customer_phone:          form.customer_phone,
        interested_vehicle_id:   form.interested_vehicle_id ?? undefined,
        interested_vehicle_desc: form.interested_vehicle_desc || undefined,
        source:                  form.source,
        assigned_to:             form.assigned_to,
        next_followup_date:      form.next_followup_date || undefined,
        next_followup_note:      form.next_followup_note || undefined,
      });
      router.push(`/admin/crm/${id}`);
    } catch (err) { setError(String(err)); setSaving(false); }
  }

  if (loading) return <AdminShell><div style={{ padding: 40, color: '#5c7090', textAlign: 'center' }}>Loading…</div></AdminShell>;

  return (
    <AdminShell>
      <div style={{ padding: '28px 32px', maxWidth: 760 }}>
        <div style={{ marginBottom: 28 }}>
          <Link href={`/admin/crm/${id}`} style={{ fontSize: 12, color: c.muted, textDecoration: 'none' }}>← Back to Lead</Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, margin: '10px 0 4px' }}>Edit Lead</h1>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#ef4444' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Customer */}
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>Customer</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Customer Name" required><input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} style={F} /></Field>
              <Field label="Customer Phone" required><input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} style={F} /></Field>
            </div>
          </div>

          {/* Vehicle */}
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>Vehicle Interest</div>

            {selectedVehicle ? (
              <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{(selectedVehicle as any).year} {(selectedVehicle as any).make} {(selectedVehicle as any).model}</div>
                  <div style={{ fontSize: 11, color: c.muted }}>{(selectedVehicle as any).stock_id}</div>
                </div>
                <button type="button" onClick={clearVehicle} style={{ background: 'none', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 13 }}>✕ Remove</button>
              </div>
            ) : (
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <input
                  value={vehicleQuery}
                  onChange={e => setVehicleQuery(e.target.value)}
                  placeholder="Search vehicle by make, model, stock ID…"
                  style={F}
                />
                {vehicleResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: c.drop, border: `1px solid ${c.border}`, borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                    {vehicleResults.map(v => (
                      <div key={v.id} onClick={() => pickVehicle(v)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between' }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{v.year} {v.make} {v.model}</div>
                          <div style={{ fontSize: 11, color: c.muted }}>{v.stock_id}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{formatPrice(v.asking_price)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Field label="Vehicle Description (free text)">
              <input value={form.interested_vehicle_desc} onChange={e => set('interested_vehicle_desc', e.target.value)} style={F} placeholder="e.g. Toyota Aqua 2020" />
            </Field>
          </div>

          {/* Lead details */}
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>Lead Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Source" required>
                <select value={form.source} onChange={e => set('source', e.target.value)} style={F}>
                  {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Assigned To" required>
                <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} style={F}>
                  <option value="">— Select —</option>
                  {salespersons.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
                </select>
              </Field>
              <Field label="Next Follow-up Date">
                <input type="date" value={form.next_followup_date} onChange={e => set('next_followup_date', e.target.value)} style={F} />
              </Field>
              <Field label="Follow-up Note">
                <input value={form.next_followup_note} onChange={e => set('next_followup_note', e.target.value)} style={F} placeholder="What to discuss…" />
              </Field>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={{ background: saving ? '#0a6647' : '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <Link href={`/admin/crm/${id}`} style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 18px', fontSize: 14, color: c.muted, textDecoration: 'none' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
