'use client';
import { useState } from 'react';
import { triggerExport, FORMAT_LABELS, type ExportFormat } from '@/lib/exportHelpers';

interface ExportButtonsProps {
  endpoint: string;
  params?:  Record<string, string>;
  label?:   string;
  formats?: ExportFormat[];
}

const FORMATS: ExportFormat[] = ['xlsx', 'csv', 'pdf', 'docx'];

export default function ExportButtons({ endpoint, params = {}, label, formats = FORMATS }: ExportButtonsProps) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error,   setError]   = useState('');

  const handleExport = async (fmt: ExportFormat) => {
    setLoading(fmt);
    setError('');
    try {
      await triggerExport(endpoint, fmt, params);
    } catch (err: any) {
      setError(err?.message ?? 'Export failed');
      setTimeout(() => setError(''), 4000);
    }
    setLoading(null);
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
      {label && <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>{label}</span>}
      <div style={{ display: 'flex', gap: 6 }}>
        {formats.map(fmt => (
          <button
            key={fmt}
            onClick={() => handleExport(fmt)}
            disabled={loading !== null}
            title={`Export as ${fmt.toUpperCase()}`}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: loading === fmt ? '#1e40af' : 'transparent',
              color: loading === fmt ? '#fff' : '#94a3b8',
              fontSize: 11,
              fontWeight: 700,
              cursor: loading !== null ? 'default' : 'pointer',
              opacity: loading !== null && loading !== fmt ? 0.5 : 1,
              transition: 'all .12s',
              whiteSpace: 'nowrap',
            }}>
            {loading === fmt ? '⏳' : FORMAT_LABELS[fmt]}
          </button>
        ))}
      </div>
      {error && <span style={{ fontSize: 11, color: '#ef4444' }}>{error}</span>}
    </div>
  );
}
