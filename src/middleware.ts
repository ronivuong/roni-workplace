import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (token?.status === "INACTIVE") {
      return NextResponse.redirect(new URL("/login?error=inactive", req.url));
    }

    const role = token?.role as string | undefined;

    // Admin-only routes
    if (path.startsWith("/settings") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
    }

    // User management: Admin + Leader
    if (path.startsWith("/users") && role !== "ADMIN" && role !== "LEADER") {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
    }

    // Team write operations handled in API; page readable by all authenticated
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Public routes
        if (path === "/" || path === "/login") return true;
        // API auth always allowed
        if (path.startsWith("/api/auth")) return true;
        // Everything else needs token
        if (path.startsWith("/api/")) return !!token;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/content-studio/:path*",
    "/publish/:path*",
    "/video-studio/:path*",
    "/analytics/:path*",
    "/teams/:path*",
    "/users/:path*",
    "/agents/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/api/users/:path*",
    "/api/teams/:path*",
    "/api/notifications/:path*",
    "/api/upload/:path*",
    "/api/settings/:path*",
  ],
};
