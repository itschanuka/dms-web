'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/lib/theme';

interface NavModule {
  href:   string;
  icon:   string;
  label:  string;
  color:  string;
  badge?: string;
  group?: 'core' | 'system';
}

const MODULES: NavModule[] = [
  // Core
  { href: '/admin',             icon: '⬡',  label: 'Dashboard',   color: '#6366f1', group: 'core' },
  { href: '/admin/inventory',   icon: '🚗', label: 'Inventory',   color: '#0ea5e9', group: 'core' },
  { href: '/admin/crm',         icon: '📋', label: 'CRM',         color: '#10b981', group: 'core' },
  { href: '/admin/deals',       icon: '🤝', label: 'Deals',       color: '#f59e0b', group: 'core' },
  { href: '/admin/customers',   icon: '👤', label: 'Customers',   color: '#8b5cf6', group: 'core' },
  { href: '/admin/commissions', icon: '💰', label: 'Commissions', color: '#f97316', group: 'core' },
  { href: '/admin/expenses',    icon: '💳', label: 'Expenses',    color: '#ef4444', group: 'core' },
  { href: '/admin/employees',   icon: '👥', label: 'Employees',   color: '#ec4899', group: 'core' },
  { href: '/admin/reports',     icon: '📈', label: 'Reports',     color: '#14b8a6', group: 'core' },
  { href: '/admin/ai-assistant', icon: 'AI', label: 'AI Assistant', color: '#2563eb', group: 'core' },
  // System
  { href: '/admin/backups',     icon: '💾', label: 'Backups',     color: '#0ea5e9', group: 'system' },
  { href: '/admin/trash',       icon: '🗑️', label: 'Trash',       color: '#64748b', group: 'system' },
  { href: '/admin/audit',       icon: '🔐', label: 'Audit Log',   color: '#a855f7', group: 'system' },
];

const BREADCRUMB_MAP: Record<string, string> = {
  new:         'Add New',
  edit:        'Edit',
  detail:      'Detail',
  commissions: 'Commissions',
  sales:       'Sales',
  inventory:   'Inventory',
  customers:   'Customers',
  employees:   'Employees',
  expenses:    'Expenses',
  crm:         'CRM',
  backups:     'Backups',
  'ai-assistant': 'AI Assistant',
};

interface Props {
  children:    React.ReactNode;
  activeKey?:  string;
  activePage?: string;  // legacy alias
}

