import { EXCLUDE_REASONS, excludeStudent, teacherDenied, UUID, type ExcludeReason } from "@/lib/teacher";

// Исключить ученика из анализа с причиной. Данные ученика не удаляются.
export async function POST(request: Request) {
  const denied = await teacherDenied();
  if (denied) return denied;

  try {
    const body: unknown = await request.json().catch(() => null);
    const { studentId, reason } = (body ?? {}) as { studentId?: unknown; reason?: unknown };
    if (
      typeof studentId !== "string" ||
      !UUID.test(studentId) ||
      typeof reason !== "string" ||
      !(EXCLUDE_REASONS as readonly string[]).includes(reason)
    ) {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }

    const changed = await excludeStudent(studentId, reason as ExcludeReason);
    if (!changed) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
