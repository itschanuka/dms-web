import type { Metadata } from 'next';
import Link from 'next/link';
import { DEALERSHIP } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'About Us',
  description: `Learn about ${DEALERSHIP.name} — our story, our team, and why we're Sri Lanka's most trusted car dealership.`,
};

export default function AboutPage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{
        padding:    '80px 24px 64px',
        background: 'linear-gradient(180deg, #0d1117 0%, #07090f 100%)',
        borderBottom: '1px solid #1f2d45',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5c7090', marginBottom: 12 }}>
            About Us
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, color: '#fff', margin: '0 0 20px', lineHeight: 1.1 }}>
            More Than a Dealership.<br />
            <span style={{ color: '#6366f1' }}>A Trusted Partner.</span>
          </h1>
          <p style={{ fontSize: 17, color: '#5c7090', lineHeight: 1.7, margin: 0, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            We believe buying a car should be exciting, not stressful. That&apos;s why we built {DEALERSHIP.name} around transparency, trust, and exceptional service.
          </p>
        </div>
      </section>

      {/* ── OUR STORY ────────────────────────────────────────── */}
      <section style={{ padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 60, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5c7090', marginBottom: 12 }}>
              Our Story
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: '#fff', margin: '0 0 20px' }}>
              Built on a Decade of Trust
            </h2>
            <p style={{ fontSize: 15, color: '#8097b8', lineHeight: 1.8, marginBottom: 16 }}>
              {DEALERSHIP.name} was founded with a simple mission: to make quality vehicles accessible to every Sri Lankan family, with zero compromise on honesty or service.
            </p>
            <p style={{ fontSize: 15, color: '#8097b8', lineHeight: 1.8, marginBottom: 16 }}>
              Over the years, we&apos;ve grown from a small lot in Colombo to one of the most trusted names in the industry — built entirely on word-of-mouth and repeat customers.
            </p>
            <p style={{ fontSize: 15, color: '#8097b8', lineHeight: 1.8 }}>
              Every vehicle we sell is personally inspected, documented, and priced fairly. We never sell what we wouldn&apos;t buy ourselves.
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { icon: '🏆', num: '10+',  label: 'Years in Business'      },
              { icon: '🚗', num: '500+', label: 'Vehicles Sold'           },
              { icon: '😊', num: '1000+', label: 'Happy Customers'        },
              { icon: '🏦', num: '5+',   label: 'Finance Partners'        },
            ].map(stat => (
              <div key={stat.label} style={{
                background:   '#0d1117',
                border:       '1px solid #1f2d45',
                borderRadius: 12,
                padding:      '24px 20px',
                textAlign:    'center',
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#6366f1', lineHeight: 1 }}>{stat.num}</div>
                <div style={{ fontSize: 12, color: '#5c7090', marginTop: 6, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VALUES ───────────────────────────────────────────── */}
      <section style={{ padding: '72px 24px', background: '#0d1117', borderTop: '1px solid #1f2d45', borderBottom: '1px solid #1f2d45' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5c7090', marginBottom: 8 }}>
              What We Stand For
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: '#fff', margin: 0 }}>
              Our Core Values
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {[
              { icon: '🤝', title: 'Honesty',         desc: 'We tell you the full history of every vehicle. No surprises, ever.' },
              { icon: '💎', title: 'Quality',          desc: 'Only vehicles that meet our rigorous inspection standards make it to our lot.' },
              { icon: '⚡', title: 'Efficiency',       desc: 'We respect your time. Fast paperwork, clear answers, quick decisions.' },
              { icon: '🛡️', title: 'Accountability',  desc: 'We stand behind every vehicle we sell. If something&apos;s wrong, we make it right.' },
            ].map(v => (
              <div key={v.title} style={{
                background:   '#111827',
                border:       '1px solid #1f2d45',
                borderRadius: 12,
                padding:      '28px 24px',
              }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{v.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>{v.title}</h3>
                <p style={{ fontSize: 13, color: '#5c7090', lineHeight: 1.6, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ─────────────────────────────────────────────── */}
      <section style={{ padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5c7090', marginBottom: 8 }}>
              The People Behind It
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>
              Meet Our Team
            </h2>
            <p style={{ fontSize: 15, color: '#5c7090', margin: 0 }}>
              Experienced professionals dedicated to helping you find the right car.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {[
              { name: 'Roshan Silva',   role: 'Founder & Director',   emoji: '👨‍💼' },
              { name: 'Priya Fernando', role: 'Sales Manager',         emoji: '👩‍💼' },
              { name: 'Ashan Perera',   role: 'Senior Sales Executive', emoji: '👨‍💼' },
              { name: 'Nadee Jayasinghe', role: 'Finance Advisor',     emoji: '👩‍💼' },
            ].map(member => (
              <div key={member.name} style={{
                background:   '#0d1117',
                border:       '1px solid #1f2d45',
                borderRadius: 12,
                padding:      '28px 20px',
                textAlign:    'center',
              }}>
                <div style={{
                  width: 64, height: 64,
                  background: 'rgba(99,102,241,0.12)',
                  border: '2px solid rgba(99,102,241,0.2)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                  margin: '0 auto 14px',
                }}>
                  {member.emoji}
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                  {member.name}
                </h3>
                <p style={{ fontSize: 12, color: '#5c7090', margin: 0 }}>{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={{ padding: '64px 24px', background: '#0d1117', borderTop: '1px solid #1f2d45' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, color: '#fff', margin: '0 0 14px' }}>
            Come Visit Us
          </h2>
          <p style={{ fontSize: 15, color: '#5c7090', margin: '0 0 28px', lineHeight: 1.7 }}>
            {DEALERSHIP.address}<br />
            {DEALERSHIP.workingHours}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/inventory" style={{
              background: '#6366f1', color: '#fff',
              padding: '12px 24px', borderRadius: 10,
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}>
              Browse Cars →
            </Link>
            <Link href="/contact" style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #1f2d45',
              color: '#dde4f0',
              padding: '12px 24px', borderRadius: 10,
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}>
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
