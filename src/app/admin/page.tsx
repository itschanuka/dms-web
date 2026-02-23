'use client';

import AdminShell from '@/components/admin/AdminShell';
import Link from 'next/link';

export default function AdminDashboard() {
  const modules = [
    { href: '/admin/inventory', icon: '🚗', label: 'Inventory',  desc: 'Manage vehicles',   color: '#6366f1' },
    { href: '/admin/crm',       icon: '📋', label: 'CRM',        desc: 'Lead pipeline',     color: '#0ea5e9' },
    { href: '/admin/deals',     icon: '🤝', label: 'Deals',      desc: 'Sales management',  color: '#10b981' },
    { href: '/admin/customers', icon: '👤', label: 'Customers',  desc: 'Customer database', color: '#f59e0b' },
    { href: '/admin/employees', icon: '👥', label: 'Employees',  desc: 'Staff management',  color: '#8b5cf6' },
    { href: '/admin/reports',   icon: '📈', label: 'Reports',    desc: 'Analytics',         color: '#ef4444' },
  ];

  return (
    <AdminShell>
      <div style={{ padding: '40px 28px' }}>

        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#5c7090', margin: '6px 0 0' }}>
            Full KPI analytics coming in Phase 13. Click a module to get started.
          </p>
        </div>

        {/* Phase 0 complete banner */}
        <div style={{
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <span style={{ fontSize: 28 }}>✅</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399', marginBottom: 2 }}>
              Phase 0 — Foundation complete
            </div>
            <div style={{ fontSize: 13, color: '#5c7090' }}>
              Authentication is working. DB migrations ran. Audit log is recording.
            </div>
          </div>
        </div>

        {/* Module grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {modules.map(m => (
            <Link key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: '#0d1117', border: '1px solid #1f2d45', borderRadius: 12,
                  padding: '24px 20px', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#253550')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#1f2d45')}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{m.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: '#5c7090' }}>{m.desc}</div>
                <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, color: m.color }}>Open →</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Phase 2 active notice */}
        <div style={{
          marginTop: 32,
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 12,
          padding: '18px 20px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>
            ✓ Phase 2 — Inventory System Active
          </div>
          <div style={{ fontSize: 12, color: '#5c7090' }}>
            You can now add vehicles, track costs, upload photos, manage status, and toggle website visibility.
          </div>
        </div>

      </div>
    </AdminShell>
  );
}