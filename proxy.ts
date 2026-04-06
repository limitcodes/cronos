import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await auth.api.getSession({ headers: request.headers });
  const publicPaths = new Set(["/", "/login"]);

  if (!session && !publicPaths.has(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (session && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/new", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
