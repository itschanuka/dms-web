import Link from 'next/link';
import { DEALERSHIP } from '@/lib/constants';

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer style={{
      background:  '#f3f4f6',
      borderTop:   '1px solid rgba(0,0,0,0.07)',
      marginTop:   'auto',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Outfit:wght@300;400;500;600&display=swap');
        .pf-link {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: #6b7f96;
          text-decoration: none;
          display: block;
          margin-bottom: 9px;
          transition: color 0.15s;
          letter-spacing: 0.01em;
        }
        .pf-link:hover { color: #0f1923; }
        .pf-social {
          width: 34px; height: 34px;
          border-radius: 7px;
          border: 1px solid rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.7);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          text-decoration: none;
          transition: all 0.18s ease;
        }
        .pf-social:hover {
          background: #fff;
          border-color: rgba(0,0,0,0.2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
      `}</style>

      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '56px 32px 32px' }}>

        {/* Top grid */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap:                 48,
          marginBottom:        48,
        }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <rect width="26" height="26" rx="5" fill="#0f1923"/>
                <path d="M5 18L9 10L13 15L16 11L21 18H5Z" fill="#3b82f6" opacity="0.9"/>
                <circle cx="18" cy="9" r="2.5" fill="#60a5fa" opacity="0.8"/>
              </svg>
              <span style={{
                fontFamily:    "'Playfair Display', Georgia, serif",
                fontSize:      17,
                fontWeight:    700,
                color:         '#0f1923',
                letterSpacing: '0.02em',
              }}>
                {DEALERSHIP.name}
              </span>
            </div>
            <p style={{
              fontFamily:  "'Outfit', sans-serif",
              fontSize:    13,
              fontWeight:  300,
              color:       '#8097b8',
              lineHeight:  1.75,
              margin:      '0 0 18px',
              maxWidth:    220,
            }}>
              {DEALERSHIP.tagline}. Quality vehicles, transparent pricing, trusted service.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={DEALERSHIP.social.facebook}  target="_blank" rel="noopener noreferrer" className="pf-social" aria-label="Facebook">📘</a>
              <a href={DEALERSHIP.social.instagram} target="_blank" rel="noopener noreferrer" className="pf-social" aria-label="Instagram">📸</a>
              <a href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="pf-social" aria-label="WhatsApp">💬</a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 style={{
              fontFamily:    "'Outfit', sans-serif",
              fontSize:      10,
              fontWeight:    600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:         '#9dafc0',
              margin:        '0 0 18px',
            }}>
              Quick Links
            </h4>
            {[
              { href: '/',          label: 'Home'        },
              { href: '/inventory', label: 'Browse Cars' },
              { href: '/about',     label: 'About Us'    },
              { href: '/contact',   label: 'Contact'     },
            ].map(link => (
              <Link key={link.href} href={link.href} className="pf-link">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Services */}
          <div>
            <h4 style={{
              fontFamily:    "'Outfit', sans-serif",
              fontSize:      10,
              fontWeight:    600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:         '#9dafc0',
              margin:        '0 0 18px',
            }}>
              Services
            </h4>
            {[
              { href: '/contact?subject=Finance+Enquiry',   label: 'Finance Options'  },
              { href: '/contact?subject=Trade-In+Valuation', label: 'Trade-In'         },
              { href: '/contact?subject=Book+a+Test+Drive',  label: 'Test Drive'       },
              { href: '/contact?subject=General+Enquiry',    label: 'General Enquiry'  },
            ].map(link => (
              <a key={link.href} href={link.href} className="pf-link">
                {link.label}
              </a>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 style={{
              fontFamily:    "'Outfit', sans-serif",
              fontSize:      10,
              fontWeight:    600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:         '#9dafc0',
              margin:        '0 0 18px',
            }}>
              Contact
            </h4>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize:   13,
              fontWeight: 300,
              color:      '#8097b8',
              lineHeight: 2,
            }}>
              <div>📍 {DEALERSHIP.address}</div>
              <div>
                📞 <a href={`tel:${DEALERSHIP.phone}`} style={{ color: '#6b7f96', textDecoration: 'none' }}>
                  {DEALERSHIP.phone}
                </a>
              </div>
              <div>
                ✉️ <a href={`mailto:${DEALERSHIP.email}`} style={{ color: '#6b7f96', textDecoration: 'none' }}>
                  {DEALERSHIP.email}
                </a>
              </div>
              <div>🕐 {DEALERSHIP.workingHours}</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 24 }} />

        {/* Bottom bar */}
        <div style={{
          display:        'flex',
          flexWrap:       'wrap',
          justifyContent: 'space-between',
          alignItems:     'center',
          gap:            12,
        }}>
          <p style={{
            fontFamily:  "'Outfit', sans-serif",
            fontSize:    12,
            fontWeight:  300,
            color:       '#a0b0c0',
            margin:      0,
          }}>
            © {year} {DEALERSHIP.name}. All rights reserved.
          </p>
          <p style={{
            fontFamily:  "'Outfit', sans-serif",
            fontSize:    12,
            fontWeight:  300,
            color:       '#a0b0c0',
            margin:      0,
          }}>
            Prices listed in usd · Subject to change without notice
          </p>
        </div>
      </div>
    </footer>
  );
}