'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import ReportTable from '@/components/reports/ReportTable';
import { reportApi } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';

const TABS = [
  { key: 'summary',    label: '📊 Sales Summary' },
  { key: 'by-finance', label: '🏦 By Finance Provider' },
];

const PRESETS = [
  { label: 'This month', getRange: () => {
    const n = new Date(); const y = n.getFullYear(); const m = String(n.getMonth()+1).padStart(2,'0');
    return { from: `${y}-${m}-01`, to: `${y}-${m}-31` };
  }},
  { label: 'Last 3mo', getRange: () => {
    const to = new Date(); const from = new Date(); from.setMonth(from.getMonth() - 3);
    return { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) };
  }},
  { label: 'This year', getRange: () => {
    const y = new Date().getFullYear();
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }},
];

export default function SalesReportPage() {
  const t = useTheme();
  const { employee } = useAuth();
  const canViewProfit = employee?.role === 'admin' || employee?.permissions?.view_profit;

  const [tab,      setTab]      = useState('summary');
  const [report,   setReport]   = useState<any>(null);
  const [loading,  setLoading]  = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params['from'] = dateFrom;
      if (dateTo)   params['to']   = dateTo;
      const data = await reportApi.getSalesReport(`sales/${tab}`, params);
      setReport(data);
    } catch {}
    setLoading(false);
  }, [tab, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const inp = { background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '7px 12px', color: t.text, fontSize: 13 };
  const exportParams: Record<string, string> = {};
  if (dateFrom) exportParams['from'] = dateFrom;
  if (dateTo)   exportParams['to']   = dateTo;

  return (
    <AdminShell activeKey="reports">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Link href="/admin/reports" style={{ color: t.muted, textDecoration: 'none', fontSize: 20 }}>←</Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, margin: 0 }}>💵 Sales Reports</h1>
            <p style={{ color: t.muted, fontSize: 13, margin: 0 }}>Revenue, balances, finance breakdown{canViewProfit ? ', profit' : ''}</p>
          </div>
        </div>

        {!canViewProfit && (
          <div style={{ background: '#f59e0b22', border: '1px solid #f59e0b44', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#f59e0b', fontSize: 12 }}>
            ⚠️ Profit column hidden — requires <strong>view_profit</strong> permission.
          </div>
        )}

        {/* Tabs + date filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {TABS.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${tab === tb.key ? '#2563eb' : t.border}`, background: tab === tb.key ? '#2563eb22' : 'transparent', color: tab === tb.key ? '#60a5fa' : t.muted, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* Date range row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { const r = p.getRange(); setDateFrom(r.from); setDateTo(r.to); }}
              style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {p.label}
            </button>
          ))}
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
          <span style={{ color: t.muted, fontSize: 12 }}>to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
              style={{ ...inp, cursor: 'pointer', color: t.muted }}>✕ Clear</button>
          )}
        </div>

        <ReportTable
          title={report?.title ?? ''}
          summary={report?.summary?.map((s: any) => ({ label: s.label, value: s.value })) ?? []}
          columns={report?.columns ?? []}
          rows={report?.rows ?? []}
          loading={loading}
          exportEndpoint={`/reports/sales/${tab}/export`}
          exportParams={exportParams}
        />
      </div>
    </AdminShell>
  );
}