export default function AdminShell({ children }: Props) {
  const pathname  = usePathname();
  const router    = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toggleTheme, isDark } = useTheme();

  const [userEmail,   setUserEmail]   = useState('');
  const [userName,    setUserName]    = useState('');
  const [userRole,    setUserRole]    = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ''));
    const n = sessionStorage.getItem('dms_employee_name');
    const r = sessionStorage.getItem('dms_employee_role');
    if (n) setUserName(n);
    if (r) setUserRole(r);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    sessionStorage.clear();
    router.push('/admin/login');
  }

  function isActive(mod: NavModule) {
    if (mod.href === '/admin') return pathname === '/admin' || pathname === '/admin/dashboard';
    return pathname.startsWith(mod.href);
  }

  const activeModule = MODULES.find(m => isActive(m)) ?? MODULES[0]!;
  const displayName  = userName || userEmail.split('@')[0] || 'User';
  const initials     = displayName.slice(0, 2).toUpperCase();

  const coreModules   = MODULES.filter(m => m.group === 'core');
  const systemModules = MODULES.filter(m => m.group === 'system');

  // Color tokens
  const c = {
    bg:          isDark ? '#0f1623' : '#f0f4f9',
    sidebar:     isDark ? '#141c2e' : '#ffffff',
    sidebarBdr:  isDark ? '#1e2d42' : '#e2eaf4',
    header:      isDark ? '#141c2e' : '#ffffff',
    headerBdr:   isDark ? '#1e2d42' : '#e2eaf4',
    dropdownBg:  isDark ? '#1c2538' : '#ffffff',
    hoverRow:    isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    shadow:      isDark ? '0 16px 48px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.12)',
    text:        isDark ? '#e8f0fc' : '#0f1e32',
    textMuted:   isDark ? '#5a7295' : '#4a6278',
    navText:     isDark ? '#607898' : '#6b7a8d',
    navHover:    isDark ? '#c8d8f0' : '#0f1e32',
    divider:     isDark ? '#1e2d42' : '#e8eef6',
    groupLabel:  isDark ? '#3a4f6a' : '#9db0c5',
  };

  const sidebarW = collapsed ? 64 : 220;

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: c.bg,
      fontFamily: "'Geist', 'DM Sans', ui-sans-serif, system-ui, sans-serif",
      transition: 'background 0.25s',
    }}>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside style={{
        width: sidebarW,
        minHeight: '100vh',
        background: c.sidebar,
        borderRight: `1px solid ${c.sidebarBdr}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 500,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), background 0.25s',
        overflowX: 'hidden',
        overflowY: 'auto',
        scrollbarWidth: 'none',
      }}>

        {/* Logo */}
        <div style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 16px' : '0 18px',
          gap: 10,
          borderBottom: `1px solid ${c.sidebarBdr}`,
          flexShrink: 0,
          justifyContent: collapsed ? 'center' : 'flex-start',
          overflow: 'hidden',
        }}>
          <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
              borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 900, color: '#fff',
              flexShrink: 0,
              boxShadow: '0 0 16px rgba(99,102,241,0.4)',
            }}>A</div>
            {!collapsed && (
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: c.text, letterSpacing: '-0.3px', lineHeight: 1 }}>Auto Prime</div>
                <div style={{ fontSize: 10, color: c.textMuted, marginTop: 2, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Admin Console</div>
              </div>
            )}
          </Link>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 1 }}>

          {/* Core group label */}
          {!collapsed && (
            <div style={{
              fontSize: 10, fontWeight: 700, color: c.groupLabel,
              letterSpacing: '0.8px', textTransform: 'uppercase',
              padding: '8px 18px 4px', userSelect: 'none',
            }}>
              Main
            </div>
          )}
          {coreModules.map(mod => (
            <SideNavLink key={mod.href} mod={mod} active={isActive(mod)} collapsed={collapsed} c={c} />
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: c.divider, margin: '8px 14px' }} />

          {/* System group label */}
          {!collapsed && (
            <div style={{
              fontSize: 10, fontWeight: 700, color: c.groupLabel,
              letterSpacing: '0.8px', textTransform: 'uppercase',
              padding: '4px 18px 4px', userSelect: 'none',
            }}>
              System
            </div>
          )}
          {systemModules.map(mod => (
            <SideNavLink key={mod.href} mod={mod} active={isActive(mod)} collapsed={collapsed} c={c} />
          ))}
        </nav>

        {/* Bottom utilities */}
        <div style={{
          borderTop: `1px solid ${c.sidebarBdr}`,
          padding: '10px 8px',
          display: 'flex', flexDirection: 'column', gap: 2,
          flexShrink: 0,
        }}>

          {/* View Site */}
          {!collapsed && (
            <Link
              href="/"
              target="_blank"
              aria-label="Open public site in a new tab"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 8,
                fontSize: 12, fontWeight: 500, color: c.navText,
                textDecoration: 'none', transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = c.hoverRow; el.style.color = c.navHover; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'transparent'; el.style.color = c.navText; }}
            >
              <span style={{ fontSize: 13 }}>↗</span> View Site
            </Link>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8,
              fontSize: 12, fontWeight: 500, color: c.navText,
              background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left', transition: 'all 0.15s',
              justifyContent: collapsed ? 'center' : 'flex-start',
              whiteSpace: 'nowrap', width: '100%',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = c.hoverRow; el.style.color = c.navHover; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = c.navText; }}
          >
            <span style={{ fontSize: 15 }}>{isDark ? '☀️' : '🌙'}</span>
            {!collapsed && (isDark ? 'Light Mode' : 'Dark Mode')}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(o => !o)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8,
              fontSize: 12, fontWeight: 500, color: c.navText,
              background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left', transition: 'all 0.15s',
              justifyContent: collapsed ? 'center' : 'flex-start',
              whiteSpace: 'nowrap', width: '100%',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = c.hoverRow; el.style.color = c.navHover; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = c.navText; }}
          >
            <span style={{ fontSize: 14, display: 'inline-block', transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s' }}>◁</span>
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        marginLeft: sidebarW,
        transition: 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)',
        minWidth: 0,
      }}>

        {/* Top header bar */}
        <header style={{
          height: 56,
          background: c.header,
          borderBottom: `1px solid ${c.headerBdr}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 300,
          flexShrink: 0,
          transition: 'background 0.25s, border-color 0.25s',
        }}>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 3, height: 18, borderRadius: 3,
              background: activeModule.color,
              boxShadow: `0 0 8px ${activeModule.color}70`,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{activeModule.label}</span>
            {getSubPath(pathname, activeModule) && (
              <>
                <span style={{ fontSize: 12, color: c.textMuted }}>›</span>
                <span style={{ fontSize: 13, color: c.textMuted }}>{getSubPath(pathname, activeModule)}</span>
              </>
            )}
          </div>

          {/* Avatar / profile */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: profileOpen ? 'rgba(99,102,241,0.1)' : 'transparent',
                border: `1px solid ${profileOpen ? 'rgba(99,102,241,0.3)' : c.headerBdr}`,
                borderRadius: 24, padding: '4px 12px 4px 4px',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `linear-gradient(135deg, ${activeModule.color}33, ${activeModule.color}66)`,
                border: `1.5px solid ${activeModule.color}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: activeModule.color,
              }}>{initials}</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.text, lineHeight: 1 }}>{displayName}</div>
                {userRole && <div style={{ fontSize: 10, color: c.textMuted, marginTop: 1.5, textTransform: 'capitalize' }}>{userRole}</div>}
              </div>
              <span style={{ fontSize: 10, color: c.textMuted, marginLeft: 2 }}>▾</span>
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <>
                <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 400 }} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: c.dropdownBg, border: `1px solid ${c.headerBdr}`,
                  borderRadius: 12, padding: 8, minWidth: 200,
                  zIndex: 500, boxShadow: c.shadow,
                }}>
                  <div style={{ padding: '8px 12px 10px', borderBottom: `1px solid ${c.headerBdr}`, marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
                  </div>
                  <DDItem href="/admin/change-password" label="Change Password" icon="🔑" c={c} />
                  <DDItem href="/admin/audit"           label="Audit Log"       icon="🔐" c={c} />
                  <DDItem href="/admin/trash"           label="Trash"           icon="🗑️" c={c} />
                  <div style={{ height: 1, background: c.headerBdr, margin: '6px 0' }} />
                  <button
                    onClick={handleSignOut}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 7,
                      background: 'none', border: 'none',
                      fontSize: 12, fontWeight: 600, color: '#ef4444',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <main>{children}</main>
        </div>
      </div>

      <style>{`
        aside::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ── Sidebar NavLink ──────────────────────────────────────────
function SideNavLink({
  mod, active, collapsed, c,
}: {
  mod: NavModule;
  active: boolean;
  collapsed: boolean;
  c: { navText: string; navHover: string; hoverRow: string; text: string };
}) {
  return (
    <Link
      href={mod.href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? mod.label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 10,
        padding: collapsed ? '10px 0' : '9px 14px 9px 16px',
        margin: '0 8px',
        borderRadius: 9,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        color: active ? mod.color : c.navText,
        textDecoration: 'none',
        background: active ? `${mod.color}14` : 'transparent',
        borderLeft: active ? `3px solid ${mod.color}` : '3px solid transparent',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
      onMouseEnter={e => {
        if (!active) {
          const el = e.currentTarget as HTMLAnchorElement;
          el.style.color = c.navHover;
          el.style.background = c.hoverRow;
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          const el = e.currentTarget as HTMLAnchorElement;
          el.style.color = c.navText;
          el.style.background = 'transparent';
        }
      }}
    >
      <span style={{
        fontSize: 16,
        flexShrink: 0,
        filter: active ? 'none' : 'grayscale(0.4)',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: collapsed ? '100%' : 'auto',
      }}>{mod.icon}</span>

      {!collapsed && (
        <>
          <span style={{ flex: 1 }}>{mod.label}</span>
          {mod.badge && (
            <span style={{
              fontSize: 9, fontWeight: 800, color: '#fff',
              background: mod.color, borderRadius: 10,
              padding: '1px 5px', textTransform: 'uppercase',
            }}>{mod.badge}</span>
          )}
          {active && (
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: mod.color,
              boxShadow: `0 0 6px ${mod.color}`,
              flexShrink: 0,
            }} />
          )}
        </>
      )}
    </Link>
  );
}

// ── Dropdown item ────────────────────────────────────────────
function DDItem({ href, label, icon, c }: { href: string; label: string; icon: string; c: { textMuted: string; hoverRow: string; text: string } }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 7,
        fontSize: 12, fontWeight: 500, color: c.textMuted,
        textDecoration: 'none', transition: 'all 0.12s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = c.hoverRow; (e.currentTarget as HTMLAnchorElement).style.color = c.text; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = c.textMuted; }}
    >
      <span>{icon}</span> {label}
    </Link>
  );
}

// ── Breadcrumb helper ────────────────────────────────────────
function getSubPath(pathname: string, activeModule: NavModule): string | null {
  const relative = pathname.slice(activeModule.href.length);
  if (!relative || relative === '/') return null;
  const segments = relative.split('/').filter(Boolean);
  const first    = segments[0];
  if (!first) return null;
  if (BREADCRUMB_MAP[first]) return BREADCRUMB_MAP[first]!;
  if (/^[0-9a-f-]{36}$/i.test(first)) {
    const sub = segments[1];
    if (sub === 'edit') return 'Edit';
    if (sub === 'new')  return 'Add New';
    return 'Detail';
  }
  return first.charAt(0).toUpperCase() + first.slice(1).replace(/-/g, ' ');
}
