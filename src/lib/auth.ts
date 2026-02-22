import { createClient } from './supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface LoginResult {
  status:
    | 'mfa_required'
    | 'mfa_setup_required'
    | 'password_change_required'
    | 'success'
    | 'error';
  factorId?: string;
  error?: string;
}

export interface MfaEnrollResult {
  status: 'success' | 'error';
  factorId?: string;
  qrCode?: string;
  secret?: string;
  error?: string;
}

export interface EmployeeProfile {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  totp_enabled: boolean;
  must_change_password: boolean;
  permissions: Record<string, boolean>;
}

// ─────────────────────────────────────────────────────────────
// SIGN IN
// ─────────────────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string
): Promise<LoginResult> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { status: 'error', error: error.message };
  }

  if (!data) {
    return { status: 'error', error: 'Authentication failed' };
  }

  // If no session but user exists → MFA required
  if (!data.session && data.user) {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp?.[0];

    if (totpFactor?.status === 'verified') {
      return { status: 'mfa_required', factorId: totpFactor.id };
    }

    return { status: 'mfa_setup_required' };
  }

  if (data.session) {
    // Check password change flag
    const { data: empData } = await supabase
      .from('employees')
      .select('must_change_password')
      .eq('auth_user_id', data.user?.id)
      .single();

    if (empData?.must_change_password) {
      return { status: 'password_change_required' };
    }

    // Check MFA
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp?.[0];

    if (!totpFactor || totpFactor.status !== 'verified') {
      return { status: 'mfa_setup_required' };
    }

    return { status: 'success' };
  }

  return { status: 'error', error: 'Unexpected authentication state' };
}

// ─────────────────────────────────────────────────────────────
// VERIFY MFA
// ─────────────────────────────────────────────────────────────

export async function verifyMfa(
  factorId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      return { success: false, error: challengeError.message };
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      return { success: false, error: 'Invalid code. Please try again.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'MFA verification failed' };
  }
}

// ─────────────────────────────────────────────────────────────
// ENROLL MFA
// ─────────────────────────────────────────────────────────────

export async function enrollMfa(): Promise<MfaEnrollResult> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (error) {
      return { status: 'error', error: error.message };
    }

    return {
      status: 'success',
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    };
  } catch (err: any) {
    return { status: 'error', error: err?.message || 'Failed to set up MFA' };
  }
}

// ─────────────────────────────────────────────────────────────
// VERIFY ENROLLED MFA
// ─────────────────────────────────────────────────────────────

export async function verifyEnrolledMfa(
  factorId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError)
      return { success: false, error: challengeError.message };

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      return {
        success: false,
        error: 'Invalid code. Check your authenticator app.',
      };
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session && API_URL) {
      await fetch(`${API_URL}/auth/mfa-setup-complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'MFA verification failed' };
  }
}

// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────

export async function changePassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    if (!API_URL) {
      return { success: false, error: 'NEXT_PUBLIC_API_URL is not set' };
    }

    const { data: { session }, error: sessionErr } =
      await supabase.auth.getSession();

    if (sessionErr) return { success: false, error: sessionErr.message };
    if (!session) return { success: false, error: 'Not authenticated' };

    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ new_password: newPassword }),
    });

    const text = await res.text();
    let json: any = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON response
    }

    if (!res.ok) {
      return {
        success: false,
        error:
          json?.error?.message ||
          json?.message ||
          text ||
          `Request failed (${res.status})`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

// ─────────────────────────────────────────────────────────────
// GET PROFILE
// ─────────────────────────────────────────────────────────────

export async function getMe(): Promise<EmployeeProfile | null> {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !API_URL) return null;

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const text = await res.text();
    let json: any = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch {}

    if (!res.ok) return null;

    return json?.data ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session && API_URL) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }).catch(() => {});
  }

  await supabase.auth.signOut();
}