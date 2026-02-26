'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { expenseApi, inventoryApi } from '@/lib/api';
import { useTheme } from '@/lib/theme';

const CATEGORIES = [
  { value: 'rent',           label: '🏢 Rent' },
  { value: 'utilities',      label: '💡 Utilities' },
  { value: 'salaries',       label: '💼 Salaries' },
  { value: 'marketing',      label: '📣 Marketing' },
  { value: 'office',         label: '🖨️ Office' },
  { value: 'vehicle_repair', label: '🔧 Vehicle Repair' },
  { value: 'transport',      label: '🚚 Transport' },
  { value: 'other',          label: '📦 Other' },
];

export default function EditExpensePage({ params }: { params: { id: string } }) {
  const t      = useTheme();
  const router = useRouter();

  const [category,    setCategory]    = useState('');
  const [description, setDescription] = useState('');
  const [amount,      setAmount]      = useState('');
  const [date,        setDate]        = useState('');
  const [vehicleId,   setVehicleId]   = useState('');
  const [reference,   setReference]   = useState('');
  const [notes,       setNotes]       = useState('');

  const [vehicles,    setVehicles]    = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    Promise.all([
      expenseApi.getById(params.id),
      inventoryApi.list({ limit: 200, status: 'available' }),
    ]).then(([exp, inv]) => {
      setCategory(exp.category ?? '');
      setDescription(exp.description ?? '');
      setAmount(String(exp.amount ?? ''));
      setDate(exp.expense_date ?? '');
      setVehicleId((exp.vehicle as any)?.id ?? '');
      setReference(exp.reference ?? '');
      setNotes(exp.notes ?? '');
      setVehicles(inv.vehicles ?? []);
    }).catch(() => setError('Failed to load expense'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const valid = category && description.trim() && Number(amount) > 0 && date;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      await expenseApi.update(params.id, {
        category:     category as any,
        description:  description.trim(),
        amount:       Number(amount),
        expense_date: date,
        vehicle_id:   vehicleId || undefined,
        reference:    reference.trim() || undefined,
        notes:        notes.trim() || undefined,
      });
      router.push('/admin/expenses');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update expense');
    }
    setSaving(false);
  };

  const inp   = { width: '100%', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '10px 14px', color: t.text, fontSize: 14, boxSizing: 'border-box' as const };
  const lbl   = { fontSize: 11, fontWeight: 700 as const, color: t.muted, textTransform: 'uppercase' as const, letterSpacing: '.06em', display: 'block', marginBottom: 6 };
  const field = { marginBottom: 18 };

  if (loading) return <AdminShell activeKey="expenses"><div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div></AdminShell>;

  return (
    <AdminShell activeKey="expenses">
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 8px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <Link href="/admin/expenses" style={{ color: t.muted, textDecoration: 'none', fontSize: 20 }}>←</Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, margin: 0 }}>Edit Expense</h1>
            <p style={{ color: t.muted, fontSize: 13, margin: 0 }}>Update expense details</p>
          </div>
        </div>

        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 28 }}>

          {/* Category */}
          <div style={field}>
            <label style={lbl}>Category *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                  style={{
                    padding: '10px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: category === c.value ? '#2563eb22' : t.inputBg,
                    border: `1px solid ${category === c.value ? '#2563eb' : t.border}`,
                    color: category === c.value ? '#60a5fa' : t.text,
                    textAlign: 'center', transition: 'all .12s',
                  }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div style={field}>
            <label style={lbl}>Description *</label>
            <input value={description} onChange={e => setDescription(e.target.value)} style={inp} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={lbl}>Amount (LKR) *</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
            </div>
          </div>

          <div style={field}>
            <label style={lbl}>Link to Vehicle (optional)</label>
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              <option value="">— No vehicle link —</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.stock_id} · {v.year} {v.make} {v.model}</option>
              ))}
            </select>
          </div>

          <div style={field}>
            <label style={lbl}>Reference No. (optional)</label>
            <input value={reference} onChange={e => setReference(e.target.value)} style={inp} />
          </div>

          <div style={field}>
            <label style={lbl}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {error && <div style={{ background: '#ef444422', border: '1px solid #ef444444', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Link href="/admin/expenses" style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${t.border}`, color: t.muted, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              Cancel
            </Link>
            <button onClick={handleSubmit} disabled={!valid || saving}
              style={{ padding: '10px 24px', borderRadius: 10, background: valid && !saving ? '#2563eb' : '#2563eb66', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: valid && !saving ? 'pointer' : 'default' }}>
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
