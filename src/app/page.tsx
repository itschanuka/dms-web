import Link from 'next/link';
import type { Metadata } from 'next';
import { DEALERSHIP } from '@/lib/constants';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';

export const metadata: Metadata = {
  title: DEALERSHIP.name,
  description: `Welcome to ${DEALERSHIP.name} — Sri Lanka's trusted destination for quality vehicles.`,
};

export default function HomePage() {
  return (
    <>
      <PublicHeader />
      <section
        style={{
          padding: '100px 24px 80px',
          background: 'linear-gradient(180deg, #0d1117 0%, #07090f 100%)',
          borderBottom: '1px solid #1f2d45',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5c7090', marginBottom: 12 }}>
            Welcome to {DEALERSHIP.name}
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 900, color: '#fff', margin: '0 0 20px', lineHeight: 1.1 }}>
            Drive Your Dream.<br />
            <span style={{ color: '#6366f1' }}>With Confidence.</span>
          </h1>
          <p style={{ fontSize: 18, color: '#8097b8', lineHeight: 1.7, margin: '0 auto 32px', maxWidth: 600 }}>
            Discover carefully inspected vehicles, transparent pricing, and a dealership built on trust and long-term relationships.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/inventory" style={{ background: '#6366f1', color: '#fff', padding: '14px 28px', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>
              Browse Inventory →
            </Link>
            <Link href="/contact" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1f2d45', color: '#dde4f0', padding: '14px 28px', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
          {[
            { icon: '🚗', title: 'Premium Vehicles', desc: 'Hand-selected used and brand new vehicles meeting strict inspection standards.' },
            { icon: '💰', title: 'Fair Pricing', desc: 'Transparent pricing with no hidden fees and clear documentation.' },
            { icon: '🏦', title: 'Flexible Financing', desc: 'Multiple finance options tailored to suit your budget and needs.' },
            { icon: '🛡️', title: 'After-Sales Support', desc: 'We stand behind every vehicle we sell with reliable customer support.' },
          ].map((item) => (
            <div key={item.title} style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 14, padding: 28 }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>{item.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: '#5c7090', margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '70px 24px', background: '#0d1117', borderTop: '1px solid #1f2d45', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Ready to Find Your Next Car?</h2>
          <p style={{ fontSize: 15, color: '#5c7090', marginBottom: 28 }}>
            Visit our showroom at {DEALERSHIP.address} or browse our full inventory online.
          </p>
          <Link href="/inventory" style={{ background: '#10b981', color: '#000', padding: '14px 30px', borderRadius: 12, fontWeight: 800, textDecoration: 'none' }}>
            View Available Vehicles →
          </Link>
        </div>
      </section>
      <PublicFooter />
    </>
  );
}