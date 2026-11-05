import { cookies } from "next/headers";
import { teacherDenied } from "@/lib/teacher";
import { TEACHER_COOKIE } from "@/lib/teacher-session";

export async function POST() {
  const denied = await teacherDenied();
  if (denied) return denied;
  (await cookies()).delete(TEACHER_COOKIE);
  return Response.json({ ok: true });
}
