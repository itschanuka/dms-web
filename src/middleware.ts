import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js middleware — runs on every request before rendering.
 *
 * Protection rules:
 *   /admin/* → must be authenticated with a valid session
 *   /        → public (redirects to /admin if already logged in)
 *   /login   → public (redirects to /admin if already logged in)
 *
 * Note: Supabase session refresh is handled here automatically.
 * The MFA AAL check is done at the API layer (backend) — middleware
 * only needs to verify a session exists.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: always await this before reading session
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect /admin/* routes
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // User is authenticated — let the page handle further checks
    // (password change required, MFA setup required, etc.)
    return supabaseResponse;
  }

  // Redirect authenticated users away from login
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - /api/* (API routes handled separately)
     * - /public/* paths
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
