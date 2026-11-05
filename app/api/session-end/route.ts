import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Сюда ведёт страница ученика, которого исключили, пока cookie ещё жила.
// Стираем cookie и открываем /login, иначе proxy вернул бы вошедшего с /login на главную.
export async function GET(request: Request) {
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", request.url));
}
