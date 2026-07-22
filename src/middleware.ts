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

    if (path.startsWith("/settings") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
    }

    if (path.startsWith("/users") && role !== "ADMIN" && role !== "LEADER") {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path === "/" || path === "/login") return true;
        if (path.startsWith("/api/auth")) return true;
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
    // Include base paths AND nested (Next matcher quirks)
    "/api/users",
    "/api/users/:path*",
    "/api/teams",
    "/api/teams/:path*",
    "/api/notifications",
    "/api/notifications/:path*",
    "/api/upload/:path*",
    "/api/settings/:path*",
    "/api/content",
    "/api/content/:path*",
    "/api/agents",
    "/api/agents/:path*",
    "/api/platforms",
    "/api/platforms/:path*",
  ],
};
