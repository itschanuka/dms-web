'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme';
import AdminShell from '@/components/admin/AdminShell';
import Link from 'next/link';
import { adminApi, type AdminVehicle } from '@/lib/api';
import { formatPrice } from '@/lib/formatters';

// ── Types — unchanged ─────────────────────────────────────────
interface InventoryStats {
  total:     number;
  available: number;
  reserved:  number;
  sold:      number;
  draft:     number;
  onWebsite: number;
  deadStock: number;
  recent:    AdminVehicle[];
}

const STATUS_COLOR: Record<string, string> = {
  draft:       '#64748b',
  available:   '#10b981',
  reserved:    '#f59e0b',
  sold:        '#6366f1',
  written_off: '#ef4444',
};

const MODULES = [
  { href: '/admin/inventory', icon: '🚗', label: 'Inventory',  desc: 'Vehicles, costs & photos', color: '#6366f1' },
  { href: '/admin/crm',       icon: '📋', label: 'CRM',        desc: 'Leads & follow-ups',       color: '#0ea5e9' },
  { href: '/admin/deals',     icon: '🤝', label: 'Deals',      desc: 'Sales pipeline',           color: '#10b981' },
  { href: '/admin/customers', icon: '👤', label: 'Customers',  desc: 'Database & history',       color: '#f59e0b' },
  { href: '/admin/employees', icon: '👥', label: 'Employees',  desc: 'Staff & permissions',      color: '#8b5cf6' },
  { href: '/admin/reports',   icon: '📈', label: 'Reports',    desc: 'Analytics & exports',      color: '#ef4444' },
];

