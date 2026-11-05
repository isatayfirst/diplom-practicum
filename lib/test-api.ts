import "server-only";
import { cookies } from "next/headers";
import { allowRequest } from "@/lib/rate-limit";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { getStudentClass, getTestState, isTestKind, type TestState } from "@/lib/tests";

type Prepared =
  | { response: Response }
  | { response: null; studentId: string; state: TestState; body: Record<string, unknown> };

// Общая часть API теста: сессия, лимит, тело, и отказ для закрытого и завершённого теста.
// Проверка идёт на сервере по данным базы. Ученик определяется только по cookie.
export async function prepareTestRequest(request: Request): Promise<Prepared> {
  const studentId = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!studentId) return { response: Response.json({ error: "unauthorized" }, { status: 401 }) };
  // Свой счётчик на тесты: 30 запросов за скользящую минуту, как у /api/answer.
  if (!allowRequest(`test:${studentId}`)) {
    return { response: Response.json({ error: "rate_limited" }, { status: 429 }) };
  }

  const parsed: unknown = await request.json().catch(() => null);
  const body = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
  if (!isTestKind(body.kind)) {
    return { response: Response.json({ error: "bad_request" }, { status: 400 }) };
  }

  const { classId } = await getStudentClass(studentId);
  const state = await getTestState(studentId, classId, body.kind);
  if (!state) return { response: Response.json({ error: "not_found" }, { status: 404 }) };
  if (state.status === "closed") {
    return { response: Response.json({ error: "closed" }, { status: 403 }) };
  }
  if (state.status === "finished") {
    return { response: Response.json({ error: "finished" }, { status: 409 }) };
  }
  return { response: null, studentId, state, body };
}
