'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { publicApi } from '@/lib/api';
import { DEALERSHIP, CONTACT_SUBJECTS } from '@/lib/constants';

/* ── Shared styles injected once ── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

  .cp-eyebrow {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #3b82f6;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
  }
  .cp-eyebrow::before {
    content: '';
    width: 20px; height: 1px;
    background: #3b82f6;
    display: inline-block;
  }

  .cp-label {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.35);
    display: block;
    margin-bottom: 8px;
  }

  .cp-input {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 8px;
    padding: 12px 16px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 400;
    color: #e8eef8;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
    appearance: none;
  }
  .cp-input::placeholder { color: rgba(255,255,255,0.18); }
  .cp-input:focus {
    border-color: rgba(59,130,246,0.5);
    background: rgba(59,130,246,0.04);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.08);
  }
  .cp-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .cp-input[type='date']::-webkit-calendar-picker-indicator { filter: invert(0.4); }

  .cp-submit {
    width: 100%;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 14px 24px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: all 0.22s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .cp-submit:not(:disabled) {
    background: #1d4ed8;
    color: #ffffff;
  }
  .cp-submit:not(:disabled):hover {
    background: #2563eb;
    box-shadow: 0 8px 28px rgba(29,78,216,0.45);
    transform: translateY(-1px);
  }
  .cp-submit:disabled {
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.2);
    cursor: not-allowed;
  }

  .cp-wa-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 20px 24px;
    border-radius: 12px;
    background: rgba(37,211,102,0.07);
    border: 1px solid rgba(37,211,102,0.2);
    text-decoration: none;
    transition: all 0.22s ease;
  }
  .cp-wa-btn:hover {
    background: rgba(37,211,102,0.12);
    border-color: rgba(37,211,102,0.4);
    transform: translateY(-2px);
  }

  .cp-info-row {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 16px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .cp-info-row:last-child { border-bottom: none; }

  .cp-info-icon {
    width: 36px; height: 36px;
    border-radius: 8px;
    background: rgba(29,78,216,0.1);
    border: 1px solid rgba(29,78,216,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  @media (max-width: 600px) {
    .cp-two-col { grid-template-columns: 1fr !important; }
  }
`;

/* ── Contact form component ── */
function ContactForm() {
  const searchParams   = useSearchParams();
  const prefillRef     = searchParams.get('vehicle_ref') ?? '';
  const prefillSubject = searchParams.get('subject') ?? '';

  const [name,       setName]       = useState('');
  const [phone,      setPhone]      = useState('');
  const [email,      setEmail]      = useState('');
  const [subject,    setSubject]    = useState(prefillSubject || 'General Enquiry');
  const [message,    setMessage]    = useState('');
  const [vehicleRef, setVehicleRef] = useState(prefillRef);
  const [loading,    setLoading]    = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await publicApi.submitContact({
        name, phone,
        email:       email || undefined,
        subject,
        message,
        vehicle_ref: vehicleRef || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send. Please try WhatsApp or call us directly.');
    } finally {
      setLoading(false);
    }
  }

  /* Success state */
  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 16px' }}>
        {/* Animated checkmark */}
        <div style={{
          width:        72, height: 72,
          borderRadius: '50%',
          background:   'rgba(29,78,216,0.12)',
          border:       '1px solid rgba(29,78,216,0.3)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontSize:     32,
          margin:       '0 auto 24px',
          boxShadow:    '0 0 40px rgba(29,78,216,0.2)',
        }}>
          ✓
        </div>
        <h3 style={{
          fontFamily:  "'Cormorant Garamond', Georgia, serif",
          fontSize:    28,
          fontWeight:  700,
          color:       '#ffffff',
          marginBottom: 12,
        }}>
          Message Received
        </h3>
        <p style={{
          fontFamily:  "'DM Sans', sans-serif",
          fontSize:    14,
          fontWeight:  300,
          color:       'rgba(255,255,255,0.45)',
          lineHeight:  1.7,
          marginBottom: 28,
        }}>
          Thank you, {name}. We&apos;ll be in touch within a few hours.
          For a faster response, reach us directly on WhatsApp.
        </p>
        <a
          href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            8,
            background:     '#25D366',
            color:          '#fff',
            padding:        '12px 22px',
            borderRadius:   8,
            fontFamily:     "'DM Sans', sans-serif",
            fontSize:       13,
            fontWeight:     600,
            letterSpacing:  '0.04em',
            textDecoration: 'none',
          }}
        >
          💬 Chat on WhatsApp
        </a>
      </div>
    );
  }

  const canSubmit = !loading && name.trim() && phone.trim() && message.trim();

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && (
        <div style={{
          background:   'rgba(239,68,68,0.08)',
          border:       '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8,
          padding:      '12px 16px',
          fontFamily:   "'DM Sans', sans-serif",
          fontSize:     13,
          color:        '#fca5a5',
        }}>
          {error}
        </div>
      )}

      {/* Name + Phone */}
      <div className="cp-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label className="cp-label">Full Name *</label>
          <input className="cp-input" type="text" value={name} onChange={e => setName(e.target.value)}
            required placeholder="Your full name" disabled={loading} />
        </div>
        <div>
          <label className="cp-label">Phone *</label>
          <input className="cp-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            required placeholder="+94 77 000 0000" disabled={loading} />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="cp-label">Email Address <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
        <input className="cp-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com" disabled={loading} />
      </div>

      {/* Subject + Vehicle Ref */}
      <div className="cp-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label className="cp-label">Subject *</label>
          <div style={{ position: 'relative' }}>
            <select className="cp-input" value={subject} onChange={e => setSubject(e.target.value)}
              style={{ paddingRight: 32, cursor: 'pointer' }} disabled={loading}>
              {CONTACT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>▼</span>
          </div>
        </div>
        <div>
          <label className="cp-label">Vehicle Reference <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <input className="cp-input" type="text" value={vehicleRef} onChange={e => setVehicleRef(e.target.value)}
            placeholder="e.g. STK-2024-001" disabled={loading} />
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="cp-label">Message *</label>
        <textarea
          className="cp-input"
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          rows={5}
          placeholder="Tell us what you're looking for, any specific requirements, or any questions you have…"
          disabled={loading}
          style={{ resize: 'vertical', minHeight: 130, lineHeight: 1.65 }}
        />
      </div>

      <button type="submit" disabled={!canSubmit} className="cp-submit">
        {loading ? 'Sending…' : <><span>Send Message</span><span>→</span></>}
      </button>

      <p style={{
        fontFamily:  "'DM Sans', sans-serif",
        fontSize:    11,
        color:       'rgba(255,255,255,0.2)',
        textAlign:   'center',
        letterSpacing: '0.04em',
      }}>
        We typically respond within a few hours during business hours.
      </p>
    </form>
  );
}

