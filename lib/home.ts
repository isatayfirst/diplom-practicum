import "server-only";
import { createServerClient, getTasks, type TaskListItem } from "@/lib/tasks";
import { getStudentClass, getTestSummaries, type TestSummary } from "@/lib/tests";

// scored: вывод оценён учителем. Балл на сервере не покидает кабинет: ученик видит только факт оценки.
export type PathTask = TaskListItem & { solved: boolean; scored: boolean; pending: boolean };

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
    .select("id, task_id, is_correct, created_at")
    .eq("student_id", studentId)
    .order("is_correct", { ascending: false, nullsFirst: false })
    .returns<{ id: string; task_id: string; is_correct: boolean | null; created_at: string }[]>();

  if (error) throw new Error(`attempts: ${error.code}`);
  return data;
}

// Какие отправки выводов оценены. Сам балл не читается: нужен только факт строки в text_scores.
async function getScoredAttemptIds(studentId: string): Promise<Set<string>> {
  const { data, error } = await createServerClient()
    .from("text_scores")
    .select("attempt_id, attempts!inner(student_id)")
    .eq("attempts.student_id", studentId)
    .returns<{ attempt_id: string }[]>();

  if (error) throw new Error(`text_scores: ${error.code}`);
  return new Set(data.map((row) => row.attempt_id));
}

export async function getHomeState(studentId: string): Promise<HomeState> {
  const { classId, studyGroup } = await getStudentClass(studentId);
  // Контрольный класс видит только тесты: задач, пути и прогресса для него нет.
  if (studyGroup === "control") {
    return { variant: "control", tests: await getTestSummaries(studentId, classId) };
  }

  const [tasks, attempts, scoredIds, tests] = await Promise.all([
    getTasks(),
    getAttempts(studentId),
    getScoredAttemptIds(studentId),
    getTestSummaries(studentId, classId),
  ]);
  const solvedIds = new Set(attempts.filter((a) => a.is_correct === true).map((a) => a.task_id));
  // Вывод: строка с is_correct = null. Считается последняя отправка по задаче:
  // оценена (строка в text_scores) или ждёт проверки. Новая отправка снова ждёт проверки.
  const latestSent = new Map<string, { id: string; created_at: string }>();
  for (const attempt of attempts) {
    if (attempt.is_correct !== null) continue;
    const best = latestSent.get(attempt.task_id);
    if (!best || attempt.created_at > best.created_at) latestSent.set(attempt.task_id, attempt);
  }
  const path = tasks.map((task) => {
    const latest = task.answer_type === "text" ? latestSent.get(task.id) : undefined;
    const scored = latest !== undefined && scoredIds.has(latest.id);
    return {
      ...task,
      solved: solvedIds.has(task.id),
      scored,
      pending: latest !== undefined && !scored,
    };
  });

  return {
    variant: attempts.length > 0 ? "returning" : "first",
    tasks: path,
    // Оценённый вывод засчитывается при любом балле: иначе статус выдал бы ученику результат.
    solvedCount: path.filter((task) => task.solved || task.scored).length,
    nextOrderNo: path.find((task) => !task.solved && !task.scored && !task.pending)?.order_no ?? null,
    tests,
  };
}
