import AdminShell from '@/components/admin/AdminShell';
import VehicleForm from '@/components/admin/VehicleForm';
import Link from 'next/link';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap');

  .nvp-root {
    --nvp-font:        'DM Sans', sans-serif;
    --nvp-bg:          #0b0f1a;
    --nvp-surface:     #111827;
    --nvp-border:      rgba(255,255,255,0.07);
    --nvp-text:        #edf2fc;
    --nvp-text-c:      #536880;
    --nvp-accent:      #6366f1;
    --nvp-accent-glow: rgba(99,102,241,0.2);
    --nvp-radius-lg:   14px;
  }

  .nvp-root * { box-sizing: border-box; font-family: var(--nvp-font); }

  .nvp-root { padding: 32px 28px; background: var(--nvp-bg); min-height: 100%; }

  /* Back link */
  .nvp-back {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 600; color: var(--nvp-text-c);
    text-decoration: none; margin-bottom: 14px;
    transition: color 0.15s, gap 0.15s;
  }
  .nvp-back:hover { color: var(--nvp-text); gap: 8px; }
  .nvp-back-arrow { transition: transform 0.15s; }
  .nvp-back:hover .nvp-back-arrow { transform: translateX(-2px); }

  /* Header */
  .nvp-header { margin-bottom: 28px; }
  .nvp-title  { font-size: 24px; font-weight: 900; color: var(--nvp-text); margin: 0; letter-spacing: -0.5px; }
  .nvp-sub    { font-size: 13px; color: var(--nvp-text-c); margin: 6px 0 0; }

  /* Form card */
  .nvp-card {
    background: var(--nvp-surface);
    border: 1px solid var(--nvp-border);
    border-radius: var(--nvp-radius-lg);
    padding: 28px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.35);
  }
`;

export default function NewVehiclePage() {
  return (
    <AdminShell>
      <style>{CSS}</style>

      <div className="nvp-root">
        <div className="nvp-header">
          <Link href="/admin/inventory" className="nvp-back">
            <span className="nvp-back-arrow">←</span> Back to Inventory
          </Link>
          <h1 className="nvp-title">Add New Vehicle</h1>
          <p className="nvp-sub">Stock ID will be auto-generated when you save.</p>
        </div>

        <div className="nvp-card">
          <VehicleForm mode="create" />
        </div>
      </div>
    </AdminShell>
  );
}