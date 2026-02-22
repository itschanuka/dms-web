import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

/**
 * Next.js middleware — runs on every request before rendering.
 *
 * Protection rules:
 *   /admin/* → must be authenticated with a valid session
 *   /        → public
 *   /login   → public (redirects to /admin if already logged in)
 *
 * Note: Supabase session refresh is handled here automatically.
 */
export async function middleware(request: NextRequest) {
  // Start with a response we can attach cookies to
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Update the incoming request cookies (so downstream handlers see them)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          // Recreate response so it carries updated request context
          response = NextResponse.next({ request });

          // Set cookies on the outgoing response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: refresh session before checking user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect /admin/* routes
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // Redirect authenticated users away from login
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};