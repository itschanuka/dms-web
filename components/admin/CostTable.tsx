'use client';

import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/lib/api';
import { formatPrice } from '@/lib/formatters';
import { createClient } from '@/lib/supabase/client';

interface ReceiptFile { url: string; name: string; }

interface Cost {
  id:            string;
  category:      string;
  description:   string;
  amount:        number;
  cost_date:     string;
  receipt_files: ReceiptFile[] | null;
  created_at:    string;
}

interface Props {
  vehicleId: string;
  stockId:   string;
  canEdit:   boolean;
}

const COST_CATEGORIES = [
  { value: 'repair',              label: 'Repair'                },
  { value: 'spare_parts',         label: 'Spare Parts'           },
  { value: 'paint_bodywork',      label: 'Paint & Bodywork'      },
  { value: 'service',             label: 'Service'               },
  { value: 'transport',           label: 'Transport'             },
  { value: 'auction_import_fees', label: 'Auction / Import Fees' },
  { value: 'advertising',         label: 'Advertising'           },
  { value: 'other',               label: 'Other'                 },
];

const INPUT: React.CSSProperties = {
  width: '100%', background: '#07090f', border: '1px solid #1f2d45',
  borderRadius: 6, padding: '7px 10px', fontSize: 13,
  color: '#dde4f0', outline: 'none', boxSizing: 'border-box',
};

function todayStr() { return new Date().toISOString().split('T')[0]!; }

function formatDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg','jpeg','png','webp','gif','bmp'].includes(ext)) return '🖼️';
  if (ext === 'pdf')                                          return '📄';
  if (['doc','docx'].includes(ext))                          return '📝';
  if (['xls','xlsx','csv'].includes(ext))                    return '📊';
  return '📎';
}

