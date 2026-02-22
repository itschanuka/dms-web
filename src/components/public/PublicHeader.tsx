'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { DEALERSHIP } from '@/lib/constants';

const NAV_LINKS = [
  { href: '/',          label: 'Home'      },
  { href: '/about',     label: 'About'     },
  { href: '/inventory', label: 'Inventory' },
  { href: '/contact',   label: 'Contact'   },
];

export default function PublicHeader() {
  const pathname    = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header style={{
      position:    'sticky',
      top:         0,
      zIndex:      100,
      background:  'rgba(7, 9, 15, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #1f2d45',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 900, color: '#fff',
          }}>
            A
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {DEALERSHIP.name}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }} className="desktop-nav">
          {NAV_LINKS.map(link => {
            const isActive = link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding:        '6px 16px',
                  borderRadius:   8,
                  fontSize:       14,
                  fontWeight:     isActive ? 700 : 500,
                  color:          isActive ? '#fff' : '#8097b8',
                  textDecoration: 'none',
                  background:     isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                  transition:     'all 0.15s',
                }}
              >
                {link.label}
              </Link>
            );
          })}

          {/* WhatsApp CTA */}
          <a
            href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft:   8,
              padding:      '7px 16px',
              borderRadius: 8,
              fontSize:     13,
              fontWeight:   700,
              color:        '#fff',
              background:   '#25D366',
              textDecoration: 'none',
              display:      'flex',
              alignItems:   'center',
              gap:          6,
            }}
          >
            <span>💬</span> WhatsApp
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="mobile-menu-btn"
          style={{
            background: 'none',
            border: '1px solid #1f2d45',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            color: '#8097b8',
            fontSize: 18,
          }}
          aria-label="Toggle menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{
          background:   '#0d1117',
          borderBottom: '1px solid #1f2d45',
          padding:      '12px 24px 20px',
        }}>
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{
                display:        'block',
                padding:        '10px 0',
                fontSize:       15,
                fontWeight:     pathname === link.href ? 700 : 500,
                color:          pathname === link.href ? '#6366f1' : '#8097b8',
                textDecoration: 'none',
                borderBottom:   '1px solid #1f2d45',
              }}
            >
              {link.label}
            </Link>
          ))}
          <a
            href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              marginTop: 12,
              padding: '10px 0',
              fontSize: 15,
              fontWeight: 700,
              color: '#25D366',
              textDecoration: 'none',
            }}
          >
            💬 WhatsApp Us
          </a>
        </div>
      )}

      <style>{`
        .desktop-nav { display: flex !important; }
        .mobile-menu-btn { display: none !important; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
