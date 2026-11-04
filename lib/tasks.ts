import "server-only";
import { createClient } from "@supabase/supabase-js";

export type TaskSkill = "read" | "calc" | "functions" | "conclude";

export type TaskListItem = {
  id: string;
  order_no: number;
  skill: TaskSkill;
  statement_kk: string;
};

// У anon нет прав на tasks_public, поэтому читаем серверным ключом.
// server-only не даст импортировать этот модуль в клиентский код.
export async function getTasks(): Promise<TaskListItem[]> {
  const supabase = createClient(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await supabase
    .from("tasks_public")
    .select("id, order_no, skill, statement_kk")
    .order("order_no")
    .returns<TaskListItem[]>();

  if (error) throw new Error(`tasks_public: ${error.message}`);
  return data;
}
