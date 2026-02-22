import Link from 'next/link';
import { DEALERSHIP } from '@/lib/constants';

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: '#0d1117', borderTop: '1px solid #1f2d45', marginTop: 'auto' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 32px' }}>

        {/* Top section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 40 }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 900, color: '#fff',
              }}>
                A
              </div>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{DEALERSHIP.name}</span>
            </div>
            <p style={{ fontSize: 13, color: '#5c7090', lineHeight: 1.7, margin: 0 }}>
              {DEALERSHIP.tagline}. Quality vehicles, transparent pricing, trusted service.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <a href={DEALERSHIP.social.facebook} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 20, textDecoration: 'none' }} aria-label="Facebook">
                📘
              </a>
              <a href={DEALERSHIP.social.instagram} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 20, textDecoration: 'none' }} aria-label="Instagram">
                📸
              </a>
              <a href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 20, textDecoration: 'none' }} aria-label="WhatsApp">
                💬
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5c7090', margin: '0 0 16px' }}>
              Quick Links
            </h4>
            {[
              { href: '/',          label: 'Home'         },
              { href: '/inventory', label: 'Browse Cars'  },
              { href: '/about',     label: 'About Us'     },
              { href: '/contact',   label: 'Contact'      },
            ].map(link => (
              <Link key={link.href} href={link.href} style={{
                display: 'block',
                fontSize: 13,
                color: '#8097b8',
                textDecoration: 'none',
                marginBottom: 8,
                transition: 'color 0.15s',
              }}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5c7090', margin: '0 0 16px' }}>
              Contact Us
            </h4>
            <div style={{ fontSize: 13, color: '#8097b8', lineHeight: 1.9 }}>
              <div>📍 {DEALERSHIP.address}</div>
              <div>
                📞{' '}
                <a href={`tel:${DEALERSHIP.phone}`} style={{ color: '#8097b8', textDecoration: 'none' }}>
                  {DEALERSHIP.phone}
                </a>
              </div>
              <div>
                ✉️{' '}
                <a href={`mailto:${DEALERSHIP.email}`} style={{ color: '#8097b8', textDecoration: 'none' }}>
                  {DEALERSHIP.email}
                </a>
              </div>
              <div>🕐 {DEALERSHIP.workingHours}</div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid #1f2d45',
          paddingTop: 20,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}>
          <p style={{ fontSize: 12, color: '#3a4e6a', margin: 0 }}>
            © {year} {DEALERSHIP.name}. All rights reserved.
          </p>
          <p style={{ fontSize: 12, color: '#3a4e6a', margin: 0 }}>
            Prices are listed in LKR and subject to change without notice.
          </p>
        </div>
      </div>
    </footer>
  );
}
