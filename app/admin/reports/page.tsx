'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { reportApi } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { formatCurrency } from '@/lib/formatters';
import { useAuth } from '@/hooks/useAuth';

// Simple bar chart using SVG (no dependency needed for basic charts)
function BarChart({ data, labelKey, valueKey, color = '#2563eb', height = 160 }: {
  data: Record<string, any>[];
  labelKey: string;
  valueKey: string;
  color?: string;
  height?: number;
}) {
  const t = useTheme();
  if (!data || data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: 12 }}>No data</div>;

  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, paddingBottom: 24, position: 'relative' }}>
      {data.map((d, i) => {
        const pct = ((Number(d[valueKey]) || 0) / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <div title={`${d[labelKey]}: ${d[valueKey]}`} style={{ width: '100%', height: `${pct}%`, background: color, borderRadius: '4px 4px 0 0', minHeight: 2, transition: 'height .3s', cursor: 'default' }} />
            <span style={{ fontSize: 9, color: t.muted, transform: 'rotate(-30deg)', transformOrigin: 'top center', whiteSpace: 'nowrap', marginTop: 4 }}>
              {String(d[labelKey]).slice(-7)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({ label, value, sub, color, icon, href }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: string; href?: string;
}) {
  const t    = useTheme();
  const card = (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '20px 22px', borderLeft: `4px solid ${color ?? '#2563eb'}`, transition: 'transform .1s', cursor: href ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: color ?? t.text, fontFamily: 'monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{card}</Link> : card;
}

export default function ReportsDashboardPage() {
  const t      = useTheme();
  const { employee } = useAuth();
  const isAdmin = employee?.role === 'admin' || employee?.role === 'manager';

  const [dash,    setDash]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // For charts — load report data
  const [monthlySales,    setMonthlySales]    = useState<any[]>([]);
  const [leadSources,     setLeadSources]     = useState<any[]>([]);
  const [agingStock,      setAgingStock]      = useState<any[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) return;

    reportApi.getDashboard()
      .then(setDash)
      .catch(() => {})
      .finally(() => setLoading(false));

    // Load chart data in parallel
    reportApi.getSalesReport('sales/summary', {}).then(r => {
      // Group deals by month
      const monthly: Record<string, number> = {};
      for (const row of (r.rows ?? [])) {
        const month = String(row['date'] ?? '').slice(0, 7);
        if (month) monthly[month] = (monthly[month] ?? 0) + (Number(row['total_amount']) || 0);
      }
      setMonthlySales(Object.entries(monthly).slice(-12).map(([month, total]) => ({ month, total })));
    }).catch(() => {});

    reportApi.getSalesReport('crm/lead-source', {}).then(r => {
      setLeadSources(r.rows?.slice(0, 6).map(row => ({ source: row['source'], count: row['total'] })) ?? []);
    }).catch(() => {});

    reportApi.getSalesReport('inventory/aging-stock', { days: '30' }).then(r => {
      // Group by days ranges
      const buckets: Record<string, number> = { '30–60': 0, '61–90': 0, '91–120': 0, '120+': 0 };
      for (const row of (r.rows ?? [])) {
        const d = Number(row['days_in_stock']) || 0;
        if (d <= 60)       buckets['30–60']!++;
        else if (d <= 90)  buckets['61–90']!++;
        else if (d <= 120) buckets['91–120']!++;
        else               buckets['120+']!++;
      }
      setAgingStock(Object.entries(buckets).map(([range, count]) => ({ range, count })));
    }).catch(() => {});

    reportApi.getSalesReport('expenses/monthly-trend', {}).then(r => {
      setMonthlyExpenses(r.rows?.slice(-12) ?? []);
    }).catch(() => {});
  }, [isAdmin]);

  if (!isAdmin) {
    return <AdminShell activeKey="reports"><div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Access restricted — Manager+ only</div></AdminShell>;
  }

  const inv  = dash?.inventory  ?? {};
  const crm  = dash?.crm        ?? {};
  const sal  = dash?.sales       ?? {};
  const comm = dash?.commissions ?? {};
  const exp  = dash?.expenses    ?? {};
  const emp  = dash?.employees   ?? {};
  const net  = dash?.net_position ?? 0;

  return (
    <AdminShell activeKey="reports">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: t.text, margin: 0 }}>📊 Analytics Dashboard</h1>
            <p style={{ color: t.muted, fontSize: 13, margin: '4px 0 0' }}>Live KPIs across all modules</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['inventory', 'crm', 'sales', 'customers', 'employees', 'commissions', 'expenses'].map(k => (
              <Link key={k} href={`/admin/reports/${k}`}
                style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${t.border}`, color: t.muted, textDecoration: 'none', fontSize: 12, fontWeight: 600, textTransform: 'capitalize', background: t.card }}>
                {k}
              </Link>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: t.muted }}>Loading KPIs...</div>
        ) : (
          <>
            {/* Net position banner */}
            <div style={{ background: net >= 0 ? '#16a34a22' : '#ef444422', border: `1px solid ${net >= 0 ? '#16a34a44' : '#ef444444'}`, borderRadius: 12, padding: '14px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: t.muted, fontSize: 14, fontWeight: 600 }}>Net Position (Profit − Expenses)</span>
              <span style={{ fontWeight: 900, fontSize: 22, color: net >= 0 ? '#34d399' : '#ef4444', fontFamily: 'monospace' }}>
                {net >= 0 ? '+' : ''}{formatCurrency(net)}
              </span>
            </div>

            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
              <KpiCard label="Available Stock"    value={inv.available_stock ?? 0}                  sub={`${inv.total_vehicles ?? 0} total · ${inv.sold_vehicles ?? 0} sold`} color="#6366f1" icon="🚗" href="/admin/reports/inventory" />
              <KpiCard label="Stock Value"        value={formatCurrency(inv.stock_value ?? 0)}        sub="At selling prices"            color="#818cf8" icon="💰" />
              <KpiCard label="Total Revenue"      value={formatCurrency(sal.total_revenue ?? 0)}      sub="All completed deals"          color="#34d399" icon="💵" href="/admin/reports/sales" />
              <KpiCard label="Pending Balances"   value={formatCurrency(sal.pending_balances ?? 0)}   sub="Awaiting collection"          color={sal.pending_balances > 0 ? '#f59e0b' : '#34d399'} icon="⏳" />
              <KpiCard label="Open Leads"         value={crm.open_leads ?? 0}                         sub={`${crm.total_leads ?? 0} total leads`} color="#ec4899" icon="📋" href="/admin/reports/crm" />
              <KpiCard label="Customers"          value={crm.total_customers ?? 0}                    sub="Total registered"             color="#0ea5e9" icon="👥" href="/admin/reports/customers" />
              <KpiCard label="Unpaid Commissions" value={formatCurrency(comm.unpaid_amount ?? 0)}     sub="Outstanding to salespeople"   color={comm.unpaid_amount > 0 ? '#ef4444' : '#34d399'} icon="💸" href="/admin/reports/commissions" />
              <KpiCard label="Total Expenses"     value={formatCurrency(exp.total_expenses ?? 0)}     sub="All categories"               color="#f59e0b" icon="🧾" href="/admin/reports/expenses" />
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 14 }}>📈 Monthly Revenue (last 12mo)</div>
                {monthlySales.length > 0
                  ? <BarChart data={monthlySales} labelKey="month" valueKey="total" color="#34d399" height={160} />
                  : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: 12 }}>No sales data</div>
                }
              </div>

              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 14 }}>🎯 Lead Sources</div>
                {leadSources.length > 0
                  ? <BarChart data={leadSources} labelKey="source" valueKey="count" color="#ec4899" height={160} />
                  : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: 12 }}>No lead data</div>
                }
              </div>

              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 14 }}>🚨 Aging Stock Buckets (days unsold)</div>
                {agingStock.some(d => d.count > 0)
                  ? <BarChart data={agingStock} labelKey="range" valueKey="count" color="#ef4444" height={160} />
                  : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: 12 }}>No aged stock</div>
                }
              </div>

              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 14 }}>🧾 Monthly Expenses</div>
                {monthlyExpenses.length > 0
                  ? <BarChart data={monthlyExpenses} labelKey="month" valueKey="total" color="#f59e0b" height={160} />
                  : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: 12 }}>No expense data</div>
                }
              </div>
            </div>

            {/* Active employees chip */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: '12px 20px', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>👨‍💼</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: t.text }}>{emp.active_count ?? 0} active employees</div>
                <Link href="/admin/reports/employees" style={{ fontSize: 12, color: '#60a5fa', textDecoration: 'none' }}>View performance →</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
