import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Закрыто по умолчанию: без входа открыта только страница /login.
// /api сюда не входит: маршруты сами отвечают JSON с кодом 401.
export function proxy(request: NextRequest) {
  const signedIn = readSession(request.cookies.get(SESSION_COOKIE)?.value) !== null;
  const onLogin = request.nextUrl.pathname === "/login";

  if (!signedIn && !onLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (signedIn && onLogin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
