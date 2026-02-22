'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicVehicleDetail } from '@/lib/api';
import {
  formatPrice, formatMileage, formatCondition,
  formatTransmission, formatFuelType, formatLabel, formatMonthYear,
} from '@/lib/formatters';
import { DEALERSHIP } from '@/lib/constants';

const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWEyMjM1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWkiIGZvbnQtc2l6ZT0iNjAiPvCfkLY8L3RleHQ+PC9zdmc+';

const CONDITION_COLORS: Record<string, string> = {
  brand_new:     '#10b981',
  reconditioned: '#0ea5e9',
  used:          '#f59e0b',
};

interface Props { vehicle: PublicVehicleDetail }

export default function VehicleDetailClient({ vehicle }: Props) {
  const allPhotos = vehicle.photos.length > 0
    ? vehicle.photos
    : [{ id: 'placeholder', file_url: PLACEHOLDER, file_name: 'No image', is_main_image: true, sort_order: 0 }];

  const [activeIdx, setActiveIdx] = useState(0);
  const activePhoto = allPhotos[activeIdx];

  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.variant ? ' ' + vehicle.variant : ''}`;
  const waMessage = encodeURIComponent(
    `Hi, I'm interested in the ${title} (Stock: ${vehicle.stock_id}) listed at ${formatPrice(vehicle.asking_price)}. Is it still available?`
  );

  const specs: Array<{ label: string; value: string }> = [
    { label: 'Stock ID',      value: vehicle.stock_id },
    { label: 'Condition',     value: formatCondition(vehicle.condition) },
    { label: 'Year',          value: String(vehicle.year) },
    { label: 'Mileage',       value: formatMileage(vehicle.mileage) },
    { label: 'Fuel Type',     value: formatFuelType(vehicle.fuel_type) },
    { label: 'Transmission',  value: formatTransmission(vehicle.transmission) },
    { label: 'Body Type',     value: formatLabel(vehicle.body_type) },
    { label: 'Color',         value: vehicle.color },
    { label: 'Location',      value: vehicle.location },
    ...(vehicle.engine_capacity ? [{ label: 'Engine',    value: vehicle.engine_capacity }] : []),
    ...(vehicle.registration_number ? [{ label: 'Reg. No.',  value: vehicle.registration_number }] : []),
    { label: 'Listed',        value: formatMonthYear(vehicle.created_at) },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 24, fontSize: 13, color: '#5c7090' }}>
        <Link href="/"         style={{ color: '#5c7090', textDecoration: 'none' }}>Home</Link>
        <span>/</span>
        <Link href="/inventory" style={{ color: '#5c7090', textDecoration: 'none' }}>Inventory</Link>
        <span>/</span>
        <span style={{ color: '#8097b8' }}>{title}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 32, alignItems: 'start' }}>

        {/* ── LEFT: Gallery ─────────────────────────────────── */}
        <div>
          {/* Main image */}
          <div style={{ position: 'relative', height: 420, background: '#0d1117', borderRadius: 14, overflow: 'hidden', marginBottom: 12, border: '1px solid #1f2d45' }}>
            <Image
              src={activePhoto?.file_url ?? PLACEHOLDER}
              alt={title}
              fill
              style={{ objectFit: 'cover' }}
              priority
              unoptimized={!activePhoto?.file_url || activePhoto.file_url === PLACEHOLDER}
            />
            {/* Condition badge */}
            <div style={{
              position: 'absolute', top: 14, left: 14,
              background: CONDITION_COLORS[vehicle.condition] ?? '#5c7090',
              color: '#fff', fontSize: 11, fontWeight: 700,
              padding: '4px 10px', borderRadius: 20, letterSpacing: '0.05em',
            }}>
              {formatCondition(vehicle.condition).toUpperCase()}
            </div>
            {/* Photo counter */}
            {allPhotos.length > 1 && (
              <div style={{
                position: 'absolute', bottom: 14, right: 14,
                background: 'rgba(0,0,0,0.7)', color: '#fff',
                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
              }}>
                {activeIdx + 1} / {allPhotos.length}
              </div>
            )}
            {/* Nav arrows */}
            {allPhotos.length > 1 && (
              <>
                <button
                  onClick={() => setActiveIdx(i => (i - 1 + allPhotos.length) % allPhotos.length)}
                  style={arrowStyle('left')}
                  aria-label="Previous photo"
                >‹</button>
                <button
                  onClick={() => setActiveIdx(i => (i + 1) % allPhotos.length)}
                  style={arrowStyle('right')}
                  aria-label="Next photo"
                >›</button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {allPhotos.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allPhotos.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={() => setActiveIdx(idx)}
                  style={{
                    width: 72, height: 56,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: `2px solid ${idx === activeIdx ? '#6366f1' : '#1f2d45'}`,
                    background: '#0d1117',
                    cursor: 'pointer',
                    padding: 0,
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <Image src={photo.file_url} alt={`Photo ${idx + 1}`} fill style={{ objectFit: 'cover' }} unoptimized />
                </button>
              ))}
            </div>
          )}

          {/* Specs table */}
          <div style={{ marginTop: 28, background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f2d45' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Vehicle Specifications</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {specs.map((spec, i) => (
                <div key={spec.label} style={{
                  padding: '12px 20px',
                  borderBottom: i < specs.length - 2 ? '1px solid #111827' : 'none',
                  borderRight: i % 2 === 0 ? '1px solid #111827' : 'none',
                }}>
                  <div style={{ fontSize: 11, color: '#5c7090', marginBottom: 3, fontWeight: 600 }}>{spec.label}</div>
                  <div style={{ fontSize: 13, color: '#dde4f0', fontWeight: 500 }}>{spec.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Info + CTA ──────────────────────────────── */}
        <div style={{ position: 'sticky', top: 80 }}>
          {/* Title & price */}
          <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 14, padding: '24px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#5c7090', fontWeight: 600, marginBottom: 4 }}>{vehicle.stock_id}</div>
            <h1 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 900, color: '#fff', margin: '0 0 6px', lineHeight: 1.2 }}>
              {title}
            </h1>
            <div style={{ fontSize: 13, color: '#5c7090', marginBottom: 20 }}>
              📍 {vehicle.location}
            </div>

            {/* Quick spec pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              {[
                { icon: '⚙️', val: formatTransmission(vehicle.transmission) },
                { icon: '⛽', val: formatFuelType(vehicle.fuel_type)        },
                { icon: '📍', val: formatMileage(vehicle.mileage)           },
              ].map(p => (
                <div key={p.val} style={{
                  background: '#111827', border: '1px solid #1f2d45',
                  borderRadius: 8, padding: '5px 10px',
                  fontSize: 11, color: '#8097b8',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {p.icon} {p.val}
                </div>
              ))}
            </div>

            {/* Price */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#5c7090', marginBottom: 4, fontWeight: 600 }}>ASKING PRICE</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#6366f1', lineHeight: 1 }}>
                {formatPrice(vehicle.asking_price)}
              </div>
              <div style={{ fontSize: 11, color: '#5c7090', marginTop: 4 }}>Negotiable · Finance available</div>
            </div>

            {/* CTA buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={`https://wa.me/${DEALERSHIP.whatsapp.replace(/\D/g, '')}?text=${waMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: '#25D366', color: '#fff',
                  padding: '13px 20px', borderRadius: 10,
                  fontSize: 14, fontWeight: 700, textDecoration: 'none',
                }}
              >
                💬 Enquire on WhatsApp
              </a>
              <a
                href={`tel:${DEALERSHIP.phone}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                  color: '#818cf8',
                  padding: '12px 20px', borderRadius: 10,
                  fontSize: 14, fontWeight: 700, textDecoration: 'none',
                }}
              >
                📞 Call Us
              </a>
              <Link
                href={`/contact?vehicle_ref=${vehicle.stock_id}&subject=Vehicle Enquiry`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid #1f2d45',
                  color: '#8097b8',
                  padding: '12px 20px', borderRadius: 10,
                  fontSize: 14, fontWeight: 700, textDecoration: 'none',
                }}
              >
                ✉️ Send Enquiry Form
              </Link>
            </div>
          </div>

          {/* Dealer info box */}
          <div style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5c7090', marginBottom: 12, letterSpacing: '0.08em' }}>
              SOLD BY
            </div>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: 15, marginBottom: 4 }}>{DEALERSHIP.name}</div>
            <div style={{ fontSize: 12, color: '#5c7090', lineHeight: 1.8 }}>
              <div>📍 {DEALERSHIP.address}</div>
              <div>🕐 {DEALERSHIP.workingHours}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: responsive stack */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: minmax(0,1.6fr)"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="position: sticky"] {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}

function arrowStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position:   'absolute',
    top:        '50%',
    [side]:     12,
    transform:  'translateY(-50%)',
    background: 'rgba(0,0,0,0.6)',
    border:     'none',
    borderRadius: '50%',
    width:      40,
    height:     40,
    fontSize:   22,
    color:      '#fff',
    cursor:     'pointer',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex:     2,
  };
}
