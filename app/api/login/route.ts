import { cookies } from "next/headers";
import { createSession, SESSION_COOKIE } from "@/lib/session";
import { findStudentId } from "@/lib/students";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const { classCode, personalCode } = (body ?? {}) as { classCode?: unknown; personalCode?: unknown };

  try {
    const studentId = await findStudentId(classCode, personalCode);
    if (!studentId) return Response.json({ error: "invalid_credentials" }, { status: 401 });

    const session = createSession(studentId);
    (await cookies()).set(SESSION_COOKIE, session.value, session.options);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
