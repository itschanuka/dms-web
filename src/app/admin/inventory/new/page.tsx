import AdminShell from '@/components/admin/AdminShell';
import VehicleForm from '@/components/admin/VehicleForm';
import Link from 'next/link';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap');

  .nvp {
    --bg:      #0b0f1a;
    --surface: #111827;
    --border:  rgba(255,255,255,0.07);
    --text:    #edf2fc;
    --text-c:  #536880;
    --text-b:  #a8bdd6;
    --font:    'DM Sans', sans-serif;
    --r-lg:    14px;
  }

  .nvp * { box-sizing: border-box; font-family: var(--font); }
  .nvp { background: var(--bg); min-height: 100%; padding: 32px 28px; }

  .nvp-back {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 600; color: var(--text-c);
    text-decoration: none; margin-bottom: 14px;
    transition: color 0.15s, gap 0.15s;
  }
  .nvp-back:hover { color: var(--text-b); gap: 8px; }

  .nvp-header { margin-bottom: 28px; }
  .nvp-title  { font-size: 23px; font-weight: 900; color: var(--text); margin: 0; letter-spacing: -0.5px; }
  .nvp-sub    { font-size: 13px; color: var(--text-c); margin: 6px 0 0; }

  .nvp-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 28px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.3);
  }
`;

export default function NewVehiclePage() {
  return (
    <AdminShell>
      <style>{CSS}</style>
      <div className="nvp">
        <div className="nvp-header">
          <Link href="/admin/inventory" className="nvp-back">← Back to Inventory</Link>
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