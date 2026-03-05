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
// FIX: Cleans up stale unverified TOTP factors before enrolling.
// A dangling unverified factor from a previous failed attempt causes
// mfa.enroll() to throw "invalid claim: missing sub claim".
// ─────────────────────────────────────────────────────────────

export async function enrollMfa(): Promise<MfaEnrollResult> {
  const supabase = createClient();

  try {
    // Verify we actually have a live session before even trying
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { status: 'error', error: 'SESSION_EXPIRED' };
    }

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
//
// ROOT FIX FOR THE "missing sub claim" BUG:
//
// Supabase's Admin API (supabaseAdmin.auth.admin.updateUserById)
// invalidates the current session token when it updates the password.
// So after this API call returns, the client JWT is dead.
// The next page (/setup-mfa) calls mfa.enroll() which needs a live
// JWT — without re-auth it throws "invalid claim: missing sub claim".
//
// Fix: capture the email before the session dies, then immediately
// call signInWithPassword with the NEW password to restore a fresh
// live session. /setup-mfa will now have a valid JWT.
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

    const { data: { session }, error: sessionErr } =
      await supabase.auth.getSession();

    if (sessionErr) return { success: false, error: sessionErr.message };
    if (!session) return { success: false, error: 'Not authenticated' };

    // Grab email BEFORE the session gets killed by the password change
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

    // ── THE FIX ───────────────────────────────────────────────
    // Re-sign in with the new password to restore a fresh session.
    // The Admin API password update killed the old JWT. Without this
    // re-auth, mfa.enroll() on /setup-mfa throws "missing sub claim".
    // ─────────────────────────────────────────────────────────
    if (userEmail) {
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: newPassword,
      });

      if (reAuthError) {
        return {
          success: false,
          error: `PASSWORD_CHANGED_REAUTH_FAILED: ${reAuthError.message}`,
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