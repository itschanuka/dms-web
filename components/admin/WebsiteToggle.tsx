'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';

interface Props {
  vehicleId:     string;
  initialValue:  boolean;
  vehicleStatus: string;
}

export default function WebsiteToggle({ vehicleId, initialValue, vehicleStatus }: Props) {
  const [enabled,  setEnabled]  = useState(initialValue);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const canToggle = vehicleStatus === 'available';

  async function handleToggle() {
    if (!canToggle || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await adminApi.toggleWebsite(vehicleId);
      setEnabled(result.show_on_website);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Toggle switch */}
        <button
          onClick={handleToggle}
          disabled={!canToggle || loading}
          style={{
            position:   'relative',
            width:      48,
            height:     26,
            borderRadius: 13,
            background: enabled ? '#6366f1' : '#1f2d45',
            border:     'none',
            cursor:     canToggle ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
            opacity:    loading ? 0.7 : 1,
          }}
          aria-label={enabled ? 'Hide from website' : 'Show on website'}
        >
          <div style={{
            position:   'absolute',
            top:        3,
            left:       enabled ? 25 : 3,
            width:      20,
            height:     20,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow:  '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: enabled ? '#10b981' : '#5c7090' }}>
            {loading ? 'Updating…' : enabled ? '✓ Visible on website' : '✗ Hidden from website'}
          </div>
          {!canToggle && (
            <div style={{ fontSize: 11, color: '#5c7090', marginTop: 2 }}>
              Vehicle must be Available to show on website
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</div>
      )}
    </div>
  );
}
