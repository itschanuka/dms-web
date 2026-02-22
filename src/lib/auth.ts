import { createClient } from './supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// ── Types ─────────────────────────────────────────────────────

export interface LoginResult {
  status: 'mfa_required' | 'mfa_setup_required' | 'password_change_required' | 'success' | 'error';
  factorId?: string;
  error?:    string;
}

export interface MfaEnrollResult {
  status:    'success' | 'error';
  factorId?: string;
  qrCode?:   string;   // data URI for QR code image
  secret?:   string;   // manual entry key
  error?:    string;
}

export interface EmployeeProfile {
  id:                   string;
  employee_code:        string;
  full_name:            string;
  email:                string;
  role:                 string;
  status:               string;
  totp_enabled:         boolean;
  must_change_password: boolean;
  permissions: {
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
  };
}

// ── Auth functions ────────────────────────────────────────────

/**
 * Step 1: Sign in with email + password.
 * Returns what the next step should be:
 *   - mfa_required:          has MFA, needs to verify code
 *   - mfa_setup_required:    no MFA set up yet, must enroll
 *   - password_change_required: must change temp password first
 *   - success:               no MFA required (shouldn't happen in prod)
 */
export async function signIn(email: string, password: string): Promise<LoginResult> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: 'error', error: error.message };
  }

  // Check next_step from Supabase MFA
  if (data.session === null && data.user) {
    // Supabase indicates MFA required — need to complete challenge
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp?.[0];

    if (totpFactor?.status === 'verified') {
      return { status: 'mfa_required', factorId: totpFactor.id };
    } else {
      // User exists but no verified TOTP factor — need to enroll
      return { status: 'mfa_setup_required' };
    }
  }

  if (data.session) {
    // Check if password change is needed
    const { data: empData } = await supabase
      .from('employees')
      .select('must_change_password')
      .eq('auth_user_id', data.user?.id)
      .single();

    if (empData?.must_change_password) {
      return { status: 'password_change_required' };
    }

    // Check if MFA is set up
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp?.[0];

    if (!totpFactor || totpFactor.status !== 'verified') {
      return { status: 'mfa_setup_required' };
    }

    return { status: 'success' };
  }

  return { status: 'error', error: 'Unexpected authentication state' };
}

/**
 * Step 2a: Verify TOTP code (for users who have MFA set up)
 */
export async function verifyMfa(factorId: string, code: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Create a challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      return { success: false, error: challengeError.message };
    }

    // Verify the code against the challenge
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      return { success: false, error: 'Invalid code. Please try again.' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'MFA verification failed' };
  }
}

/**
 * Step 2b: Enroll TOTP (for first-time MFA setup)
 * Returns QR code URI and secret for display.
 */
export async function enrollMfa(): Promise<MfaEnrollResult> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });

    if (error) {
      return { status: 'error', error: error.message };
    }

    return {
      status:   'success',
      factorId: data.id,
      qrCode:   data.totp.qr_code,   // SVG data URI
      secret:   data.totp.secret,     // Manual entry key
    };
  } catch {
    return { status: 'error', error: 'Failed to set up MFA' };
  }
}

/**
 * Step 2b (continued): Verify the enrolled factor to activate it
 */
export async function verifyEnrolledMfa(
  factorId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) return { success: false, error: challengeError.message };

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      return { success: false, error: 'Invalid code. Check your authenticator app and try again.' };
    }

    // Notify backend to set totp_enabled = true in employees table
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetch(`${API_URL}/auth/mfa-setup-complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type':  'application/json',
        },
      });
    }

    return { success: true };
  } catch {
    return { success: false, error: 'MFA verification failed' };
  }
}

/**
 * Change password (first-login mandatory)
 */
export async function changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Not authenticated' };

    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ new_password: newPassword }),
    });

    const json = await res.json() as { success: boolean; error?: { message: string } };
    if (!json.success) {
      return { success: false, error: json.error?.message ?? 'Password change failed' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Network error' };
  }
}

/**
 * Fetch the authenticated employee profile from the backend.
 */
export async function getMe(): Promise<EmployeeProfile | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    });
    const json = await res.json() as { success: boolean; data?: EmployeeProfile };
    return json.success ? (json.data ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * Sign out — clears Supabase session and notifies backend.
 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    }).catch(() => {/* ignore */});
  }

  await supabase.auth.signOut();
}
