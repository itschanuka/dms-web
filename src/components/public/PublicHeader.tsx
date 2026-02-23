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
  const [open,      setOpen]      = useState(false);
  const [scrolled,  setScrolled]  = useState(false);
  const [theme,     setTheme]     = useState<'dark' | 'light'>('dark');

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Detect scroll for header elevation
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isDark = theme === 'dark';

  const colors = {
    bg:          isDark ? 'rgba(4, 6, 12, 0.92)'  : 'rgba(255, 255, 255, 0.92)',
    bgScrolled:  isDark ? 'rgba(4, 6, 12, 0.98)'  : 'rgba(255, 255, 255, 0.98)',
    border:      isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text:        isDark ? '#e8eef8'                : '#0f1923',
    textMuted:   isDark ? '#4a6080'                : '#8098b0',
    navHover:    isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    activeText:  isDark ? '#ffffff'                : '#0f1923',
    activeBg:    isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    mobileBg:    isDark ? '#04060c'                : '#ffffff',
    mobileDivider: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
    btnBorder:   isDark ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.12)',
    btnText:     isDark ? '#8097b8'                : '#607090',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .ph-logo-text {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: ${colors.text};
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .ph-logo-text:hover { opacity: 0.8; }

        .ph-nav-link {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 7px 14px;
          border-radius: 6px;
          transition: all 0.18s ease;
          position: relative;
        }
        .ph-nav-link:hover {
          background: ${colors.navHover};
        }

        .ph-theme-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid ${colors.btnBorder};
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          transition: all 0.2s;
          color: ${colors.btnText};
          flex-shrink: 0;
        }
        .ph-theme-btn:hover {
          border-color: ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'};
          background: ${colors.navHover};
          transform: rotate(20deg);
        }

        .ph-cta {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 8px 18px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'};
          color: ${colors.text};
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .ph-cta:hover {
          background: ${colors.text};
          color: ${isDark ? '#04060c' : '#ffffff'};
          border-color: ${colors.text};
        }

        .ph-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: 1px solid ${colors.btnBorder};
          border-radius: 6px;
          padding: 9px 10px;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .ph-hamburger:hover { border-color: ${colors.btnText}; }
        .ph-hamburger span {
          display: block;
          width: 18px;
          height: 1.5px;
          background: ${colors.textMuted};
          border-radius: 2px;
          transition: all 0.25s ease;
          transform-origin: center;
        }
        .ph-hamburger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
        .ph-hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .ph-hamburger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

        .ph-mobile-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 998;
          animation: ph-fade-in 0.2s ease;
        }
        .ph-mobile-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: min(320px, 85vw);
          background: ${colors.mobileBg};
          border-left: 1px solid ${colors.border};
          z-index: 999;
          display: flex;
          flex-direction: column;
          animation: ph-slide-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ph-mobile-link {
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-decoration: none;
          color: ${colors.textMuted};
          padding: 16px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid ${colors.mobileDivider};
          transition: color 0.18s, background 0.18s;
        }
        .ph-mobile-link:hover, .ph-mobile-link.active {
          color: ${colors.text};
          background: ${colors.navHover};
        }

        @keyframes ph-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ph-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }

        @media (max-width: 860px) {
          .ph-desktop-nav { display: none !important; }
          .ph-hamburger   { display: flex !important; }
        }
        @media (min-width: 861px) {
          .ph-mobile-overlay { display: none !important; }
          .ph-mobile-drawer  { display: none !important; }
        }
      `}</style>

      <header style={{
        position:       'sticky',
        top:            0,
        zIndex:         100,
        background:     scrolled ? colors.bgScrolled : colors.bg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom:   `1px solid ${scrolled ? colors.border : 'transparent'}`,
        transition:     'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        boxShadow:      scrolled
          ? (isDark ? '0 4px 32px rgba(0,0,0,0.4)' : '0 4px 32px rgba(0,0,0,0.08)')
          : 'none',
      }}>
        <div style={{
          maxWidth:       1280,
          margin:         '0 auto',
          padding:        '0 28px',
          height:         68,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            20,
        }}>

          {/* Logo */}
          <Link href="/" className="ph-logo-text" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill={isDark ? '#0a1628' : '#f0f4ff'}/>
              <path d="M6 18L10 10L14 15L17 11L22 18H6Z" fill={isDark ? '#3b82f6' : '#1d4ed8'} opacity="0.9"/>
              <circle cx="19" cy="10" r="2.5" fill={isDark ? '#60a5fa' : '#3b82f6'} opacity="0.7"/>
            </svg>
            {DEALERSHIP.name}
          </Link>

          {/* Desktop nav */}
          <nav className="ph-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {NAV_LINKS.map(link => {
              const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="ph-nav-link"
                  style={{
                    color:      isActive ? colors.activeText : colors.textMuted,
                    background: isActive ? colors.activeBg : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Theme toggle */}
            <button
              className="ph-theme-btn"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* WhatsApp CTA — desktop only */}
            <a
              href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ph-cta ph-desktop-nav"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ fontSize: 13 }}>↗</span> Enquire
            </a>

            {/* Hamburger */}
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
          <div className="ph-mobile-overlay" onClick={() => setOpen(false)} />
          <div className="ph-mobile-drawer">
            {/* Drawer header */}
            <div style={{
              padding:        '20px 24px 18px 32px',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              borderBottom:   `1px solid ${colors.mobileDivider}`,
            }}>
              <span style={{
                fontFamily:    "'Cormorant Garamond', Georgia, serif",
                fontSize:      17,
                fontWeight:    700,
                color:         colors.text,
                letterSpacing: '0.04em',
              }}>
                {DEALERSHIP.name}
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                style={{
                  width:        36,
                  height:       36,
                  borderRadius: '50%',
                  border:       `1px solid ${colors.btnBorder}`,
                  background:   'transparent',
                  cursor:       'pointer',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  fontSize:     18,
                  color:        colors.textMuted,
                  lineHeight:   1,
                  transition:   'all 0.18s',
                }}
              >
                ✕
              </button>
            </div>

            {/* Nav links */}
            <nav style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
              {NAV_LINKS.map(link => {
                const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`ph-mobile-link${isActive ? ' active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                    <span style={{ fontSize: 12, opacity: 0.4 }}>→</span>
                  </Link>
                );
              })}
            </nav>

            {/* Bottom section */}
            <div style={{ padding: '20px 32px 32px', borderTop: `1px solid ${colors.mobileDivider}` }}>
              <a
                href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            8,
                  width:          '100%',
                  padding:        '13px 20px',
                  borderRadius:   8,
                  background:     '#25D366',
                  color:          '#fff',
                  fontFamily:     "'DM Sans', sans-serif",
                  fontSize:       14,
                  fontWeight:     600,
                  textDecoration: 'none',
                  letterSpacing:  '0.02em',
                  marginBottom:   12,
                }}
              >
                💬 WhatsApp Us
              </a>

              {/* Theme toggle in mobile */}
              <button
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            8,
                  width:          '100%',
                  padding:        '11px 20px',
                  borderRadius:   8,
                  border:         `1px solid ${colors.btnBorder}`,
                  background:     'transparent',
                  cursor:         'pointer',
                  fontFamily:     "'DM Sans', sans-serif",
                  fontSize:       13,
                  fontWeight:     500,
                  color:          colors.textMuted,
                }}
              >
                {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}