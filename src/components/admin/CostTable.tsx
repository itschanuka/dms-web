'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { formatPrice } from '@/lib/formatters';

interface Cost {
  id:          string;
  cost_type:   string;
  description: string;
  amount:      number;
  paid_date:   string | null;
  supplier:    string | null;
}

interface Props {
  vehicleId:  string;
  canEdit:    boolean;
}

const COST_TYPES = [
  'purchase', 'repair', 'service', 'inspection', 'shipping',
  'registration', 'insurance', 'cleaning', 'parts', 'other',
];

const INPUT: React.CSSProperties = {
  width: '100%', background: '#07090f', border: '1px solid #1f2d45',
  borderRadius: 6, padding: '7px 10px', fontSize: 13,
  color: '#dde4f0', outline: 'none', boxSizing: 'border-box',
};

export default function CostTable({ vehicleId, canEdit }: Props) {
  const [costs,   setCosts]   = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const [form, setForm] = useState({
    cost_type:   'repair',
    description: '',
    amount:      '',
    paid_date:   '',
    supplier:    '',
  });

  useEffect(() => { void loadCosts(); }, [vehicleId]);

  async function loadCosts() {
    setLoading(true);
    try {
      const data = await adminApi.getCosts(vehicleId);
      setCosts(data);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }

  function resetForm() {
    setForm({ cost_type: 'repair', description: '', amount: '', paid_date: '', supplier: '' });
    setEditId(null);
    setShowForm(false);
    setError('');
  }

  function startEdit(cost: Cost) {
    setForm({
      cost_type:   cost.cost_type,
      description: cost.description,
      amount:      String(cost.amount),
      paid_date:   cost.paid_date ?? '',
      supplier:    cost.supplier  ?? '',
    });
    setEditId(cost.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.description || !form.amount) { setError('Description and amount are required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        cost_type:   form.cost_type,
        description: form.description,
        amount:      parseFloat(form.amount),
        paid_date:   form.paid_date   || undefined,
        supplier:    form.supplier    || undefined,
      };
      if (editId) {
        await adminApi.updateCost(vehicleId, editId, payload);
      } else {
        await adminApi.addCost(vehicleId, payload);
      }
      await loadCosts();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const total = costs.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Cost Entries</span>
          <span style={{ fontSize: 12, color: '#5c7090', marginLeft: 10 }}>
            Total: <strong style={{ color: '#f59e0b' }}>{formatPrice(total)}</strong>
          </span>
        </div>
        {canEdit && !showForm && (
          <button onClick={() => setShowForm(true)} style={{
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 7, padding: '6px 14px', fontSize: 12,
            fontWeight: 700, color: '#818cf8', cursor: 'pointer',
          }}>
            + Add Cost
          </button>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && canEdit && (
        <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
            {editId ? 'Edit Cost' : 'Add Cost'}
          </div>
          {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: '#5c7090', display: 'block', marginBottom: 4 }}>Type</label>
              <select value={form.cost_type} onChange={e => setForm(f => ({ ...f, cost_type: e.target.value }))} style={{ ...INPUT, appearance: 'none' }}>
                {COST_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#5c7090', display: 'block', marginBottom: 4 }}>Amount (LKR) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" style={INPUT} />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: '#5c7090', display: 'block', marginBottom: 4 }}>Description *</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Full service + oil change" style={INPUT} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: '#5c7090', display: 'block', marginBottom: 4 }}>Paid Date</label>
              <input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} style={INPUT} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#5c7090', display: 'block', marginBottom: 4 }}>Supplier</label>
              <input type="text" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Optional" style={INPUT} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSubmit} disabled={saving} style={{
              background: '#6366f1', color: '#fff', border: 'none',
              borderRadius: 7, padding: '8px 18px', fontSize: 13,
              fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving…' : editId ? 'Update' : 'Add Cost'}
            </button>
            <button onClick={resetForm} style={{
              background: 'none', border: '1px solid #1f2d45',
              borderRadius: 7, padding: '8px 14px', fontSize: 13,
              color: '#5c7090', cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ fontSize: 13, color: '#5c7090', padding: '16px 0' }}>Loading costs…</div>
      ) : costs.length === 0 ? (
        <div style={{ fontSize: 13, color: '#5c7090', padding: '20px', textAlign: 'center', background: '#111827', borderRadius: 8 }}>
          No cost entries yet
        </div>
      ) : (
        <div style={{ border: '1px solid #1f2d45', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#111827' }}>
                {['Type', 'Description', 'Supplier', 'Date', 'Amount', canEdit ? '' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#5c7090', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costs.map((cost, i) => (
                <tr key={cost.id} style={{ borderTop: i > 0 ? '1px solid #1a2535' : 'none' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: 4 }}>
                      {cost.cost_type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#dde4f0' }}>{cost.description}</td>
                  <td style={{ padding: '10px 14px', color: '#5c7090' }}>{cost.supplier ?? '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#5c7090', whiteSpace: 'nowrap' }}>{cost.paid_date ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap' }}>{formatPrice(cost.amount)}</td>
                  {canEdit && (
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => startEdit(cost)} style={{
                        background: 'none', border: 'none', fontSize: 12,
                        color: '#5c7090', cursor: 'pointer', padding: '2px 6px',
                      }}>
                        ✏️
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #1f2d45', background: '#111827' }}>
                <td colSpan={4} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#5c7090' }}>TOTAL COSTS</td>
                <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 900, color: '#f59e0b' }}>{formatPrice(total)}</td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
