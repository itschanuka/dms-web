'use client';
import ExportButtons from './ExportButtons';
import { useTheme } from '@/lib/theme';
import type { ExportFormat } from '@/lib/exportHelpers';

interface ReportColumn {
  key:    string;
  label:  string;
  format?: 'currency' | 'date' | 'percent' | 'number' | 'text';
  align?: 'left' | 'right' | 'center';
}

interface SummaryItem {
  label: string;
  value: string | number;
  color?: string;
}

interface ReportTableProps {
  title:        string;
  subtitle?:    string;
  summary:      SummaryItem[];
  columns:      ReportColumn[];
  rows:         Record<string, unknown>[];
  loading?:     boolean;
  exportEndpoint?: string;
  exportParams?:   Record<string, string>;
  exportFormats?:  ExportFormat[];
}

function formatCell(value: unknown, format?: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (format === 'currency') return `usd ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (format === 'percent')  return `${Number(value).toFixed(1)}%`;
  if (format === 'number')   return Number(value).toLocaleString();
  if (format === 'date')     return new Date(String(value)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return String(value);
}

function isMoney(fmt?: string) { return fmt === 'currency' || fmt === 'percent' || fmt === 'number'; }

export default function ReportTable({
  title, subtitle, summary, columns, rows, loading,
  exportEndpoint, exportParams, exportFormats,
}: ReportTableProps) {
  const t = useTheme();

  const th = {
    padding: '10px 14px',
    fontSize: 10,
    fontWeight: 700 as const,
    color: t.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: '.06em',
    borderBottom: `1px solid ${t.border}`,
    whiteSpace: 'nowrap' as const,
  };

  return (
    <div>
      {/* Summary cards */}
      {summary.length > 0 && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
          {summary.map((s, i) => (
            <div key={i} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '16px 20px', minWidth: 140 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color ?? t.text, fontFamily: typeof s.value === 'number' ? 'monospace' : 'inherit' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table card */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {/* Table header bar */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: t.text }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {exportEndpoint && (
            <ExportButtons endpoint={exportEndpoint} params={exportParams} formats={exportFormats} />
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} style={{ ...th, textAlign: (col.align ?? (isMoney(col.format) ? 'right' : 'left')) as any }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} style={{ padding: 40, textAlign: 'center', color: t.muted, fontSize: 13 }}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ padding: 40, textAlign: 'center', color: t.muted, fontSize: 13 }}>No data available</td></tr>
              ) : rows.map((row, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${t.border}`, background: i % 2 === 1 ? `${t.border}22` : 'transparent' }}>
                  {columns.map(col => {
                    const val = row[col.key];
                    const isCurrency = col.format === 'currency';
                    return (
                      <td key={col.key} style={{
                        padding: '11px 14px',
                        fontSize: 13,
                        color: isCurrency ? '#34d399' : t.text,
                        fontFamily: isMoney(col.format) ? 'monospace' : 'inherit',
                        fontWeight: isCurrency ? 700 : 400,
                        textAlign: (col.align ?? (isMoney(col.format) ? 'right' : 'left')) as any,
                        whiteSpace: 'nowrap',
                      }}>
                        {formatCell(val, col.format)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div style={{ padding: '10px 20px', borderTop: `1px solid ${t.border}`, color: t.muted, fontSize: 12 }}>
            {rows.length} row{rows.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
