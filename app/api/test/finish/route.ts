import { prepareTestRequest } from "@/lib/test-api";
import { finishTest } from "@/lib/tests";

// Завершить можно только тест, на каждый вопрос которого есть ответ.
export async function POST(request: Request) {
  try {
    const prepared = await prepareTestRequest(request);
    if (prepared.response) return prepared.response;

    const { studentId, state } = prepared;
    if (state.questions.some((question) => !state.answers.has(question.id))) {
      return Response.json({ error: "incomplete" }, { status: 409 });
    }

    const saved = await finishTest(studentId, state.testId);
    if (!saved) return Response.json({ error: "finished" }, { status: 409 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
