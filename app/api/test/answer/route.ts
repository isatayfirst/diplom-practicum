import { InactiveStudentError } from "@/lib/students";
import { prepareTestRequest } from "@/lib/test-api";
import { saveTestAnswer } from "@/lib/tests";

const MAX_TIME_SPENT_MS = 24 * 60 * 60 * 1000;

function parseTimeSpent(value: unknown): number | null {
  const valid = Number.isInteger(value) && Number(value) >= 0 && Number(value) <= MAX_TIME_SPENT_MS;
  return valid ? Number(value) : null;
}

// Ответ только { ok: true }: верно или неверно ученику не сообщается.
export async function POST(request: Request) {
  try {
    const prepared = await prepareTestRequest(request);
    if (prepared.response) return prepared.response;

    const { studentId, state, body } = prepared;
    const question = state.questions.find((item) => item.position === body.position);
    if (!question) return Response.json({ error: "not_found" }, { status: 404 });
    if (typeof body.answer !== "string" || !question.options.includes(body.answer)) {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }

    // Если запись не удалась, ошибка уходит в catch и подтверждения нет.
    await saveTestAnswer({
      student_id: studentId,
      question_id: question.id,
      answer_raw: body.answer,
      time_spent_ms: parseTimeSpent(body.timeSpentMs),
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof InactiveStudentError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error(error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
