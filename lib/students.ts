import "server-only";
import { createServerClient } from "@/lib/tasks";

const MAX_CLASS_CODE_LENGTH = 64;

// Ученик исключён из анализа: его cookie больше ничего не открывает.
// Страница исключённого ученика ведёт сюда: маршрут стирает cookie и открывает /login.
export const SESSION_END_PATH = "/api/session-end";

export class InactiveStudentError extends Error {
  constructor() {
    super("student is not active");
  }
}

// Неверный класс, неверный код, неактивный класс и исключённый ученик неразличимы: во всех случаях null.
export async function findStudentId(classCode: unknown, personalCode: unknown): Promise<string | null> {
  if (typeof classCode !== "string" || typeof personalCode !== "string") return null;

  const code = classCode.trim();
  const personal = personalCode.trim().toUpperCase();
  if (!code || code.length > MAX_CLASS_CODE_LENGTH || !/^[A-Z0-9]{5}$/.test(personal)) return null;

  const { data, error } = await createServerClient()
    .from("students")
    .select("id, classes!inner(code, active)")
    .eq("personal_code", personal)
    .eq("classes.code", code)
    .eq("classes.active", true)
    .eq("status", "active")
    .maybeSingle();

  // В сообщение идёт только код ошибки: текст базы может цитировать данные запроса.
  if (error) throw new Error(`students: ${error.code}`);
  return data?.id ?? null;
}
