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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --blue-deep:    #0a1628;
          --blue-mid:     #1d4ed8;
          --blue-light:   #3b82f6;
          --blue-glow:    #60a5fa;
          --white:        #ffffff;
          --off-white:    #e8eef8;
          --dark:         #04060c;
          --text-muted:   #4a6080;
          --border:       rgba(255,255,255,0.07);
        }

        [data-theme='light'] {
          --blue-deep:    #eff6ff;
          --blue-mid:     #1d4ed8;
          --blue-light:   #2563eb;
          --blue-glow:    #1d4ed8;
          --white:        #0f1923;
          --off-white:    #1e2d3d;
          --dark:         #f8faff;
          --text-muted:   #607090;
          --border:       rgba(0,0,0,0.08);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Hero ── */
        .hp-hero {
          position: relative;
          min-height: 100svh;
          display: flex;
          align-items: center;
          overflow: hidden;
          background: #04060c;
        }

        /* Animated gradient orbs */
        .hp-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .hp-orb-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(29,78,216,0.35) 0%, transparent 70%);
          top: -10%; left: -5%;
          animation: hp-float1 12s ease-in-out infinite;
        }
        .hp-orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(96,165,250,0.2) 0%, transparent 70%);
          bottom: 10%; right: 5%;
          animation: hp-float2 15s ease-in-out infinite;
        }
        .hp-orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%);
          top: 50%; left: 40%;
          animation: hp-float3 18s ease-in-out infinite;
        }

        @keyframes hp-float1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50%       { transform: translate(40px, 30px) scale(1.1); }
        }
        @keyframes hp-float2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50%       { transform: translate(-30px, -40px) scale(0.95); }
        }
        @keyframes hp-float3 {
          0%, 100% { transform: translate(0,0); }
          33%       { transform: translate(20px, -20px); }
          66%       { transform: translate(-20px, 10px); }
        }

        /* Fine grain texture overlay */
        .hp-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
          opacity: 0.4;
        }

        /* Horizontal lines grid */
        .hp-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 1;
        }

        .hp-hero-inner {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 100px 28px 80px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        /* Glass card */
        .hp-glass-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 44px 48px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.02) inset,
            0 32px 80px rgba(0,0,0,0.4),
            0 0 60px rgba(29,78,216,0.08);
        }

        .hp-eyebrow {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #60a5fa;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .hp-eyebrow::before {
          content: '';
          display: block;
          width: 24px;
          height: 1px;
          background: #3b82f6;
        }

        .hp-headline {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(40px, 5vw, 64px);
          font-weight: 700;
          line-height: 1.05;
          color: #ffffff;
          margin-bottom: 22px;
          letter-spacing: -0.01em;
        }
        .hp-headline em {
          font-style: italic;
          color: #60a5fa;
        }

        .hp-subline {
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 300;
          line-height: 1.75;
          color: rgba(255,255,255,0.5);
          margin-bottom: 36px;
          max-width: 420px;
        }

        .hp-cta-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .hp-btn-primary {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 8px;
          background: #1d4ed8;
          color: #ffffff;
          border: 1px solid transparent;
          transition: all 0.22s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .hp-btn-primary:hover {
          background: #2563eb;
          box-shadow: 0 8px 28px rgba(29,78,216,0.45);
          transform: translateY(-1px);
        }

        .hp-btn-ghost {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 14px 24px;
          border-radius: 8px;
          background: transparent;
          color: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.15);
          transition: all 0.22s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .hp-btn-ghost:hover {
          border-color: rgba(255,255,255,0.35);
          color: #ffffff;
          background: rgba(255,255,255,0.05);
        }

        /* Hero visual — right side */
        .hp-hero-visual {
          position: relative;
          height: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hp-car-silhouette {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        /* Animated car SVG */
        .hp-car-glow {
          position: absolute;
          width: 70%;
          height: 40%;
          bottom: 18%;
          left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(ellipse, rgba(29,78,216,0.4) 0%, transparent 70%);
          filter: blur(30px);
          animation: hp-glow-pulse 3s ease-in-out infinite;
        }

        @keyframes hp-glow-pulse {
          0%, 100% { opacity: 0.6; transform: translateX(-50%) scaleX(1); }
          50%       { opacity: 1;   transform: translateX(-50%) scaleX(1.1); }
        }

        .hp-car-svg {
          width: 90%;
          max-width: 500px;
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 20px 40px rgba(29,78,216,0.3));
          animation: hp-car-float 6s ease-in-out infinite;
        }

        @keyframes hp-car-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }

        /* Floating stats */
        .hp-stat-chip {
          position: absolute;
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 10px 16px;
          font-family: 'DM Sans', sans-serif;
          z-index: 3;
          animation: hp-chip-float 4s ease-in-out infinite;
        }
        .hp-stat-chip:nth-child(3) { animation-delay: -2s; }
        .hp-stat-chip-num {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
        }
        .hp-stat-chip-label {
          font-size: 10px;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        @keyframes hp-chip-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }

        /* ── Marquee strip ── */
        .hp-marquee-strip {
          background: #1d4ed8;
          overflow: hidden;
          padding: 10px 0;
          white-space: nowrap;
          position: relative;
        }
        .hp-marquee-track {
          display: inline-flex;
          animation: hp-marquee 30s linear infinite;
        }
        .hp-marquee-item {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.8);
          padding: 0 28px;
          display: inline-flex;
          align-items: center;
          gap: 28px;
        }
        .hp-marquee-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: rgba(255,255,255,0.4);
          flex-shrink: 0;
        }
        @keyframes hp-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        /* ── Why Us ── */
        .hp-why {
          padding: 96px 28px;
          background: #04060c;
        }
        .hp-section-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #3b82f6;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .hp-section-label::before {
          content: '';
          display: inline-block;
          width: 20px;
          height: 1px;
          background: currentColor;
        }
        .hp-section-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(30px, 4vw, 48px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.1;
          margin-bottom: 16px;
        }
        .hp-section-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 300;
          color: rgba(255,255,255,0.4);
          line-height: 1.7;
          max-width: 500px;
        }

        .hp-feature-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 32px 28px;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }
        .hp-feature-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(29,78,216,0.06) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.25s;
        }
        .hp-feature-card:hover {
          border-color: rgba(59,130,246,0.25);
          transform: translateY(-3px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(59,130,246,0.1);
        }
        .hp-feature-card:hover::before { opacity: 1; }

        .hp-feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(29,78,216,0.15);
          border: 1px solid rgba(59,130,246,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-bottom: 20px;
        }
        .hp-feature-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 10px;
          letter-spacing: 0.01em;
        }
        .hp-feature-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 300;
          color: rgba(255,255,255,0.4);
          line-height: 1.7;
        }

        /* ── Stats band ── */
        .hp-stats-band {
          padding: 72px 28px;
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: #070c18;
        }
        .hp-stat-num {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(40px, 6vw, 64px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .hp-stat-unit {
          color: #3b82f6;
        }
        .hp-stat-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          margin-top: 6px;
        }

        /* ── Inventory CTA ── */
        .hp-inventory-cta {
          padding: 96px 28px;
          background: #04060c;
          position: relative;
          overflow: hidden;
        }
        .hp-inventory-cta::before {
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(29,78,216,0.12) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .hp-cta-box {
          position: relative;
          max-width: 780px;
          margin: 0 auto;
          text-align: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 64px 48px;
        }
        .hp-cta-box::before {
          content: '';
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 60%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent);
        }

        /* ── Finance strip ── */
        .hp-finance {
          padding: 64px 28px;
          background: #070c18;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        /* Responsive */
        @media (max-width: 860px) {
          .hp-hero-inner {
            grid-template-columns: 1fr;
            gap: 40px;
            padding: 80px 20px 60px;
            text-align: center;
          }
          .hp-glass-card {
            padding: 32px 24px;
          }
          .hp-eyebrow {
            justify-content: center;
          }
          .hp-subline {
            margin-left: auto;
            margin-right: auto;
          }
          .hp-cta-row {
            justify-content: center;
          }
          .hp-hero-visual {
            height: 280px;
            order: -1;
          }
          .hp-stat-chip:nth-child(2) { display: none; }
          .hp-stat-chip:nth-child(3) { display: none; }
          .hp-cta-box { padding: 40px 24px; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════ */}
      {/* HERO                                          */}
      {/* ══════════════════════════════════════════════ */}
      <section className="hp-hero">
        <div className="hp-orb hp-orb-1" />
        <div className="hp-orb hp-orb-2" />
        <div className="hp-orb hp-orb-3" />

        <div className="hp-hero-inner">
          {/* Left — glass card with text */}
          <div className="hp-glass-card">
            <p className="hp-eyebrow">Sri Lanka&apos;s Premier Dealership</p>
            <h1 className="hp-headline">
              Drive Your<br />
              <em>Dream</em> With<br />
              Confidence
            </h1>
            <p className="hp-subline">
              Handpicked vehicles. Transparent pricing. Zero compromise.
              Discover our curated collection of premium cars — from city commuters to luxury SUVs.
            </p>
            <div className="hp-cta-row">
              <Link href="/inventory" className="hp-btn-primary">
                Browse Inventory <span>→</span>
              </Link>
              <Link href="/contact" className="hp-btn-ghost">
                Get in Touch
              </Link>
            </div>
          </div>

          {/* Right — animated car illustration */}
          <div className="hp-hero-visual">
            <div className="hp-car-glow" />

            {/* Floating stat chips */}
            <div className="hp-stat-chip" style={{ top: '8%', right: '4%' }}>
              <div className="hp-stat-chip-num">500+</div>
              <div className="hp-stat-chip-label">Cars Sold</div>
            </div>
            <div className="hp-stat-chip" style={{ bottom: '12%', left: '2%', animationDelay: '-1.5s' }}>
              <div className="hp-stat-chip-num">10+</div>
              <div className="hp-stat-chip-label">Years</div>
            </div>

            {/* Luxury car SVG illustration */}
            <svg className="hp-car-svg" viewBox="0 0 500 220" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Ground shadow */}
              <ellipse cx="250" cy="200" rx="200" ry="10" fill="rgba(29,78,216,0.2)" />

              {/* Body */}
              <path d="M60 160 L60 130 Q80 80 140 70 L200 60 Q240 50 280 55 L360 65 Q400 72 430 95 L450 130 L450 160 Z"
                fill="#0a1628" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5"/>

              {/* Roof / cabin glass */}
              <path d="M155 125 L175 80 Q200 65 240 62 L295 62 Q330 65 355 82 L375 125 Z"
                fill="rgba(59,130,246,0.15)" stroke="rgba(96,165,250,0.3)" strokeWidth="1"/>

              {/* Windshield highlight */}
              <path d="M170 120 L188 82 Q205 68 235 65 L270 65"
                stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round"/>

              {/* Hood highlight line */}
              <path d="M375 125 Q400 118 430 130"
                stroke="rgba(59,130,246,0.5)" strokeWidth="1.5" strokeLinecap="round"/>

              {/* Side body highlight */}
              <path d="M65 148 Q200 140 440 145"
                stroke="rgba(59,130,246,0.3)" strokeWidth="1" strokeLinecap="round"/>

              {/* Front grille */}
              <rect x="432" y="128" width="18" height="22" rx="2"
                fill="rgba(59,130,246,0.2)" stroke="rgba(96,165,250,0.4)" strokeWidth="1"/>
              <line x1="432" y1="135" x2="450" y2="135" stroke="rgba(96,165,250,0.4)" strokeWidth="0.8"/>
              <line x1="432" y1="141" x2="450" y2="141" stroke="rgba(96,165,250,0.4)" strokeWidth="0.8"/>
              <line x1="432" y1="147" x2="450" y2="147" stroke="rgba(96,165,250,0.4)" strokeWidth="0.8"/>

              {/* Headlight */}
              <path d="M438 118 Q446 115 452 120 L452 128 Q446 130 438 128 Z"
                fill="rgba(147,197,253,0.6)" stroke="rgba(96,165,250,0.5)" strokeWidth="0.8"/>
              {/* Headlight glow */}
              <ellipse cx="455" cy="123" rx="6" ry="4"
                fill="rgba(147,197,253,0.3)" filter="url(#blur)"/>

              {/* Tail light */}
              <rect x="58" y="118" width="10" height="22" rx="2"
                fill="rgba(239,68,68,0.4)" stroke="rgba(239,68,68,0.3)" strokeWidth="0.8"/>

              {/* Front wheel */}
              <circle cx="370" cy="168" r="30" fill="#070c18" stroke="rgba(59,130,246,0.4)" strokeWidth="2"/>
              <circle cx="370" cy="168" r="20" fill="#0a1628" stroke="rgba(59,130,246,0.25)" strokeWidth="1.5"/>
              <circle cx="370" cy="168" r="10" fill="#060911" stroke="rgba(96,165,250,0.3)" strokeWidth="1"/>
              {/* Spokes */}
              {[0,60,120,180,240,300].map((angle, i) => (
                <line key={i}
                  x1={370 + 11 * Math.cos(angle * Math.PI/180)}
                  y1={168 + 11 * Math.sin(angle * Math.PI/180)}
                  x2={370 + 19 * Math.cos(angle * Math.PI/180)}
                  y2={168 + 19 * Math.sin(angle * Math.PI/180)}
                  stroke="rgba(96,165,250,0.5)" strokeWidth="1.5"/>
              ))}

              {/* Rear wheel */}
              <circle cx="140" cy="168" r="30" fill="#070c18" stroke="rgba(59,130,246,0.4)" strokeWidth="2"/>
              <circle cx="140" cy="168" r="20" fill="#0a1628" stroke="rgba(59,130,246,0.25)" strokeWidth="1.5"/>
              <circle cx="140" cy="168" r="10" fill="#060911" stroke="rgba(96,165,250,0.3)" strokeWidth="1"/>
              {[0,60,120,180,240,300].map((angle, i) => (
                <line key={i}
                  x1={140 + 11 * Math.cos(angle * Math.PI/180)}
                  y1={168 + 11 * Math.sin(angle * Math.PI/180)}
                  x2={140 + 19 * Math.cos(angle * Math.PI/180)}
                  y2={168 + 19 * Math.sin(angle * Math.PI/180)}
                  stroke="rgba(96,165,250,0.5)" strokeWidth="1.5"/>
              ))}

              {/* Door lines */}
              <line x1="260" y1="68" x2="258" y2="158" stroke="rgba(59,130,246,0.2)" strokeWidth="1"/>
              <line x1="340" y1="72" x2="338" y2="155" stroke="rgba(59,130,246,0.15)" strokeWidth="0.8"/>

              {/* Door handle */}
              <rect x="295" y="118" width="18" height="4" rx="2"
                fill="rgba(96,165,250,0.4)"/>

              <defs>
                <filter id="blur"><feGaussianBlur stdDeviation="3"/></filter>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* MARQUEE STRIP                                  */}
      {/* ══════════════════════════════════════════════ */}
      <div className="hp-marquee-strip">
        <div className="hp-marquee-track">
          {Array.from({ length: 2 }).map((_, trackIdx) => (
            ['Premium Selection', 'Transparent Pricing', 'Finance Available', 'Trade-In Welcome',
             'Fully Inspected', 'Test Drive Anytime', 'Trusted Since 2014', 'Island-Wide Delivery'].map((item, i) => (
              <span key={`${trackIdx}-${i}`} className="hp-marquee-item">
                {item}
                <span className="hp-marquee-dot" />
              </span>
            ))
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* WHY CHOOSE US                                  */}
      {/* ══════════════════════════════════════════════ */}
      <section className="hp-why">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 56 }}>
            <p className="hp-section-label">Why Choose Us</p>
            <h2 className="hp-section-title">
              The Standard You<br />Deserve
            </h2>
            <p className="hp-section-sub">
              We built {DEALERSHIP.name} around one idea: buying a car should feel
              as good as driving one.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              {
                icon: '🛡️',
                title: 'Fully Inspected',
                desc: 'Every vehicle undergoes a rigorous multi-point inspection before it reaches our lot. No hidden surprises.',
              },
              {
                icon: '💎',
                title: 'Transparent Pricing',
                desc: 'The price you see is the price we discuss. No inflated stickers, no pressure tactics, ever.',
              },
              {
                icon: '🏦',
                title: 'Finance Made Easy',
                desc: 'Partner banks and leasing companies on standby. We handle the paperwork so you can focus on the drive.',
              },
              {
                icon: '🔄',
                title: 'Trade-In Welcome',
                desc: 'Bring your current vehicle. We offer fair market valuations with no obligation to buy.',
              },
            ].map(f => (
              <div key={f.title} className="hp-feature-card">
                <div className="hp-feature-icon">{f.icon}</div>
                <h3 className="hp-feature-title">{f.title}</h3>
                <p className="hp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* STATS BAND                                     */}
      {/* ══════════════════════════════════════════════ */}
      <section className="hp-stats-band">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 40, textAlign: 'center' }}>
            {[
              { num: '500', unit: '+', label: 'Vehicles Sold'    },
              { num: '10',  unit: '+', label: 'Years in Business' },
              { num: '98',  unit: '%', label: 'Customer Satisfaction' },
              { num: '5',   unit: '+', label: 'Finance Partners'  },
            ].map(s => (
              <div key={s.label}>
                <div className="hp-stat-num">
                  {s.num}<span className="hp-stat-unit">{s.unit}</span>
                </div>
                <div className="hp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* INVENTORY CTA                                  */}
      {/* ══════════════════════════════════════════════ */}
      <section className="hp-inventory-cta">
        <div className="hp-cta-box">
          <p className="hp-section-label" style={{ justifyContent: 'center' }}>Browse Our Stock</p>
          <h2 className="hp-section-title" style={{ marginBottom: 16 }}>
            Find Your Perfect<br />
            <em style={{ color: '#60a5fa', fontStyle: 'italic' }}>Match Today</em>
          </h2>
          <p style={{
            fontFamily:  "'DM Sans', sans-serif",
            fontSize:    15,
            fontWeight:  300,
            color:       'rgba(255,255,255,0.4)',
            lineHeight:  1.7,
            marginBottom: 36,
          }}>
            From compact city cars to executive saloons — browse our full inventory
            with real-time availability, full specs, and honest pricing.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/inventory" className="hp-btn-primary">
              View All Vehicles <span>→</span>
            </Link>
            <a
              href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hp-btn-ghost"
            >
              💬 Ask on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* FINANCE / CONTACT STRIP                        */}
      {/* ══════════════════════════════════════════════ */}
      <section className="hp-finance">
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {/* Finance */}
          <div style={{
            background:   'rgba(29,78,216,0.08)',
            border:       '1px solid rgba(29,78,216,0.2)',
            borderRadius: 14,
            padding:      '32px 28px',
          }}>
            <div style={{ fontSize: 28, marginBottom: 16 }}>🏦</div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 10 }}>
              Finance Options
            </h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 300, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 18 }}>
              Low down payments. Competitive rates. We work with 5+ banks and leasing companies to find the deal that works for you.
            </p>
            <Link href="/contact?subject=Finance Enquiry" className="hp-btn-ghost" style={{ fontSize: 12, padding: '10px 18px' }}>
              Enquire Now →
            </Link>
          </div>

          {/* Visit */}
          <div style={{
            background:   'rgba(255,255,255,0.025)',
            border:       '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding:      '32px 28px',
          }}>
            <div style={{ fontSize: 28, marginBottom: 16 }}>📍</div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 10 }}>
              Visit Us
            </h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 300, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 18 }}>
              {DEALERSHIP.address}<br />
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>{DEALERSHIP.workingHours}</span>
            </p>
            <a
              href={`tel:${DEALERSHIP.phone}`}
              className="hp-btn-ghost"
              style={{ fontSize: 12, padding: '10px 18px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              📞 {DEALERSHIP.phone}
            </a>
          </div>

          {/* Trade-in */}
          <div style={{
            background:   'rgba(255,255,255,0.025)',
            border:       '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding:      '32px 28px',
          }}>
            <div style={{ fontSize: 28, marginBottom: 16 }}>🔄</div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 10 }}>
              Trade-In Your Car
            </h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 300, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 18 }}>
              Get a fair valuation for your current vehicle and use it toward the purchase of your next one. Quick. Hassle-free.
            </p>
            <Link href="/contact?subject=Trade-In Valuation" className="hp-btn-ghost" style={{ fontSize: 12, padding: '10px 18px' }}>
              Get a Quote →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}