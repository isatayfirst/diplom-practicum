import "server-only";
import { toCsv, type CsvValue } from "@/lib/csv";
import { createServerClient } from "@/lib/tasks";
import { fetchAll, loadTests, type ClassInfo } from "@/lib/teacher";
import { TEST_KINDS } from "@/lib/tests";

// Три файла CSV по классу. Заголовки и значения-перечисления машиночитаемые (латиница, snake_case)
// и от языка интерфейса не зависят; от языка зависит только текст колонки `period`.
// В файлы не попадают: личные коды, id, answer_raw и тексты выводов (answer_raw здесь даже не читается).
export const EXPORT_KINDS = ["attempts", "tests", "students"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export function isExportKind(value: string): value is ExportKind {
  return (EXPORT_KINDS as readonly string[]).includes(value);
}

// Часть имени файла для каждого вида.
export const EXPORT_FILE_PART: Record<ExportKind, string> = {
  attempts: "attempts",
  tests: "test-results",
  students: "students",
};

type StudentRow = { id: string; number: number; status: "active" | "excluded"; excluded_reason: string | null };

async function loadStudents(classId: string): Promise<StudentRow[]> {
  const { data, error } = await createServerClient()
    .from("students")
    .select("id, number, status, excluded_reason")
    .eq("class_id", classId)
    .order("number")
    .returns<StudentRow[]>();
  if (error) throw new Error(`students: ${error.code}`);
  return data;
}

// Дата и время в UTC без долей секунды: 2026-11-05T09:58:48Z.
function iso(value: string): string {
  return `${new Date(value).toISOString().slice(0, 19)}Z`;
}

async function attemptsRows(cls: ClassInfo, period: string, active: StudentRow[]): Promise<CsvValue[][]> {
  const db = createServerClient();
  const ids = active.map((student) => student.id);
  if (ids.length === 0) return [];

  type Attempt = { id: string; student_id: string; task_id: string; is_correct: boolean | null; time_spent_ms: number | null; created_at: string };
  const [tasks, attempts, scores] = await Promise.all([
    db.from("tasks_public").select("id, order_no").returns<{ id: string; order_no: number }[]>().then(({ data, error }) => {
      if (error) throw new Error(`tasks_public: ${error.code}`);
      return data;
    }),
    fetchAll<Attempt>(
      (from, to) =>
        db
          .from("attempts")
          .select("id, student_id, task_id, is_correct, time_spent_ms, created_at")
          .in("student_id", ids)
          .order("id")
          .range(from, to)
          .returns<Attempt[]>(),
      "attempts",
    ),
    fetchAll<{ attempt_id: string; score: number }>(
      (from, to) =>
        db
          .from("text_scores")
          .select("attempt_id, score, attempts!inner(student_id)")
          .in("attempts.student_id", ids)
          .order("attempt_id")
          .range(from, to)
          .returns<{ attempt_id: string; score: number }[]>(),
      "text_scores",
    ),
  ]);

  const orderNo = new Map(tasks.map((task) => [task.id, task.order_no]));
  const scoreOf = new Map(scores.map((row) => [row.attempt_id, row.score]));
  const numberOf = new Map(active.map((student) => [student.id, student.number]));

  // Порядок: ученик, задача, время попытки; номер попытки считается по паре «ученик × задача».
  const sorted = attempts
    .filter((attempt) => orderNo.has(attempt.task_id))
    .sort(
      (a, b) =>
        numberOf.get(a.student_id)! - numberOf.get(b.student_id)! ||
        orderNo.get(a.task_id)! - orderNo.get(b.task_id)! ||
        a.created_at.localeCompare(b.created_at) ||
        a.id.localeCompare(b.id),
    );

  const counters = new Map<string, number>();
  return sorted.map((attempt) => {
    const key = `${attempt.student_id}|${attempt.task_id}`;
    const attemptNo = (counters.get(key) ?? 0) + 1;
    counters.set(key, attemptNo);
    return [
      numberOf.get(attempt.student_id)!,
      cls.code,
      period,
      orderNo.get(attempt.task_id)!,
      attemptNo,
      attempt.is_correct === null ? "teacher" : attempt.is_correct ? "correct" : "incorrect",
      scoreOf.get(attempt.id) ?? null,
      attempt.time_spent_ms,
      iso(attempt.created_at),
    ];
  });
}

async function testRows(cls: ClassInfo, period: string, active: StudentRow[]): Promise<CsvValue[][]> {
  const ids = active.map((student) => student.id);
  if (ids.length === 0) return [];

  const db = createServerClient();
  const [columns, sessions, tests] = await Promise.all([
    loadTests(cls.id, ids),
    fetchAll<{ student_id: string; test_id: string; finished_at: string }>(
      (from, to) =>
        db
          .from("test_sessions")
          .select("student_id, test_id, finished_at")
          .in("student_id", ids)
          .order("student_id")
          .range(from, to)
          .returns<{ student_id: string; test_id: string; finished_at: string }[]>(),
      "test_sessions",
    ),
    db.from("tests").select("id, kind").returns<{ id: string; kind: string }[]>().then(({ data, error }) => {
      if (error) throw new Error(`tests: ${error.code}`);
      return data;
    }),
  ]);

  const testId = new Map(tests.map((test) => [test.kind, test.id]));
  const finishedAt = new Map(sessions.map((row) => [`${row.student_id}|${row.test_id}`, row.finished_at]));

  return active.flatMap((student) =>
    TEST_KINDS.flatMap((kind): CsvValue[][] => {
      const column = columns.find((item) => item.kind === kind);
      const score = column?.scores.get(student.id);
      const finished = finishedAt.get(`${student.id}|${testId.get(kind)}`);
      // Только завершённые тесты: результат есть только у них.
      if (!column || score === undefined || finished === undefined) return [];
      return [[student.number, cls.code, period, kind, score, column.questionCount, iso(finished)]];
    }),
  );
}

function studentRows(cls: ClassInfo, period: string, students: StudentRow[]): CsvValue[][] {
  return students.map((student) => [
    student.number,
    cls.code,
    period,
    cls.studyGroup,
    student.status,
    student.excluded_reason,
  ]);
}

// Исключённые ученики есть только в списке учеников: из попыток и результатов тестов они убраны,
// как и из тепловой карты и средних в кабинете.
export async function buildExport(kind: ExportKind, cls: ClassInfo, period: string): Promise<string> {
  const students = await loadStudents(cls.id);
  const active = students.filter((student) => student.status === "active");

  switch (kind) {
    case "attempts":
      return toCsv(
        ["student_no", "class", "period", "task_no", "attempt_no", "verdict", "score", "time_ms", "created_at"],
        await attemptsRows(cls, period, active),
      );
    case "tests":
      return toCsv(
        ["student_no", "class", "period", "test", "score", "total", "finished_at"],
        await testRows(cls, period, active),
      );
    case "students":
      return toCsv(
        ["student_no", "class", "period", "study_group", "status", "excluded_reason"],
        studentRows(cls, period, students),
      );
  }
}
