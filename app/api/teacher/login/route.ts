import { cookies } from "next/headers";
import {
  clientKey,
  createTeacherSession,
  isLockedOut,
  isTeacherCode,
  recordFailure,
  TEACHER_COOKIE,
} from "@/lib/teacher-session";

// Неверный код: всегда один ответ 401. После 5 неверных за 15 минут с одного адреса — 429,
// и верный код в это время тоже не принимается.
export async function POST(request: Request) {
  try {
    const key = clientKey(request);
    if (isLockedOut(key)) return Response.json({ error: "rate_limited" }, { status: 429 });

    const body: unknown = await request.json().catch(() => null);
    const { code } = (body ?? {}) as { code?: unknown };

    if (!isTeacherCode(code)) {
      recordFailure(key);
      return Response.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const session = createTeacherSession();
    (await cookies()).set(TEACHER_COOKIE, session.value, session.options);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
