'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import ReportTable from '@/components/reports/ReportTable';
import { reportApi } from '@/lib/api';
import { useTheme } from '@/lib/theme';

export default function EmployeesReportPage() {
  const t = useTheme();
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
      const data = await reportApi.getSalesReport('employees/performance', params);
      setReport(data);
    } catch {}
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const inp = { background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '7px 12px', color: t.text, fontSize: 13 };
  const exportParams: Record<string, string> = {};
  if (dateFrom) exportParams['from'] = dateFrom;
  if (dateTo)   exportParams['to']   = dateTo;

  return (
    <AdminShell activeKey="reports">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Link href="/admin/reports" style={{ color: t.muted, textDecoration: 'none', fontSize: 20 }}>←</Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, margin: 0 }}>👨‍💼 Employee Reports</h1>
            <p style={{ color: t.muted, fontSize: 13, margin: 0 }}>Salesperson performance: deals, revenue, leads, conversion</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: t.muted, fontWeight: 700 }}>Date range:</span>
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
          exportEndpoint="/reports/employees/performance/export"
          exportParams={exportParams}
        />
      </div>
    </AdminShell>
  );
}
