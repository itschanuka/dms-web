import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

const ADMIN_AUTH_PAGES = new Set([
  '/admin/login',
  '/admin/change-password',
  '/admin/setup-mfa',
  '/admin/verify-mfa',
]);

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
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            if (options) supabaseResponse.cookies.set(name, value, options);
            else supabaseResponse.cookies.set(name, value);
          });
        },
      },
    }
  );

  // Refresh session (cookie-based)
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ✅ Protect /admin/* but allow the admin auth pages
  if (pathname.startsWith('/admin')) {
    // allow the auth pages to load even without a session
    if (ADMIN_AUTH_PAGES.has(pathname)) {
      // if already logged in, keep them out of login page
      if (pathname === '/admin/login' && user) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return supabaseResponse;
    }

    // everything else under /admin requires session
    if (!user) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

  // ✅ Optional: if someone visits /login, send them to the real login page
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Public routes
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};