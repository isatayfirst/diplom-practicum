import "server-only";
import { createServerClient, getTasks, type TaskListItem } from "@/lib/tasks";
import { getStudentClass, getTestSummaries, type TestSummary } from "@/lib/tests";

export type PathTask = TaskListItem & { solved: boolean; pending: boolean };

export type HomeState =
  | { variant: "control"; tests: TestSummary[] }
  | {
      variant: "first" | "returning";
      tasks: PathTask[];
      solvedCount: number;
      nextOrderNo: number | null;
      tests: TestSummary[];
    };

async function getAttempts(studentId: string) {
  // answer_raw сюда не выбираем. Верные попытки идут первыми: если ответ базы
  // обрежется по лимиту строк, потеряются выводы и неверные, а не решённые задачи.
  const { data, error } = await createServerClient()
    .from("attempts")
    .select("task_id, is_correct")
    .eq("student_id", studentId)
    .order("is_correct", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`attempts: ${error.code}`);
  return data;
}

export async function getHomeState(studentId: string): Promise<HomeState> {
  const { classId, studyGroup } = await getStudentClass(studentId);
  // Контрольный класс видит только тесты: задач, пути и прогресса для него нет.
  if (studyGroup === "control") {
    return { variant: "control", tests: await getTestSummaries(studentId, classId) };
  }

  const [tasks, attempts, tests] = await Promise.all([
    getTasks(),
    getAttempts(studentId),
    getTestSummaries(studentId, classId),
  ]);
  const solvedIds = new Set(attempts.filter((a) => a.is_correct === true).map((a) => a.task_id));
  // Вывод: строка с is_correct = null. Оценки появятся на шаге 7, до тех пор вывод ждёт проверки.
  const sentIds = new Set(attempts.filter((a) => a.is_correct === null).map((a) => a.task_id));
  const path = tasks.map((task) => ({
    ...task,
    solved: solvedIds.has(task.id),
    pending: task.answer_type === "text" && sentIds.has(task.id),
  }));

  return {
    variant: attempts.length > 0 ? "returning" : "first",
    tasks: path,
    solvedCount: path.filter((task) => task.solved).length,
    nextOrderNo: path.find((task) => !task.solved && !task.pending)?.order_no ?? null,
    tests,
  };
}
