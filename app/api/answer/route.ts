import { cookies } from "next/headers";
import { checkAnswer, getAnswerKey, recordAttempt } from "@/lib/answers";
import { allowRequest } from "@/lib/rate-limit";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { isOrderNo } from "@/lib/tasks";
import { getStudentClass } from "@/lib/tests";

const MAX_TIME_SPENT_MS = 24 * 60 * 60 * 1000;

function parseTimeSpent(value: unknown): number | null {
  const valid = Number.isInteger(value) && Number(value) >= 0 && Number(value) <= MAX_TIME_SPENT_MS;
  return valid ? Number(value) : null;
}

export async function POST(request: Request) {
  try {
    // Ученик определяется только по cookie. student_id из тела запроса не читается.
    const studentId = readSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!studentId) return Response.json({ error: "unauthorized" }, { status: 401 });
    if (!allowRequest(studentId)) return Response.json({ error: "rate_limited" }, { status: 429 });

    // Контрольному классу задачи недоступны: класс берётся из базы, ничего не пишется.
    if ((await getStudentClass(studentId)).studyGroup === "control") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const body: unknown = await request.json().catch(() => null);
    const { orderNo, answer, timeSpentMs } = (body ?? {}) as {
      orderNo?: unknown;
      answer?: unknown;
      timeSpentMs?: unknown;
    };

    if (!isOrderNo(orderNo)) {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }

    const key = await getAnswerKey(orderNo);
    if (!key) return Response.json({ error: "not_found" }, { status: 404 });

    const verdict = checkAnswer(key, answer);
    if (verdict !== "invalid_format") {
      // Если запись не удалась, ошибка уходит в catch и вердикт не показывается.
      await recordAttempt({
        student_id: studentId,
        task_id: key.id,
        answer_raw: String(answer),
        is_correct: verdict === "teacher" ? null : verdict === "correct",
        time_spent_ms: parseTimeSpent(timeSpentMs),
      });
    }

    return Response.json({ verdict });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
