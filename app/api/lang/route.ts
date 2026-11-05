import { NextResponse } from "next/server";
import { LANG_COOKIE, LANG_MAX_AGE_SECONDS, LOCALES } from "@/lib/t";

// Возврат только на страницу этого же сайта: чужой или отсутствующий Referer ведёт на главную.
function returnPath(request: Request): string {
  const referer = request.headers.get("referer");
  if (!referer) return "/";
  try {
    const from = new URL(referer);
    return from.origin === new URL(request.url).origin ? `${from.pathname}${from.search}` : "/";
  } catch {
    return "/";
  }
}

// Выбор языка: cookie без личных данных. Сессия не нужна: язык выбирают и на странице входа.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const lang = form?.get("lang");
  if (typeof lang !== "string" || !(LOCALES as readonly string[]).includes(lang)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const response = NextResponse.redirect(new URL(returnPath(request), request.url), 303);
  response.cookies.set(LANG_COOKIE, lang, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LANG_MAX_AGE_SECONDS,
  });
  return response;
}
