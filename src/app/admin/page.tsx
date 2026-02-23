'use client';

import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import Link from 'next/link';

// ── Theme context (simple local state — no provider needed) ───
type Theme = 'dark' | 'light';

// ── Static KPI data (replace with real API calls later) ───────
const KPI_CARDS = [
  { label: 'Total Vehicles',    value: '48',        sub: '+3 this week',   icon: '🚗', color: '#6366f1', trend: 'up'   },
  { label: 'Active Deals',      value: '12',        sub: '4 pending close', icon: '🤝', color: '#10b981', trend: 'up'   },
  { label: 'Revenue (Month)',   value: 'LKR 8.4M',  sub: '+18% vs last mo', icon: '💰', color: '#f59e0b', trend: 'up'   },
  { label: 'Open Leads',        value: '31',        sub: '7 follow-up due', icon: '📋', color: '#0ea5e9', trend: 'down' },
];

const MODULES = [
  { href: '/admin/inventory', icon: '🚗', label: 'Inventory',  desc: 'Stock, costs & photos',  color: '#6366f1', count: '48 vehicles' },
  { href: '/admin/crm',       icon: '📋', label: 'CRM',        desc: 'Leads & follow-ups',     color: '#0ea5e9', count: '31 open leads' },
  { href: '/admin/deals',     icon: '🤝', label: 'Deals',      desc: 'Sales pipeline',         color: '#10b981', count: '12 active' },
  { href: '/admin/customers', icon: '👤', label: 'Customers',  desc: 'Database & history',     color: '#f59e0b', count: '284 total' },
  { href: '/admin/employees', icon: '👥', label: 'Employees',  desc: 'Staff & permissions',    color: '#8b5cf6', count: '6 active' },
  { href: '/admin/reports',   icon: '📈', label: 'Reports',    desc: 'Analytics & exports',    color: '#ef4444', count: 'Phase 13' },
];

// ── Decorative car SVG illustrations ─────────────────────────
function CarSilhouette({ color, style }: { color: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      {/* Body */}
      <path d="M20 50 Q22 38 40 32 L70 24 Q90 18 110 18 L140 18 Q160 18 170 28 L185 50 Z"
        fill={color} opacity="0.15" />
      <path d="M20 50 Q22 38 40 32 L70 24 Q90 18 110 18 L140 18 Q160 18 170 28 L185 50"
        stroke={color} strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Roof */}
      <path d="M55 32 Q70 18 110 16 Q140 14 155 28"
        stroke={color} strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Windshield */}
      <path d="M55 32 L70 22 L108 18 L55 32Z" fill={color} opacity="0.08" />
      {/* Rear window */}
      <path d="M125 18 L150 18 L160 30 L125 30Z" fill={color} opacity="0.08" />
      {/* Bottom */}
      <line x1="20" y1="50" x2="185" y2="50" stroke={color} strokeWidth="1.5" opacity="0.3" />
      {/* Wheels */}
      <circle cx="55"  cy="50" r="12" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.06" opacity="0.7" />
      <circle cx="55"  cy="50" r="6"  stroke={color} strokeWidth="1" fill={color} fillOpacity="0.1"  opacity="0.6" />
      <circle cx="155" cy="50" r="12" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.06" opacity="0.7" />
      <circle cx="155" cy="50" r="6"  stroke={color} strokeWidth="1"   fill={color} fillOpacity="0.1"  opacity="0.6" />
      {/* Headlight */}
      <ellipse cx="183" cy="42" rx="4" ry="3" fill={color} opacity="0.4" />
      {/* Grill line */}
      <line x1="182" y1="44" x2="185" y2="50" stroke={color} strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function SUVSilhouette({ color, style }: { color: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <path d="M15 52 Q18 36 38 28 L65 22 Q88 16 115 16 L148 16 Q168 16 178 28 L188 52 Z"
        fill={color} opacity="0.12" />
      <path d="M15 52 Q18 36 38 28 L65 22 Q88 16 115 16 L148 16 Q168 16 178 28 L188 52"
        stroke={color} strokeWidth="1.5" fill="none" opacity="0.45" />
      <path d="M50 28 L68 16 L148 16 L165 28Z" fill={color} opacity="0.07" />
      <line x1="15" y1="52" x2="188" y2="52" stroke={color} strokeWidth="1.5" opacity="0.3" />
      <circle cx="52"  cy="52" r="13" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.05" opacity="0.7" />
      <circle cx="52"  cy="52" r="6"  stroke={color} strokeWidth="1"   fill={color} fillOpacity="0.1"  opacity="0.6" />
      <circle cx="158" cy="52" r="13" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.05" opacity="0.7" />
      <circle cx="158" cy="52" r="6"  stroke={color} strokeWidth="1"   fill={color} fillOpacity="0.1"  opacity="0.6" />
      <rect x="170" y="30" width="18" height="10" rx="2" fill={color} opacity="0.15" />
      <ellipse cx="186" cy="43" rx="3" ry="2.5" fill={color} opacity="0.5" />
    </svg>
  );
}

