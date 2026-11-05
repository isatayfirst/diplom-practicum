import "server-only";
import type { ClassData, ClassInfo } from "@/lib/teacher";
import type { TestKind } from "@/lib/tests";
import type { TFn } from "@/lib/t";

export const DASH = "—";

// Десятичная запятая: 4,6.
export function formatNumber(value: number): string {
  return (Math.round(value * 10) / 10).toString().replace(".", ",");
}

export function formatRatio(t: TFn, value: number | null, total: number): string {
  return value === null ? DASH : t("teacher.ratio", { value: formatNumber(value), total });
}

// Класс берётся из ?class=код; неизвестный или пустой код даёт первый класс.
export function pickClass(classes: ClassInfo[], code: string | undefined): ClassInfo | null {
  return classes.find((item) => item.code === code) ?? classes[0] ?? null;
}

export function lastActivity(t: TFn, attempts: { created_at: string }[]): string {
  if (attempts.length === 0) return DASH;
  const latest = attempts.reduce((best, a) => (a.created_at > best ? a.created_at : best), attempts[0].created_at);
  const days = Math.floor(Date.now() / 86_400_000) - Math.floor(new Date(latest).getTime() / 86_400_000);
  if (days <= 0) return t("teacher.students.lastToday");
  if (days === 1) return t("teacher.students.lastYesterday");
  return t("teacher.students.lastDaysAgo", { count: days });
}

export type TestsView = {
  columns: { kind: TestKind; questionCount: number; open: boolean }[];
  // активные ученики: номер и «X / N» или тире по каждому тесту
  rows: { number: number; values: Record<TestKind, string> }[];
  pretestAverage: string;
};

// Результаты тестов только активных учеников: исключённые в списки и средние не входят.
export function buildTestsView(data: ClassData, t: TFn): TestsView {
  const active = data.students.filter((student) => student.status === "active");
  const column = (kind: TestKind) => data.tests.find((test) => test.kind === kind);

  const rows = active.map((student) => {
    const value = (kind: TestKind) => {
      const test = column(kind);
      const score = test?.scores.get(student.id);
      return test && score !== undefined ? t("teacher.ratio", { value: score, total: test.questionCount }) : DASH;
    };
    return { number: student.number, values: { pretest: value("pretest"), posttest: value("posttest") } };
  });

  const pre = column("pretest");
  const scores = pre ? active.flatMap((student) => (pre.scores.has(student.id) ? [pre.scores.get(student.id)!] : [])) : [];
  const average = scores.length > 0 && pre ? scores.reduce((sum, v) => sum + v, 0) / scores.length : null;

  return {
    columns: data.tests.map((test) => ({ kind: test.kind, questionCount: test.questionCount, open: test.open })),
    rows,
    pretestAverage: pre ? formatRatio(t, average, pre.questionCount) : DASH,
  };
}
