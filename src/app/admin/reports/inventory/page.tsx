'use client';
import { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import ReportTable from '@/components/reports/ReportTable';
import { reportApi } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

const TABS = [
  { key: 'current-stock', label: '📦 Current Stock' },
  { key: 'aging-stock',   label: '⏰ Aging Stock' },
];

export default function InventoryReportPage() {
  const t = useTheme();
  const { employee } = useAuth();
  const canViewProfit = employee?.role === 'admin' || employee?.permissions?.view_profit;

  const [tab,    setTab]    = useState('current-stock');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [days,   setDays]   = useState('60');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (tab === 'aging-stock') params['days'] = days;
      const data = await reportApi.getSalesReport(`inventory/${tab}`, params);
      setReport(data);
    } catch {}
    setLoading(false);
  }, [tab, days]);

  useEffect(() => { load(); }, [load]);

  const exportParams: Record<string, string> = {};
  if (tab === 'aging-stock') exportParams['days'] = days;

  const inp = { background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '7px 12px', color: t.text, fontSize: 13 };

  return (
    <AdminShell activeKey="reports">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Link href="/admin/reports" style={{ color: t.muted, textDecoration: 'none', fontSize: 20 }}>←</Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, margin: 0 }}>🚗 Inventory Reports</h1>
            <p style={{ color: t.muted, fontSize: 13, margin: 0 }}>Stock levels, aging analysis, and profit potential</p>
          </div>
        </div>

        {!canViewProfit && (
          <div style={{ background: '#f59e0b22', border: '1px solid #f59e0b44', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#f59e0b', fontSize: 12 }}>
            ⚠️ Profit columns are hidden — your account doesn't have the <strong>view_profit</strong> permission.
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {TABS.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${tab === tb.key ? '#2563eb' : t.border}`, background: tab === tb.key ? '#2563eb22' : 'transparent', color: tab === tb.key ? '#60a5fa' : t.muted, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* Aging days filter */}
        {tab === 'aging-stock' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: t.muted, fontWeight: 700 }}>Threshold (days):</label>
            {['30', '60', '90', '120'].map(d => (
              <button key={d} onClick={() => setDays(d)}
                style={{ padding: '5px 14px', borderRadius: 8, border: `1px solid ${days === d ? '#2563eb' : t.border}`, background: days === d ? '#2563eb22' : 'transparent', color: days === d ? '#60a5fa' : t.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {d}+
              </button>
            ))}
          </div>
        )}

        <ReportTable
          title={report?.title ?? ''}
          summary={report?.summary?.map((s: any) => ({ label: s.label, value: s.value })) ?? []}
          columns={report?.columns ?? []}
          rows={report?.rows ?? []}
          loading={loading}
          exportEndpoint={`/reports/inventory/${tab}/export`}
          exportParams={exportParams}
        />
      </div>
    </AdminShell>
  );
}
