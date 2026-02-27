'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { DEALERSHIP } from '@/lib/constants';

const NAV_LINKS = [
  { href: '/',          label: 'Home'      },
  { href: '/inventory', label: 'Inventory' },
  { href: '/about',     label: 'About'     },
  { href: '/contact',   label: 'Contact'   },
];

export default function PublicHeader() {
  const pathname = usePathname();
  const [open,     setOpen]     = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Outfit:wght@300;400;500;600&display=swap');

        .ph-logo {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #0f1923;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: opacity 0.2s;
        }
        .ph-logo:hover { opacity: 0.7; }

        .ph-nav-link {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 7px 14px;
          border-radius: 5px;
          color: #6b7f96;
          transition: all 0.18s ease;
        }
        .ph-nav-link:hover { color: #0f1923; background: rgba(0,0,0,0.05); }
        .ph-nav-link.active { color: #0f1923; font-weight: 600; background: rgba(0,0,0,0.06); }

        .ph-enquire {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 9px 20px;
          border-radius: 5px;
          background: #0f1923;
          color: #fff;
          border: 1px solid #0f1923;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
        }
        .ph-enquire:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
          box-shadow: 0 4px 20px rgba(29,78,216,0.25);
        }

        .ph-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 6px;
          padding: 9px 10px;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .ph-hamburger:hover { border-color: rgba(0,0,0,0.28); }
        .ph-hamburger span {
          display: block;
          width: 18px;
          height: 1.5px;
          background: #6b7f96;
          border-radius: 2px;
          transition: all 0.25s ease;
          transform-origin: center;
        }
        .ph-hamburger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
        .ph-hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .ph-hamburger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

        .ph-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.3);
          backdrop-filter: blur(4px);
          z-index: 998;
          animation: ph-fade 0.2s ease;
        }
        .ph-drawer {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: min(300px, 85vw);
          background: #f8f9fb;
          border-left: 1px solid rgba(0,0,0,0.08);
          z-index: 999;
          display: flex;
          flex-direction: column;
          animation: ph-slide 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ph-drawer-link {
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-decoration: none;
          color: #6b7f96;
          padding: 16px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          transition: color 0.15s, background 0.15s;
        }
        .ph-drawer-link:hover, .ph-drawer-link.active {
          color: #0f1923;
          background: rgba(0,0,0,0.03);
        }

        @keyframes ph-fade  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ph-slide { from { transform: translateX(100%) } to { transform: translateX(0) } }

        @media (max-width: 860px) {
          .ph-desktop-nav { display: none !important; }
          .ph-hamburger   { display: flex !important; }
        }
        @media (min-width: 861px) {
          .ph-overlay, .ph-drawer { display: none !important; }
        }
      `}</style>

      <header style={{
        position:            'sticky',
        top:                 0,
        zIndex:              100,
        background:          scrolled ? 'rgba(248,249,251,0.98)' : 'rgba(248,249,251,0.94)',
        backdropFilter:      'blur(20px)',
        WebkitBackdropFilter:'blur(20px)',
        borderBottom:        scrolled ? '1px solid rgba(0,0,0,0.09)' : '1px solid rgba(0,0,0,0.05)',
        transition:          'all 0.3s ease',
        boxShadow:           scrolled ? '0 2px 24px rgba(0,0,0,0.06)' : 'none',
      }}>
        <div style={{
          maxWidth:       1360,
          margin:         '0 auto',
          padding:        '0 32px',
          height:         66,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            20,
        }}>

          {/* Logo */}
          <Link href="/" className="ph-logo">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect width="26" height="26" rx="5" fill="#0f1923"/>
              <path d="M5 18L9 10L13 15L16 11L21 18H5Z" fill="#3b82f6" opacity="0.9"/>
              <circle cx="18" cy="9" r="2.5" fill="#60a5fa" opacity="0.8"/>
            </svg>
            {DEALERSHIP.name}
          </Link>

          {/* Desktop nav */}
          <nav className="ph-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {NAV_LINKS.map(link => {
              const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} className={`ph-nav-link${isActive ? ' active' : ''}`}>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a
              href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ph-enquire ph-desktop-nav"
            >
              <span>↗</span> Enquire
            </a>
            <button
              className={`ph-hamburger${open ? ' open' : ''}`}
              onClick={() => setOpen(o => !o)}
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="ph-overlay" onClick={() => setOpen(false)} />
          <div className="ph-drawer">
            <div style={{
              padding:        '18px 20px 16px 28px',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              borderBottom:   '1px solid rgba(0,0,0,0.07)',
            }}>
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 700, color: '#0f1923' }}>
                {DEALERSHIP.name}
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  border: '1px solid rgba(0,0,0,0.1)',
                  background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: '#6b7f96',
                }}
              >
                ✕
              </button>
            </div>

            <nav style={{ flex: 1, overflowY: 'auto', paddingTop: 6 }}>
              {NAV_LINKS.map(link => {
                const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`ph-drawer-link${isActive ? ' active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                    <span style={{ fontSize: 11, opacity: 0.3 }}>→</span>
                  </Link>
                );
              })}
            </nav>

            <div style={{ padding: '18px 28px 28px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
              <a
                href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, width: '100%', padding: '13px 20px', borderRadius: 7,
                  background: '#25D366', color: '#fff',
                  fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', letterSpacing: '0.04em',
                }}
              >
                💬 WhatsApp Us
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
}