// ── Dashboard ─────────────────────────────────────────────────
export default function AdminDashboard() {
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [stats,   setStats]   = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => { setMounted(true); }, []);

  // ── Real API call — unchanged ─────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await adminApi.listVehicles({ limit: 200 });
        const all = result.vehicles;
        setStats({
          total:     result.pagination.total,
          available: all.filter(v => v.status === 'available').length,
          reserved:  all.filter(v => v.status === 'reserved').length,
          sold:      all.filter(v => v.status === 'sold').length,
          draft:     all.filter(v => v.status === 'draft').length,
          onWebsite: all.filter(v => v.show_on_website).length,
          deadStock: all.filter(v => v.aging_bucket === 'dead_stock').length,
          recent:    all.slice(0, 6),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // ── Design tokens ─────────────────────────────────────────
  const t = {
    bg:       isDark ? '#0f1623' : '#f4f7fb',
    card:     isDark ? '#161f30' : '#ffffff',
    border:   isDark ? '#1e2d42' : '#e4eaf2',
    text:     isDark ? '#e4eefa' : '#0d1829',
    sub:      isDark ? '#6a89aa' : '#5a6f8a',
    muted:    isDark ? '#2e4460' : '#a0b0c4',
    accent:   '#6366f1',
    hoverRow: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
    shadow:   isDark ? '0 1px 4px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.07)',
  };

  if (!mounted) return null;

  const kpis = [
    { label: 'Total Stock',    value: stats?.total,     color: '#6366f1', icon: '🚗' },
    { label: 'Available',      value: stats?.available, color: '#10b981', icon: '✅' },
    { label: 'Reserved',       value: stats?.reserved,  color: '#f59e0b', icon: '🔒' },
    { label: 'Sold',           value: stats?.sold,      color: '#8b5cf6', icon: '🏷️' },
    { label: 'On Website',     value: stats?.onWebsite, color: '#0ea5e9', icon: '🌐' },
    { label: 'Dead Stock 90d+',value: stats?.deadStock, color: (stats?.deadStock ?? 0) > 0 ? '#ef4444' : '#64748b', icon: '⚠️' },
  ];

  const barTotal = (stats?.available ?? 0) + (stats?.reserved ?? 0) + (stats?.sold ?? 0) + (stats?.draft ?? 0);
  const barSegs = barTotal > 0 ? [
    { pct: (stats!.available / barTotal) * 100, color: '#10b981', label: 'Available', n: stats!.available },
    { pct: (stats!.reserved  / barTotal) * 100, color: '#f59e0b', label: 'Reserved',  n: stats!.reserved  },
    { pct: (stats!.sold      / barTotal) * 100, color: '#6366f1', label: 'Sold',      n: stats!.sold      },
    { pct: (stats!.draft     / barTotal) * 100, color: '#334155', label: 'Draft',     n: stats!.draft     },
  ] : [];

  return (
    <AdminShell>
      <div style={{ minHeight: '100%', background: t.bg, transition: 'background .25s' }}>

        {/* ── Hero banner ───────────────────────────────────── */}
        <div style={{
          padding: '28px 32px 24px',
          borderBottom: `1px solid ${t.border}`,
          background: isDark
            ? 'linear-gradient(135deg, #0d1422 0%, #131e32 100%)'
            : 'linear-gradient(135deg, #edf1fa 0%, #f4f7fb 100%)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -50, right: 60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.07) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(99,102,241,.05) 1px, transparent 1px)', backgroundSize: '26px 26px', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 7px #10b981' }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.sub }}>Live · Auto Prime Admin</span>
            </div>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: t.text, margin: '0 0 5px', letterSpacing: '-.4px' }}>{getGreeting()}</h1>
            <p style={{ fontSize: 13, color: t.sub, margin: 0 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div style={{ padding: '24px 32px 56px', maxWidth: 1320, margin: '0 auto' }}>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.18)', borderRadius: 10, padding: '11px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 20, display: 'flex', gap: 8 }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── KPI grid ──────────────────────────────────────── */}
          <Label text="Inventory Overview" t={t} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
            {kpis.map((k, i) => (
              <div key={k.label}
                style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 13, padding: '17px 15px', position: 'relative', overflow: 'hidden', boxShadow: t.shadow, transition: 'transform .18s, box-shadow .18s, border-color .18s', animation: `fadeUp .35s ease both`, animationDelay: `${i * 45}ms` }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 8px 28px ${k.color}20`; el.style.borderColor = `${k.color}40`; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = t.shadow; el.style.borderColor = t.border; }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.color, borderRadius: '13px 13px 0 0' }} />
                <div style={{ fontSize: 19, marginBottom: 9 }}>{k.icon}</div>
                {loading
                  ? <div style={{ height: 26, width: '50%', borderRadius: 5, background: isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)', animation: 'pulse 1.4s ease infinite' }} />
                  : <div style={{ fontSize: 28, fontWeight: 900, color: k.color, letterSpacing: '-1px', lineHeight: 1 }}>{k.value ?? 0}</div>
                }
                <div style={{ fontSize: 11, color: t.sub, marginTop: 6, fontWeight: 600 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* ── Status bar ────────────────────────────────────── */}
          {!loading && barSegs.length > 0 && (
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '15px 20px', marginBottom: 24, boxShadow: t.shadow }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: t.muted, letterSpacing: '.6px', textTransform: 'uppercase', marginBottom: 11 }}>Status Distribution</div>
              <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', gap: 2, marginBottom: 11 }}>
                {barSegs.map(s => (
                  <div key={s.label} style={{ width: `${s.pct}%`, background: s.color, borderRadius: 999, minWidth: s.pct > 0 ? 4 : 0 }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {barSegs.map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                    <span style={{ fontSize: 11.5, color: t.sub }}>{s.label}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: t.text }}>{s.n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 2-col layout ──────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px', gap: 20, alignItems: 'start' }}>

            {/* Recent inventory */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Label text="Recent Inventory" t={t} />
                <Link href="/admin/inventory" style={{ fontSize: 12.5, color: t.accent, textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
              </div>
              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: t.shadow }}>
                {loading ? (
                  <div style={{ padding: '16px' }}>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < 4 ? `1px solid ${t.border}` : 'none' }}>
                        {[12, 30, 15, 14, 12].map((w, j) => (
                          <div key={j} style={{ height: 12, width: `${w}%`, borderRadius: 4, background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)', animation: 'pulse 1.4s ease infinite', animationDelay: `${j * 80}ms` }} />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : !stats || stats.recent.length === 0 ? (
                  <div style={{ padding: '52px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 12, opacity: .45 }}>🚗</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 6 }}>No vehicles yet</div>
                    <div style={{ fontSize: 13, color: t.sub, marginBottom: 20 }}>Add your first vehicle to get started</div>
                    <Link href="/admin/inventory/new" style={{ background: t.accent, color: '#fff', textDecoration: 'none', padding: '10px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>+ Add Vehicle</Link>
                  </div>
                ) : (
                  <>
                    {/* Header row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr 90px 108px 108px 52px', padding: '10px 16px', borderBottom: `1px solid ${t.border}`, background: isDark ? 'rgba(255,255,255,.015)' : 'rgba(0,0,0,.015)' }}>
                      {['Stock', 'Vehicle', 'Status', 'Price', 'Profit', 'Age'].map(h => (
                        <div key={h} style={{ fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: '.5px', textTransform: 'uppercase' }}>{h}</div>
                      ))}
                    </div>
                    {/* Data rows */}
                    {stats.recent.map((v, i) => (
                      <div key={v.id}
                        style={{ display: 'grid', gridTemplateColumns: '96px 1fr 90px 108px 108px 52px', padding: '12px 16px', borderTop: i > 0 ? `1px solid ${t.border}` : 'none', cursor: 'pointer', transition: 'background .1s', alignItems: 'center' }}
                        onClick={() => { window.location.href = `/admin/inventory/${v.id}`; }}
                        onMouseEnter={e => (e.currentTarget.style.background = t.hoverRow)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, fontFamily: 'monospace', letterSpacing: '.3px' }}>{v.stock_id}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{v.year} {v.make} {v.model}</div>
                          {v.variant && <div style={{ fontSize: 11, color: t.sub, marginTop: 1 }}>{v.variant}</div>}
                        </div>
                        <div>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: STATUS_COLOR[v.status] ?? t.sub, background: `${STATUS_COLOR[v.status] ?? '#64748b'}18`, padding: '3px 8px', borderRadius: 20, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                            {v.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, whiteSpace: 'nowrap' }}>{formatPrice(v.asking_price)}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: v.estimated_profit >= 0 ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>
                          {v.estimated_profit >= 0 ? '+' : ''}{formatPrice(v.estimated_profit)}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: v.aging_bucket === 'dead_stock' ? '#ef4444' : v.aging_bucket === 'old' ? '#f59e0b' : t.sub }}>
                          {v.days_in_stock}d
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: '11px 16px', borderTop: `1px solid ${t.border}`, background: isDark ? 'rgba(255,255,255,.01)' : 'rgba(0,0,0,.01)' }}>
                      <Link href="/admin/inventory" style={{ fontSize: 12.5, color: t.accent, fontWeight: 600, textDecoration: 'none' }}>
                        View all {stats.total} vehicles →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Module links */}
              <div>
                <Label text="Quick Access" t={t} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {MODULES.map((mod, i) => (
                    <Link key={mod.href} href={mod.href}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: '11px 13px', textDecoration: 'none', boxShadow: t.shadow, transition: 'all .15s', animation: `fadeUp .35s ease both`, animationDelay: `${200 + i * 40}ms` }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = `${mod.color}45`; el.style.transform = 'translateX(3px)'; el.style.background = isDark ? `${mod.color}0c` : `${mod.color}06`; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = t.border; el.style.transform = ''; el.style.background = t.card; }}
                    >
                      <div style={{ width: 33, height: 33, borderRadius: 8, background: `${mod.color}15`, border: `1px solid ${mod.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{mod.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{mod.label}</div>
                        <div style={{ fontSize: 11, color: t.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.desc}</div>
                      </div>
                      <span style={{ fontSize: 14, color: t.muted }}>›</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Status widget */}
              <div style={{ background: t.card, border: `1px solid rgba(16,185,129,.2)`, borderRadius: 12, padding: '14px 16px', boxShadow: t.shadow }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#10b981' }}>All systems operational</span>
                </div>
                {['Auth & Security', 'Database', 'Audit Logging', 'Inventory API'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontSize: 11.5, color: t.sub }}>{item}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,.1)', padding: '2px 7px', borderRadius: 20 }}>OK</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:.4; } }
      `}</style>
    </AdminShell>
  );
}

function Label({ text, t }: { text: string; t: { muted: string } }) {
  return <div style={{ fontSize: 10.5, fontWeight: 700, color: t.muted, letterSpacing: '.7px', textTransform: 'uppercase', marginBottom: 12 }}>{text}</div>;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
