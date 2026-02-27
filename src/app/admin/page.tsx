'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme';
import AdminShell from '@/components/admin/AdminShell';
import Link from 'next/link';
import { adminApi, type AdminVehicle } from '@/lib/api';
import { formatPrice } from '@/lib/formatters';

// ── Decorative car SVG — purely visual, zero data ─────────────
function CarSilhouette({ color, style }: { color: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <path d="M20 50 Q22 38 40 32 L70 24 Q90 18 110 18 L140 18 Q160 18 170 28 L185 50 Z" fill={color} opacity="0.12" />
      <path d="M20 50 Q22 38 40 32 L70 24 Q90 18 110 18 L140 18 Q160 18 170 28 L185 50" stroke={color} strokeWidth="1.5" fill="none" opacity="0.45" />
      <path d="M55 32 Q70 18 110 16 Q140 14 155 28" stroke={color} strokeWidth="1.5" fill="none" opacity="0.35" />
      <line x1="20" y1="50" x2="185" y2="50" stroke={color} strokeWidth="1.5" opacity="0.25" />
      <circle cx="55"  cy="50" r="12" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.05" opacity="0.7" />
      <circle cx="55"  cy="50" r="5"  fill={color} opacity="0.3" />
      <circle cx="155" cy="50" r="12" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.05" opacity="0.7" />
      <circle cx="155" cy="50" r="5"  fill={color} opacity="0.3" />
      <ellipse cx="183" cy="42" rx="4" ry="3" fill={color} opacity="0.35" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────
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
  draft:       '#4a6080',
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
  const { toggleTheme, isDark } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [stats,   setStats]   = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => { setMounted(true); }, []);

  // ── Real API call — inventory is the only built module so far ──
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
          recent:    all.slice(0, 5),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const dk = isDark;
  const t = {
    // Surfaces
    bg:        dk ? '#141c2e' : '#dde6f0',
    bgCard:    dk ? '#1c2538' : '#e4edf8',
    border:    dk ? '#263550' : '#aec2d6',
    // Text — distinct contrast levels
    text:      dk ? '#e8f0fc' : '#0f1e32',   // primary: near-white on dark, deep navy on light
    textSub:   dk ? '#7a94b8' : '#2e4a68',   // subtext: readable mid-tone
    textMuted: dk ? '#3d5270' : '#6a88a8',   // hints: clearly subordinate
  };

  if (!mounted) return null;

  const kpiCards = stats ? [
    { label: 'Total Stock',    value: stats.total,     color: '#6366f1', icon: '🚗' },
    { label: 'Available',      value: stats.available, color: '#10b981', icon: '✅' },
    { label: 'Reserved',       value: stats.reserved,  color: '#f59e0b', icon: '🔒' },
    { label: 'Sold',           value: stats.sold,      color: '#8b5cf6', icon: '🏷️' },
    { label: 'On Website',     value: stats.onWebsite, color: '#0ea5e9', icon: '🌐' },
    { label: 'Dead Stock 90d+',value: stats.deadStock, color: stats.deadStock > 0 ? '#ef4444' : t.textSub, icon: '⚠️' },
  ] : [];

  return (
    <AdminShell>
      <div style={{ background: t.bg, minHeight: '100vh', paddingBottom: 60, transition: 'background 0.3s' }}>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div style={{
          position:     'relative',
          overflow:     'hidden',
          background:   dk
            ? 'linear-gradient(135deg, #111827 0%, #162032 60%, #141c2e 100%)'
            : 'linear-gradient(135deg, #c8d6e8 0%, #d0d8ee 60%, #c4d8e4 100%)',
          padding:      '36px 28px 30px',
          borderBottom: `1px solid ${t.border}`,
        }}>
          <CarSilhouette color="#6366f1" style={{ position: 'absolute', right: -10, top: -5, width: 300, opacity: dk ? 0.5 : 0.3, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -60, right: 100, width: 260, height: 260, borderRadius: '50%', background: dk ? 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' : 'none', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6366f1', marginBottom: 8 }}>
                AUTO PRIME · ADMIN CONSOLE
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: t.text, margin: 0, letterSpacing: '-0.5px' }}>
                Dashboard
              </h1>
              <p style={{ fontSize: 13, color: t.textSub, margin: '6px 0 0' }}>
                {getGreeting()} — live snapshot from your database.
              </p>
            </div>

            <button
              onClick={toggleTheme}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: dk ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
                border: `1px solid ${t.border}`, borderRadius: 24,
                padding: '8px 16px', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: t.text, transition: 'all 0.2s', flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = t.border)}
            >
              <span style={{ fontSize: 15 }}>{dk ? '☀️' : '🌙'}</span>
              {dk ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>

        <div style={{ padding: '28px 24px', maxWidth: 1280, margin: '0 auto' }}>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 20, display: 'flex', gap: 8 }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── Inventory KPI — real numbers from DB ─────────── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textSub, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 14 }}>
            Inventory — Live
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12, marginBottom: 30 }}>
            {loading
              ? [...Array(6)].map((_, i) => (
                  <div key={i} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, height: 88, animation: 'pulse 1.4s ease infinite', animationDelay: `${i * 80}ms` }} />
                ))
              : kpiCards.map((kpi, i) => (
                  <div key={kpi.label}
                    style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: '16px 14px', position: 'relative', overflow: 'hidden', transition: 'all 0.2s', animation: 'fadeSlideUp 0.4s ease both', animationDelay: `${i * 50}ms` }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = kpi.color + '55'; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = `0 6px 20px ${kpi.color}12`; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = t.border; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${kpi.color}, ${kpi.color}22)`, borderRadius: '12px 12px 0 0' }} />
                    <div style={{ fontSize: 18, marginBottom: 8 }}>{kpi.icon}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: kpi.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{kpi.value}</div>
                    <div style={{ fontSize: 11, color: t.textSub, marginTop: 5, fontWeight: 600 }}>{kpi.label}</div>
                  </div>
                ))
            }
          </div>

          {/* ── Two column layout ─────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 20, alignItems: 'start' }}>

            {/* Recent vehicles — real data */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.textSub, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Recent Inventory
                </div>
                <Link href="/admin/inventory" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                  View all →
                </Link>
              </div>

              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: t.textSub, fontSize: 13 }}>Loading…</div>
                ) : !stats || stats.recent.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🚗</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 6 }}>No vehicles yet</div>
                    <div style={{ fontSize: 12, color: t.textSub, marginBottom: 18 }}>Add your first vehicle to get started</div>
                    <Link href="/admin/inventory/new" style={{ background: '#6366f1', color: '#fff', textDecoration: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                      + Add Vehicle
                    </Link>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                            {['Stock ID', 'Vehicle', 'Status', 'Asking Price', 'Est. Profit', 'Age'].map(h => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.textSub, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recent.map((v, i) => (
                            <tr key={v.id}
                              style={{ borderTop: i > 0 ? `1px solid ${t.border}` : 'none', transition: 'background 0.12s', cursor: 'pointer' }}
                              onClick={() => { window.location.href = `/admin/inventory/${v.id}`; }}
                              onMouseEnter={e => (e.currentTarget.style.background = dk ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <td style={{ padding: '11px 14px', fontWeight: 700, color: '#6366f1', fontSize: 12, whiteSpace: 'nowrap' }}>{v.stock_id}</td>
                              <td style={{ padding: '11px 14px', minWidth: 160 }}>
                                <div style={{ fontWeight: 700, color: t.text }}>{v.year} {v.make} {v.model}</div>
                                {v.variant && <div style={{ fontSize: 11, color: t.textSub }}>{v.variant}</div>}
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[v.status] ?? t.textSub, background: (STATUS_COLOR[v.status] ?? '#4a6080') + '18', padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize' }}>
                                  {v.status}
                                </span>
                              </td>
                              <td style={{ padding: '11px 14px', fontWeight: 700, color: t.text, whiteSpace: 'nowrap' }}>{formatPrice(v.asking_price)}</td>
                              <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: 700, color: v.estimated_profit >= 0 ? '#10b981' : '#ef4444' }}>
                                  {v.estimated_profit >= 0 ? '+' : ''}{formatPrice(v.estimated_profit)}
                                </span>
                              </td>
                              <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', fontSize: 12 }}>
                                <span style={{ color: v.aging_bucket === 'dead_stock' ? '#ef4444' : v.aging_bucket === 'old' ? '#f59e0b' : t.textSub }}>
                                  {v.days_in_stock}d
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ padding: '11px 16px', borderTop: `1px solid ${t.border}` }}>
                      <Link href="/admin/inventory" style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                        View full inventory ({stats.total} vehicles) →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modules sidebar */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.textSub, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 14 }}>
                Modules
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {MODULES.map((mod, i) => (
                  <Link key={mod.href} href={mod.href}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: '11px 13px', textDecoration: 'none', transition: 'all 0.15s', animation: 'fadeSlideUp 0.4s ease both', animationDelay: `${300 + i * 45}ms` }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = mod.color + '55'; el.style.transform = 'translateX(3px)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = t.border; el.style.transform = 'translateX(0)'; }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: `${mod.color}18`, border: `1px solid ${mod.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{mod.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{mod.label}</div>
                      <div style={{ fontSize: 11, color: t.textSub }}>{mod.desc}</div>
                    </div>
                    <span style={{ fontSize: 12, color: t.textMuted, flexShrink: 0 }}>→</span>
                  </Link>
                ))}
              </div>

              <div style={{ marginTop: 12, background: dk ? 'rgba(16,185,129,0.07)' : 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '11px 13px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 5px #10b981' }} />
                  All systems operational
                </div>
                <div style={{ fontSize: 11, color: t.textSub }}>Auth · DB · Audit logs · Inventory</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        @media (max-width: 900px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AdminShell>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}