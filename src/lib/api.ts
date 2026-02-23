import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ─────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────────────────────

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
  name:         string;
  phone:        string;
  email?:       string;
  subject:      string;
  message:      string;
  vehicle_ref?: string;
}

// ─────────────────────────────────────────────────────────────
// ADMIN TYPES
// ─────────────────────────────────────────────────────────────

export interface AdminVehicle {
  id:                      string;
  stock_id:                string;
  make:                    string;
  model:                   string;
  variant:                 string | null;
  year:                    number;
  mileage:                 number;
  engine_capacity:         string | null;
  transmission:            string;
  fuel_type:               string;
  color:                   string;
  body_type:               string;
  condition:               string;
  location:                string;
  status:                  string;
  asking_price:            number;
  minimum_price:           number | null;
  total_cost_cache:        number | null;
  main_image_url:          string | null;
  show_on_website:         boolean;
  chassis_vin:             string;
  registration_number:     string | null;
  purchase_date:           string;
  supplier_name:           string | null;
  purchase_type:           string;
  purchase_price:          number;
  purchase_payment_status: string;
  notes:                   string | null;
  days_in_stock:           number;
  aging_bucket:            string;
  estimated_profit:        number;
  created_at:              string;
  updated_at:              string;
}

export interface VehicleCost {
  id:          string;
  vehicle_id:  string;
  cost_date:   string;
  category:    string;
  description: string;
  amount:      number;
  created_by:  string;
  created_at:  string;
}

export interface VehicleDocument {
  id:            string;
  vehicle_id:    string;
  file_url:      string;
  file_name:     string;
  file_size:     number | null;
  doc_type:      string;
  is_main_image: boolean;
  sort_order:    number;
  created_at:    string;
}

// ─────────────────────────────────────────────────────────────
// FETCH HELPERS
// ─────────────────────────────────────────────────────────────

async function publicFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json() as { success: boolean; data?: T; error?: { message: string } };
  if (!json.success) throw new Error(json.error?.message ?? 'API error');
  return json.data as T;
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // createClient() returns a fresh browser Supabase client each call
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token    = data.session?.access_token;

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  const json = await res.json() as {
    success: boolean;
    data?:   T;
    error?:  { code: string; message: string };
  };
  if (!json.success) throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  return json.data as T;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

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

export const publicApi = {
  getVehicles: (params: VehicleListParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return publicFetch<{ vehicles: PublicVehicle[]; pagination: Pagination }>(
      `/public/vehicles${qs.toString() ? '?' + qs.toString() : ''}`
    );
  },

  getVehicleFilters: () =>
    publicFetch<VehicleFilters>('/public/vehicles/filters'),

  getVehicle: (id: string) =>
    publicFetch<PublicVehicleDetail>(`/public/vehicles/${id}`),

  submitContact: (data: ContactFormData) =>
    publicFetch<{ message: string }>('/public/contact', {
      method: 'POST',
      body:   JSON.stringify(data),
    }),
};

// ─────────────────────────────────────────────────────────────
// ADMIN API
// ─────────────────────────────────────────────────────────────

export interface AdminVehicleListParams {
  page?:            number;
  limit?:           number;
  status?:          string;
  make?:            string;
  year?:            number;
  location?:        string;
  aging?:           string;
  show_on_website?: boolean;
  search?:          string;
}

export const adminApi = {
  // ── Inventory ─────────────────────────────────────────────

  listVehicles: (params: AdminVehicleListParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return adminFetch<{ vehicles: AdminVehicle[]; pagination: Pagination }>(
      `/inventory${qs.toString() ? '?' + qs.toString() : ''}`
    );
  },

  getVehicle: (id: string) =>
    adminFetch<AdminVehicle>(`/inventory/${id}`),

  createVehicle: (data: Partial<AdminVehicle>) =>
    adminFetch<AdminVehicle>('/inventory', { method: 'POST', body: JSON.stringify(data) }),

  updateVehicle: (id: string, data: Partial<AdminVehicle>) =>
    adminFetch<AdminVehicle>(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  changeStatus: (id: string, status: string) =>
    adminFetch<AdminVehicle>(`/inventory/${id}/status`, {
      method: 'PATCH',
      body:   JSON.stringify({ status }),
    }),

  toggleWebsite: (id: string) =>
    adminFetch<{ id: string; show_on_website: boolean }>(
      `/inventory/${id}/website-toggle`,
      { method: 'PATCH' }
    ),

  deleteVehicle: (id: string) =>
    adminFetch<{ message: string }>(`/inventory/${id}`, { method: 'DELETE' }),

  // ── Costs ─────────────────────────────────────────────────

  getCosts: (vehicleId: string) =>
    adminFetch<VehicleCost[]>(`/inventory/${vehicleId}/costs`),

  addCost: (vehicleId: string, data: Partial<VehicleCost>) =>
    adminFetch<VehicleCost>(`/inventory/${vehicleId}/costs`, {
      method: 'POST',
      body:   JSON.stringify(data),
    }),

  updateCost: (vehicleId: string, costId: string, data: Partial<VehicleCost>) =>
    adminFetch<VehicleCost>(`/inventory/${vehicleId}/costs/${costId}`, {
      method: 'PUT',
      body:   JSON.stringify(data),
    }),

  // ── Documents ─────────────────────────────────────────────

  getDocuments: (vehicleId: string) =>
    adminFetch<VehicleDocument[]>(`/inventory/${vehicleId}/documents`),

  addDocument: (vehicleId: string, data: Partial<VehicleDocument>) =>
    adminFetch<VehicleDocument>(`/inventory/${vehicleId}/documents`, {
      method: 'POST',
      body:   JSON.stringify(data),
    }),

  deleteDocument: (vehicleId: string, docId: string) =>
    adminFetch<{ message: string }>(
      `/inventory/${vehicleId}/documents/${docId}`,
      { method: 'DELETE' }
    ),

  setMainImage: (vehicleId: string, docId: string) =>
    adminFetch<{ message: string }>(
      `/inventory/${vehicleId}/documents/${docId}/set-main`,
      { method: 'PATCH' }
    ),
};