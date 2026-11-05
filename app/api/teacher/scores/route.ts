import { saveScore, teacherDenied, UUID } from "@/lib/teacher";

// Оценка вывода: целое 0, 1 или 2 для последней отправки ученика по текстовой задаче.
// Повторная оценка заменяет прежнюю.
export async function POST(request: Request) {
  const denied = await teacherDenied();
  if (denied) return denied;

  try {
    const body: unknown = await request.json().catch(() => null);
    const { attemptId, score } = (body ?? {}) as { attemptId?: unknown; score?: unknown };
    if (
      typeof attemptId !== "string" ||
      !UUID.test(attemptId) ||
      typeof score !== "number" ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > 2
    ) {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }

    const result = await saveScore(attemptId, score);
    if (result.ok) return Response.json({ ok: true });
    const status = result.reason === "not_found" ? 404 : result.reason === "stale" ? 409 : 400;
    return Response.json({ error: result.reason }, { status });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
