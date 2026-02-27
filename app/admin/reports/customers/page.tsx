'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import ReportTable from '@/components/reports/ReportTable';
import { reportApi } from '@/lib/api';
import { useTheme } from '@/lib/theme';

const TABS = [
  { key: 'repeat',    label: '🔁 Repeat Buyers' },
  { key: 'top-spend', label: '💰 Top by Spend' },
];

export default function CustomersReportPage() {
  const t = useTheme();
  const [tab,    setTab]    = useState('repeat');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [limit,  setLimit]  = useState('20');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (tab === 'top-spend') params['limit'] = limit;
      const data = await reportApi.getSalesReport(`customers/${tab}`, params);
      setReport(data);
    } catch {}
    setLoading(false);
  }, [tab, limit]);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminShell activeKey="reports">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 8px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Link href="/admin/reports" style={{ color: t.muted, textDecoration: 'none', fontSize: 20 }}>←</Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, margin: 0 }}>👥 Customer Reports</h1>
            <p style={{ color: t.muted, fontSize: 13, margin: 0 }}>Repeat buyers, top spenders, history</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          {TABS.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${tab === tb.key ? '#2563eb' : t.border}`, background: tab === tb.key ? '#2563eb22' : 'transparent', color: tab === tb.key ? '#60a5fa' : t.muted, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {tb.label}
            </button>
          ))}
          {tab === 'top-spend' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
              <span style={{ fontSize: 12, color: t.muted, fontWeight: 700 }}>Show top:</span>
              {['10', '20', '50'].map(n => (
                <button key={n} onClick={() => setLimit(n)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${limit === n ? '#2563eb' : t.border}`, background: limit === n ? '#2563eb22' : 'transparent', color: limit === n ? '#60a5fa' : t.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        <ReportTable
          title={report?.title ?? ''}
          summary={report?.summary?.map((s: any) => ({ label: s.label, value: s.value })) ?? []}
          columns={report?.columns ?? []}
          rows={report?.rows ?? []}
          loading={loading}
          exportEndpoint={`/reports/customers/${tab}/export`}
          exportParams={tab === 'top-spend' ? { limit } : {}}
        />
      </div>
    </AdminShell>
  );
}
