import "server-only";
import { createServerClient } from "@/lib/tasks";

export type StudyGroup = "experimental" | "control";
export type TestKind = "pretest" | "posttest";
export type TestStatus = "closed" | "open" | "finished";

export const TEST_KINDS: TestKind[] = ["pretest", "posttest"];

export function isTestKind(value: unknown): value is TestKind {
  return typeof value === "string" && (TEST_KINDS as string[]).includes(value);
}

// Класс ученика берётся из базы по id из cookie, а не из тела запроса.
export async function getStudentClass(
  studentId: string,
): Promise<{ classId: string; studyGroup: StudyGroup }> {
  const { data, error } = await createServerClient()
    .from("students")
    .select("class_id, classes!inner(study_group)")
    .eq("id", studentId)
    .returns<{ class_id: string; classes: { study_group: StudyGroup } }[]>()
    .maybeSingle();

  if (error) throw new Error(`students: ${error.code}`);
  // Подписанная cookie есть, а ученика нет: это сбой, а не «первый вход».
  if (!data) throw new Error("students: not found");
  return { classId: data.class_id, studyGroup: data.classes.study_group };
}

function statusOf(open: boolean, finished: boolean): TestStatus {
  if (finished) return "finished";
  return open ? "open" : "closed";
}

export type TestSummary = {
  kind: TestKind;
  status: TestStatus;
  answeredCount: number;
  questionCount: number;
};

// Для главной: тесты без вопросов не показываются. Эталоны не читаются.
export async function getTestSummaries(
  studentId: string,
  classId: string,
): Promise<TestSummary[]> {
  const db = createServerClient();
  const [tests, questions, opened, sessions, answers] = await Promise.all([
    db.from("tests").select("id, kind").returns<{ id: string; kind: TestKind }[]>(),
    db.from("test_questions").select("id, test_id").returns<{ id: string; test_id: string }[]>(),
    db
      .from("class_tests")
      .select("test_id, open")
      .eq("class_id", classId)
      .returns<{ test_id: string; open: boolean }[]>(),
    db
      .from("test_sessions")
      .select("test_id")
      .eq("student_id", studentId)
      .returns<{ test_id: string }[]>(),
    db
      .from("test_answers")
      .select("question_id")
      .eq("student_id", studentId)
      .returns<{ question_id: string }[]>(),
  ]);

  for (const [name, result] of Object.entries({ tests, questions, opened, sessions, answers })) {
    if (result.error) throw new Error(`${name}: ${result.error.code}`);
  }

  const answeredIds = new Set(answers.data!.map((row) => row.question_id));
  const finishedIds = new Set(sessions.data!.map((row) => row.test_id));
  const openIds = new Set(opened.data!.filter((row) => row.open).map((row) => row.test_id));

  return TEST_KINDS.flatMap((kind) => {
    const test = tests.data!.find((row) => row.kind === kind);
    if (!test) return [];
    const own = questions.data!.filter((row) => row.test_id === test.id);
    if (own.length === 0) return [];
    return [
      {
        kind,
        status: statusOf(openIds.has(test.id), finishedIds.has(test.id)),
        answeredCount: own.filter((row) => answeredIds.has(row.id)).length,
        questionCount: own.length,
      },
    ];
  });
}

export type TestQuestion = {
  id: string;
  position: number;
  statement_kk: string;
  options: string[];
};

export type TestState = {
  testId: string;
  status: TestStatus;
  questions: TestQuestion[];
  // question_id -> ответ этого ученика
  answers: Map<string, string>;
};

// Состояние теста для одного ученика. Эталоны (test_question_keys) не читаются:
// в этой таблице вопросов нет колонок с верным ответом.
export async function getTestState(
  studentId: string,
  classId: string,
  kind: TestKind,
): Promise<TestState | null> {
  const db = createServerClient();
  const { data: test, error: testError } = await db
    .from("tests")
    .select("id")
    .eq("kind", kind)
    .returns<{ id: string }[]>()
    .maybeSingle();
  if (testError) throw new Error(`tests: ${testError.code}`);
  if (!test) return null;

  const [questions, opened, session] = await Promise.all([
    db
      .from("test_questions")
      .select("id, position, statement_kk, options")
      .eq("test_id", test.id)
      .order("position")
      .returns<TestQuestion[]>(),
    db
      .from("class_tests")
      .select("open")
      .eq("class_id", classId)
      .eq("test_id", test.id)
      .returns<{ open: boolean }[]>()
      .maybeSingle(),
    db
      .from("test_sessions")
      .select("student_id")
      .eq("student_id", studentId)
      .eq("test_id", test.id)
      .returns<{ student_id: string }[]>()
      .maybeSingle(),
  ]);
  if (questions.error) throw new Error(`test_questions: ${questions.error.code}`);
  if (opened.error) throw new Error(`class_tests: ${opened.error.code}`);
  if (session.error) throw new Error(`test_sessions: ${session.error.code}`);
  if (questions.data.length === 0) return null;

  const status = statusOf(opened.data?.open === true, session.data !== null);

  const answers = new Map<string, string>();
  if (status !== "closed") {
    const { data, error } = await db
      .from("test_answers")
      .select("question_id, answer_raw")
      .eq("student_id", studentId)
      .in(
        "question_id",
        questions.data.map((question) => question.id),
      )
      .returns<{ question_id: string; answer_raw: string }[]>();
    if (error) throw new Error(`test_answers: ${error.code}`);
    for (const row of data) answers.set(row.question_id, row.answer_raw);
  }

  return { testId: test.id, status, questions: questions.data, answers };
}

export async function saveTestAnswer(row: {
  student_id: string;
  question_id: string;
  answer_raw: string;
  time_spent_ms: number | null;
}): Promise<void> {
  // Повторная отправка (обрыв связи, смена варианта) заменяет прежний ответ.
  const { error } = await createServerClient()
    .from("test_answers")
    .upsert(row, { onConflict: "student_id,question_id" });
  if (error) throw new Error(`test_answers: ${error.code}`);
}

// false: тест уже был завершён (одновременный повторный запрос).
export async function finishTest(studentId: string, testId: string): Promise<boolean> {
  const { error } = await createServerClient()
    .from("test_sessions")
    .insert({ student_id: studentId, test_id: testId });
  if (error?.code === "23505") return false;
  if (error) throw new Error(`test_sessions: ${error.code}`);
  return true;
}
