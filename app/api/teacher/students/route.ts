import { addStudent, teacherDenied, UUID } from "@/lib/teacher";

// Добавить следующий номер в класс: сервер сам выдаёт номер и личный код.
export async function POST(request: Request) {
  const denied = await teacherDenied();
  if (denied) return denied;

  try {
    const body: unknown = await request.json().catch(() => null);
    const { classId } = (body ?? {}) as { classId?: unknown };
    if (typeof classId !== "string" || !UUID.test(classId)) {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }

    const result = await addStudent(classId);
    if (result.ok) return Response.json({ ok: true });
    return Response.json({ error: result.reason }, { status: result.reason === "class_full" ? 409 : 404 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
