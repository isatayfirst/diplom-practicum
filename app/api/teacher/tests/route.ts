import { setTestOpen, teacherDenied, UUID } from "@/lib/teacher";
import { isTestKind } from "@/lib/tests";

// Открыть или закрыть тест для класса. Окно подтверждения итогового теста — на странице;
// сам запрос пишет class_tests одной строкой (класс, тест).
export async function POST(request: Request) {
  const denied = await teacherDenied();
  if (denied) return denied;

  try {
    const body: unknown = await request.json().catch(() => null);
    const { classId, kind, open } = (body ?? {}) as { classId?: unknown; kind?: unknown; open?: unknown };
    if (typeof classId !== "string" || !UUID.test(classId) || !isTestKind(kind) || typeof open !== "boolean") {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }

    const result = await setTestOpen(classId, kind, open);
    if (result.ok) return Response.json({ ok: true });
    return Response.json({ error: result.reason }, { status: result.reason === "no_questions" ? 409 : 404 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
