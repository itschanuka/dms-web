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

async function publicFetch<T>(path: string, options?: RequestInit): Promise<{ success: true; data: T } | { success: false; error: { message: string } }> {
  const res  = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json() as { success: boolean; data?: T; error?: { message: string } };
  if (!json.success) return { success: false, error: { message: json.error?.message ?? 'API error' } };
  return { success: true, data: json.data as T };
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
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
  if (!json.success) {
    const msg = json.error?.message ?? `Request failed: ${res.status}`;
    throw new Error(msg);
  }
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

  getAnalytics: (from: string, to: string) => {
    const qs = new URLSearchParams({ from, to });
    return adminFetch<{
      period:            { from: string; to: string };
      totalVehicles:     number;
      statusCounts:      Record<string, number>;
      availableCount:    number;
      inventoryValue:    number;
      inventoryCostBase: number;
      inventoryProfit:   number;
      addedInPeriod:     number;
      soldInPeriod:      number;
      revenueInPeriod:   number;
      costInPeriod:      number;
      profitInPeriod:    number;
      agingBreakdown:    { fresh: number; aging: number; old: number; dead_stock: number };
      monthlyTrend:      Array<{ month: string; added: number; sold: number }>;
    }>(`/inventory/analytics?${qs.toString()}`);
  },

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

// ─────────────────────────────────────────────────────────────
// CUSTOMER TYPES — Phase 3
// ─────────────────────────────────────────────────────────────

export type CustomerType   = 'individual' | 'business' | 'dealer_trader' | 'repeat_buyer';
export type CustomerStatus = 'active' | 'inactive' | 'blacklisted';

export interface Customer {
  id:               string;
  customer_code:    string;
  full_name:        string;
  phone_primary:    string;
  phone_secondary:  string | null;
  email:            string | null;
  address:          string | null;
  city:             string | null;
  nic_passport:     string | null;
  business_name:    string | null;
  customer_type:    CustomerType;
  status:           CustomerStatus;
  blacklist_reason: string | null;
  blacklisted_at:   string | null;
  created_at:       string;
  updated_at:       string;
}

export interface CustomerNote {
  id:         string;
  note:       string;
  created_by: string;
  created_at: string;
}

export interface CustomerDetail extends Customer {
  business_reg_no: string | null;
  blacklisted_by:  string | null;
  notes: CustomerNote[];
  leads: Array<{
    id:                      string;
    lead_code:               string;
    status:                  string;
    source:                  string;
    interested_vehicle_desc: string | null;
    created_at:              string;
  }>;
  deals: Array<{
    id:             string;
    deal_code:      string;
    status:         string;
    selling_price:  number;
    payment_status: string;
    deal_date:      string;
  }>;
  financial_summary: {
    total_deals:  number;
    total_spend:  number;
    active_deals: number;
  };
}

export interface DuplicateMatch {
  id:            string;
  field:         string;
  customer_code: string;
  full_name:     string;
}

export interface CustomerListParams {
  page?:          number;
  limit?:         number;
  search?:        string;
  customer_type?: string;
  city?:          string;
  status?:        string;
}

export interface CreateCustomerData {
  full_name:        string;
  phone_primary:    string;
  phone_secondary?: string;
  email?:           string;
  address?:         string;
  city?:            string;
  nic_passport?:    string;
  business_name?:   string;
  business_reg_no?: string;
  customer_type:    CustomerType;
}

// ─────────────────────────────────────────────────────────────
// CUSTOMER API — Phase 3
// ─────────────────────────────────────────────────────────────

export const customerApi = {
  list: (params: CustomerListParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return adminFetch<{ customers: Customer[]; pagination: Pagination }>(
      `/customers${qs.toString() ? '?' + qs.toString() : ''}`
    );
  },

  get: (id: string) =>
    adminFetch<CustomerDetail>(`/customers/${id}`),

  checkDuplicate: (phone: string, nic?: string, excludeId?: string) => {
    const qs = new URLSearchParams({ phone });
    if (nic)       qs.set('nic', nic);
    if (excludeId) qs.set('exclude_id', excludeId);
    return adminFetch<{ duplicates: DuplicateMatch[] }>(`/customers/check-duplicate?${qs.toString()}`);
  },

  create: (data: CreateCustomerData) =>
    adminFetch<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<CreateCustomerData> & { status?: 'active' | 'inactive' }) =>
    adminFetch<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  blacklist: (id: string, reason: string) =>
    adminFetch<Customer>(`/customers/${id}/blacklist`, {
      method: 'PATCH',
      body:   JSON.stringify({ reason }),
    }),

  removeBlacklist: (id: string) =>
    adminFetch<Customer>(`/customers/${id}/remove-blacklist`, { method: 'PATCH' }),

  softDelete: (id: string) =>
    adminFetch<{ message: string }>(`/customers/${id}`, { method: 'DELETE' }),

  getNotes: (id: string) =>
    adminFetch<CustomerNote[]>(`/customers/${id}/notes`),

  addNote: (id: string, note: string) =>
    adminFetch<CustomerNote>(`/customers/${id}/notes`, {
      method: 'POST',
      body:   JSON.stringify({ note }),
    }),

  deleteNote: (customerId: string, noteId: string) =>
    adminFetch<{ message: string }>(`/customers/${customerId}/notes/${noteId}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────
// CRM TYPES — Phase 4
// ─────────────────────────────────────────────────────────────

export type LeadStatus =
  | 'new' | 'contacted' | 'interested' | 'test_drive'
  | 'negotiation' | 'won' | 'lost';

export type LeadSource =
  | 'walk_in' | 'call' | 'website' | 'facebook'
  | 'whatsapp' | 'referral' | 'other';

export type LostReason =
  | 'price_too_high' | 'competitor' | 'not_interested'
  | 'financing_rejected' | 'other';

export interface Lead {
  id:                      string;
  lead_code:               string;
  customer_id:             string | null;
  customer_name:           string;
  customer_phone:          string;
  interested_vehicle_id:   string | null;
  interested_vehicle_desc: string | null;
  source:                  LeadSource;
  assigned_to:             string;
  status:                  LeadStatus;
  next_followup_date:      string | null;
  next_followup_note:      string | null;
  lost_reason:             LostReason | null;
  won_deal_id:             string | null;
  created_at:              string;
  updated_at:              string;
}

export interface LeadFollowUp {
  id:                 string;
  lead_id?:           string;
  follow_up_date:     string;
  status_at_time:     string;
  notes:              string;
  next_followup_date: string | null;
  created_by:         string;
  created_at:         string;
}

export interface LeadDetail extends Lead {
  lost_note:   string | null;
  created_by:  string;
  follow_ups:  LeadFollowUp[];
  vehicle: {
    id:             string;
    stock_id:       string;
    make:           string;
    model:          string;
    year:           number;
    asking_price:   number;
    status:         string;
    main_image_url: string | null;
  } | null;
  customer: {
    id:            string;
    customer_code: string;
    full_name:     string;
    phone_primary: string;
    status:        string;
  } | null;
}

export interface Salesperson {
  id:            string;
  full_name:     string;
  employee_code: string;
  role:          string;
}

export interface VehicleSearchResult {
  id:             string;
  stock_id:       string;
  make:           string;
  model:          string;
  year:           number;
  asking_price:   number;
  status:         string;
  main_image_url: string | null;
}

export interface LeadListParams {
  page?:         number;
  limit?:        number;
  status?:       string;
  source?:       string;
  assigned_to?:  string;
  search?:       string;
  date_from?:    string;
  date_to?:      string;
  overdue_only?: boolean;
}

export interface CreateLeadData {
  customer_id?:             string;
  customer_name:            string;
  customer_phone:           string;
  interested_vehicle_id?:   string;
  interested_vehicle_desc?: string;
  source:                   LeadSource;
  assigned_to:              string;
  next_followup_date?:      string;
  next_followup_note?:      string;
}

// ─────────────────────────────────────────────────────────────
// LEAD API — Phase 4
// ─────────────────────────────────────────────────────────────

export const leadApi = {
  list: (params: LeadListParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== false) qs.set(k, String(v));
    });
    return adminFetch<{ leads: Lead[]; pagination: Pagination }>(
      `/leads${qs.toString() ? '?' + qs.toString() : ''}`
    );
  },

  get: (id: string) =>
    adminFetch<LeadDetail>(`/leads/${id}`),

  getOverdue: () =>
    adminFetch<Lead[]>('/leads/overdue'),

  getDueToday: () =>
    adminFetch<Lead[]>('/leads/due-today'),

  getSalespersons: () =>
    adminFetch<Salesperson[]>('/leads/salespersons'),

  searchVehicles: (q: string) =>
    adminFetch<VehicleSearchResult[]>(`/leads/vehicles/search?q=${encodeURIComponent(q)}`),

  create: (data: CreateLeadData) =>
    adminFetch<Lead>('/leads', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<CreateLeadData>) =>
    adminFetch<Lead>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  patchStatus: (id: string, status: LeadStatus, lost_reason?: LostReason, lost_note?: string) =>
    adminFetch<Lead>(`/leads/${id}/status`, {
      method: 'PATCH',
      body:   JSON.stringify({ status, lost_reason, lost_note }),
    }),

  reassign: (id: string, assigned_to: string) =>
    adminFetch<Lead>(`/leads/${id}/assign`, {
      method: 'PATCH',
      body:   JSON.stringify({ assigned_to }),
    }),

  softDelete: (id: string) =>
    adminFetch<{ message: string }>(`/leads/${id}`, { method: 'DELETE' }),

  getFollowUps: (id: string) =>
    adminFetch<LeadFollowUp[]>(`/leads/${id}/follow-ups`),

  addFollowUp: (id: string, data: { follow_up_date: string; notes: string; next_followup_date?: string }) =>
    adminFetch<LeadFollowUp>(`/leads/${id}/follow-ups`, {
      method: 'POST',
      body:   JSON.stringify(data),
    }),
};

// ─────────────────────────────────────────────────────────────
// DEALS TYPES — Phase 5
// ─────────────────────────────────────────────────────────────

export type DealStatus    = 'draft' | 'reserved' | 'active' | 'completed' | 'cancelled';
export type PaymentType   = 'cash' | 'finance' | 'mixed';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'fully_paid';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'finance_disbursement';
export type LoanStatus    = 'not_started' | 'submitted' | 'approved' | 'rejected' | 'disbursed';

export interface Deal {
  id:                 string;
  deal_code:          string;
  vehicle_id:         string;
  customer_id:        string;
  salesperson_id:     string;
  deal_date:          string;
  status:             DealStatus;
  selling_price:      number;
  discount_amount:    number;
  payment_type:       PaymentType;
  total_paid_cache:   number;
  payment_status:     PaymentStatus;
  reservation_amount: number | null;
  reservation_date:   string | null;
  reservation_expiry: string | null;
  notes:              string | null;
  created_at:         string;
  updated_at:         string;
  completed_at:       string | null;
  customer:    { id: string; customer_code: string; full_name: string; phone_primary: string } | null;
  vehicle:     { id: string; stock_id: string; make: string; model: string; year: number; main_image_url: string | null } | null;
  salesperson: { id: string; full_name: string; employee_code: string } | null;
}

export interface DealPayment {
  id:                      string;
  deal_id:                 string;
  payment_date:            string;
  amount:                  number;
  method:                  PaymentMethod;
  reference_number:        string | null;
  notes:                   string | null;
  is_finance_disbursement: boolean;
  created_at:              string;
  created_by_emp:          { id: string; full_name: string } | null;
}

export interface DealFinance {
  id:                    string;
  deal_id:               string;
  provider_type:         'bank' | 'finance_company';
  provider_name:         string;
  branch:                string | null;
  officer_name:          string | null;
  officer_contact:       string | null;
  application_date:      string | null;
  loan_status:           LoanStatus;
  selling_price_ref:     number;
  customer_down_payment: number;
  loan_amount_requested: number | null;
  loan_amount_approved:  number | null;
  loan_amount_disbursed: number | null;
  disbursement_date:     string | null;
  notes:                 string | null;
  updated_at:            string;
}

export interface DealTradeIn {
  id:                    string;
  deal_id:               string;
  make:                  string;
  model:                 string;
  year:                  number | null;
  mileage:               number | null;
  registration_number:   string | null;
  condition_notes:       string | null;
  trade_in_value:        number;
  added_to_inventory_id: string | null;
  created_at:            string;
}

export interface DealDelivery {
  id:                         string;
  deal_id:                    string;
  delivery_date:              string | null;
  delivery_status:            'pending' | 'delivered';
  check_payment_received:     boolean;
  check_agreement_signed:     boolean;
  check_docs_handed_over:     boolean;
  check_vehicle_handed_over:  boolean;
  delivery_notes:             string | null;
  updated_at:                 string;
}

export interface DealCommission {
  id:                     string;
  deal_id:                string;
  employee_id:            string;
  commission_type:        string;
  commission_rate:        number | null;
  fixed_value:            number | null;
  calculated_amount:      number;
  manual_override_amount: number | null;
  final_amount:           number;
  status:                 'unpaid' | 'paid';
  paid_at:                string | null;
}

export interface DealDetail extends Deal {
  vehicle: {
    id: string; stock_id: string; make: string; model: string; variant: string | null;
    year: number; color: string; mileage: number; asking_price: number;
    purchase_price: number; total_cost_cache: number; main_image_url: string | null; status: string;
  } | null;
  customer: {
    id: string; customer_code: string; full_name: string; phone_primary: string;
    email: string | null; address: string | null; city: string | null; status: string;
  } | null;
  salesperson: {
    id: string; full_name: string; employee_code: string; role: string;
    commission_type: string | null; commission_value: number | null;
  } | null;
  discount_approver: { id: string; full_name: string } | null;
  payments:   DealPayment[];
  finance:    DealFinance | null;
  trade_in:   DealTradeIn | null;
  delivery:   DealDelivery | null;
  commission: DealCommission | null;
}

export interface DealProfit {
  selling_price:     number;
  discount_amount:   number;
  effective_price:   number;
  total_cost:        number;
  gross_profit:      number;
  commission_amount: number;
  net_profit:        number;
  commission:        DealCommission | null;
}

export interface DealListParams {
  page?:           number;
  limit?:          number;
  status?:         string;
  payment_status?: string;
  salesperson_id?: string;
  customer_id?:    string;
  vehicle_id?:     string;
  date_from?:      string;
  date_to?:        string;
  search?:         string;
}

export interface CreateDealData {
  vehicle_id:          string;
  customer_id:         string;
  salesperson_id:      string;
  deal_date:           string;
  selling_price:       number;
  discount_amount?:    number;
  payment_type:        PaymentType;
  reservation_amount?: number;
  reservation_date?:   string;
  reservation_expiry?: string;
  notes?:              string;
  lead_id?:            string;
}

// ─────────────────────────────────────────────────────────────
// DEALS API — Phase 5
// ─────────────────────────────────────────────────────────────

export const dealApi = {
  getStats: () =>
    adminFetch<{ total: number; draft: number; reserved: number; active: number; completed: number; cancelled: number; revenue: number; outstanding: number }>('/deals/stats'),

  list: (params: DealListParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== false) qs.set(k, String(v));
    });
    return adminFetch<{ deals: Deal[]; pagination: Pagination }>(
      `/deals${qs.toString() ? '?' + qs.toString() : ''}`
    );
  },

  get:    (id: string) => adminFetch<DealDetail>(`/deals/${id}`),

  create: (data: CreateDealData) =>
    adminFetch<Deal>('/deals', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<CreateDealData>) =>
    adminFetch<Deal>(`/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  complete: (id: string, override_payment = false) =>
    adminFetch<{ success: boolean; deal_code: string }>(`/deals/${id}/complete`, {
      method: 'PATCH', body: JSON.stringify({ override_payment }),
    }),

  cancel: (id: string, reason: string, refund_amount?: number) =>
    adminFetch<{ success: boolean }>(`/deals/${id}/cancel`, {
      method: 'PATCH', body: JSON.stringify({ reason, refund_amount }),
    }),

  applyDiscount: (id: string, discount_amount: number) =>
    adminFetch<Deal>(`/deals/${id}/discount`, {
      method: 'PATCH', body: JSON.stringify({ discount_amount }),
    }),

  softDelete: (id: string) =>
    adminFetch<{ message: string }>(`/deals/${id}`, { method: 'DELETE' }),

  getPayments: (id: string) =>
    adminFetch<DealPayment[]>(`/deals/${id}/payments`),

  addPayment: (id: string, data: { payment_date: string; amount: number; method: PaymentMethod; reference_number?: string; notes?: string }) =>
    adminFetch<DealPayment>(`/deals/${id}/payments`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  getFinance: (id: string) =>
    adminFetch<DealFinance | null>(`/deals/${id}/finance`),

  upsertFinance: (id: string, data: Partial<DealFinance>) =>
    adminFetch<DealFinance>(`/deals/${id}/finance`, {
      method: 'PUT', body: JSON.stringify(data),
    }),

  disburse: (id: string, data: { loan_amount_disbursed: number; disbursement_date: string; reference_number?: string }) =>
    adminFetch<DealPayment>(`/deals/${id}/finance/disburse`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  getTradeIn: (id: string) =>
    adminFetch<DealTradeIn | null>(`/deals/${id}/trade-in`),

  upsertTradeIn: (id: string, data: Partial<DealTradeIn>) =>
    adminFetch<DealTradeIn>(`/deals/${id}/trade-in`, {
      method: 'PUT', body: JSON.stringify(data),
    }),

  getDelivery: (id: string) =>
    adminFetch<DealDelivery | null>(`/deals/${id}/delivery`),

  updateDelivery: (id: string, data: Partial<DealDelivery>) =>
    adminFetch<DealDelivery>(`/deals/${id}/delivery`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  getProfit: (id: string) =>
    adminFetch<DealProfit>(`/deals/${id}/profit`),

  getSalespersons: () =>
    adminFetch<Salesperson[]>('/deals/helpers/salespersons'),

  searchVehicles: (q: string) =>
    adminFetch<VehicleSearchResult[]>(`/deals/helpers/vehicles/search?q=${encodeURIComponent(q)}`),

  searchCustomers: (q: string) =>
    adminFetch<{ id: string; customer_code: string; full_name: string; phone_primary: string; status: string }[]>(
      `/deals/helpers/customers/search?q=${encodeURIComponent(q)}`
    ),
};

// ─────────────────────────────────────────────────────────────
// COMMISSION API — Phase 6
// Append these to src/lib/api.ts
// ─────────────────────────────────────────────────────────────

export interface Commission {
  id:                     string;
  deal_id:                string;
  commission_type:        string;
  commission_rate:        number | null;
  fixed_value:            number | null;
  base_amount:            number | null;
  calculated_amount:      number;
  manual_override_amount: number | null;
  final_amount:           number;
  status:                 'paid' | 'unpaid';
  paid_at:                string | null;
  notes:                  string | null;
  created_at:             string;
  employee:               { id: string; full_name: string; employee_code: string; role: string } | null;
  deal: {
    deal_code: string;
    deal_date: string;
    vehicle: { make: string; model: string; year: number; stock_id: string } | null;
  } | null;
  override_by_emp: { full_name: string } | null;
  paid_by_emp:     { full_name: string } | null;
}

export interface CommissionStats {
  total_count:   number;
  unpaid_count:  number;
  paid_count:    number;
  total_amount:  number;
  unpaid_amount: number;
  paid_amount:   number;
}

export interface CommissionSummary {
  employee_id:   string;
  month:         string | null;
  deal_count:    number;
  total_earned:  number;
  total_paid:    number;
  total_unpaid:  number;
}

export interface CommissionListParams {
  page?:         number;
  limit?:        number;
  employee_id?:  string;
  status?:       'paid' | 'unpaid';
  month?:        string;
  date_from?:    string;
  date_to?:      string;
}

export const commissionApi = {
  getStats: () =>
    adminFetch<CommissionStats>('/commissions/stats'),

  list: (params: CommissionListParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return adminFetch<{ commissions: Commission[]; pagination: Pagination }>(
      `/commissions${qs.toString() ? '?' + qs.toString() : ''}`
    );
  },

  get: (id: string) =>
    adminFetch<Commission>(`/commissions/${id}`),

  markPaid: (id: string) =>
    adminFetch<Commission>(`/commissions/${id}/mark-paid`, { method: 'PATCH' }),

  override: (id: string, overrideAmount: number, notes?: string) =>
    adminFetch<Commission>(`/commissions/${id}/override`, {
      method: 'PATCH',
      body: JSON.stringify({ override_amount: overrideAmount, notes }),
    }),

  getEmployeeSummary: (employeeId: string, month?: string) => {
    const qs = month ? `?month=${month}` : '';
    return adminFetch<CommissionSummary>(`/commissions/employee/${employeeId}/summary${qs}`);
  },
};

// ─────────────────────────────────────────────────────────────
// EMPLOYEE API — Phase 7
// ─────────────────────────────────────────────────────────────

export interface Employee {
  id:               string;
  employee_code:    string;
  full_name:        string;
  email:            string;
  phone:            string | null;
  address:          string | null;
  nic:              string | null;
  role:             'admin' | 'manager' | 'salesperson' | 'accountant';
  status:           'active' | 'inactive';
  commission_type:  string | null;
  commission_value: number | null;
  join_date:        string;
  last_login_at:    string | null;
  totp_enabled:     boolean;
  must_change_password: boolean;
  created_at:       string;
}

export interface EmployeeWithPermissions extends Employee {
  employee_permissions: {
    view_profit:        boolean;
    edit_price:         boolean;
    delete_records:     boolean;
    view_reports:       boolean;
    manage_employees:   boolean;
    audit_view:         boolean;
    backup_download:    boolean;
    approve_discount:   boolean;
    cancel_deal:        boolean;
    blacklist_customer: boolean;
    export_reports:     boolean;
    updated_at:         string;
  } | null;
}

export interface EmployeePerformance {
  employee_id:       string;
  period:            { from: string | null; to: string | null };
  deals_closed:      number;
  deals_total:       number;
  total_revenue:     number;
  leads_assigned:    number;
  leads_won:         number;
  conversion_rate:   number;
  commission_earned: number;
  commission_paid:   number;
}

export interface CreateEmployeeData {
  full_name:        string;
  email:            string;
  phone?:           string;
  address?:         string;
  nic?:             string;
  join_date:        string;
  role:             'admin' | 'manager' | 'salesperson' | 'accountant';
  commission_type?: 'fixed' | 'percent_price' | 'percent_profit' | null;
  commission_value?: number | null;
  temp_password:    string;
}

export const employeeApi = {
  list: (params: { page?: number; limit?: number; role?: string; status?: string; search?: string } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return adminFetch<{ employees: Employee[]; pagination: Pagination }>(
      `/employees${qs.toString() ? '?' + qs.toString() : ''}`
    );
  },

  get: (id: string) =>
    adminFetch<EmployeeWithPermissions>(`/employees/${id}`),

  create: (data: CreateEmployeeData) =>
    adminFetch<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<CreateEmployeeData>) =>
    adminFetch<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updatePermissions: (id: string, perms: Record<string, boolean>) =>
    adminFetch<unknown>(`/employees/${id}/permissions`, { method: 'PUT', body: JSON.stringify(perms) }),

  updateCommission: (id: string, data: { commission_type: string | null; commission_value: number | null }) =>
    adminFetch<Employee>(`/employees/${id}/commission`, { method: 'PUT', body: JSON.stringify(data) }),

  updateStatus: (id: string, status: 'active' | 'inactive') =>
    adminFetch<Employee>(`/employees/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  resetAuth: (id: string, tempPassword: string) =>
    adminFetch<{ success: boolean }>(`/employees/${id}/reset-auth`, {
      method: 'POST',
      body: JSON.stringify({ temp_password: tempPassword }),
    }),

  getPerformance: (id: string, from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    return adminFetch<EmployeePerformance>(`/employees/${id}/performance${qs.toString() ? '?' + qs.toString() : ''}`);
  },

  softDelete: (id: string) =>
    adminFetch<unknown>(`/employees/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────
//  PHASE 8 — EXPENSE TRACKING
// ─────────────────────────────────────────────────────────────

export interface Expense {
  id:           string;
  category:     string;
  description:  string;
  amount:       number;
  expense_date: string;
  reference?:   string | null;
  notes?:       string | null;
  vehicle?:     { id: string; stock_id: string; make: string; model: string; year: number } | null;
  created_by_emp?: { id: string; full_name: string; employee_code: string } | null;
  created_at:   string;
  updated_at:   string;
}

export interface ExpenseListResult {
  expenses:      Expense[];
  total:         number;
  page:          number;
  limit:         number;
  pages:         number;
  running_total: number;
}

export const expenseApi = {
  list: (params: Record<string, any> = {}): Promise<ExpenseListResult> =>
    adminFetch('/expenses?' + new URLSearchParams(params).toString()),

  getById: (id: string): Promise<Expense> =>
    adminFetch(`/expenses/${id}`),

  create: (input: Record<string, any>): Promise<Expense> =>
    adminFetch('/expenses', { method: 'POST', body: JSON.stringify(input) }),

  update: (id: string, input: Record<string, any>): Promise<Expense> =>
    adminFetch(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  delete: (id: string): Promise<{ deleted: boolean }> =>
    adminFetch(`/expenses/${id}`, { method: 'DELETE' }),

  getCategoryTotals: (date_from?: string, date_to?: string): Promise<{ by_category: Record<string, number>; grand_total: number }> => {
    const params = new URLSearchParams();
    if (date_from) params.set('date_from', date_from);
    if (date_to)   params.set('date_to', date_to);
    return adminFetch(`/expenses/totals?${params.toString()}`);
  },
};

// ─────────────────────────────────────────────────────────────
//  PHASE 9 — REPORTS & ANALYTICS
// ─────────────────────────────────────────────────────────────

export interface ReportPayload {
  title:       string;
  subtitle?:   string;
  filters?:    Record<string, string>;
  summary:     { label: string; value: string | number }[];
  columns:     { key: string; label: string; format?: string }[];
  rows:        Record<string, unknown>[];
  generatedAt: string;
  generatedBy: string;
  rowCount:    number;
}

export interface DashboardData {
  inventory:   { total_vehicles: number; available_stock: number; sold_vehicles: number; stock_value: number; potential_profit: number };
  crm:         { total_leads: number; open_leads: number; total_customers: number };
  sales:       { total_revenue: number; total_profit: number; pending_balances: number };
  commissions: { unpaid_amount: number };
  expenses:    { total_expenses: number };
  employees:   { active_count: number };
  net_position: number;
}

export const reportApi = {
  getDashboard: (): Promise<DashboardData> =>
    adminFetch('/reports/dashboard'),

  getSalesReport: (name: string, params: Record<string, string> = {}): Promise<ReportPayload> =>
    adminFetch(`/reports/${name}?` + new URLSearchParams(params).toString()),
};

// ─────────────────────────────────────────────────────────────
//  PHASE 10 — TRASH
// ─────────────────────────────────────────────────────────────

export interface TrashRecord {
  id:         string;
  deleted_at: string;
  deleted_by: string | null;
  [key: string]: any;
}

export const trashApi = {
  list: (type?: string): Promise<Record<string, TrashRecord[]>> => {
    const qs = type ? `?type=${type}` : '';
    return adminFetch(`/trash${qs}`);
  },

  restore: (type: string, id: string): Promise<{ message: string }> =>
    adminFetch(`/trash/${type}/${id}/restore`, { method: 'PATCH' }),

  permanentDelete: (type: string, id: string): Promise<{ message: string }> =>
    adminFetch(`/trash/${type}/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────
//  PHASE 12 — AUDIT LOGS
// ─────────────────────────────────────────────────────────────

export interface AuditLog {
  id:          string;
  timestamp:   string;
  actor_type:  string;
  actor_id:    string | null;
  actor_name:  string | null;
  module:      string;
  action:      string;
  entity_type: string | null;
  entity_id:   string | null;
  message:     string;
  metadata:    Record<string, unknown> | null;
  ip_address:  string | null;
  prev_hash:   string | null;
  row_hash:    string | null;
}

export interface AuditListParams {
  page?:        number;
  limit?:       number;
  module?:      string;
  action?:      string;
  actor_id?:    string;
  entity_type?: string;
  from?:        string;
  to?:          string;
  search?:      string;
}

export const auditApi = {
  list: (params: AuditListParams = {}): Promise<{ logs: AuditLog[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)); });
    return adminFetch(`/audit-logs?${qs.toString()}`);
  },

  verify: (): Promise<{ valid: boolean; firstBrokenAt?: string }> =>
    adminFetch('/audit-logs/verify'),

  stats: (): Promise<{ byModule: { module: string; count: number }[]; recentActions: AuditLog[] }> =>
    adminFetch('/audit-logs/stats'),
};


// ─────────────────────────────────────────────────────────────
// BACKUP TYPES  (append to bottom of src/lib/api.ts)
// ─────────────────────────────────────────────────────────────

export interface SystemBackup {
  id:              string;
  type:            'daily' | 'weekly' | 'manual';
  status:          'running' | 'success' | 'failed';
  triggered_by:    string;
  file_path:       string | null;
  file_name:       string | null;
  file_size_bytes: number | null;
  tables_included: string[] | null;
  row_counts:      Record<string, number> | null;
  error_message:   string | null;
  started_at:      string;
  completed_at:    string | null;
  duration_ms:     number | null;
}

export interface BackupStats {
  last_success:       SystemBackup | null;
  last_failure:       SystemBackup | null;
  total_backups:      number;
  successful_backups: number;
  failed_backups:     number;
  success_rate:       number;
  next_daily_at:      string;
  next_weekly_at:     string;
}

export interface BackupListParams {
  page?:   number;
  limit?:  number;
  type?:   'daily' | 'weekly' | 'manual';
  status?: 'running' | 'success' | 'failed';
}

// ─────────────────────────────────────────────────────────────
// BACKUP API
// ─────────────────────────────────────────────────────────────

export const backupApi = {
  list: (params: BackupListParams = {}): Promise<{
    backups: SystemBackup[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return adminFetch(`/backups?${qs.toString()}`);
  },

  stats: (): Promise<BackupStats> =>
    adminFetch('/backups/stats'),

  get: (id: string): Promise<SystemBackup> =>
    adminFetch(`/backups/${id}`),

  trigger: (type: 'daily' | 'weekly' | 'manual' = 'manual'): Promise<{
    backup_id: string;
    message:   string;
    success:   boolean;
  }> =>
    adminFetch('/backups/trigger', {
      method: 'POST',
      body:   JSON.stringify({ type }),
    }),

  getDownloadUrl: (id: string): Promise<{
    url:                string;
    file_name:          string;
    expires_in_seconds: number;
  }> =>
    adminFetch(`/backups/${id}/download`),

  delete: (id: string): Promise<{ message: string }> =>
    adminFetch(`/backups/${id}`, { method: 'DELETE' }),
};