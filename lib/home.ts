import "server-only";
import { createServerClient, getTasks, type TaskListItem } from "@/lib/tasks";

type StudyGroup = "experimental" | "control";

export type PathTask = TaskListItem & { solved: boolean };

export type HomeState =
  | { variant: "control" }
  | {
      variant: "first" | "returning";
      tasks: PathTask[];
      solvedCount: number;
      nextOrderNo: number | null;
    };

async function getStudyGroup(studentId: string): Promise<StudyGroup> {
  const { data, error } = await createServerClient()
    .from("students")
    .select("classes!inner(study_group)")
    .eq("id", studentId)
    .returns<{ classes: { study_group: StudyGroup } }[]>()
    .maybeSingle();

  if (error) throw new Error(`students: ${error.code}`);
  // Подписанная cookie есть, а ученика нет: это сбой, а не «первый вход».
  if (!data) throw new Error("students: not found");
  return data.classes.study_group;
}

async function getAttempts(studentId: string) {
  // answer_raw сюда не выбираем. Верные попытки идут первыми: если ответ базы
  // обрежется по лимиту строк, потеряются неверные, а не решённые задачи.
  const { data, error } = await createServerClient()
    .from("attempts")
    .select("task_id, is_correct")
    .eq("student_id", studentId)
    .order("is_correct", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`attempts: ${error.code}`);
  return data;
}

export async function getHomeState(studentId: string): Promise<HomeState> {
  if ((await getStudyGroup(studentId)) === "control") return { variant: "control" };

  const [tasks, attempts] = await Promise.all([getTasks(), getAttempts(studentId)]);
  const solvedIds = new Set(attempts.filter((a) => a.is_correct === true).map((a) => a.task_id));
  const path = tasks.map((task) => ({ ...task, solved: solvedIds.has(task.id) }));

  return {
    variant: attempts.length > 0 ? "returning" : "first",
    tasks: path,
    solvedCount: path.filter((task) => task.solved).length,
    // Текстовые задачи до шага 5 решить нельзя, поэтому следующими они не становятся.
    nextOrderNo: path.find((task) => !task.solved && task.answer_type !== "text")?.order_no ?? null,
  };
}
