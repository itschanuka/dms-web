'use client';

import { useState, useCallback, useEffect } from 'react';
import { publicApi, type VehicleFilters, type PublicVehicle, type Pagination } from '@/lib/api';
import VehicleCard from '@/components/public/VehicleCard';
import { SORT_OPTIONS } from '@/lib/constants';

interface Props {
  initialFilters: VehicleFilters;
}

const SELECT_STYLE: React.CSSProperties = {
  background:   '#07090f',
  border:       '1px solid #1f2d45',
  borderRadius: 8,
  padding:      '8px 12px',
  fontSize:     13,
  color:        '#dde4f0',
  outline:      'none',
  cursor:       'pointer',
  appearance:   'none',
  paddingRight: 28,
};

export default function InventoryClient({ initialFilters }: Props) {
  const [vehicles,   setVehicles]   = useState<PublicVehicle[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  // Filters state
  const [search,       setSearch]       = useState('');
  const [make,         setMake]         = useState('');
  const [year,         setYear]         = useState('');
  const [bodyType,     setBodyType]     = useState('');
  const [fuelType,     setFuelType]     = useState('');
  const [transmission, setTransmission] = useState('');
  const [sort,         setSort]         = useState<string>('newest');
  const [page,         setPage]         = useState(1);

  const fetchVehicles = useCallback(async (pg = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await publicApi.getVehicles({
        page:  pg,
        limit: 12,
        ...(search       && { search }),
        ...(make         && { make }),
        ...(year         && { year: parseInt(year, 10) }),
        ...(bodyType     && { body_type: bodyType }),
        ...(fuelType     && { fuel_type: fuelType }),
        ...(transmission && { transmission }),
        sort: sort as 'newest' | 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc',
      });
      setVehicles(result.vehicles);
      setPagination(result.pagination);
      setPage(pg);
    } catch {
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, make, year, bodyType, fuelType, transmission, sort]);

  // Initial load + on filter change
  useEffect(() => {
    void fetchVehicles(1);
  }, [fetchVehicles]);

  function clearFilters() {
    setSearch('');
    setMake('');
    setYear('');
    setBodyType('');
    setFuelType('');
    setTransmission('');
    setSort('newest');
    setPage(1);
  }

  const hasFilters = search || make || year || bodyType || fuelType || transmission;

  return (
    <div style={{ padding: '48px 24px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5c7090', marginBottom: 8 }}>
          Our Stock
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#fff', margin: 0 }}>
          Browse Inventory
        </h1>
      </div>

      {/* Filter bar */}
      <div style={{
        background:   '#0d1117',
        border:       '1px solid #1f2d45',
        borderRadius: 12,
        padding:      '20px 20px',
        marginBottom: 28,
      }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#5c7090' }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by make, model, or stock ID…"
            style={{
              width:        '100%',
              background:   '#07090f',
              border:       '1px solid #1f2d45',
              borderRadius: 8,
              padding:      '10px 14px 10px 38px',
              fontSize:     14,
              color:        '#dde4f0',
              outline:      'none',
              boxSizing:    'border-box',
            }}
          />
        </div>

        {/* Dropdowns */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Make */}
          <div style={{ position: 'relative' }}>
            <select value={make} onChange={e => setMake(e.target.value)} style={SELECT_STYLE}>
              <option value="">All Makes</option>
              {initialFilters.makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#5c7090', pointerEvents: 'none' }}>▼</span>
          </div>

          {/* Year */}
          <div style={{ position: 'relative' }}>
            <select value={year} onChange={e => setYear(e.target.value)} style={SELECT_STYLE}>
              <option value="">All Years</option>
              {initialFilters.years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#5c7090', pointerEvents: 'none' }}>▼</span>
          </div>

          {/* Body type */}
          <div style={{ position: 'relative' }}>
            <select value={bodyType} onChange={e => setBodyType(e.target.value)} style={SELECT_STYLE}>
              <option value="">All Types</option>
              {initialFilters.bodyTypes.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#5c7090', pointerEvents: 'none' }}>▼</span>
          </div>

          {/* Fuel type */}
          <div style={{ position: 'relative' }}>
            <select value={fuelType} onChange={e => setFuelType(e.target.value)} style={SELECT_STYLE}>
              <option value="">All Fuels</option>
              {initialFilters.fuelTypes.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#5c7090', pointerEvents: 'none' }}>▼</span>
          </div>

          {/* Transmission */}
          <div style={{ position: 'relative' }}>
            <select value={transmission} onChange={e => setTransmission(e.target.value)} style={SELECT_STYLE}>
              <option value="">All Transmissions</option>
              {initialFilters.transmissions.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#5c7090', pointerEvents: 'none' }}>▼</span>
          </div>

          {/* Sort */}
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <select value={sort} onChange={e => setSort(e.target.value)} style={SELECT_STYLE}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#5c7090', pointerEvents: 'none' }}>▼</span>
          </div>

          {/* Clear */}
          {hasFilters && (
            <button onClick={clearFilters} style={{
              background: 'none',
              border:     '1px solid #1f2d45',
              borderRadius: 8,
              color:      '#ef4444',
              fontSize:   12,
              fontWeight: 600,
              padding:    '8px 12px',
              cursor:     'pointer',
            }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!loading && pagination && (
        <div style={{ fontSize: 13, color: '#5c7090', marginBottom: 20 }}>
          {pagination.total === 0
            ? 'No vehicles found'
            : `Showing ${vehicles.length} of ${pagination.total} vehicle${pagination.total !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '14px 18px', color: '#fca5a5', fontSize: 14, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 14, height: 340, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* Grid */}
      {!loading && vehicles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {vehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && vehicles.length === 0 && !error && (
        <div style={{
          textAlign: 'center', padding: '80px 24px',
          background: '#0d1117', border: '1px solid #1f2d45',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            No vehicles found
          </h3>
          <p style={{ fontSize: 14, color: '#5c7090', marginBottom: 20 }}>
            Try adjusting your filters or search term.
          </p>
          <button onClick={clearFilters} style={{
            background: '#6366f1', color: '#fff',
            border: 'none', borderRadius: 8,
            padding: '10px 20px', fontSize: 13,
            fontWeight: 700, cursor: 'pointer',
          }}>
            Clear all filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 40 }}>
          <button
            onClick={() => void fetchVehicles(page - 1)}
            disabled={!pagination.hasPrev}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: pagination.hasPrev ? '#0d1117' : 'transparent',
              border: '1px solid #1f2d45',
              color: pagination.hasPrev ? '#dde4f0' : '#3a4e6a',
              cursor: pagination.hasPrev ? 'pointer' : 'not-allowed',
            }}
          >
            ← Prev
          </button>

          <span style={{ fontSize: 13, color: '#5c7090', padding: '0 8px' }}>
            Page {page} of {pagination.totalPages}
          </span>

          <button
            onClick={() => void fetchVehicles(page + 1)}
            disabled={!pagination.hasNext}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: pagination.hasNext ? '#0d1117' : 'transparent',
              border: '1px solid #1f2d45',
              color: pagination.hasNext ? '#dde4f0' : '#3a4e6a',
              cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
            }}
          >
            Next →
          </button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
