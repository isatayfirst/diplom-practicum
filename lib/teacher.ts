import "server-only";
import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type AnswerType } from "@/lib/tasks";
import { readTeacherSession, TEACHER_COOKIE } from "@/lib/teacher-session";
import { TEST_KINDS, type StudyGroup, type TestKind } from "@/lib/tests";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_CLASS_SIZE = 40;
export const EXCLUDE_REASONS = ["moved", "class_changed", "other"] as const;
export type ExcludeReason = (typeof EXCLUDE_REASONS)[number];

// Алфавит личных кодов без похожих знаков (0, O, 1, I, L): лист читается на печати.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// ---------- доступ ----------

export async function isTeacher(): Promise<boolean> {
  return readTeacherSession((await cookies()).get(TEACHER_COOKIE)?.value);
}

// Каждая страница кабинета проверяет cookie сама, а не только proxy.ts.
export async function requireTeacherPage(): Promise<void> {
  if (!(await isTeacher())) redirect("/teacher/login");
}

// Для API: null, если учитель вошёл, иначе готовый ответ 401.
export async function teacherDenied(): Promise<Response | null> {
  return (await isTeacher()) ? null : Response.json({ error: "unauthorized" }, { status: 401 });
}

// ---------- чтение базы ----------

type DbResult<T> = { data: T[] | null; error: { code: string } | null };

