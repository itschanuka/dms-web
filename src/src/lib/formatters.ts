/**
 * Format a number as usd currency
 * e.g. 4500000 → "usd 4,500,000"
 */
export function formatPrice(amount: number): string {
  return `usd ${amount.toLocaleString('en-LK')}`;
}

/** Alias for formatPrice — use either name */
export const formatCurrency = formatPrice;

/**
 * Format mileage with unit
 * e.g. 42000 → "42,000 km"
 */
export function formatMileage(km: number): string {
  return `${km.toLocaleString('en-LK')} km`;
}

/**
 * Capitalise first letter and replace underscores with spaces
 * e.g. "percent_profit" → "Percent Profit"
 */
export function formatLabel(value: string): string {
  return value
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Format a date string for display
 * e.g. "2024-01-15" → "Jan 2024"
 */
export function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Format condition label for display
 */
export function formatCondition(condition: string): string {
  const map: Record<string, string> = {
    used:          'Used',
    reconditioned: 'Reconditioned',
    brand_new:     'Brand New',
  };
  return map[condition] ?? formatLabel(condition);
}

/**
 * Format transmission label
 */
export function formatTransmission(t: string): string {
  const map: Record<string, string> = {
    manual:    'Manual',
    automatic: 'Automatic',
    cvt:       'CVT',
  };
  return map[t] ?? formatLabel(t);
}

/**
 * Format fuel type label
 */
export function formatFuelType(f: string): string {
  const map: Record<string, string> = {
    petrol:   'Petrol',
    diesel:   'Diesel',
    hybrid:   'Hybrid',
    electric: 'Electric',
  };
  return map[f] ?? formatLabel(f);
}