/* ── Page ── */
export default function ContactPage() {
  return (
    <>
      <style>{STYLES}</style>

      {/* ══════════════════════════════════════════════ */}
      {/* HERO                                          */}
      {/* ══════════════════════════════════════════════ */}
      <section style={{
        position:   'relative',
        padding:    '100px 28px 80px',
        background: '#04060c',
        overflow:   'hidden',
      }}>
        {/* Orb */}
        <div style={{
          position:     'absolute',
          width: 500, height: 500,
          borderRadius: '50%',
          background:   'radial-gradient(circle, rgba(29,78,216,0.15) 0%, transparent 65%)',
          top: -100, left: '60%',
          transform:    'translateX(-30%)',
          pointerEvents: 'none',
        }} />
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p className="cp-eyebrow">Get in Touch</p>
          <h1 style={{
            fontFamily:   "'Cormorant Garamond', Georgia, serif",
            fontSize:     'clamp(42px, 6vw, 72px)',
            fontWeight:   700,
            color:        '#ffffff',
            lineHeight:   1.05,
            letterSpacing: '-0.02em',
            marginBottom: 22,
          }}>
            We&apos;d Love to<br />
            <em style={{ fontStyle: 'italic', color: '#60a5fa' }}>Hear From You</em>
          </h1>
          <p style={{
            fontFamily:  "'DM Sans', sans-serif",
            fontSize:    17,
            fontWeight:  300,
            color:       'rgba(255,255,255,0.4)',
            lineHeight:  1.75,
            maxWidth:    500,
          }}>
            Questions about a vehicle, a test drive, finance options, or a trade-in — our team is here and ready to help.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                   */}
      {/* ══════════════════════════════════════════════ */}
      <section style={{ background: '#04060c', padding: '0 28px 96px' }}>
        <div style={{
          maxWidth: 1280,
          margin:   '0 auto',
          display:  'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
          gap:      40,
          alignItems: 'start',
        }}>

          {/* ── LEFT: Form ── */}
          <div style={{
            background:   'rgba(255,255,255,0.025)',
            border:       '1px solid rgba(255,255,255,0.08)',
            borderRadius: 18,
            padding:      '40px 40px',
            position:     'relative',
            overflow:     'hidden',
          }}>
            {/* Top edge glow line */}
            <div style={{
              position:   'absolute',
              top: 0, left: '20%', right: '20%',
              height:     1,
              background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)',
            }} />

            <h2 style={{
              fontFamily:   "'Cormorant Garamond', Georgia, serif",
              fontSize:     26,
              fontWeight:   700,
              color:        '#ffffff',
              marginBottom: 28,
              letterSpacing: '-0.01em',
            }}>
              Send Us a Message
            </h2>

            <Suspense fallback={
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.3)', padding: '40px 0', textAlign: 'center' }}>
                Loading form…
              </div>
            }>
              <ContactForm />
            </Suspense>
          </div>

          {/* ── RIGHT: Info ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>

            {/* WhatsApp CTA */}
            <a
              href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cp-wa-btn"
            >
              <div style={{
                width: 48, height: 48,
                borderRadius: 12,
                background: 'rgba(37,211,102,0.15)',
                border: '1px solid rgba(37,211,102,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                💬
              </div>
              <div>
                <div style={{
                  fontFamily:   "'DM Sans', sans-serif",
                  fontSize:     15,
                  fontWeight:   600,
                  color:        '#25D366',
                  marginBottom: 3,
                }}>
                  Chat on WhatsApp
                </div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize:   13,
                  fontWeight: 300,
                  color:      'rgba(255,255,255,0.35)',
                }}>
                  Fastest response — usually within minutes
                </div>
              </div>
            </a>

            {/* Contact info card */}
            <div style={{
              background:   'rgba(255,255,255,0.025)',
              border:       '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding:      '28px 28px',
            }}>
              <h3 style={{
                fontFamily:   "'Cormorant Garamond', Georgia, serif",
                fontSize:     18,
                fontWeight:   700,
                color:        '#ffffff',
                marginBottom: 20,
                letterSpacing: '0.01em',
              }}>
                Contact Details
              </h3>

              {[
                { icon: '📞', label: 'Phone',         value: DEALERSHIP.phone,        href: `tel:${DEALERSHIP.phone}` },
                { icon: '✉️', label: 'Email',         value: DEALERSHIP.email,        href: `mailto:${DEALERSHIP.email}` },
                { icon: '📍', label: 'Address',       value: DEALERSHIP.address,      href: undefined },
                { icon: '🕐', label: 'Working Hours', value: DEALERSHIP.workingHours, href: undefined },
              ].map(item => (
                <div key={item.label} className="cp-info-row">
                  <div className="cp-info-icon">{item.icon}</div>
                  <div>
                    <div style={{
                      fontFamily:    "'DM Sans', sans-serif",
                      fontSize:      10,
                      fontWeight:    600,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color:         'rgba(255,255,255,0.25)',
                      marginBottom:  4,
                    }}>
                      {item.label}
                    </div>
                    {item.href ? (
                      <a href={item.href} style={{
                        fontFamily:     "'DM Sans', sans-serif",
                        fontSize:       14,
                        fontWeight:     400,
                        color:          '#8097b8',
                        textDecoration: 'none',
                        transition:     'color 0.18s',
                      }}>
                        {item.value}
                      </a>
                    ) : (
                      <div style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize:   14,
                        fontWeight: 300,
                        color:      'rgba(255,255,255,0.45)',
                        lineHeight: 1.5,
                      }}>
                        {item.value}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Map embed */}
            <div style={{
              borderRadius: 14,
              overflow:     'hidden',
              border:       '1px solid rgba(255,255,255,0.08)',
              position:     'relative',
            }}>
              <iframe
                src={DEALERSHIP.mapEmbedUrl}
                width="100%"
                height="220"
                style={{ border: 0, display: 'block', filter: 'grayscale(0.3) brightness(0.85) contrast(1.1)' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Dealership Location"
              />
            </div>

            {/* Quick links */}
            <div style={{
              display:             'grid',
              gridTemplateColumns: '1fr 1fr',
              gap:                 10,
            }}>
              {[
                { label: 'Browse Inventory', href: '/inventory',                emoji: '🚗' },
                { label: 'About Us',         href: '/about',                    emoji: '🏢' },
                { label: 'Finance Options',  href: '/contact?subject=Finance+Enquiry', emoji: '🏦' },
                { label: 'Book Test Drive',  href: '/contact?subject=Book+a+Test+Drive', emoji: '🔑' },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            8,
                    padding:        '12px 14px',
                    borderRadius:   10,
                    background:     'rgba(255,255,255,0.025)',
                    border:         '1px solid rgba(255,255,255,0.07)',
                    textDecoration: 'none',
                    fontFamily:     "'DM Sans', sans-serif",
                    fontSize:       12,
                    fontWeight:     500,
                    color:          'rgba(255,255,255,0.45)',
                    transition:     'all 0.18s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.25)';
                    (e.currentTarget as HTMLElement).style.color = '#ffffff';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(29,78,216,0.07)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)';
                  }}
                >
                  <span>{link.emoji}</span>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Responsive grid */}
        <style>{`
          @media (max-width: 900px) {
            section > div[style*="gridTemplateColumns: minmax"] {
              grid-template-columns: 1fr !important;
            }
            div[style*="padding: '40px 40px'"] {
              padding: 28px 20px !important;
            }
          }
        `}</style>
      </section>
    </>
  );
}