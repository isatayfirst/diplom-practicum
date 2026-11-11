import { cookies } from "next/headers";
import { isLocale, LANG_COOKIE } from "@/lib/i18n";

// Выбор языка: cookie без персональных данных, действует для ученика и учителя.
// Сессия не нужна: язык нужен и на страницах входа.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const lang = typeof body === "object" && body !== null ? (body as { lang?: unknown }).lang : undefined;
  if (!isLocale(lang)) return Response.json({ error: "bad_request" }, { status: 400 });

  (await cookies()).set(LANG_COOKIE, lang, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  return Response.json({ ok: true });
}