// База отдаёт не больше 1000 строк за запрос: читаем страницами.
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<DbResult<T>>,
  label: string,
): Promise<T[]> {
  const size = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(`${label}: ${error.code}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < size) return rows;
  }
}

export type ClassInfo = { id: string; code: string; label: string; studyGroup: StudyGroup };

export async function listClasses(): Promise<ClassInfo[]> {
  const { data, error } = await createServerClient()
    .from("classes")
    .select("id, code, label, study_group")
    .order("code")
    .returns<{ id: string; code: string; label: string; study_group: StudyGroup }[]>();
  if (error) throw new Error(`classes: ${error.code}`);
  return data.map((row) => ({ id: row.id, code: row.code, label: row.label, studyGroup: row.study_group }));
}

export type StudentRow = {
  id: string;
  number: number;
  personalCode: string;
  status: "active" | "excluded";
  reason: ExcludeReason | null;
};

type TaskRow = { id: string; order_no: number; answer_type: AnswerType };
type AttemptRow = { id: string; student_id: string; task_id: string; is_correct: boolean | null; created_at: string };

export type TestColumn = {
  kind: TestKind;
  questionCount: number;
  open: boolean;
  // номер ученика -> число верных ответов; только у учеников, завершивших тест
  scores: Map<string, number>;
};

export type ClassData = {
  students: StudentRow[];
  tasks: TaskRow[];
  attempts: AttemptRow[];
  scores: Map<string, number>; // attempt_id -> оценка
  tests: TestColumn[];
};

export async function loadClassData(classId: string, studyGroup: StudyGroup): Promise<ClassData> {
  const db = createServerClient();

  const { data: studentData, error: studentError } = await db
    .from("students")
    .select("id, number, personal_code, status, excluded_reason")
    .eq("class_id", classId)
    .order("number")
    .returns<{ id: string; number: number; personal_code: string; status: "active" | "excluded"; excluded_reason: ExcludeReason | null }[]>();
  if (studentError) throw new Error(`students: ${studentError.code}`);
  const students: StudentRow[] = studentData.map((row) => ({
    id: row.id,
    number: row.number,
    personalCode: row.personal_code,
    status: row.status,
    reason: row.excluded_reason,
  }));
  const ids = students.map((student) => student.id);

  const experimental = studyGroup === "experimental";
  const [tasks, attempts, scoreRows, tests] = await Promise.all([
    experimental
      ? db.from("tasks_public").select("id, order_no, answer_type").order("order_no").returns<TaskRow[]>().then(({ data, error }) => {
          if (error) throw new Error(`tasks_public: ${error.code}`);
          return data;
        })
      : Promise.resolve([] as TaskRow[]),
    experimental && ids.length > 0
      ? fetchAll<AttemptRow>(
          (from, to) =>
            db
              .from("attempts")
              .select("id, student_id, task_id, is_correct, created_at")
              .in("student_id", ids)
              .order("id")
              .range(from, to)
              .returns<AttemptRow[]>(),
          "attempts",
        )
      : Promise.resolve([] as AttemptRow[]),
    experimental && ids.length > 0
      ? fetchAll<{ attempt_id: string; score: number }>(
          (from, to) =>
            db
              .from("text_scores")
              .select("attempt_id, score, attempts!inner(student_id)")
              .in("attempts.student_id", ids)
              .order("attempt_id")
              .range(from, to)
              .returns<{ attempt_id: string; score: number }[]>(),
          "text_scores",
        )
      : Promise.resolve([] as { attempt_id: string; score: number }[]),
    loadTests(classId, ids),
  ]);

  return {
    students,
    tasks,
    attempts,
    scores: new Map(scoreRows.map((row) => [row.attempt_id, row.score])),
    tests,
  };
}

// Результат теста X / N считает сервер по test_question_keys. Эталон дальше этой функции не уходит.
async function loadTests(classId: string, studentIds: string[]): Promise<TestColumn[]> {
  const db = createServerClient();
  const [testRows, questions, keys, opened] = await Promise.all([
    db.from("tests").select("id, kind").returns<{ id: string; kind: TestKind }[]>(),
    db.from("test_questions").select("id, test_id").returns<{ id: string; test_id: string }[]>(),
    db.from("test_question_keys").select("question_id, correct_option").returns<{ question_id: string; correct_option: string }[]>(),
    db.from("class_tests").select("test_id, open").eq("class_id", classId).returns<{ test_id: string; open: boolean }[]>(),
  ]);
  for (const [name, result] of Object.entries({ testRows, questions, keys, opened })) {
    if (result.error) throw new Error(`${name}: ${result.error.code}`);
  }

  const [sessions, answers] =
    studentIds.length > 0
      ? await Promise.all([
          fetchAll<{ student_id: string; test_id: string }>(
            (from, to) =>
              db
                .from("test_sessions")
                .select("student_id, test_id")
                .in("student_id", studentIds)
                .order("student_id")
                .range(from, to)
                .returns<{ student_id: string; test_id: string }[]>(),
            "test_sessions",
          ),
          fetchAll<{ student_id: string; question_id: string; answer_raw: string }>(
            (from, to) =>
              db
                .from("test_answers")
                .select("student_id, question_id, answer_raw")
                .in("student_id", studentIds)
                .order("id")
                .range(from, to)
                .returns<{ student_id: string; question_id: string; answer_raw: string }[]>(),
            "test_answers",
          ),
        ])
      : [[], []];

  const keyOf = new Map(keys.data!.map((row) => [row.question_id, row.correct_option]));
  const finished = new Set(sessions.map((row) => `${row.student_id}|${row.test_id}`));

  return TEST_KINDS.flatMap((kind) => {
    const test = testRows.data!.find((row) => row.kind === kind);
    if (!test) return [];
    const own = new Set(questions.data!.filter((row) => row.test_id === test.id).map((row) => row.id));
    const scores = new Map<string, number>();
    for (const studentId of studentIds) {
      if (finished.has(`${studentId}|${test.id}`)) scores.set(studentId, 0);
    }
    for (const answer of answers) {
      if (!own.has(answer.question_id) || !scores.has(answer.student_id)) continue;
      if (keyOf.get(answer.question_id) === answer.answer_raw) {
        scores.set(answer.student_id, (scores.get(answer.student_id) ?? 0) + 1);
      }
    }
    return [
      {
        kind,
        questionCount: own.size,
        open: opened.data!.some((row) => row.test_id === test.id && row.open),
        scores,
      },
    ];
  });
}

// ---------- тепловая карта ----------

export type CellState = "none" | "unsolved" | "solved" | "pending" | "scored";
export type Cell = { state: CellState; attempts: number; score: number | null };

export type GradeItem = {
  attemptId: string;
  studentNumber: number;
  orderNo: number;
  answer: string;
  score: number | null;
};

export type HeatRow = { number: number; cells: Cell[]; done: number };

export type Overview = {
  orderNos: number[];
  rows: HeatRow[];
  excludedCount: number;
  avgDone: number | null;
  avgAttempts: number | null;
  busiestOrderNo: number | null;
};

// Одна ячейка «ученик × задача». Вывод: учитывается последняя отправка (is_correct = null).
// Оценённый вывод считается выполненным при любом балле, как и на главной ученика.
export function buildCells(
  tasks: TaskRow[],
  attempts: AttemptRow[],
  scores: Map<string, number>,
): { cells: Cell[]; latestText: Map<string, AttemptRow> } {
  const byTask = new Map<string, AttemptRow[]>();
  for (const attempt of attempts) {
    byTask.set(attempt.task_id, [...(byTask.get(attempt.task_id) ?? []), attempt]);
  }
  const latestText = new Map<string, AttemptRow>();

  const cells = tasks.map((task): Cell => {
    const own = byTask.get(task.id) ?? [];
    if (own.length === 0) return { state: "none", attempts: 0, score: null };
    if (task.answer_type !== "text") {
      return { state: own.some((a) => a.is_correct === true) ? "solved" : "unsolved", attempts: own.length, score: null };
    }
    const sent = own.filter((a) => a.is_correct === null);
    if (sent.length === 0) return { state: "unsolved", attempts: own.length, score: null };
    const latest = sent.reduce((best, a) => (a.created_at > best.created_at ? a : best));
    latestText.set(task.id, latest);
    const score = scores.get(latest.id);
    return score === undefined
      ? { state: "pending", attempts: own.length, score: null }
      : { state: "scored", attempts: own.length, score };
  });
  return { cells, latestText };
}

export function buildOverview(data: ClassData): { overview: Overview; grade: GradeItem[] } {
  const active = data.students.filter((student) => student.status === "active");
  const grade: GradeItem[] = [];
  const attemptsOf = new Map<string, AttemptRow[]>();
  for (const attempt of data.attempts) {
    attemptsOf.set(attempt.student_id, [...(attemptsOf.get(attempt.student_id) ?? []), attempt]);
  }
  const textTasks = new Map(data.tasks.map((task) => [task.id, task.order_no]));
  const taskTotals = new Map<number, number>();

  const rows = active.map((student): HeatRow => {
    const mine = attemptsOf.get(student.id) ?? [];
    const { cells, latestText } = buildCells(data.tasks, mine, data.scores);
    cells.forEach((cell, index) => {
      const orderNo = data.tasks[index].order_no;
      taskTotals.set(orderNo, (taskTotals.get(orderNo) ?? 0) + cell.attempts);
    });
    for (const [taskId, attempt] of latestText) {
      grade.push({
        attemptId: attempt.id,
        studentNumber: student.number,
        orderNo: textTasks.get(taskId)!,
        answer: "",
        score: data.scores.get(attempt.id) ?? null,
      });
    }
    return {
      number: student.number,
      cells,
      done: cells.filter((cell) => cell.state === "solved" || cell.state === "scored").length,
    };
  });

  const touched = rows.flatMap((row) => row.cells).filter((cell) => cell.attempts > 0);
  let busiest: number | null = null;
  let max = 0;
  for (const [orderNo, total] of taskTotals) {
    if (total > max) {
      max = total;
      busiest = orderNo;
    }
  }

  return {
    overview: {
      orderNos: data.tasks.map((task) => task.order_no),
      rows,
      excludedCount: data.students.length - active.length,
      avgDone: rows.length > 0 ? rows.reduce((sum, row) => sum + row.done, 0) / rows.length : null,
      avgAttempts: touched.length > 0 ? touched.reduce((sum, cell) => sum + cell.attempts, 0) / touched.length : null,
      busiestOrderNo: busiest,
    },
    grade,
  };
}

// Тексты выводов нужны только для оценки: читаем только последние отправки.
export async function loadAnswers(attemptIds: string[]): Promise<Map<string, string>> {
  if (attemptIds.length === 0) return new Map();
  const { data, error } = await createServerClient()
    .from("attempts")
    .select("id, answer_raw")
    .in("id", attemptIds)
    .returns<{ id: string; answer_raw: string }[]>();
  if (error) throw new Error(`attempts: ${error.code}`);
  return new Map(data.map((row) => [row.id, row.answer_raw]));
}

// ---------- изменения ----------

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 5; i += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export type AddResult = { ok: true } | { ok: false; reason: "not_found" | "class_full" };

export async function addStudent(classId: string): Promise<AddResult> {
  const db = createServerClient();
  const { data: cls, error: classError } = await db.from("classes").select("id").eq("id", classId).maybeSingle();
  if (classError) throw new Error(`classes: ${classError.code}`);
  if (!cls) return { ok: false, reason: "not_found" };

  // Номер или код могли занять одновременно: при нарушении уникальности пробуем снова.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data: numbers, error } = await db
      .from("students")
      .select("number")
      .eq("class_id", classId)
      .returns<{ number: number }[]>();
    if (error) throw new Error(`students: ${error.code}`);
    if (numbers.length >= MAX_CLASS_SIZE) return { ok: false, reason: "class_full" };

    const next = numbers.reduce((max, row) => Math.max(max, row.number), 0) + 1;
    const { error: insertError } = await db
      .from("students")
      .insert({ class_id: classId, number: next, personal_code: generateCode() });
    if (!insertError) return { ok: true };
    if (insertError.code !== "23505") throw new Error(`students: ${insertError.code}`);
  }
  throw new Error("students: could not allocate number and code");
}

export async function excludeStudent(studentId: string, reason: ExcludeReason): Promise<boolean> {
  const { data, error } = await createServerClient()
    .from("students")
    .update({ status: "excluded", excluded_reason: reason })
    .eq("id", studentId)
    .eq("status", "active")
    .select("id");
  if (error) throw new Error(`students: ${error.code}`);
  return data.length === 1;
}

export type ScoreResult = { ok: true } | { ok: false; reason: "not_found" | "not_text" | "stale" };

export async function saveScore(attemptId: string, score: number): Promise<ScoreResult> {
  const db = createServerClient();
  const { data: attempt, error } = await db
    .from("attempts")
    .select("id, student_id, task_id, is_correct, created_at")
    .eq("id", attemptId)
    .maybeSingle<AttemptRow>();
  if (error) throw new Error(`attempts: ${error.code}`);
  if (!attempt) return { ok: false, reason: "not_found" };

  const { data: task, error: taskError } = await db
    .from("tasks_public")
    .select("answer_type")
    .eq("id", attempt.task_id)
    .maybeSingle<{ answer_type: AnswerType }>();
  if (taskError) throw new Error(`tasks_public: ${taskError.code}`);
  if (attempt.is_correct !== null || task?.answer_type !== "text") return { ok: false, reason: "not_text" };

  // Оценивается только последняя отправка этого ученика по этой задаче.
  const { data: newer, error: newerError } = await db
    .from("attempts")
    .select("id")
    .eq("student_id", attempt.student_id)
    .eq("task_id", attempt.task_id)
    .is("is_correct", null)
    .gt("created_at", attempt.created_at)
    .limit(1);
  if (newerError) throw new Error(`attempts: ${newerError.code}`);
  if (newer.length > 0) return { ok: false, reason: "stale" };

  const { error: saveError } = await db
    .from("text_scores")
    .upsert({ attempt_id: attemptId, score, scored_at: new Date().toISOString() });
  if (saveError) throw new Error(`text_scores: ${saveError.code}`);
  return { ok: true };
}

export type ToggleResult = { ok: true } | { ok: false; reason: "not_found" | "no_questions" };

export async function setTestOpen(classId: string, kind: TestKind, open: boolean): Promise<ToggleResult> {
  const db = createServerClient();
  const { data: test, error } = await db.from("tests").select("id").eq("kind", kind).maybeSingle<{ id: string }>();
  if (error) throw new Error(`tests: ${error.code}`);
  if (!test) return { ok: false, reason: "not_found" };

  if (open) {
    const { count, error: countError } = await db
      .from("test_questions")
      .select("id", { count: "exact", head: true })
      .eq("test_id", test.id);
    if (countError) throw new Error(`test_questions: ${countError.code}`);
    if (!count) return { ok: false, reason: "no_questions" };
  }

  const { error: saveError } = await db.from("class_tests").upsert({ class_id: classId, test_id: test.id, open });
  if (saveError) {
    if (saveError.code === "23503") return { ok: false, reason: "not_found" };
    throw new Error(`class_tests: ${saveError.code}`);
  }
  return { ok: true };
}
