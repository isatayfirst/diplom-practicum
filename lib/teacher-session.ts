import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const TEACHER_COOKIE = "teacher";

const TEACHER_MAX_AGE_SECONDS = 8 * 60 * 60;

function secrets() {
  const sessionSecret = process.env.SESSION_SECRET;
  const teacherCode = process.env.TEACHER_SECRET_CODE;
  // Пустой ключ или пустой код дали бы подпись или вход, доступные кому угодно.
  if (!sessionSecret) throw new Error("SESSION_SECRET is not set");
  if (!teacherCode) throw new Error("TEACHER_SECRET_CODE is not set");
  return { sessionSecret, teacherCode };
}

// Подпись привязана к метке «teacher» и к самому коду учителя: cookie ученика
// кабинет не открывает, а смена кода сразу гасит все выданные сессии учителя.
function sign(payload: string): Buffer {
  const { sessionSecret, teacherCode } = secrets();
  return createHmac("sha256", sessionSecret).update(`teacher|${teacherCode}|${payload}`).digest();
}

// Сравнение без утечки по времени: обе строки сначала сворачиваются в SHA-256 одной длины.
export function isTeacherCode(candidate: unknown): boolean {
  if (typeof candidate !== "string" || candidate.length === 0 || candidate.length > 256) return false;
  const { sessionSecret, teacherCode } = secrets();
  const fold = (value: string) => createHmac("sha256", sessionSecret).update(`code|${value}`).digest();
  return timingSafeEqual(fold(candidate), fold(teacherCode));
}

// В cookie только срок и подпись: `срок.подпись`.
export function createTeacherSession() {
  const expires = Math.floor(Date.now() / 1000) + TEACHER_MAX_AGE_SECONDS;
  const payload = String(expires);
  return {
    value: `${payload}.${sign(payload).toString("base64url")}`,
    options: {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TEACHER_MAX_AGE_SECONDS,
    },
  } as const;
}

export function readTeacherSession(value: string | undefined): boolean {
  const [expires, signature, ...rest] = value?.split(".") ?? [];
  if (!expires || !signature || rest.length > 0 || !/^\d+$/.test(expires)) return false;

  const expected = sign(expires);
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;

  return Number(expires) > Date.now() / 1000;
}

// Неверные коды: 5 за 15 минут на адрес, потом отказ даже для верного кода.
// Счётчик в памяти процесса: на Vercel у каждого экземпляра он свой.
const FAIL_LIMIT = 5;
const FAIL_WINDOW_MS = 15 * 60_000;
const failures = new Map<string, number[]>();

function recent(key: string, now: number) {
  return (failures.get(key) ?? []).filter((time) => now - time < FAIL_WINDOW_MS);
}

export function isLockedOut(key: string): boolean {
  return recent(key, Date.now()).length >= FAIL_LIMIT;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  failures.set(key, [...recent(key, now), now]);
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}
