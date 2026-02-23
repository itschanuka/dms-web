'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ── Module definitions ────────────────────────────────────────

interface NavModule {
  href:    string;
  icon:    string;
  label:   string;
  color:   string;         // accent color for active state
  badge?:  string;         // optional badge text (e.g. 'New')
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
  children:      React.ReactNode;
  theme?:        'dark' | 'light';
  onThemeToggle?: () => void;
}

export default function AdminShell({ children, theme = 'dark', onThemeToggle }: Props) {
  const pathname   = usePathname();
  const router     = useRouter();
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [userEmail,    setUserEmail]    = useState('');
  const [userName,     setUserName]     = useState('');
  const [userRole,     setUserRole]     = useState('');
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [scrolled,     setScrolled]     = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? '';
      setUserEmail(email);
    });

    // Try to get employee profile from localStorage cache or session
    const cached = sessionStorage.getItem('dms_employee_name');
    const cachedRole = sessionStorage.getItem('dms_employee_role');
    if (cached)     setUserName(cached);
    if (cachedRole) setUserRole(cachedRole);
  }, []);

  // Track content scroll for subtle header shadow
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 4);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    sessionStorage.clear();
    router.push('/admin/login');
  }

  // Determine active module
  function isActive(mod: NavModule) {
    if (mod.href === '/admin') {
      return pathname === '/admin' || pathname === '/admin/dashboard';
    }
    return pathname.startsWith(mod.href);
  }

  const activeModule = MODULES.find(m => isActive(m)) ?? MODULES[0]!;
  const displayName  = userName || userEmail.split('@')[0] || 'User';
  const initials     = displayName.slice(0, 2).toUpperCase();

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      minHeight:     '100vh',
      background:    theme === 'dark' ? '#070a12' : '#dde6f0',
      fontFamily:    "'Geist', 'DM Sans', ui-sans-serif, system-ui, sans-serif",
    }}>

      {/* ══════════════════════════════════════════════════════
          TOP HEADER — Brand + User
      ══════════════════════════════════════════════════════ */}
      <header style={{
        height:          52,
        background:      theme === 'dark' ? '#0b0f1a' : '#d4dff0',
        borderBottom:    theme === 'dark' ? '1px solid #131b2e' : '1px solid #b8ccdf',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '0 20px',
        position:        'sticky',
        top:             0,
        zIndex:          300,
        flexShrink:      0,
      }}>
        {/* Left — Logo */}
        <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width:          30,
            height:         30,
            background:     'linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)',
            borderRadius:   7,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       13,
            fontWeight:     900,
            color:          '#fff',
            letterSpacing:  '-0.5px',
            flexShrink:     0,
            boxShadow:      '0 0 18px rgba(99,102,241,0.35)',
          }}>A</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0', lineHeight: 1, letterSpacing: '-0.3px' }}>
              Auto Prime
            </div>
            <div style={{ fontSize: 10, color: '#3d5070', marginTop: 1, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Admin Console
            </div>
          </div>
        </Link>

        {/* Right — User profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <Link href="/" target="_blank" style={{
            fontSize: 11, color: '#3d5070', textDecoration: 'none',
            padding: '4px 10px', border: '1px solid #1a2540',
            borderRadius: 20, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#8097b8'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#253550'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#3d5070'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#1a2540'; }}
          >
            View Site ↗
          </Link>

          {/* Avatar button */}
          <button
            onClick={() => setProfileOpen(o => !o)}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            8,
              background:     profileOpen ? 'rgba(99,102,241,0.12)' : 'transparent',
              border:         `1px solid ${profileOpen ? 'rgba(99,102,241,0.3)' : '#1a2540'}`,
              borderRadius:   24,
              padding:        '4px 10px 4px 4px',
              cursor:         'pointer',
              transition:     'all 0.15s',
            }}
          >
            <div style={{
              width:          26,
              height:         26,
              borderRadius:   '50%',
              background:     `linear-gradient(135deg, ${activeModule.color}33, ${activeModule.color}66)`,
              border:         `1.5px solid ${activeModule.color}55`,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       10,
              fontWeight:     800,
              color:          activeModule.color,
            }}>{initials}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#c4d0e4', lineHeight: 1 }}>{displayName}</div>
              {userRole && (
                <div style={{ fontSize: 10, color: '#3d5070', marginTop: 1, textTransform: 'capitalize' }}>{userRole}</div>
              )}
            </div>
            <span style={{ fontSize: 10, color: '#3d5070', marginLeft: 2 }}>▾</span>
          </button>

          {/* Profile dropdown */}
          {profileOpen && (
            <>
              <div
                onClick={() => setProfileOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 400 }}
              />
              <div style={{
                position:     'absolute',
                top:          'calc(100% + 8px)',
                right:        0,
                background:   '#0d1525',
                border:       '1px solid #1a2540',
                borderRadius: 12,
                padding:      8,
                minWidth:     180,
                zIndex:       500,
                boxShadow:    '0 16px 48px rgba(0,0,0,0.6)',
              }}>
                <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid #131b2e', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#c4d0e4' }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: '#3d5070', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
                </div>
                <DropdownItem href="/admin/settings" label="Settings" icon="⚙" />
                <DropdownItem href="/admin/change-password" label="Change Password" icon="🔑" />
                <div style={{ height: 1, background: '#131b2e', margin: '6px 0' }} />
                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 7, background: 'none', border: 'none',
                    fontSize: 12, fontWeight: 600, color: '#ef4444', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span>🚪</span> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          MODULE NAV BAR — The separate navigation header
      ══════════════════════════════════════════════════════ */}
      <nav style={{
        background:   theme === 'dark' ? '#0b0f1a' : '#d4dff0',
        borderBottom: scrolled ? '1px solid #1a2540' : '1px solid #0f1524',
        position:     'sticky',
        top:          52,
        zIndex:       200,
        flexShrink:   0,
        boxShadow:    scrolled ? '0 4px 24px rgba(0,0,0,0.4)' : 'none',
        transition:   'box-shadow 0.2s, border-color 0.2s',
      }}>
        {/* Scrollable module tabs */}
        <div style={{
          display:         'flex',
          alignItems:      'stretch',
          overflowX:       'auto',
          scrollbarWidth:  'none',
          maxWidth:        1400,
          margin:          '0 auto',
          padding:         '0 16px',
        }}
          className="hide-scrollbar"
        >
          {MODULES.map(mod => {
            const active = isActive(mod);
            return (
              <Link
                key={mod.href}
                href={mod.href}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            7,
                  padding:        '0 14px',
                  height:         44,
                  fontSize:       12.5,
                  fontWeight:     active ? 700 : 500,
                  color:          active ? mod.color : '#4a6080',
                  textDecoration: 'none',
                  borderBottom:   active ? `2px solid ${mod.color}` : '2px solid transparent',
                  background:     active ? `${mod.color}0d` : 'transparent',
                  whiteSpace:     'nowrap',
                  transition:     'all 0.15s ease',
                  position:       'relative',
                  flexShrink:     0,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.color = '#8097b8';
                    el.style.background = 'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.color = '#4a6080';
                    el.style.background = 'transparent';
                  }
                }}
              >
                {/* Icon */}
                <span style={{
                  fontSize:       active ? 14 : 13,
                  filter:         active ? 'none' : 'grayscale(0.6)',
                  transition:     'all 0.15s',
                }}>{mod.icon}</span>

                {/* Label */}
                {mod.label}

                {/* Badge */}
                {mod.badge && (
                  <span style={{
                    fontSize:       9,
                    fontWeight:     800,
                    color:          '#fff',
                    background:     mod.color,
                    borderRadius:   10,
                    padding:        '1px 5px',
                    letterSpacing:  '0.3px',
                    textTransform:  'uppercase',
                  }}>{mod.badge}</span>
                )}

                {/* Active dot indicator */}
                {active && (
                  <span style={{
                    width:          5,
                    height:         5,
                    borderRadius:   '50%',
                    background:     mod.color,
                    marginLeft:     2,
                    boxShadow:      `0 0 6px ${mod.color}`,
                    flexShrink:     0,
                  }} />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════
          CONTENT AREA
      ══════════════════════════════════════════════════════ */}
      <div
        ref={scrollRef}
        style={{
          flex:     1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Page context bar — breadcrumb + module accent */}
        <div style={{
          background:    '#08101c',
          borderBottom:  '1px solid #0f1a2e',
          padding:       '10px 24px',
          display:       'flex',
          alignItems:    'center',
          gap:           10,
        }}>
          {/* Module color stripe */}
          <div style={{
            width:        3,
            height:       16,
            borderRadius: 3,
            background:   activeModule.color,
            boxShadow:    `0 0 8px ${activeModule.color}80`,
            flexShrink:   0,
          }} />
          <span style={{ fontSize: 12, color: '#c4d0e4', fontWeight: 600 }}>
            {activeModule.label}
          </span>
          {getSubPath(pathname, activeModule) && (
            <>
              <span style={{ fontSize: 11, color: '#253550' }}>›</span>
              <span style={{ fontSize: 12, color: '#4a6080' }}>
                {getSubPath(pathname, activeModule)}
              </span>
            </>
          )}
        </div>

        {/* Actual page content */}
        <main>
          {children}
        </main>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @media (max-width: 640px) {
          .admin-nav-label { display: none; }
        }
      `}</style>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────

function DropdownItem({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 7,
      fontSize: 12, fontWeight: 500, color: '#8097b8', textDecoration: 'none',
      transition: 'all 0.12s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLAnchorElement).style.color = '#c4d0e4'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = '#8097b8'; }}
    >
      <span>{icon}</span> {label}
    </Link>
  );
}

// ── Utilities ─────────────────────────────────────────────────

function getSubPath(pathname: string, activeModule: NavModule): string | null {
  const relative = pathname.slice(activeModule.href.length);
  if (!relative || relative === '/') return null;

  const segments = relative.split('/').filter(Boolean);
  const first = segments[0];
  if (!first) return null;

  // Human-readable mappings
  const MAP: Record<string, string> = {
    new:  'Add New',
    edit: 'Edit',
  };

  if (MAP[first]) return MAP[first];

  // If it looks like a UUID, show "Detail"
  if (/^[0-9a-f-]{36}$/i.test(first)) {
    return segments[1] === 'edit' ? 'Edit' : 'Detail';
  }

  return first.charAt(0).toUpperCase() + first.slice(1);
}