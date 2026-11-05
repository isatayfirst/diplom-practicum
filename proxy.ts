import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { readTeacherSession, TEACHER_COOKIE } from "@/lib/teacher-session";

// Закрыто по умолчанию: без входа открыта только страница /login.
// /api сюда не входит: маршруты сами отвечают JSON с кодом 401.
// /teacher живёт по своей cookie: сессия ученика кабинет не открывает.
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path === "/teacher" || path.startsWith("/teacher/")) {
    const isTeacher = readTeacherSession(request.cookies.get(TEACHER_COOKIE)?.value);
    const onTeacherLogin = path === "/teacher/login";
    if (!isTeacher && !onTeacherLogin) return NextResponse.redirect(new URL("/teacher/login", request.url));
    if (isTeacher && onTeacherLogin) return NextResponse.redirect(new URL("/teacher", request.url));
    return NextResponse.next();
  }

  const signedIn = readSession(request.cookies.get(SESSION_COOKIE)?.value) !== null;
  const onLogin = path === "/login";

  if (!signedIn && !onLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (signedIn && onLogin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
