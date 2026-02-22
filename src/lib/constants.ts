// ── Dealership info — update these with real values ───────────
export const DEALERSHIP = {
  name:      'Auto Prime',
  tagline:   'Sri Lanka\'s Trusted Car Dealership',
  phone:     '+94 11 234 5678',
  whatsapp:  '+94 77 234 5678',
  email:     'info@autoprime.lk',
  address:   '123 Galle Road, Colombo 03, Sri Lanka',
  mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.9!2d79.85!3d6.91!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwNTQnMjQuMCJOIDc5wrA1MScwLjAiRQ!5e0!3m2!1sen!2slk!4v1600000000000',
  workingHours: 'Mon – Sat: 9:00 AM – 6:00 PM',
  social: {
    facebook:  'https://facebook.com/autoprimelk',
    instagram: 'https://instagram.com/autoprimelk',
  },
} as const;

// ── Vehicle enums ─────────────────────────────────────────────
export const BODY_TYPES = [
  { value: 'sedan',       label: 'Sedan'       },
  { value: 'suv',         label: 'SUV'         },
  { value: 'hatchback',   label: 'Hatchback'   },
  { value: 'van',         label: 'Van'         },
  { value: 'pickup',      label: 'Pickup'      },
  { value: 'coupe',       label: 'Coupe'       },
  { value: 'convertible', label: 'Convertible' },
  { value: 'wagon',       label: 'Wagon'       },
  { value: 'other',       label: 'Other'       },
] as const;

export const FUEL_TYPES = [
  { value: 'petrol',   label: 'Petrol'   },
  { value: 'diesel',   label: 'Diesel'   },
  { value: 'hybrid',   label: 'Hybrid'   },
  { value: 'electric', label: 'Electric' },
] as const;

export const TRANSMISSIONS = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual',    label: 'Manual'    },
  { value: 'cvt',       label: 'CVT'       },
] as const;

export const CONDITIONS = [
  { value: 'used',          label: 'Used'          },
  { value: 'reconditioned', label: 'Reconditioned' },
  { value: 'brand_new',     label: 'Brand New'     },
] as const;

export const CONTACT_SUBJECTS = [
  'General Enquiry',
  'Vehicle Enquiry',
  'Book a Test Drive',
  'Finance Enquiry',
  'Trade-In Valuation',
  'After-Sales Service',
  'Other',
] as const;

// ── Sort options for inventory page ──────────────────────────
export const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First'    },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'year_desc',  label: 'Year: Newest'    },
  { value: 'year_asc',   label: 'Year: Oldest'    },
] as const;

// ── Role labels ───────────────────────────────────────────────
export const ROLE_LABELS: Record<string, string> = {
  admin:       'Administrator',
  manager:     'Manager',
  salesperson: 'Sales Executive',
  accountant:  'Accountant',
};
