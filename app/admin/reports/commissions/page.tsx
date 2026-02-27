'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import ReportTable from '@/components/reports/ReportTable';
import { reportApi } from '@/lib/api';
import { useTheme } from '@/lib/theme';

const TABS = [
  { key: 'summary', label: '📈 Commission Summary' },
  { key: 'unpaid',  label: '🔴 Unpaid List' },
];

function currentMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
}

export default function CommissionsReportPage() {
  const t = useTheme();
  const [tab,    setTab]    = useState('summary');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [month,  setMonth]  = useState(currentMonth());
  const [useMonth, setUseMonth] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (tab === 'summary' && useMonth) params['month'] = month;
      const data = await reportApi.getSalesReport(`commissions/${tab}`, params);
      setReport(data);
    } catch {}
    setLoading(false);
  }, [tab, month, useMonth]);

  useEffect(() => { load(); }, [load]);

  const inp = { background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '7px 12px', color: t.text, fontSize: 13 };
  const exportParams: Record<string, string> = {};
  if (tab === 'summary' && useMonth) exportParams['month'] = month;

  return (
    <AdminShell activeKey="reports">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 8px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Link href="/admin/reports" style={{ color: t.muted, textDecoration: 'none', fontSize: 20 }}>←</Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, margin: 0 }}>💸 Commission Reports</h1>
            <p style={{ color: t.muted, fontSize: 13, margin: 0 }}>Paid vs unpaid, monthly breakdown by employee</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {TABS.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${tab === tb.key ? '#2563eb' : t.border}`, background: tab === tb.key ? '#2563eb22' : 'transparent', color: tab === tb.key ? '#60a5fa' : t.muted, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {tb.label}
            </button>
          ))}
          {tab === 'summary' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.muted, cursor: 'pointer' }}>
                <input type="checkbox" checked={useMonth} onChange={e => setUseMonth(e.target.checked)} />
                Filter by month
              </label>
              {useMonth && (
                <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={inp} />
              )}
            </div>
          )}
        </div>

        <ReportTable
          title={report?.title ?? ''}
          summary={report?.summary?.map((s: any) => ({ label: s.label, value: s.value })) ?? []}
          columns={report?.columns ?? []}
          rows={report?.rows ?? []}
          loading={loading}
          exportEndpoint={`/reports/commissions/${tab}/export`}
          exportParams={exportParams}
        />
      </div>
    </AdminShell>
  );
}
