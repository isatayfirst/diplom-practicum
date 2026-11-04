import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "session";

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function sign(payload: string): Buffer {
  const secret = process.env.SESSION_SECRET;
  // Пустой ключ дал бы подпись, которую может повторить кто угодно.
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return createHmac("sha256", secret).update(payload).digest();
}

// В cookie только id ученика и срок: `id.срок.подпись`.
export function createSession(studentId: string) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${studentId}.${expires}`;
  return {
    value: `${payload}.${sign(payload).toString("base64url")}`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  } as const;
}

// Возвращает id ученика. Подделанная или просроченная cookie равна её отсутствию.
export function readSession(value: string | undefined): string | null {
  const [studentId, expires, signature, ...rest] = value?.split(".") ?? [];
  if (!studentId || !expires || !signature || rest.length > 0) return null;

  const expected = sign(`${studentId}.${expires}`);
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  return Number(expires) > Date.now() / 1000 ? studentId : null;
}
