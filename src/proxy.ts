import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getRoleHome, type UserRole } from "@/types/auth";

function allowedRoles(pathname: string): UserRole[] {
  if (pathname.startsWith("/admin")) return ["ADMIN"];
  if (pathname.startsWith("/cozinha") || pathname.startsWith("/print/cozinha")) {
    return ["ADMIN", "KITCHEN"];
  }
  if (pathname.startsWith("/entregador") || pathname.startsWith("/print/entrega")) {
    return ["ADMIN", "DELIVERY"];
  }
  return [];
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) return response;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data: authData } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!authData.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,active")
    .eq("id", authData.user.id)
    .maybeSingle<{ role: UserRole; active: boolean }>();

  if (!profile?.active || !allowedRoles(pathname).includes(profile.role)) {
    return NextResponse.redirect(new URL(getRoleHome(profile?.role ?? "CUSTOMER"), request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/cozinha/:path*",
    "/entregador/:path*",
    "/print/cozinha/:path*",
    "/print/entrega/:path*",
  ],
};
