const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ── Types ─────────────────────────────────────────────────────

export interface PublicVehicle {
  id:               string;
  stock_id:         string;
  make:             string;
  model:            string;
  variant:          string | null;
  year:             number;
  mileage:          number;
  engine_capacity:  string | null;
  transmission:     string;
  fuel_type:        string;
  color:            string;
  body_type:        string;
  condition:        string;
  location:         string;
  asking_price:     number;
  main_image_url:   string | null;
  purchase_date:    string;
  created_at:       string;
}

export interface PublicVehicleDetail extends PublicVehicle {
  chassis_vin:         string;
  registration_number: string | null;
  photos: Array<{
    id:            string;
    file_url:      string;
    file_name:     string;
    is_main_image: boolean;
    sort_order:    number;
  }>;
}

export interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}

export interface VehicleFilters {
  makes:         string[];
  years:         number[];
  bodyTypes:     string[];
  fuelTypes:     string[];
  transmissions: string[];
}

export interface ContactFormData {
  name:        string;
  phone:       string;
  email?:      string;
  subject:     string;
  message:     string;
  vehicle_ref?: string;
}

// ── Public API ────────────────────────────────────────────────

export interface VehicleListParams {
  page?:         number;
  limit?:        number;
  make?:         string;
  year?:         number;
  body_type?:    string;
  fuel_type?:    string;
  transmission?: string;
  search?:       string;
  sort?:         'newest' | 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc';
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json() as { success: boolean; data?: T; error?: { message: string } };
  if (!json.success) {
    throw new Error(json.error?.message ?? 'API error');
  }
  return json.data as T;
}

export const publicApi = {
  /** Get paginated public vehicle listing */
  getVehicles: (params: VehicleListParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return apiFetch<{ vehicles: PublicVehicle[]; pagination: Pagination }>(
      `/public/vehicles${qs.toString() ? '?' + qs.toString() : ''}`
    );
  },

  /** Get available filter values for the inventory page */
  getVehicleFilters: () =>
    apiFetch<VehicleFilters>('/public/vehicles/filters'),

  /** Get a single vehicle detail */
  getVehicle: (id: string) =>
    apiFetch<PublicVehicleDetail>(`/public/vehicles/${id}`),

  /** Submit the contact form */
  submitContact: (data: ContactFormData) =>
    apiFetch<{ message: string }>('/public/contact', {
      method: 'POST',
      body:   JSON.stringify(data),
    }),
};
