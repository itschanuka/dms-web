// src/lib/exportHelpers.ts
// Phase 9 — Triggers a browser download from a report export endpoint

export type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'docx';

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf:  '📄 PDF',
  xlsx: '📊 Excel',
  csv:  '📋 CSV',
  docx: '📝 DOCX',
};

/**
 * Calls the export endpoint, receives blob, triggers browser download.
 * endpoint: e.g. '/reports/sales/summary/export'
 * params: query params to append (from, to, format, etc.)
 */
export async function triggerExport(
  endpoint: string,
  format:   ExportFormat,
  params:   Record<string, string> = {}
): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dms_token') : '';

  const qs = new URLSearchParams({ ...params, format }).toString();
  const url = `${process.env.NEXT_PUBLIC_API_URL ?? ''}${endpoint}?${qs}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `Export failed (${res.status})`);
  }

  const blob = await res.blob();

  // Extract filename from Content-Disposition
  const cd       = res.headers.get('Content-Disposition') ?? '';
  const match    = cd.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `report.${format}`;

  const url2 = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url2;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url2);
}
