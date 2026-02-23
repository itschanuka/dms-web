import type { Metadata } from 'next';
import Link from 'next/link';
import { DEALERSHIP } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${DEALERSHIP.name} — ${DEALERSHIP.tagline}`,
  description: `Browse premium used, reconditioned, and brand new vehicles at ${DEALERSHIP.name}. Transparent pricing. Trusted service. Sri Lanka's finest automotive destination.`,
};

export default function HomePage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Outfit:wght@200;300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ─── HERO ─────────────────────────────────────────── */
        .h-hero {
          position: relative;
          width: 100%;
          height: 100svh;
          min-height: 640px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
        }

        .h-hero-bg {
          position: absolute;
          inset: 0;
          background-image: url('https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=2400&q=85');
          background-size: cover;
          background-position: center 40%;
          transform: scale(1.04);
          animation: h-zoom 18s ease-out forwards;
        }

        @keyframes h-zoom {
          from { transform: scale(1.04); }
          to   { transform: scale(1.0);  }
        }

        .h-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to top,
              rgba(2, 4, 10, 0.97) 0%,
              rgba(2, 4, 10, 0.75) 35%,
              rgba(2, 4, 10, 0.25) 65%,
              rgba(2, 4, 10, 0.05) 100%
            ),
            linear-gradient(to right,
              rgba(2, 4, 10, 0.6) 0%,
              transparent 60%
            );
        }

        .h-hero-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%);
          pointer-events: none;
        }

        .h-hero-lines {
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(255,255,255,0.012) 3px,
            rgba(255,255,255,0.012) 4px
          );
          pointer-events: none;
        }

        .h-hero-inner {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1360px;
          margin: 0 auto;
          padding: 0 48px 80px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: end;
        }

        .h-tag {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          margin-bottom: 28px;
          animation: h-fade-up 0.8s ease 0.2s both;
        }
        .h-tag-line {
          width: 32px; height: 1px;
          background: linear-gradient(90deg, #3b82f6, transparent);
        }

        .h-headline {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(52px, 7vw, 96px);
          font-weight: 900;
          line-height: 0.95;
          letter-spacing: -0.02em;
          color: #ffffff;
          margin-bottom: 28px;
          animation: h-fade-up 0.9s ease 0.35s both;
        }
        .h-headline-outline {
          font-style: italic;
          font-weight: 700;
          color: transparent;
          -webkit-text-stroke: 1.5px rgba(255,255,255,0.6);
        }

        .h-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 300;
          line-height: 1.8;
          color: rgba(255,255,255,0.5);
          max-width: 380px;
          margin-bottom: 40px;
          animation: h-fade-up 0.9s ease 0.5s both;
        }

        .h-cta-row {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          animation: h-fade-up 0.9s ease 0.65s both;
        }

        .h-btn-solid {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 15px 32px;
          border-radius: 4px;
          background: #1d4ed8;
          color: #fff;
          border: 1px solid #1d4ed8;
          transition: all 0.22s ease;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
        }
        .h-btn-solid:hover {
          background: #2563eb;
          border-color: #2563eb;
          box-shadow: 0 0 40px rgba(29,78,216,0.5);
          transform: translateY(-1px);
        }

        .h-btn-outline {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 15px 28px;
          border-radius: 4px;
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(8px);
          color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.18);
          transition: all 0.22s ease;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
        }
        .h-btn-outline:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.35);
          color: #fff;
        }

        /* Glass panel right side */
        .h-hero-panel {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 32px 28px;
          animation: h-fade-up 0.9s ease 0.55s both;
        }
        .h-panel-title {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .h-panel-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: rgba(255,255,255,0.06);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 18px;
        }
        .h-panel-stat {
          background: rgba(0,0,0,0.35);
          padding: 18px 16px;
        }
        .h-panel-stat-num {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 28px;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        .h-panel-stat-accent { color: #60a5fa; }
        .h-panel-stat-label {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.28);
          margin-top: 4px;
        }
        .h-panel-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .h-badge {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 20px;
          padding: 5px 11px;
        }

        /* Scroll indicator */
        .h-scroll {
          position: absolute;
          bottom: 36px;
          right: 48px;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: h-fade-up 1s ease 1s both;
        }
        .h-scroll-text {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.2);
          writing-mode: vertical-rl;
        }
        .h-scroll-line {
          width: 1px; height: 52px;
          background: linear-gradient(to bottom, rgba(255,255,255,0.3), transparent);
          animation: h-line-pulse 2s ease-in-out infinite;
        }
        @keyframes h-line-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }

        @keyframes h-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ─── MARQUEE ──────────────────────────────────────── */
        .h-marquee {
          background: #060d1e;
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          overflow: hidden;
          padding: 14px 0;
          white-space: nowrap;
        }
        .h-marquee-track {
          display: inline-flex;
          animation: h-scroll-left 35s linear infinite;
        }
        .h-marquee-item {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.28);
          padding: 0 36px;
          display: inline-flex;
          align-items: center;
          gap: 36px;
        }
        .h-marquee-diamond {
          width: 4px; height: 4px;
          background: #1d4ed8;
          transform: rotate(45deg);
          flex-shrink: 0;
        }
        @keyframes h-scroll-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        /* ─── WHY US ───────────────────────────────────────── */
        .h-why {
          background: #02040a;
          padding: 112px 48px;
        }
        .h-section-kicker {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #3b82f6;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }
        .h-section-kicker::after {
          content: '';
          width: 36px; height: 1px;
          background: currentColor;
          display: inline-block;
        }
        .h-section-h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(34px, 4.5vw, 58px);
          font-weight: 900;
          line-height: 1.05;
          color: #fff;
          letter-spacing: -0.02em;
          margin-bottom: 64px;
        }
        .h-section-h2 em {
          font-style: italic;
          font-weight: 700;
          color: rgba(255,255,255,0.35);
        }

        .h-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          overflow: hidden;
        }
        .h-card {
          background: #050912;
          padding: 36px 28px 40px;
          position: relative;
          transition: background 0.25s ease;
        }
        .h-card::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #1d4ed8, #3b82f6);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }
        .h-card:hover { background: #070d1a; }
        .h-card:hover::after { transform: scaleX(1); }
        .h-card-num {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 11px;
          font-style: italic;
          color: rgba(255,255,255,0.12);
          letter-spacing: 0.1em;
          margin-bottom: 32px;
        }
        .h-card-icon { font-size: 24px; margin-bottom: 18px; display: block; }
        .h-card-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 12px;
          line-height: 1.2;
        }
        .h-card-desc {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: rgba(255,255,255,0.35);
          line-height: 1.8;
        }

        /* ─── STATS ────────────────────────────────────────── */
        .h-stats {
          background: #030710;
          padding: 0;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .h-stats-inner {
          max-width: 1360px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        .h-stat-cell {
          padding: 56px 48px;
          border-right: 1px solid rgba(255,255,255,0.06);
          transition: background 0.2s;
        }
        .h-stat-cell:last-child { border-right: none; }
        .h-stat-cell:hover { background: rgba(255,255,255,0.02); }
        .h-stat-big {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(48px, 5vw, 72px);
          font-weight: 900;
          color: #fff;
          line-height: 1;
          letter-spacing: -0.03em;
        }
        .h-stat-blue { color: #3b82f6; }
        .h-stat-lbl {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.22);
          margin-top: 10px;
        }

        /* ─── CTA SECTION ──────────────────────────────────── */
        .h-cta-full {
          position: relative;
          padding: 128px 48px;
          background: #02040a;
          overflow: hidden;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .h-cta-full::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=50');
          background-size: cover;
          background-position: center;
          opacity: 0.06;
        }
        .h-cta-full::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(29,78,216,0.12) 0%, transparent 70%);
        }
        .h-cta-inner {
          position: relative;
          z-index: 1;
          max-width: 640px;
          margin: 0 auto;
        }
        .h-cta-h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(36px, 5vw, 64px);
          font-weight: 900;
          color: #fff;
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin-bottom: 20px;
        }
        .h-cta-h2 em { font-style: italic; color: #60a5fa; }
        .h-cta-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 300;
          color: rgba(255,255,255,0.38);
          line-height: 1.8;
          margin-bottom: 44px;
        }
        .h-cta-btns {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ─── SERVICE STRIP ────────────────────────────────── */
        .h-services {
          background: #030710;
          padding: 80px 48px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .h-svc-grid {
          max-width: 1360px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .h-svc-card {
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 36px 32px;
          background: rgba(255,255,255,0.02);
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }
        .h-svc-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, transparent, transparent);
          transition: background 0.3s;
        }
        .h-svc-card:hover {
          border-color: rgba(59,130,246,0.2);
          background: rgba(29,78,216,0.04);
          transform: translateY(-3px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .h-svc-card:hover::before {
          background: linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent);
        }
        .h-svc-emoji { font-size: 28px; margin-bottom: 20px; display: block; }
        .h-svc-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 12px;
        }
        .h-svc-desc {
          font-family: 'Outfit', sans-serif;
          font-size: 13.5px;
          font-weight: 300;
          color: rgba(255,255,255,0.35);
          line-height: 1.8;
          margin-bottom: 22px;
        }
        .h-svc-link {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #3b82f6;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: gap 0.2s;
        }
        .h-svc-link:hover { gap: 12px; }

        /* ─── RESPONSIVE ───────────────────────────────────── */
        @media (max-width: 1100px) {
          .h-cards { grid-template-columns: repeat(2, 1fr); }
          .h-stats-inner { grid-template-columns: repeat(2, 1fr); }
          .h-stat-cell:nth-child(2) { border-right: none; }
          .h-stat-cell:nth-child(3) { border-top: 1px solid rgba(255,255,255,0.06); }
          .h-stat-cell:nth-child(4) { border-top: 1px solid rgba(255,255,255,0.06); border-right: none; }
        }
        @media (max-width: 860px) {
          .h-hero-inner { grid-template-columns: 1fr; padding: 0 24px 60px; }
          .h-hero-panel { display: none; }
          .h-why, .h-services, .h-cta-full { padding-left: 24px; padding-right: 24px; }
          .h-svc-grid { grid-template-columns: 1fr; }
          .h-scroll { display: none; }
          .h-stat-cell { padding: 40px 28px; }
        }
        @media (max-width: 600px) {
          .h-cards { grid-template-columns: 1fr; }
          .h-stats-inner { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════ */}
      {/* HERO — Full-bleed Porsche photograph                    */}
      {/* ════════════════════════════════════════════════════════ */}
      <section className="h-hero">
        <div className="h-hero-bg" />
        <div className="h-hero-overlay" />
        <div className="h-hero-vignette" />
        <div className="h-hero-lines" />

        <div className="h-hero-inner">
          {/* Left — headline */}
          <div>
            <p className="h-tag">
              <span className="h-tag-line" />
              Sri Lanka&apos;s Premier Dealership
            </p>
            <h1 className="h-headline">
              Drive<br />
              <span className="h-headline-outline">Exceptional</span><br />
              Every Day
            </h1>
            <p className="h-sub">
              Handpicked vehicles. Ruthlessly transparent pricing.
              From city commuters to exotic luxury — your next car is here.
            </p>
            <div className="h-cta-row">
              <Link href="/inventory" className="h-btn-solid">
                Browse Stock
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <a
                href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-btn-outline"
              >
                💬 WhatsApp Us
              </a>
            </div>
          </div>

          {/* Right — glass stats panel */}
          <div className="h-hero-panel">
            <p className="h-panel-title">At a Glance</p>
            <div className="h-panel-stats">
              {[
                { num: '500', a: '+', label: 'Vehicles Sold'    },
                { num: '10',  a: '+', label: 'Years Active'     },
                { num: '98',  a: '%', label: 'Satisfied Buyers' },
                { num: '5',   a: '+', label: 'Finance Partners' },
              ].map(s => (
                <div key={s.label} className="h-panel-stat">
                  <div className="h-panel-stat-num">{s.num}<span className="h-panel-stat-accent">{s.a}</span></div>
                  <div className="h-panel-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="h-panel-badges">
              {['Inspected', 'Finance Ready', 'Trade-In', 'Test Drive', 'Island Delivery'].map(b => (
                <span key={b} className="h-badge">{b}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="h-scroll">
          <span className="h-scroll-text">Scroll</span>
          <span className="h-scroll-line" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════ */}
      {/* MARQUEE                                                  */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="h-marquee" aria-hidden="true">
        <div className="h-marquee-track">
          {Array.from({ length: 2 }).map((_, t) =>
            ['Premium Selection', 'Transparent Pricing', 'Finance Available', 'Trade-In Welcome',
             'Fully Inspected', 'Test Drive Anytime', 'Trusted Since 2014', 'Island-Wide Delivery'].map((item, i) => (
              <span key={`${t}-${i}`} className="h-marquee-item">
                {item}<span className="h-marquee-diamond" />
              </span>
            ))
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* WHY CHOOSE US                                            */}
      {/* ════════════════════════════════════════════════════════ */}
      <section className="h-why">
        <div style={{ maxWidth: 1360, margin: '0 auto' }}>
          <p className="h-section-kicker">Why {DEALERSHIP.name}</p>
          <h2 className="h-section-h2">The Standard<br />You <em>Deserve</em></h2>
          <div className="h-cards">
            {[
              { num: '01', icon: '🛡️', title: 'Fully Inspected',    desc: 'Every vehicle passes a rigorous multi-point inspection. What you see is exactly what you get — no surprises after the handshake.' },
              { num: '02', icon: '💎', title: 'Honest Pricing',     desc: 'The number on the windscreen is the number we talk from. No hidden dealer fees, no inflated stickers. Ever.' },
              { num: '03', icon: '🏦', title: 'Finance Ready',      desc: '5+ partner banks and leasing companies. We handle the paperwork — you focus on enjoying your new car.' },
              { num: '04', icon: '🔑', title: 'Test Drive Anytime', desc: 'Every vehicle on our lot is available for a proper test drive. Just walk in — no appointment, no pressure.' },
            ].map(f => (
              <div key={f.title} className="h-card">
                <div className="h-card-num">{f.num}</div>
                <span className="h-card-icon">{f.icon}</span>
                <h3 className="h-card-title">{f.title}</h3>
                <p className="h-card-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════ */}
      {/* STATS                                                    */}
      {/* ════════════════════════════════════════════════════════ */}
      <section className="h-stats">
        <div className="h-stats-inner">
          {[
            { big: '500', a: '+', label: 'Vehicles Sold'         },
            { big: '10',  a: '+', label: 'Years in Business'     },
            { big: '98',  a: '%', label: 'Customer Satisfaction' },
            { big: '5',   a: '+', label: 'Finance Partners'      },
          ].map(s => (
            <div key={s.label} className="h-stat-cell">
              <div className="h-stat-big">{s.big}<span className="h-stat-blue">{s.a}</span></div>
              <div className="h-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════ */}
      {/* INVENTORY CTA                                            */}
      {/* ════════════════════════════════════════════════════════ */}
      <section className="h-cta-full">
        <div className="h-cta-inner">
          <p className="h-section-kicker" style={{ justifyContent: 'center' }}>Browse Our Stock</p>
          <h2 className="h-cta-h2">Find Your<br /><em>Perfect Match</em></h2>
          <p className="h-cta-sub">
            From compact city cars to executive saloons — browse our full inventory
            with real-time availability, full specs, and honest pricing.
          </p>
          <div className="h-cta-btns">
            <Link href="/inventory" className="h-btn-solid">
              View All Vehicles
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/contact" className="h-btn-outline">Get in Touch</Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SERVICES                                                 */}
      {/* ════════════════════════════════════════════════════════ */}
      <section className="h-services">
        <div className="h-svc-grid">
          <div className="h-svc-card">
            <span className="h-svc-emoji">🏦</span>
            <h3 className="h-svc-title">Finance Options</h3>
            <p className="h-svc-desc">
              Low down payments. Competitive rates. We work with 5+ banks and leasing
              companies to get you a deal that actually makes sense.
            </p>
            <Link href="/contact?subject=Finance+Enquiry" className="h-svc-link">Enquire Now →</Link>
          </div>
          <div className="h-svc-card">
            <span className="h-svc-emoji">🔄</span>
            <h3 className="h-svc-title">Trade-In Your Car</h3>
            <p className="h-svc-desc">
              Get a fair, no-obligation valuation on your current vehicle and use it
              toward your next one. Quick assessment, honest numbers.
            </p>
            <Link href="/contact?subject=Trade-In+Valuation" className="h-svc-link">Get a Quote →</Link>
          </div>
          <div className="h-svc-card">
            <span className="h-svc-emoji">📍</span>
            <h3 className="h-svc-title">Visit Our Showroom</h3>
            <p className="h-svc-desc">
              {DEALERSHIP.address}.{' '}
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>{DEALERSHIP.workingHours}.</span>
              {' '}No appointment needed.
            </p>
            <a href={`tel:${DEALERSHIP.phone}`} className="h-svc-link">{DEALERSHIP.phone} →</a>
          </div>
        </div>
      </section>
    </>
  );
}