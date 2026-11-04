import "server-only";
import { createClient } from "@supabase/supabase-js";

export type TaskSkill = "read" | "calc" | "functions" | "conclude";
export type AnswerType = "number" | "choice" | "text";

export type TaskListItem = {
  id: string;
  order_no: number;
  skill: TaskSkill;
  statement_kk: string;
  answer_type: AnswerType;
};

export type TaskDetail = TaskListItem & {
  dataset_id: string | null;
  options: string[] | null;
};

export type Dataset = {
  label: string;
  name: string;
  data: { columns: string[]; rows: string[][] };
};

const MAX_ORDER_NO = 2147483647;

// order_no в базе имеет тип integer: большее число дало бы ошибку запроса, а не 404.
export function isOrderNo(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= MAX_ORDER_NO;
}

// У anon нет прав на tasks_public, поэтому читаем серверным ключом.
// server-only не даст импортировать этот модуль в клиентский код.
export function createServerClient() {
  return createClient(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function getTasks(): Promise<TaskListItem[]> {
  const { data, error } = await createServerClient()
    .from("tasks_public")
    .select("id, order_no, skill, statement_kk, answer_type")
    .order("order_no")
    .returns<TaskListItem[]>();

  if (error) throw new Error(`tasks_public: ${error.message}`);
  return data;
}

export async function getTask(orderNo: number): Promise<TaskDetail | null> {
  const { data, error } = await createServerClient()
    .from("tasks_public")
    .select("id, order_no, skill, dataset_id, statement_kk, answer_type, options")
    .eq("order_no", orderNo)
    .returns<TaskDetail[]>()
    .maybeSingle();

  if (error) throw new Error(`tasks_public: ${error.message}`);
  return data;
}

export async function getDataset(id: string): Promise<Dataset | null> {
  const { data, error } = await createServerClient()
    .from("datasets")
    .select("label, name, data")
    .eq("id", id)
    .returns<Dataset[]>()
    .maybeSingle();

  if (error) throw new Error(`datasets: ${error.message}`);
  return data;
}
