'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { publicApi } from '@/lib/api';
import { DEALERSHIP, CONTACT_SUBJECTS } from '@/lib/constants';

function ContactForm() {
  const searchParams = useSearchParams();
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
      await publicApi.submitContact({ name, phone, email: email || undefined, subject, message, vehicle_ref: vehicleRef || undefined });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send. Please try WhatsApp or call us directly.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Message Sent!</h2>
        <p style={{ fontSize: 15, color: '#5c7090', margin: '0 0 24px', lineHeight: 1.6 }}>
          Thank you, {name}! We&apos;ll get back to you as soon as possible, usually within a few hours.
        </p>
        <a
          href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
        >
          💬 Chat on WhatsApp for faster response
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Full Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Your name" style={inputStyle} disabled={loading} />
        </div>
        <div>
          <label style={labelStyle}>Phone Number *</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+94 77 000 0000" style={inputStyle} disabled={loading} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Email Address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional" style={inputStyle} disabled={loading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Subject *</label>
          <div style={{ position: 'relative' }}>
            <select value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, paddingRight: 28, appearance: 'none' }} disabled={loading}>
              {CONTACT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#5c7090', pointerEvents: 'none' }}>▼</span>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Vehicle Reference</label>
          <input type="text" value={vehicleRef} onChange={e => setVehicleRef(e.target.value)} placeholder="e.g. STK-2024-001" style={inputStyle} disabled={loading} />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Message *</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          placeholder="Tell us what you're looking for, any specific requirements, or any questions you have…"
          rows={5}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !name || !phone || !message}
        style={{
          width: '100%', background: (loading || !name || !phone || !message) ? '#1f2d45' : '#6366f1',
          color: (loading || !name || !phone || !message) ? '#3a4e6a' : '#fff',
          border: 'none', borderRadius: 10, padding: '13px 20px',
          fontSize: 15, fontWeight: 700, cursor: (loading || !name || !phone || !message) ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Sending…' : 'Send Message →'}
      </button>

      <p style={{ fontSize: 11, color: '#3a4e6a', marginTop: 12, textAlign: 'center' }}>
        We typically respond within a few hours during business hours.
      </p>

      <style>{`
        @media (max-width: 600px) {
          form > div[style*="gridTemplateColumns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </form>
  );
}

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section style={{ padding: '72px 24px 48px', background: 'linear-gradient(180deg, #0d1117 0%, #07090f 100%)', borderBottom: '1px solid #1f2d45' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5c7090', marginBottom: 10 }}>Get in Touch</div>
          <h1 style={{ fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', lineHeight: 1.1 }}>
            We&apos;d Love to Hear From You
          </h1>
          <p style={{ fontSize: 16, color: '#5c7090', lineHeight: 1.7, margin: 0 }}>
            Whether you have a question about a specific vehicle, want to book a test drive, or need finance advice — our team is ready to help.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, alignItems: 'start' }}>

          {/* Contact form */}
          <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 16, padding: '32px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 24px' }}>Send Us a Message</h2>
            <Suspense>
              <ContactForm />
            </Suspense>
          </div>

          {/* Contact info + map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* WhatsApp CTA */}
            <a
              href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)',
                borderRadius: 12, padding: '20px 22px', textDecoration: 'none',
              }}
            >
              <div style={{ fontSize: 32 }}>💬</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#25D366', marginBottom: 2 }}>Chat on WhatsApp</div>
                <div style={{ fontSize: 13, color: '#5c7090' }}>Get an instant response — fastest way to reach us</div>
              </div>
            </a>

            {/* Info cards */}
            <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 12, padding: '22px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 18px' }}>Contact Information</h3>
              {[
                { icon: '📞', label: 'Phone',   value: DEALERSHIP.phone,   href: `tel:${DEALERSHIP.phone}` },
                { icon: '✉️', label: 'Email',   value: DEALERSHIP.email,   href: `mailto:${DEALERSHIP.email}` },
                { icon: '📍', label: 'Address', value: DEALERSHIP.address,  href: undefined },
                { icon: '🕐', label: 'Hours',   value: DEALERSHIP.workingHours, href: undefined },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                  <span style={{ fontSize: 18, lineHeight: 1.4 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: '#5c7090', fontWeight: 600, marginBottom: 2 }}>{item.label}</div>
                    {item.href ? (
                      <a href={item.href} style={{ fontSize: 13, color: '#8097b8', textDecoration: 'none' }}>{item.value}</a>
                    ) : (
                      <div style={{ fontSize: 13, color: '#8097b8' }}>{item.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Map embed */}
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #1f2d45' }}>
              <iframe
                src={DEALERSHIP.mapEmbedUrl}
                width="100%"
                height="240"
                style={{ border: 0, display: 'block' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Dealership Location"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#8097b8', marginBottom: 6, letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#07090f', border: '1px solid #1f2d45',
  borderRadius: 8, padding: '9px 13px', fontSize: 13,
  color: '#dde4f0', outline: 'none', boxSizing: 'border-box',
};