export default function CostTable({ vehicleId, stockId, canEdit }: Props) {
  const [costs,     setCosts]     = useState<Cost[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    category:      'repair',
    description:   '',
    amount:        '',
    cost_date:     todayStr(),
    supplier:      '',
    receipt_files: [] as ReceiptFile[],
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
    setForm({ category: 'repair', description: '', amount: '', cost_date: todayStr(), supplier: '', receipt_files: [] });
    setEditId(null);
    setShowForm(false);
    setError('');
    setUploadProgress('');
  }

  function startEdit(cost: Cost) {
    setForm({
      category:      cost.category,
      description:   cost.description,
      amount:        String(cost.amount),
      cost_date:     cost.cost_date ? cost.cost_date.split('T')[0]! : todayStr(),
      supplier:      '',
      receipt_files: cost.receipt_files ?? [],
    });
    setEditId(cost.id);
    setShowForm(true);
  }

  async function handleFilesSelected(fileList: FileList) {
    if (fileList.length === 0) return;
    setUploading(true);
    setError('');
    const newUploads: ReceiptFile[] = [];

    try {
      const supabase = createClient();
      const total = fileList.length;

      for (let i = 0; i < total; i++) {
        const file = fileList[i]!;
        setUploadProgress(`Uploading ${i + 1} of ${total}: ${file.name}`);

        const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
        const path = `receipts/${stockId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        // Force contentType so Supabase doesn't reject based on extension guessing
        const contentType = file.type || 'application/octet-stream';

        const { error: uploadErr } = await supabase.storage
          .from('customer-docs')
          .upload(path, file, { upsert: false, contentType });

        if (uploadErr) throw new Error(`"${file.name}" failed: ${uploadErr.message}`);

        // customer-docs is private — generate a long-lived signed URL (10 years)
        const { data: signedData, error: signErr } = await supabase.storage
          .from('customer-docs')
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);

        if (signErr || !signedData?.signedUrl) throw new Error(`"${file.name}" failed: could not generate signed URL`);

        const publicUrl = signedData.signedUrl;

        newUploads.push({ url: publicUrl, name: file.name });
      }

      setForm(f => ({ ...f, receipt_files: [...f.receipt_files, ...newUploads] }));
      setUploadProgress('');
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function removeReceipt(index: number) {
    setForm(f => ({ ...f, receipt_files: f.receipt_files.filter((_, i) => i !== index) }));
  }

  async function handleSubmit() {
    const desc = form.description.trim();
    const amt  = parseFloat(form.amount);

    if (!desc)                  { setError('Description is required');          return; }
    if (!form.amount)           { setError('Amount is required');               return; }
    if (isNaN(amt) || amt <= 0) { setError('Amount must be a positive number'); return; }
    if (!form.cost_date)        { setError('Date is required');                 return; }

    setSaving(true);
    setError('');

    const finalDesc = form.supplier.trim()
      ? `${desc} — Supplier: ${form.supplier.trim()}`
      : desc;

    try {
      const payload = {
        category:      form.category,
        description:   finalDesc,
        amount:        amt,
        cost_date:     form.cost_date,
        receipt_files: form.receipt_files.length > 0 ? form.receipt_files : null,
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

  const total = costs.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div>
      {/* ── Header ── */}
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

      {/* ── Form ── */}
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

          {/* Date + Supplier */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
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

          {/* ── Receipts / Bills ── */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#5c7090', display: 'block', marginBottom: 6 }}>
              Receipts / Bills
              <span style={{ fontSize: 10, color: '#3d5270', marginLeft: 6 }}>
                (any file type — images, PDF, Word, Excel · multiple allowed)
              </span>
            </label>

            {/* Attached files list */}
            {form.receipt_files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {form.receipt_files.map((rf, idx) => (
                  <div key={idx} style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          8,
                    background:   'rgba(16,185,129,0.07)',
                    border:       '1px solid rgba(16,185,129,0.18)',
                    borderRadius: 6,
                    padding:      '7px 10px',
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{fileIcon(rf.name)}</span>
                    <a
                      href={rf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12, color: '#10b981', textDecoration: 'none',
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {rf.name}
                    </a>
                    <button
                      onClick={() => removeReceipt(idx)}
                      title="Remove"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, padding: '0 2px', flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button / progress */}
            <input
              ref={fileRef}
              type="file"
              accept="*/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files) void handleFilesSelected(e.target.files); }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            7,
                width:          '100%',
                background:     'rgba(255,255,255,0.03)',
                border:         '1px dashed #1f2d45',
                borderRadius:   6,
                padding:        '9px 14px',
                fontSize:       12,
                color:          uploading ? '#3d5270' : '#5c7090',
                cursor:         uploading ? 'not-allowed' : 'pointer',
                transition:     'border-color 0.18s, color 0.18s',
              }}
              onMouseEnter={e => { if (!uploading) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b5270'; (e.currentTarget as HTMLButtonElement).style.color = '#8097b8'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1f2d45'; (e.currentTarget as HTMLButtonElement).style.color = uploading ? '#3d5270' : '#5c7090'; }}
            >
              {uploading ? (
                <>{uploadProgress || 'Uploading…'}</>
              ) : (
                <>📎 {form.receipt_files.length > 0 ? 'Add More Files' : 'Attach Files'}</>
              )}
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSubmit}
              disabled={saving || uploading}
              style={{
                background: '#6366f1', color: '#fff', border: 'none',
                borderRadius: 7, padding: '8px 18px', fontSize: 13,
                fontWeight: 700, cursor: (saving || uploading) ? 'not-allowed' : 'pointer',
                opacity: (saving || uploading) ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : editId ? 'Update' : 'Add Cost'}
            </button>
            <button onClick={resetForm} disabled={uploading} style={{
              background: 'none', border: '1px solid #1f2d45',
              borderRadius: 7, padding: '8px 14px', fontSize: 13,
              color: '#5c7090', cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
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
                {['Category', 'Description', 'Date', 'Files', 'Amount', canEdit ? '' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#5c7090', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costs.map((cost, i) => {
                const files = cost.receipt_files ?? [];
                return (
                  <tr key={cost.id} style={{ borderTop: i > 0 ? '1px solid #1a2535' : 'none' }}>
                    {/* Category */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                        {COST_CATEGORIES.find(c => c.value === cost.category)?.label ?? cost.category}
                      </span>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '10px 14px', color: '#dde4f0', maxWidth: 220 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {cost.description}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '10px 14px', color: '#5c7090', whiteSpace: 'nowrap' }}>
                      {formatDate(cost.cost_date)}
                    </td>

                    {/* Files */}
                    <td style={{ padding: '10px 14px' }}>
                      {files.length === 0 ? (
                        <span style={{ color: '#2a3a50', fontSize: 12 }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {files.map((rf, idx) => (
                            <a
                              key={idx}
                              href={rf.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={rf.name}
                              style={{
                                display:        'inline-flex',
                                alignItems:     'center',
                                gap:            3,
                                fontSize:       11,
                                color:          '#10b981',
                                textDecoration: 'none',
                                background:     'rgba(16,185,129,0.08)',
                                border:         '1px solid rgba(16,185,129,0.18)',
                                borderRadius:   4,
                                padding:        '2px 7px',
                                whiteSpace:     'nowrap',
                                transition:     'background 0.15s',
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(16,185,129,0.16)'}
                              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(16,185,129,0.08)'}
                            >
                              <span style={{ fontSize: 13 }}>{fileIcon(rf.name)}</span>
                              {files.length === 1 ? 'View' : `File ${idx + 1}`}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap' }}>
                      {formatPrice(Number(cost.amount))}
                    </td>

                    {/* Edit */}
                    {canEdit && (
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          onClick={() => startEdit(cost)}
                          title="Edit"
                          style={{ background: 'none', border: 'none', fontSize: 13, color: '#5c7090', cursor: 'pointer', padding: '2px 6px' }}
                        >
                          ✏️
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
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