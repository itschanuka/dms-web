'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useMemo } from 'react';

export default function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { employee, isLoading, isSignedIn, signOut } = useAuth();

  // Keep routes consistent + avoid typos everywhere
  const routes = useMemo(() => {
    return {
      login: '/admin/login',
      changePassword: '/admin/change-password',
      dashboard: '/admin',
    };
  }, []);

  // Guard 1: if not signed in -> go to admin login
  useEffect(() => {
    if (isLoading) return;

    if (!isSignedIn) {
      // avoid re-redirect spam
      if (pathname !== routes.login) router.replace(routes.login);
      return;
    }
  }, [isLoading, isSignedIn, pathname, router, routes.login]);

  // Guard 2: signed in but forced password change -> go change password
  useEffect(() => {
    if (isLoading) return;

    if (isSignedIn && employee?.must_change_password) {
      if (pathname !== routes.changePassword) router.replace(routes.changePassword);
    }
  }, [isLoading, isSignedIn, employee?.must_change_password, pathname, router, routes.changePassword]);

  // Loading UI
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#07090f',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p style={{ color: '#5c7090', fontSize: 14 }}>Loading…</p>
        </div>
      </div>
    );
  }

  // If not signed in OR employee not loaded yet, don't render dashboard content.
  // Redirects above handle navigation.
  if (!isSignedIn || !employee) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#07090f', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header
        style={{
          background: '#0d1117',
          borderBottom: '1px solid #1f2d45',
          padding: '0 32px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 700,
              color: '#818cf8',
              letterSpacing: '0.08em',
            }}
          >
            DMS
          </div>
          <span style={{ fontSize: 14, color: '#5c7090' }}>Dealership Management System</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: '#dde4f0', fontWeight: 600 }}>{employee.full_name}</div>
            <div style={{ fontSize: 11, color: '#5c7090', textTransform: 'capitalize' }}>{employee.role}</div>
          </div>

          <button
            onClick={() => void signOut()}
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 6,
              color: '#fca5a5',
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: '48px 32px', maxWidth: 900, margin: '0 auto' }}>
        {/* Phase 0 complete banner */}
        <div
          style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span style={{ fontSize: 28 }}>✅</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399', marginBottom: 2 }}>
              Phase 0 — Foundation complete
            </div>
            <div style={{ fontSize: 13, color: '#5c7090' }}>
              Authentication is working. DB migrations ran. Audit log is recording. Ready for Phase 1.
            </div>
          </div>
        </div>

        {/* Employee card */}
        <div
          style={{
            background: '#0d1117',
            border: '1px solid #1f2d45',
            borderRadius: 12,
            padding: '24px 28px',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#5c7090',
              marginBottom: 16,
            }}
          >
            Your account
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20 }}>
            {[
              { label: 'Name', value: employee.full_name },
              { label: 'Code', value: employee.employee_code },
              { label: 'Role', value: employee.role },
              { label: 'MFA', value: employee.totp_enabled ? 'Enabled ✓' : 'Not set up' },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: 11, color: '#5c7090', marginBottom: 4, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 14, color: '#dde4f0', fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Coming soon modules */}
        <div
          style={{
            background: '#0d1117',
            border: '1px solid #1f2d45',
            borderRadius: 12,
            padding: '24px 28px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#5c7090',
              marginBottom: 16,
            }}
          >
            Modules — coming in future phases
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {[
              { icon: '🌐', label: 'Public Site', phase: 1 },
              { icon: '🚗', label: 'Inventory', phase: 2 },
              { icon: '👥', label: 'Customers', phase: 3 },
              { icon: '📊', label: 'CRM / Leads', phase: 4 },
              { icon: '💼', label: 'Sales', phase: 5 },
              { icon: '💰', label: 'Commissions', phase: 6 },
              { icon: '👤', label: 'Employees', phase: 7 },
              { icon: '📋', label: 'Expenses', phase: 8 },
              { icon: '📈', label: 'Reports', phase: 9 },
            ].map((mod) => (
              <div
                key={mod.label}
                style={{
                  background: '#111827',
                  border: '1px solid #1f2d45',
                  borderRadius: 8,
                  padding: '12px 14px',
                  opacity: 0.5,
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 6 }}>{mod.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#8097b8' }}>{mod.label}</div>
                <div style={{ fontSize: 10, color: '#3a4e6a', marginTop: 2 }}>Phase {mod.phase}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}