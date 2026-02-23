import type { Metadata } from 'next';
import Link from 'next/link';
import { DEALERSHIP } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'About Us',
  description: `Learn about ${DEALERSHIP.name} — our story, our people, and why thousands of Sri Lankans trust us with their next vehicle.`,
};

export default function AboutPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        .ab-hero {
          position: relative;
          padding: 120px 28px 100px;
          overflow: hidden;
          background: #04060c;
        }
        .ab-hero::before {
          content: '';
          position: absolute;
          width: 700px; height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(29,78,216,0.18) 0%, transparent 65%);
          top: -200px; right: -100px;
          pointer-events: none;
        }
        .ab-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        .ab-eyebrow {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #3b82f6;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .ab-eyebrow::before {
          content: '';
          width: 20px; height: 1px;
          background: #3b82f6;
          display: inline-block;
        }

        .ab-h1 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(42px, 6vw, 80px);
          font-weight: 700;
          line-height: 1.0;
          color: #ffffff;
          letter-spacing: -0.02em;
          margin-bottom: 28px;
        }
        .ab-h1 em {
          font-style: italic;
          color: #60a5fa;
        }

        .ab-hero-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 17px;
          font-weight: 300;
          line-height: 1.75;
          color: rgba(255,255,255,0.45);
          max-width: 560px;
          margin-bottom: 48px;
        }

        /* Horizontal rule decorative */
        .ab-rule {
          width: 60px; height: 1px;
          background: linear-gradient(90deg, #1d4ed8, transparent);
          margin-bottom: 48px;
        }

        /* ── Story section ── */
        .ab-story {
          padding: 96px 28px;
          background: #070c18;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .ab-h2 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(32px, 4vw, 52px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.1;
          letter-spacing: -0.01em;
          margin-bottom: 24px;
        }
        .ab-h2 em { font-style: italic; color: #60a5fa; }

        .ab-body {
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 300;
          line-height: 1.85;
          color: rgba(255,255,255,0.45);
          margin-bottom: 20px;
        }

        /* Timeline */
        .ab-timeline {
          position: relative;
          padding-left: 28px;
          margin-top: 40px;
        }
        .ab-timeline::before {
          content: '';
          position: absolute;
          left: 0; top: 8px; bottom: 8px;
          width: 1px;
          background: linear-gradient(180deg, #1d4ed8, rgba(29,78,216,0.1));
        }
        .ab-tl-item {
          position: relative;
          margin-bottom: 36px;
        }
        .ab-tl-item::before {
          content: '';
          position: absolute;
          left: -33px; top: 6px;
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #1d4ed8;
          border: 2px solid #04060c;
          box-shadow: 0 0 12px rgba(29,78,216,0.5);
        }
        .ab-tl-year {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 13px;
          font-weight: 600;
          color: #3b82f6;
          letter-spacing: 0.1em;
          margin-bottom: 4px;
        }
        .ab-tl-title {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #e8eef8;
          margin-bottom: 4px;
        }
        .ab-tl-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: rgba(255,255,255,0.35);
          line-height: 1.6;
        }

        /* Stats */
        .ab-stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          background: rgba(255,255,255,0.05);
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.07);
        }
        .ab-stat-cell {
          background: #04060c;
          padding: 36px 28px;
          position: relative;
        }
        .ab-stat-cell::after {
          content: '';
          position: absolute;
          bottom: 0; left: 28px; right: 28px;
          height: 1px;
          background: rgba(255,255,255,0.04);
        }
        .ab-stat-num {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 52px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
          letter-spacing: -0.03em;
        }
        .ab-stat-accent { color: #3b82f6; }
        .ab-stat-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          margin-top: 8px;
        }

        /* ── Values ── */
        .ab-values {
          padding: 96px 28px;
          background: #04060c;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .ab-value-card {
          position: relative;
          padding: 36px 32px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
          overflow: hidden;
          transition: all 0.25s ease;
        }
        .ab-value-card::before {
          content: attr(data-num);
          position: absolute;
          right: 24px; top: 20px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 72px;
          font-weight: 700;
          color: rgba(255,255,255,0.03);
          line-height: 1;
          pointer-events: none;
          transition: color 0.25s;
        }
        .ab-value-card:hover {
          border-color: rgba(59,130,246,0.2);
          background: rgba(29,78,216,0.04);
          transform: translateY(-3px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .ab-value-card:hover::before { color: rgba(59,130,246,0.06); }

        .ab-value-icon {
          font-size: 26px;
          margin-bottom: 18px;
          display: block;
        }
        .ab-value-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 12px;
        }
        .ab-value-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 300;
          color: rgba(255,255,255,0.4);
          line-height: 1.75;
        }

        /* ── Team ── */
        .ab-team {
          padding: 96px 28px;
          background: #070c18;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .ab-team-card {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
          overflow: hidden;
          transition: all 0.25s ease;
        }
        .ab-team-card:hover {
          border-color: rgba(59,130,246,0.2);
          transform: translateY(-4px);
          box-shadow: 0 24px 60px rgba(0,0,0,0.35);
        }
        .ab-team-avatar {
          height: 160px;
          background: linear-gradient(135deg, #0a1628 0%, #111e38 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .ab-team-avatar::before {
          content: '';
          position: absolute;
          width: 120px; height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(29,78,216,0.25) 0%, transparent 70%);
        }
        .ab-team-emoji {
          font-size: 56px;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 4px 20px rgba(29,78,216,0.4));
        }
        .ab-team-info { padding: 22px 22px 24px; }
        .ab-team-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 4px;
        }
        .ab-team-role {
          font-family: 'DM Sans', sans-serif;
          font-size: 11.5px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #3b82f6;
        }

        /* ── CTA ── */
        .ab-cta {
          padding: 96px 28px;
          background: #04060c;
          border-top: 1px solid rgba(255,255,255,0.05);
          position: relative;
          overflow: hidden;
        }
        .ab-cta::before {
          content: '';
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(29,78,216,0.1) 0%, transparent 70%);
          bottom: -100px; left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .ab-btn-primary {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 13px 26px;
          border-radius: 7px;
          background: #1d4ed8;
          color: #ffffff;
          border: 1px solid transparent;
          transition: all 0.22s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .ab-btn-primary:hover {
          background: #2563eb;
          box-shadow: 0 8px 28px rgba(29,78,216,0.45);
          transform: translateY(-1px);
        }
        .ab-btn-ghost {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 13px 22px;
          border-radius: 7px;
          background: transparent;
          color: rgba(255,255,255,0.55);
          border: 1px solid rgba(255,255,255,0.13);
          transition: all 0.22s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .ab-btn-ghost:hover {
          border-color: rgba(255,255,255,0.3);
          color: #ffffff;
        }

        @media (max-width: 768px) {
          .ab-hero { padding: 80px 20px 70px; }
          .ab-stat-grid { grid-template-columns: 1fr 1fr; }
          .ab-stat-num { font-size: 38px; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════ */}
      {/* HERO                                          */}
      {/* ══════════════════════════════════════════════ */}
      <section className="ab-hero">
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <p className="ab-eyebrow">Our Story</p>
          <h1 className="ab-h1">
            More Than a<br />
            Dealership.<br />
            <em>A Promise.</em>
          </h1>
          <p className="ab-hero-sub">
            For over a decade, {DEALERSHIP.name} has been helping Sri Lankan families
            find vehicles they love — with honesty, care, and zero pressure.
          </p>
          <div className="ab-rule" />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/inventory" className="ab-btn-primary">Browse Our Stock →</Link>
            <Link href="/contact" className="ab-btn-ghost">Get in Touch</Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* STORY + TIMELINE                               */}
      {/* ══════════════════════════════════════════════ */}
      <section className="ab-story">
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 80, alignItems: 'start' }}>

          {/* Left — story text */}
          <div>
            <p className="ab-eyebrow">How We Got Here</p>
            <h2 className="ab-h2">Built on a<br /><em>Decade of Trust</em></h2>
            <p className="ab-body">
              {DEALERSHIP.name} was born from a simple frustration — car buying in Sri Lanka was stressful, opaque, and full of hidden costs. We set out to change that.
            </p>
            <p className="ab-body">
              Starting with a modest lot and a handful of vehicles, we grew entirely through word-of-mouth. Every customer who left satisfied sent us two more. That&apos;s still true today.
            </p>
            <p className="ab-body">
              We stock used, reconditioned, and brand-new vehicles — all personally inspected, transparently priced, and backed by our reputation.
            </p>

            {/* Timeline */}
            <div className="ab-timeline">
              {[
                { year: '2014', title: 'Founded', desc: 'Started with 12 vehicles and a team of three in Colombo.' },
                { year: '2017', title: 'Finance Wing Launched', desc: 'Partnered with 3 major banks to offer in-house leasing support.' },
                { year: '2020', title: 'Expanded Lot', desc: 'Moved to our current location with capacity for 60+ vehicles.' },
                { year: '2024', title: 'Digital Showroom', desc: 'Launched online inventory so customers can browse before they visit.' },
              ].map(item => (
                <div key={item.year} className="ab-tl-item">
                  <div className="ab-tl-year">{item.year}</div>
                  <div className="ab-tl-title">{item.title}</div>
                  <div className="ab-tl-desc">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — stat grid */}
          <div>
            <div className="ab-stat-grid">
              {[
                { num: '500', unit: '+', label: 'Vehicles Sold'         },
                { num: '10',  unit: '+', label: 'Years in Business'     },
                { num: '98',  unit: '%', label: 'Customer Satisfaction' },
                { num: '5',   unit: '+', label: 'Finance Partners'      },
              ].map(s => (
                <div key={s.label} className="ab-stat-cell">
                  <div className="ab-stat-num">
                    {s.num}<span className="ab-stat-accent">{s.unit}</span>
                  </div>
                  <div className="ab-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Pull quote */}
            <div style={{
              marginTop: 24,
              padding:   '28px 32px',
              background: 'rgba(29,78,216,0.07)',
              border:    '1px solid rgba(29,78,216,0.18)',
              borderLeft: '3px solid #1d4ed8',
              borderRadius: '0 12px 12px 0',
            }}>
              <p style={{
                fontFamily:  "'Cormorant Garamond', Georgia, serif",
                fontSize:    20,
                fontStyle:   'italic',
                fontWeight:  600,
                color:       'rgba(255,255,255,0.75)',
                lineHeight:  1.5,
                margin:      '0 0 12px',
              }}>
                &ldquo;We never sell what we wouldn&apos;t buy ourselves.&rdquo;
              </p>
              <p style={{
                fontFamily:  "'DM Sans', sans-serif",
                fontSize:    12,
                fontWeight:  500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:       '#3b82f6',
              }}>
                — Founder, {DEALERSHIP.name}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* VALUES                                         */}
      {/* ══════════════════════════════════════════════ */}
      <section className="ab-values">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 56 }}>
            <p className="ab-eyebrow">What We Stand For</p>
            <h2 className="ab-h2">Our Core <em>Values</em></h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { num: '01', icon: '🤝', title: 'Honesty',        desc: 'Full vehicle history, real prices, no hidden fees. What you see is exactly what you get.' },
              { num: '02', icon: '🔍', title: 'Transparency',   desc: 'Every cost disclosed upfront. We walk you through the numbers — no fine print surprises.' },
              { num: '03', icon: '💎', title: 'Quality',        desc: 'Only vehicles that pass our multi-point inspection make it to our showroom floor.' },
              { num: '04', icon: '🛡️', title: 'Accountability', desc: 'We stand behind every vehicle we sell. If something\'s not right, we make it right.' },
            ].map(v => (
              <div key={v.title} className="ab-value-card" data-num={v.num}>
                <span className="ab-value-icon">{v.icon}</span>
                <h3 className="ab-value-title">{v.title}</h3>
                <p className="ab-value-desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* TEAM                                           */}
      {/* ══════════════════════════════════════════════ */}
      <section className="ab-team">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 56 }}>
            <p className="ab-eyebrow">The People Behind It</p>
            <h2 className="ab-h2">Meet the <em>Team</em></h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
              Experienced professionals who care about getting you into the right car.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
            {[
              { name: 'Roshan Silva',     role: 'Founder & Director',     emoji: '👨‍💼' },
              { name: 'Priya Fernando',   role: 'Sales Manager',           emoji: '👩‍💼' },
              { name: 'Ashan Perera',     role: 'Senior Sales Executive',  emoji: '👨‍💼' },
              { name: 'Nadee Jayasinghe', role: 'Finance Advisor',         emoji: '👩‍💼' },
            ].map(member => (
              <div key={member.name} className="ab-team-card">
                <div className="ab-team-avatar">
                  <span className="ab-team-emoji">{member.emoji}</span>
                </div>
                <div className="ab-team-info">
                  <div className="ab-team-name">{member.name}</div>
                  <div className="ab-team-role">{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* CTA                                            */}
      {/* ══════════════════════════════════════════════ */}
      <section className="ab-cta">
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <p className="ab-eyebrow" style={{ justifyContent: 'center' }}>Ready to Start?</p>
          <h2 className="ab-h2" style={{ marginBottom: 18 }}>
            Come See Us.<br /><em>We&apos;d Love to Meet You.</em>
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 10 }}>
            {DEALERSHIP.address}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.25)', marginBottom: 36 }}>
            {DEALERSHIP.workingHours}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/inventory" className="ab-btn-primary">Browse Vehicles →</Link>
            <Link href="/contact" className="ab-btn-ghost">Send a Message</Link>
          </div>
        </div>
      </section>
    </>
  );
}