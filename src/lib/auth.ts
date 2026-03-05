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

  // If no session but user exists → Supabase already requires MFA
  if (!data.session && data.user) {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp?.[0];

    if (totpFactor?.status === 'verified') {
      return { status: 'mfa_required', factorId: totpFactor.id };
    }

    return { status: 'mfa_setup_required' };
  }

  if (data.session) {
    // Check password change flag first
    const { data: empData } = await supabase
      .from('employees')
      .select('must_change_password')
      .eq('auth_user_id', data.user?.id)
      .single();

    if (empData?.must_change_password) {
      return { status: 'password_change_required' };
    }

    // Check MFA enrollment
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp?.[0];

    if (!totpFactor || totpFactor.status !== 'verified') {
      return { status: 'mfa_setup_required' };
    }

    return { status: 'mfa_required', factorId: totpFactor.id };
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
//
// FIX: Before enrolling, unenroll any stale unverified TOTP factors.
// When a manager changes their password, Supabase nukes the session.
// If a previous enroll attempt left a dangling unverified factor,
// mfa.enroll() throws "invalid claim: missing sub claim". Cleaning
// stale factors first prevents that.
// ─────────────────────────────────────────────────────────────

export async function enrollMfa(): Promise<MfaEnrollResult> {
  const supabase = createClient();

  try {
    // Clean up any existing unverified TOTP factors first
    const { data: existingFactors } = await supabase.auth.mfa.listFactors();
    const unverifiedFactors =
      existingFactors?.totp?.filter((f) => f.status !== 'verified') ?? [];

    for (const factor of unverifiedFactors) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }

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

    const {
      data: { session },
    } = await supabase.auth.getSession();

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
//
// FIX: Supabase's Admin API (used server-side) invalidates the current
// session token when the password is updated. So by the time the user
// lands on /setup-mfa, their JWT is dead and mfa.enroll() throws
// "invalid claim: missing sub claim".
//
// Fix: grab email before the session dies, then immediately re-sign-in
// with the new password after the API call succeeds to restore a fresh
// live session. /setup-mfa now has a valid JWT to call mfa.enroll().
// ─────────────────────────────────────────────────────────────

export async function changePassword(
  newPassword: string,
  credentials?: { email: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    if (!API_URL) {
      return { success: false, error: 'NEXT_PUBLIC_API_URL is not set' };
    }

    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) return { success: false, error: sessionErr.message };
    if (!session) return { success: false, error: 'Not authenticated' };

    // Capture email BEFORE the session gets killed by the password change
    const userEmail = credentials?.email ?? session.user.email ?? '';

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

    // ── THE ACTUAL FIX ────────────────────────────────────────
    // Re-sign in with the new password to restore a fresh live session.
    // Without this, the next page (/setup-mfa) calls mfa.enroll() with
    // a dead JWT and Supabase rejects it: "invalid claim: missing sub claim".
    // ─────────────────────────────────────────────────────────
    if (userEmail) {
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: newPassword,
      });

      if (reAuthError) {
        // Re-auth failed — session is fully dead, boot back to login
        return {
          success: false,
          error: `Password changed but re-authentication failed: ${reAuthError.message}. Please log in again.`,
        };
      }
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

  const {
    data: { session },
  } = await supabase.auth.getSession();
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
  const {
    data: { session },
  } = await supabase.auth.getSession();

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