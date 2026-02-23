'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { formatPrice } from '@/lib/formatters';

interface Cost {
  id:          string;
  category:    string;
  description: string;
  amount:      number;
  cost_date:   string;
  created_at:  string;
}

interface Props {
  vehicleId:  string;
  canEdit:    boolean;
}

// Must match the API costSchema enum exactly
const COST_CATEGORIES: { value: string; label: string }[] = [
  { value: 'repair',              label: 'Repair'               },
  { value: 'spare_parts',         label: 'Spare Parts'          },
  { value: 'paint_bodywork',      label: 'Paint & Bodywork'     },
  { value: 'service',             label: 'Service'              },
  { value: 'transport',           label: 'Transport'            },
  { value: 'auction_import_fees', label: 'Auction / Import Fees'},
  { value: 'advertising',         label: 'Advertising'          },
  { value: 'other',               label: 'Other'                },
];

const INPUT: React.CSSProperties = {
  width: '100%', background: '#07090f', border: '1px solid #1f2d45',
  borderRadius: 6, padding: '7px 10px', fontSize: 13,
  color: '#dde4f0', outline: 'none', boxSizing: 'border-box',
};

function todayStr() {
  return new Date().toISOString().split('T')[0]!;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CostTable({ vehicleId, canEdit }: Props) {
  const [costs,    setCosts]    = useState<Cost[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const [form, setForm] = useState({
    category:    'repair',
    description: '',
    amount:      '',
    cost_date:   todayStr(),
    supplier:    '',
  });

  useEffect(() => { void loadCosts(); }, [vehicleId]);

  async function loadCosts() {
    setLoading(true);
    try {
      const data = await adminApi.getCosts(vehicleId);
      setCosts(data as unknown as Cost[]);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }

  function resetForm() {
    setForm({ category: 'repair', description: '', amount: '', cost_date: todayStr(), supplier: '' });
    setEditId(null);
    setShowForm(false);
    setError('');
  }

  function startEdit(cost: Cost) {
    setForm({
      category:    cost.category,
      description: cost.description,
      amount:      String(cost.amount),
      cost_date:   cost.cost_date ? cost.cost_date.split('T')[0]! : todayStr(),
      supplier:    '',
    });
    setEditId(cost.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    const desc = form.description.trim();
    const amt  = parseFloat(form.amount);

    if (!desc)              { setError('Description is required');          return; }
    if (!form.amount)       { setError('Amount is required');               return; }
    if (isNaN(amt)||amt<=0) { setError('Amount must be a positive number'); return; }
    if (!form.cost_date)    { setError('Date is required');                 return; }

    setSaving(true);
    setError('');

    // Supplier has no separate DB column — embed it into description
    const finalDesc = form.supplier.trim()
      ? `${desc} — Supplier: ${form.supplier.trim()}`
      : desc;

    try {
      const payload = {
        category:    form.category,
        description: finalDesc,
        amount:      amt,
        cost_date:   form.cost_date,
      };
      if (editId) {
        await adminApi.updateCost(vehicleId, editId, payload);
      } else {
        await adminApi.addCost(vehicleId, payload);
      }
      await loadCosts();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cost entry');
    } finally {
      setSaving(false);
    }
  }

  const total = costs.reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div>
      {/* Header */}
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

      {/* Form */}
      {showForm && canEdit && (
        <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
            {editId ? 'Edit Cost Entry' : 'Add Cost Entry'}
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: 6, padding: '7px 10px', marginBottom: 12 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Category + Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: '#5c7090', display: 'block', marginBottom: 4 }}>
                Category <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ ...INPUT, appearance: 'none', cursor: 'pointer' }}
              >
                {COST_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#5c7090', display: 'block', marginBottom: 4 }}>
                Amount (LKR) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number" min="0" step="1"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 15000"
                style={INPUT}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: '#5c7090', display: 'block', marginBottom: 4 }}>
              Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Full service + oil change"
              style={INPUT}
            />
          </div>

          {/* Date (calendar picker) + Supplier */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: '#5c7090', display: 'block', marginBottom: 4 }}>
                Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                value={form.cost_date}
                max={todayStr()}
                onChange={e => setForm(f => ({ ...f, cost_date: e.target.value }))}
                style={{ ...INPUT, colorScheme: 'dark', cursor: 'pointer' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#5c7090', display: 'block', marginBottom: 4 }}>
                Supplier <span style={{ fontSize: 10, color: '#3d5270' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={form.supplier}
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                placeholder="e.g. Perera Motors"
                style={INPUT}
              />
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
                {['Category', 'Description', 'Date', 'Amount', canEdit ? '' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#5c7090', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costs.map((cost, i) => (
                <tr key={cost.id} style={{ borderTop: i > 0 ? '1px solid #1a2535' : 'none' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                      {COST_CATEGORIES.find(c => c.value === cost.category)?.label ?? cost.category}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#dde4f0' }}>{cost.description}</td>
                  <td style={{ padding: '10px 14px', color: '#5c7090', whiteSpace: 'nowrap' }}>{formatDate(cost.cost_date)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap' }}>{formatPrice(Number(cost.amount))}</td>
                  {canEdit && (
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => startEdit(cost)} style={{
                        background: 'none', border: 'none', fontSize: 12,
                        color: '#5c7090', cursor: 'pointer', padding: '2px 6px',
                      }}>✏️</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #1f2d45', background: '#111827' }}>
                <td colSpan={3} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#5c7090' }}>TOTAL COSTS</td>
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