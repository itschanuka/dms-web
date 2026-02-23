'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/admin/dashboard',  icon: '📊', label: 'Dashboard'  },
  { href: '/admin/inventory',  icon: '🚗', label: 'Inventory'  },
  { href: '/admin/crm',        icon: '📋', label: 'CRM'        },
  { href: '/admin/deals',      icon: '🤝', label: 'Deals'      },
  { href: '/admin/customers',  icon: '👤', label: 'Customers'  },
  { href: '/admin/employees',  icon: '👥', label: 'Employees'  },
  { href: '/admin/reports',    icon: '📈', label: 'Reports'    },
];

interface Props {
  children: React.ReactNode;
}

export default function AdminShell({ children }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail,   setUserEmail]   = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '');
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#07090f' }}>

      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside style={{
        width:         240,
        background:    '#0d1117',
        borderRight:   '1px solid #1f2d45',
        display:       'flex',
        flexDirection: 'column',
        position:      'fixed',
        top:           0,
        left:          sidebarOpen ? 0 : -240,
        height:        '100vh',
        zIndex:        200,
        transition:    'left 0.25s ease',
      }}
      className="admin-sidebar"
      >
        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #1f2d45' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0,
            }}>A</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Auto Prime</div>
              <div style={{ fontSize: 10, color: '#5c7090', marginTop: 2 }}>Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {NAV.map(link => {
            const isActive = link.href === '/admin/dashboard'
              ? pathname === '/admin/dashboard' || pathname === '/admin'
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            10,
                  padding:        '9px 12px',
                  borderRadius:   8,
                  fontSize:       13,
                  fontWeight:     isActive ? 700 : 500,
                  color:          isActive ? '#fff' : '#8097b8',
                  background:     isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                  textDecoration: 'none',
                  marginBottom:   2,
                  transition:     'all 0.15s',
                  borderLeft:     isActive ? '3px solid #6366f1' : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: 16 }}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid #1f2d45' }}>
          <div style={{ fontSize: 11, color: '#5c7090', padding: '0 12px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </div>
          <button onClick={handleSignOut} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 8,
            background: 'none', border: 'none',
            fontSize: 13, fontWeight: 600,
            color: '#ef4444', cursor: 'pointer',
            textAlign: 'left',
          }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 199, display: 'none',
          }}
          className="sidebar-overlay"
        />
      )}

      {/* ── Main area ──────────────────────────────────────── */}
      <div style={{ flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column', minHeight: '100vh' }} className="admin-main">

        {/* Top bar */}
        <header style={{
          height:         56,
          background:     '#0d1117',
          borderBottom:   '1px solid #1f2d45',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0 20px',
          position:       'sticky',
          top:            0,
          zIndex:         100,
        }}>
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sidebar-toggle"
            style={{
              background: 'none', border: '1px solid #1f2d45',
              borderRadius: 6, padding: '5px 8px',
              cursor: 'pointer', color: '#8097b8', fontSize: 16,
              display: 'none',
            }}
          >
            ☰
          </button>

          {/* Breadcrumb hint */}
          <div style={{ fontSize: 13, color: '#5c7090' }}>
            {getPageTitle(pathname)}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/" target="_blank" style={{ fontSize: 12, color: '#5c7090', textDecoration: 'none' }}>
              View Site ↗
            </Link>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#818cf8', fontWeight: 700,
            }}>
              {userEmail.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 0 }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .admin-sidebar { left: -240px !important; }
          .admin-sidebar.open { left: 0 !important; }
          .admin-main { margin-left: 0 !important; }
          .sidebar-toggle { display: flex !important; }
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/admin/inventory')) return '🚗 Inventory';
  if (pathname.startsWith('/admin/crm'))       return '📋 CRM';
  if (pathname.startsWith('/admin/deals'))     return '🤝 Deals';
  if (pathname.startsWith('/admin/customers')) return '👤 Customers';
  if (pathname.startsWith('/admin/employees')) return '👥 Employees';
  if (pathname.startsWith('/admin/reports'))   return '📈 Reports';
  return '📊 Dashboard';
}