// ── Recent activity mock data ─────────────────────────────────
const RECENT_ACTIVITY = [
  { time: '2h ago',  icon: '🚗', text: 'Toyota Aqua 2019 added to inventory',        color: '#6366f1' },
  { time: '4h ago',  icon: '🤝', text: 'Deal #DL-2024-041 marked as completed',      color: '#10b981' },
  { time: '5h ago',  icon: '📋', text: 'New lead from Facebook — Honda Vezel enquiry', color: '#0ea5e9' },
  { time: '1d ago',  icon: '💰', text: 'Payment of LKR 2.8M received — Deal #039',   color: '#f59e0b' },
  { time: '1d ago',  icon: '👤', text: 'New customer registered — Kamal Perera',     color: '#8b5cf6' },
];

// ── Main dashboard ────────────────────────────────────────────
export default function AdminDashboard() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('dms_theme') as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('dms_theme', next);
  }

  const dk = theme === 'dark';

  // Theme tokens
  const t = {
    bg:          dk ? '#070a12'  : '#f0f4f8',
    bgCard:      dk ? '#0d1525'  : '#ffffff',
    bgCard2:     dk ? '#0b1220'  : '#f8fafc',
    border:      dk ? '#1a2540'  : '#e2e8f0',
    borderHover: dk ? '#2a3d60'  : '#cbd5e1',
    text:        dk ? '#e2e8f0'  : '#0f172a',
    textSub:     dk ? '#4a6080'  : '#64748b',
    textMuted:   dk ? '#2a3d60'  : '#94a3b8',
    headerBg:    dk ? '#0b0f1a'  : '#ffffff',
    navBg:       dk ? '#0b0f1a'  : '#f8fafc',
  };

  if (!mounted) return null;

  return (
    <AdminShell theme={theme} onThemeToggle={toggleTheme}>
      <div style={{
        background:  t.bg,
        minHeight:   '100vh',
        padding:     '0 0 60px',
        transition:  'background 0.3s',
      }}>

        {/* ── Hero band ───────────────────────────────────── */}
        <div style={{
          position:   'relative',
          overflow:   'hidden',
          background: dk
            ? 'linear-gradient(135deg, #080e1c 0%, #0d1a2e 50%, #070a12 100%)'
            : 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 50%, #f0fdf4 100%)',
          padding:    '36px 28px 28px',
          borderBottom: `1px solid ${t.border}`,
        }}>
          {/* Background car decorations */}
          <CarSilhouette color={dk ? '#6366f1' : '#6366f1'} style={{
            position: 'absolute', right: -20, top: -10,
            width: 340, opacity: dk ? 0.6 : 0.4, pointerEvents: 'none',
          }} />
          <SUVSilhouette color={dk ? '#0ea5e9' : '#0ea5e9'} style={{
            position: 'absolute', right: 260, bottom: -20,
            width: 220, opacity: dk ? 0.3 : 0.2, pointerEvents: 'none',
          }} />
          <CarSilhouette color={dk ? '#10b981' : '#10b981'} style={{
            position: 'absolute', left: -30, bottom: -30,
            width: 260, opacity: dk ? 0.15 : 0.1, pointerEvents: 'none',
            transform: 'scaleX(-1)',
          }} />

          {/* Radial glow */}
          <div style={{
            position: 'absolute', top: -60, right: 80,
            width: 300, height: 300,
            background: dk ? 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6366f1', marginBottom: 6 }}>
                  AUTO PRIME · ADMIN
                </div>
                <h1 style={{
                  fontSize:    32,
                  fontWeight:  900,
                  color:       t.text,
                  margin:      0,
                  letterSpacing: '-0.8px',
                  lineHeight:  1.1,
                }}>
                  Good {getGreeting()},<br />
                  <span style={{ color: '#6366f1' }}>Welcome back</span>
                </h1>
                <p style={{ fontSize: 13, color: t.textSub, margin: '10px 0 0', maxWidth: 400 }}>
                  Here's what's happening at the dealership today.
                </p>
              </div>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                title={`Switch to ${dk ? 'light' : 'dark'} mode`}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            8,
                  background:     dk ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  border:         `1px solid ${t.border}`,
                  borderRadius:   24,
                  padding:        '8px 16px',
                  cursor:         'pointer',
                  fontSize:       13,
                  fontWeight:     600,
                  color:          t.text,
                  transition:     'all 0.2s',
                  backdropFilter: 'blur(8px)',
                  flexShrink:     0,
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = t.border)}
              >
                <span style={{ fontSize: 16 }}>{dk ? '☀️' : '🌙'}</span>
                {dk ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '28px 24px', maxWidth: 1300, margin: '0 auto' }}>

          {/* ── KPI cards ─────────────────────────────────── */}
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap:                 16,
            marginBottom:        32,
          }}>
            {KPI_CARDS.map((kpi, i) => (
              <div
                key={kpi.label}
                style={{
                  background:   t.bgCard,
                  border:       `1px solid ${t.border}`,
                  borderRadius: 14,
                  padding:      '20px 20px 18px',
                  position:     'relative',
                  overflow:     'hidden',
                  transition:   'all 0.2s',
                  animation:    `fadeSlideUp 0.4s ease both`,
                  animationDelay: `${i * 60}ms`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = kpi.color + '60';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 30px ${kpi.color}15`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = t.border;
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                {/* Color accent bar */}
                <div style={{
                  position:     'absolute',
                  top:          0, left: 0, right: 0,
                  height:       3,
                  background:   `linear-gradient(90deg, ${kpi.color}, ${kpi.color}44)`,
                  borderRadius: '14px 14px 0 0',
                }} />

                {/* Glow bg */}
                <div style={{
                  position:   'absolute',
                  top:        -20, right: -20,
                  width:      80, height: 80,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${kpi.color}18 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{
                    width:          38, height: 38,
                    background:     `${kpi.color}18`,
                    border:         `1px solid ${kpi.color}30`,
                    borderRadius:   10,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       18,
                  }}>{kpi.icon}</div>
                  <span style={{
                    fontSize:     10,
                    fontWeight:   700,
                    color:        kpi.trend === 'up' ? '#10b981' : '#ef4444',
                    background:   kpi.trend === 'up' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    padding:      '2px 7px',
                    borderRadius: 10,
                  }}>
                    {kpi.trend === 'up' ? '↑' : '↓'} {kpi.sub.split(' ')[0]}
                  </span>
                </div>

                <div style={{ fontSize: 26, fontWeight: 900, color: t.text, letterSpacing: '-0.5px', lineHeight: 1 }}>
                  {kpi.value}
                </div>
                <div style={{ fontSize: 12, color: t.textSub, marginTop: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Modules + Activity (two-column) ───────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

            {/* Module cards grid */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.textSub, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 14 }}>
                System Modules
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {MODULES.map((mod, i) => (
                  <Link key={mod.href} href={mod.href} style={{ textDecoration: 'none' }}>
                    <div
                      style={{
                        background:   t.bgCard,
                        border:       `1px solid ${t.border}`,
                        borderRadius: 14,
                        padding:      '20px 18px',
                        cursor:       'pointer',
                        transition:   'all 0.2s',
                        position:     'relative',
                        overflow:     'hidden',
                        animation:    `fadeSlideUp 0.5s ease both`,
                        animationDelay: `${200 + i * 60}ms`,
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLDivElement;
                        el.style.borderColor = mod.color + '70';
                        el.style.transform = 'translateY(-3px)';
                        el.style.boxShadow = `0 12px 40px ${mod.color}18`;
                        el.style.background = dk ? `linear-gradient(135deg, #0d1525, ${mod.color}08)` : `linear-gradient(135deg, #ffffff, ${mod.color}06)`;
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLDivElement;
                        el.style.borderColor = t.border;
                        el.style.transform = 'translateY(0)';
                        el.style.boxShadow = 'none';
                        el.style.background = t.bgCard;
                      }}
                    >
                      {/* Mini car sketch for inventory */}
                      {mod.label === 'Inventory' && (
                        <CarSilhouette color={mod.color} style={{
                          position: 'absolute', bottom: -4, right: -8,
                          width: 120, opacity: 0.25, pointerEvents: 'none',
                        }} />
                      )}
                      {mod.label === 'Deals' && (
                        <SUVSilhouette color={mod.color} style={{
                          position: 'absolute', bottom: -4, right: -8,
                          width: 110, opacity: 0.2, pointerEvents: 'none',
                        }} />
                      )}

                      {/* Color top strip */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                        background: `linear-gradient(90deg, ${mod.color}, transparent)`,
                        borderRadius: '14px 14px 0 0',
                      }} />

                      <div style={{
                        width: 40, height: 40,
                        background: `${mod.color}18`,
                        border: `1px solid ${mod.color}28`,
                        borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20,
                        marginBottom: 14,
                      }}>{mod.icon}</div>

                      <div style={{ fontSize: 15, fontWeight: 800, color: t.text, marginBottom: 4, letterSpacing: '-0.2px' }}>
                        {mod.label}
                      </div>
                      <div style={{ fontSize: 12, color: t.textSub, marginBottom: 12, lineHeight: 1.4 }}>
                        {mod.desc}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: mod.color, fontWeight: 700 }}>
                          {mod.count}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: mod.color,
                          background: `${mod.color}15`,
                          padding: '3px 8px', borderRadius: 8,
                        }}>Open →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent activity feed */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.textSub, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 14 }}>
                Recent Activity
              </div>
              <div style={{
                background:   t.bgCard,
                border:       `1px solid ${t.border}`,
                borderRadius: 14,
                overflow:     'hidden',
              }}>
                {RECENT_ACTIVITY.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display:     'flex',
                      alignItems:  'flex-start',
                      gap:         12,
                      padding:     '14px 16px',
                      borderBottom: i < RECENT_ACTIVITY.length - 1 ? `1px solid ${t.border}` : 'none',
                      transition:  'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = dk ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                  >
                    {/* Icon dot */}
                    <div style={{
                      width:          32, height: 32,
                      borderRadius:   8,
                      background:     `${item.color}15`,
                      border:         `1px solid ${item.color}25`,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      fontSize:       14,
                      flexShrink:     0,
                      marginTop:      1,
                    }}>{item.icon}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: t.text, lineHeight: 1.4, fontWeight: 500 }}>
                        {item.text}
                      </div>
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>
                        {item.time}
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ padding: '12px 16px', borderTop: `1px solid ${t.border}` }}>
                  <Link href="/admin/reports" style={{
                    fontSize: 12, color: '#6366f1', fontWeight: 600, textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    View full audit log →
                  </Link>
                </div>
              </div>

              {/* Status badge */}
              <div style={{
                marginTop:    14,
                background:   dk ? 'rgba(16,185,129,0.07)' : 'rgba(16,185,129,0.06)',
                border:       '1px solid rgba(16,185,129,0.2)',
                borderRadius: 12,
                padding:      '14px 16px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                  All systems operational
                </div>
                <div style={{ fontSize: 11, color: t.textSub }}>
                  Phase 2 — Inventory active. Auth, DB & audit logs running.
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 900px) {
          .dash-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AdminShell>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}