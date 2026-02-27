import Link from 'next/link';
import Image from 'next/image';
import type { PublicVehicle } from '@/lib/api';
import { formatPrice, formatMileage, formatCondition, formatTransmission, formatFuelType } from '@/lib/formatters';

interface VehicleCardProps {
  vehicle: PublicVehicle;
}

const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWEyMjM1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWkiIGZvbnQtc2l6ZT0iNDAiPvCfkLY8L3RleHQ+PC9zdmc+';

const CONDITION_COLORS: Record<string, string> = {
  brand_new:     '#10b981',
  reconditioned: '#0ea5e9',
  used:          '#f59e0b',
};

const FUEL_ICONS: Record<string, string> = {
  petrol:   '⛽',
  diesel:   '🛢️',
  hybrid:   '🔋',
  electric: '⚡',
};

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  return (
    <Link href={`/inventory/${vehicle.id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background:   '#0d1117',
          border:       '1px solid #1f2d45',
          borderRadius: 14,
          overflow:     'hidden',
          transition:   'border-color 0.2s, transform 0.2s',
          cursor:       'pointer',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = '#253550';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = '#1f2d45';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative', height: 200, background: '#111827', overflow: 'hidden' }}>
          <Image
            src={vehicle.main_image_url ?? PLACEHOLDER}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            fill
            style={{ objectFit: 'cover' }}
            unoptimized={!vehicle.main_image_url}
          />

          {/* Condition badge */}
          <div style={{
            position:   'absolute',
            top:        10,
            left:       10,
            background: CONDITION_COLORS[vehicle.condition] ?? '#5c7090',
            color:      '#fff',
            fontSize:   10,
            fontWeight: 700,
            padding:    '3px 8px',
            borderRadius: 20,
            letterSpacing: '0.05em',
          }}>
            {formatCondition(vehicle.condition).toUpperCase()}
          </div>


        </div>

        {/* Info */}
        <div style={{ padding: '16px 18px' }}>
          {/* Title */}
          <h3 style={{
            fontSize:    16,
            fontWeight:  800,
            color:       '#fff',
            margin:      '0 0 4px',
            lineHeight:  1.3,
          }}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          {vehicle.variant && (
            <p style={{ fontSize: 12, color: '#5c7090', margin: '0 0 12px' }}>
              {vehicle.variant}
            </p>
          )}

          {/* Specs row */}
          <div style={{
            display:   'flex',
            gap:       12,
            flexWrap:  'wrap',
            marginBottom: 14,
          }}>
            {[
              { icon: FUEL_ICONS[vehicle.fuel_type] ?? '⛽', label: formatFuelType(vehicle.fuel_type) },
              { icon: '⚙️', label: formatTransmission(vehicle.transmission) },
              { icon: '📍', label: formatMileage(vehicle.mileage) },
            ].map(spec => (
              <div key={spec.label} style={{
                fontSize: 11,
                color:    '#8097b8',
                display:  'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <span>{spec.icon}</span>
                <span>{spec.label}</span>
              </div>
            ))}
          </div>

          {/* Price + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: '#5c7090', marginBottom: 2 }}>Asking Price</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#6366f1' }}>
                {formatPrice(vehicle.asking_price)}
              </div>
            </div>
            <div style={{
              background:   'rgba(99,102,241,0.15)',
              border:       '1px solid rgba(99,102,241,0.3)',
              borderRadius: 8,
              padding:      '6px 14px',
              fontSize:     12,
              fontWeight:   700,
              color:        '#818cf8',
            }}>
              View →
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}