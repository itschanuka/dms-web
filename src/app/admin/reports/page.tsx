'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { reportApi } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { formatCurrency } from '@/lib/formatters';
import { useAuth } from '@/hooks/useAuth';

function BarChart({ data, labelKey, valueKey, color = '#2563eb', height = 160 }: {
  data: Record<string, any>[];
  labelKey: string;
  valueKey: string;
  color?: string;
  height?: number;
}) {
  const t = useTheme();
  if (!data || data.length === 0) return (
    <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: 12, gap: 8, opacity: 0.5 }}>
      <span style={{ fontSize: 24 }}>📭</span> No data
    </div>
  );

  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height, paddingBottom: 26, position: 'relative' }}>
      {data.map((d, i) => {
        const pct = ((Number(d[valueKey]) || 0) / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <div
              title={`${d[labelKey]}: ${d[valueKey]}`}
              style={{
                width: '100%', height: `${pct}%`,
                background: `linear-gradient(180deg, ${color}cc, ${color})`,
                borderRadius: '4px 4px 0 0', minHeight: 2,
                transition: 'height .35s ease', cursor: 'default',
                boxShadow: `0 2px 8px ${color}30`,
              }}
            />
            <span style={{
              fontSize: 9, color: t.muted,
              transform: 'rotate(-35deg)', transformOrigin: 'top center',
              whiteSpace: 'nowrap', marginTop: 4,
            }}>
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
  const t = useTheme();
  const accent = color ?? '#2563eb';
  const card = (
    <div style={{
      background: t.card, border: `1px solid ${t.border}`,
      borderRadius: 14, padding: '18px 20px',
      borderTop: `3px solid ${accent}`,
      transition: 'transform .15s, box-shadow .15s',
      cursor: href ? 'pointer' : 'default',
      height: '100%', boxSizing: 'border-box',
    }}
      onMouseEnter={e => { if (href) { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)'; } }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '.07em', lineHeight: 1.4 }}>{label}</span>
        {icon && (
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}15`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent, fontFamily: 'monospace', letterSpacing: '-0.02em', marginBottom: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: t.muted, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{card}</Link> : card;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        {title}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ height: 1, width: 16, background: t.border }} />
      {children}
      <div style={{ flex: 1, height: 1, background: t.border }} />
    </div>
  );
}

export default function ReportsDashboardPage() {
  const t      = useTheme();
  const { employee } = useAuth();
  const isAdmin = employee?.role === 'admin' || employee?.role === 'manager';

  const [dash,    setDash]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

    reportApi.getSalesReport('sales/summary', {}).then(r => {
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
    return (
      <AdminShell activeKey="reports">
        <div style={{ padding: 80, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          Access restricted — Manager+ only
        </div>
      </AdminShell>
    );
  }

  const inv  = dash?.inventory   ?? {};
  const crm  = dash?.crm         ?? {};
  const sal  = dash?.sales        ?? {};
  const comm = dash?.commissions  ?? {};
  const exp  = dash?.expenses     ?? {};
  const emp  = dash?.employees    ?? {};
  const net  = dash?.net_position ?? 0;

  const moduleLinks = ['inventory', 'crm', 'sales', 'customers', 'employees', 'commissions', 'expenses'];

  return (
    <AdminShell activeKey="reports">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px 64px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>📊</span> Analytics Dashboard
              </h1>
              <p style={{ color: t.muted, fontSize: 13, margin: '5px 0 0', paddingLeft: 32 }}>Live KPIs across all modules</p>
            </div>
          </div>

          {/* Module nav */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {moduleLinks.map(k => (
              <Link key={k} href={`/admin/reports/${k}`} style={{
                padding: '7px 14px', borderRadius: 8,
                border: `1px solid ${t.border}`, color: t.muted,
                textDecoration: 'none', fontSize: 12, fontWeight: 600,
                textTransform: 'capitalize', background: t.card,
                transition: 'all 0.15s', display: 'inline-block',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLAnchorElement).style.color = '#6366f1'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = t.border; (e.currentTarget as HTMLAnchorElement).style.color = t.muted; }}
              >
                {k}
              </Link>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', background: t.card, border: `1px solid ${t.border}`, borderRadius: 14 }}>
            <div style={{ fontSize: 30, marginBottom: 12, opacity: 0.4 }}>⏳</div>
            <div style={{ color: t.muted, fontSize: 13, fontWeight: 500 }}>Loading KPIs…</div>
          </div>
        ) : (
          <>
            {/* ── Net Position Banner ── */}
            <div style={{
              background: net >= 0 ? '#16a34a18' : '#ef444418',
              border: `1px solid ${net >= 0 ? '#16a34a35' : '#ef444435'}`,
              borderRadius: 14, padding: '16px 24px', marginBottom: 28,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: net >= 0 ? '#34d399' : '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Net Position
                </div>
                <div style={{ color: t.muted, fontSize: 13 }}>Profit minus all recorded expenses</div>
              </div>
              <span style={{
                fontWeight: 900, fontSize: 26, color: net >= 0 ? '#34d399' : '#ef4444',
                fontFamily: 'monospace', letterSpacing: '-0.02em',
              }}>
                {net >= 0 ? '+' : ''}{formatCurrency(net)}
              </span>
            </div>

            {/* ── KPI Grid ── */}
            <div style={{ marginBottom: 28 }}>
              <SectionLabel>Key Performance Indicators</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                <KpiCard label="Available Stock"    value={inv.available_stock ?? 0}              sub={`${inv.total_vehicles ?? 0} total · ${inv.sold_vehicles ?? 0} sold`} color="#6366f1" icon="🚗" href="/admin/reports/inventory" />
                <KpiCard label="Stock Value"        value={formatCurrency(inv.stock_value ?? 0)}   sub="At selling prices"          color="#818cf8" icon="💰" />
                <KpiCard label="Total Revenue"      value={formatCurrency(sal.total_revenue ?? 0)} sub="All completed deals"         color="#34d399" icon="💵" href="/admin/reports/sales" />
                <KpiCard label="Pending Balances"   value={formatCurrency(sal.pending_balances ?? 0)} sub="Awaiting collection"     color={sal.pending_balances > 0 ? '#f59e0b' : '#34d399'} icon="⏳" />
                <KpiCard label="Open Leads"         value={crm.open_leads ?? 0}                    sub={`${crm.total_leads ?? 0} total leads`} color="#ec4899" icon="📋" href="/admin/reports/crm" />
                <KpiCard label="Customers"          value={crm.total_customers ?? 0}               sub="Total registered"           color="#0ea5e9" icon="👥" href="/admin/reports/customers" />
                <KpiCard label="Unpaid Commissions" value={formatCurrency(comm.unpaid_amount ?? 0)} sub="Outstanding to salespeople" color={comm.unpaid_amount > 0 ? '#ef4444' : '#34d399'} icon="💸" href="/admin/reports/commissions" />
                <KpiCard label="Total Expenses"     value={formatCurrency(exp.total_expenses ?? 0)} sub="All categories"             color="#f59e0b" icon="🧾" href="/admin/reports/expenses" />
              </div>
            </div>

            {/* ── Charts ── */}
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Visual Trends</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <ChartCard title="📈 Monthly Revenue (last 12mo)">
                  {monthlySales.length > 0
                    ? <BarChart data={monthlySales} labelKey="month" valueKey="total" color="#34d399" height={160} />
                    : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: 12, opacity: 0.5 }}>No sales data</div>
                  }
                </ChartCard>

                <ChartCard title="🎯 Lead Sources">
                  {leadSources.length > 0
                    ? <BarChart data={leadSources} labelKey="source" valueKey="count" color="#ec4899" height={160} />
                    : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: 12, opacity: 0.5 }}>No lead data</div>
                  }
                </ChartCard>

                <ChartCard title="🚨 Aging Stock Buckets (days unsold)">
                  {agingStock.some(d => d.count > 0)
                    ? <BarChart data={agingStock} labelKey="range" valueKey="count" color="#ef4444" height={160} />
                    : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: 12, opacity: 0.5 }}>No aged stock</div>
                  }
                </ChartCard>

                <ChartCard title="🧾 Monthly Expenses">
                  {monthlyExpenses.length > 0
                    ? <BarChart data={monthlyExpenses} labelKey="month" valueKey="total" color="#f59e0b" height={160} />
                    : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: 12, opacity: 0.5 }}>No expense data</div>
                  }
                </ChartCard>
              </div>
            </div>

            {/* ── Active Employees Footer ── */}
            <div style={{
              background: t.card, border: `1px solid ${t.border}`,
              borderRadius: 14, padding: '16px 22px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  👨‍💼
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: t.text, letterSpacing: '-0.01em' }}>
                    {emp.active_count ?? 0} active employees
                  </div>
                  <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>Currently on the team</div>
                </div>
              </div>
              <Link href="/admin/reports/employees" style={{
                padding: '9px 18px', borderRadius: 9,
                background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)',
                color: '#60a5fa', textDecoration: 'none', fontSize: 12, fontWeight: 700,
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(96,165,250,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(96,165,250,0.1)'; }}
              >
                View performance →
              </Link>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}