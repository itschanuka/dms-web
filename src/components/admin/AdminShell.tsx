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
}

const MODULES: NavModule[] = [
  { href: '/admin',           icon: '⬡',  label: 'Dashboard',  color: '#6366f1' },
  { href: '/admin/inventory', icon: '🚗', label: 'Inventory',  color: '#0ea5e9' },
  { href: '/admin/crm',       icon: '📋', label: 'CRM',        color: '#10b981' },
  { href: '/admin/deals',     icon: '🤝', label: 'Deals',      color: '#f59e0b' },
  { href: '/admin/customers', icon: '👤', label: 'Customers',  color: '#8b5cf6' },
  { href: '/admin/employees', icon: '👥', label: 'Employees',  color: '#ec4899' },
  { href: '/admin/reports',   icon: '📈', label: 'Reports',    color: '#ef4444' },
];

interface Props {
  children:    React.ReactNode;
  activePage?: string;
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
  const [scrolled,    setScrolled]    = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ''));
    const n = sessionStorage.getItem('dms_employee_name');
    const r = sessionStorage.getItem('dms_employee_role');
    if (n) setUserName(n);
    if (r) setUserRole(r);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = () => setScrolled(el.scrollTop > 4);
    el.addEventListener('scroll', h, { passive: true });
    return () => el.removeEventListener('scroll', h);
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

  // Color tokens — all theme-aware in one place
  const c = {
    // Surfaces
    bg:          isDark ? '#141c2e' : '#dde6f0',
    header:      isDark ? '#1c2538' : '#cdd8ea',
    border:      isDark ? '#263550' : '#aec2d6',
    breadBg:     isDark ? '#111827' : '#c8d6e8',
    breadBorder: isDark ? '#1e2d42' : '#adc0d4',
    dropdownBg:  isDark ? '#1c2538' : '#e4edf8',
    hoverRow:    isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    shadow:      isDark ? '0 16px 48px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.12)',
    // Text — clear contrast hierarchy for both modes
    text:        isDark ? '#e8f0fc' : '#0f1e32',   // primary: almost white on dark, deep navy on light
    textMuted:   isDark ? '#5a7295' : '#4a6278',   // secondary labels
    // Nav
    navText:     isDark ? '#607898' : '#4a6278',
    navHover:    isDark ? '#c8d8f0' : '#0f1e32',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: c.bg, fontFamily: "'Geist', 'DM Sans', ui-sans-serif, system-ui, sans-serif", transition: 'background 0.25s' }}>

      {/* ── Top Header ──────────────────────────────────────── */}
      <header style={{ height: 52, background: c.header, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, zIndex: 300, flexShrink: 0, transition: 'background 0.25s, border-color 0.25s' }}>

        <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0, boxShadow: '0 0 16px rgba(99,102,241,0.35)' }}>A</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: c.text, lineHeight: 1, letterSpacing: '-0.3px' }}>Auto Prime</div>
            <div style={{ fontSize: 10, color: c.textMuted, marginTop: 1, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Admin Console</div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>

          {/* Theme toggle */}
          <button onClick={toggleTheme} title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)', border: `1px solid ${c.border}`, borderRadius: 20, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: c.textMuted, transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLButtonElement).style.color = '#6366f1'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = c.border; (e.currentTarget as HTMLButtonElement).style.color = c.textMuted; }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          <Link href="/" target="_blank"
            style={{ fontSize: 11, color: c.textMuted, textDecoration: 'none', padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 20, transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = c.navHover; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#6366f1'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = c.textMuted; (e.currentTarget as HTMLAnchorElement).style.borderColor = c.border; }}
          >
            View Site ↗
          </Link>

          {/* Avatar */}
          <button onClick={() => setProfileOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: profileOpen ? 'rgba(99,102,241,0.12)' : 'transparent', border: `1px solid ${profileOpen ? 'rgba(99,102,241,0.3)' : c.border}`, borderRadius: 24, padding: '4px 10px 4px 4px', cursor: 'pointer', transition: 'all 0.15s' }}
          >
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg, ${activeModule.color}33, ${activeModule.color}66)`, border: `1.5px solid ${activeModule.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: activeModule.color }}>{initials}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.text, lineHeight: 1 }}>{displayName}</div>
              {userRole && <div style={{ fontSize: 10, color: c.textMuted, marginTop: 1, textTransform: 'capitalize' }}>{userRole}</div>}
            </div>
            <span style={{ fontSize: 10, color: c.textMuted, marginLeft: 2 }}>▾</span>
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <>
              <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 400 }} />
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: c.dropdownBg, border: `1px solid ${c.border}`, borderRadius: 12, padding: 8, minWidth: 180, zIndex: 500, boxShadow: c.shadow }}>
                <div style={{ padding: '8px 12px 10px', borderBottom: `1px solid ${c.border}`, marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
                </div>
                <DDItem href="/admin/change-password" label="Change Password" icon="🔑" c={c} />
                <div style={{ height: 1, background: c.border, margin: '6px 0' }} />
                <button onClick={handleSignOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 7, background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: '#ef4444', cursor: 'pointer', textAlign: 'left' }}>
                  🚪 Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Module Nav ──────────────────────────────────────── */}
      <nav style={{ background: c.header, borderBottom: `1px solid ${c.border}`, position: 'sticky', top: 52, zIndex: 200, flexShrink: 0, boxShadow: scrolled ? (isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.1)') : 'none', transition: 'box-shadow 0.2s, background 0.25s' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto', scrollbarWidth: 'none', maxWidth: 1400, margin: '0 auto', padding: '0 16px' }} className="hide-scrollbar">
          {MODULES.map(mod => {
            const active = isActive(mod);
            return (
              <Link key={mod.href} href={mod.href}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', height: 44, fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? mod.color : c.navText, textDecoration: 'none', borderBottom: active ? `2px solid ${mod.color}` : '2px solid transparent', background: active ? `${mod.color}0d` : 'transparent', whiteSpace: 'nowrap', transition: 'all 0.15s ease', flexShrink: 0 }}
                onMouseEnter={e => { if (!active) { const el = e.currentTarget as HTMLAnchorElement; el.style.color = c.navHover; el.style.background = c.hoverRow; } }}
                onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLAnchorElement; el.style.color = c.navText; el.style.background = 'transparent'; } }}
              >
                <span style={{ fontSize: active ? 14 : 13, filter: active ? 'none' : 'grayscale(0.5)', transition: 'all 0.15s' }}>{mod.icon}</span>
                {mod.label}
                {mod.badge && <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: mod.color, borderRadius: 10, padding: '1px 5px', textTransform: 'uppercase' }}>{mod.badge}</span>}
                {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: mod.color, marginLeft: 2, boxShadow: `0 0 6px ${mod.color}`, flexShrink: 0 }} />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Breadcrumb */}
        <div style={{ background: c.breadBg, borderBottom: `1px solid ${c.breadBorder}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.25s' }}>
          <div style={{ width: 3, height: 16, borderRadius: 3, background: activeModule.color, boxShadow: `0 0 8px ${activeModule.color}70`, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: c.text, fontWeight: 600 }}>{activeModule.label}</span>
          {getSubPath(pathname, activeModule) && (
            <>
              <span style={{ fontSize: 11, color: c.textMuted }}>›</span>
              <span style={{ fontSize: 12, color: c.textMuted }}>{getSubPath(pathname, activeModule)}</span>
            </>
          )}
        </div>
        <main>{children}</main>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

function DDItem({ href, label, icon, c }: { href: string; label: string; icon: string; c: { textMuted: string; hoverRow: string; text: string } }) {
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, color: c.textMuted, textDecoration: 'none', transition: 'all 0.12s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = c.hoverRow; (e.currentTarget as HTMLAnchorElement).style.color = c.text; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = c.textMuted; }}
    >
      <span>{icon}</span> {label}
    </Link>
  );
}

function getSubPath(pathname: string, activeModule: NavModule): string | null {
  const relative = pathname.slice(activeModule.href.length);
  if (!relative || relative === '/') return null;
  const segments = relative.split('/').filter(Boolean);
  const first = segments[0];
  if (!first) return null;
  const MAP: Record<string, string> = { new: 'Add New', edit: 'Edit' };
  if (MAP[first]) return MAP[first];
  if (/^[0-9a-f-]{36}$/i.test(first)) return segments[1] === 'edit' ? 'Edit' : 'Detail';
  return first.charAt(0).toUpperCase() + first.slice(1);
}