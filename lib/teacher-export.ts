import "server-only";
import type { CsvCell } from "@/lib/csv";
import { buildCsv } from "@/lib/csv";
import type { TFunction } from "@/lib/i18n";
import { buildCells, type ClassData, type ClassInfo } from "@/lib/teacher";

const ZONE = "Asia/Almaty";

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { day: pick("day"), month: pick("month"), year: pick("year") };
}

// дд.мм.гггг по времени Алматы
export function formatDate(iso: string | Date): string {
  const { day, month, year } = dateParts(typeof iso === "string" ? new Date(iso) : iso);
  return `${day}.${month}.${year}`;
}

// гггг-мм-дд для имени файла
export function fileDate(date: Date): string {
  const { day, month, year } = dateParts(date);
  return `${year}-${month}-${day}`;
}

export function exportFileName(cls: ClassInfo, now: Date): string {
  return `practicum_${cls.code.replace(/[^A-Za-z0-9_-]/g, "_")}_${fileDate(now)}.csv`;
}

export function periodOf(data: ClassData): { from: string; to: string } | null {
  return data.firstAt && data.lastAt ? { from: formatDate(data.firstAt), to: formatDate(data.lastAt) } : null;
}

const seconds = (ms: number) => Math.round(ms / 1000);

// Строка на каждого ученика класса, исключённые тоже (с пометкой). Данные те же, что в кабинете:
// ячейки считает buildCells. Личных кодов, текстов выводов и эталонов здесь нет: их нет и в ClassData.
export function buildExportCsv(t: TFunction, cls: ClassInfo, data: ClassData, now: Date): string {
  const period = periodOf(data);
  const lines: CsvCell[][] = [
    [t("csv.class"), `${cls.label} (${cls.code})`],
    [t("csv.period"), period ? `${period.from} — ${period.to}` : t("csv.noAttempts")],
    [t("csv.exportedOn"), formatDate(now)],
    [],
  ];

  const header: CsvCell[] = [t("csv.col.number"), t("csv.col.status"), t("csv.col.reason")];
  for (const task of data.tasks) {
    const name = t("home.taskNumber", { number: task.order_no });
    header.push(
      t("csv.col.attempts", { name }),
      t("csv.col.solved", { name }),
      t("csv.col.score", { name }),
      t("csv.col.time", { name }),
    );
  }
  for (const test of data.tests) {
    const name = t(`tests.${test.kind}`);
    header.push(
      t("csv.col.testCorrect", { name }),
      t("csv.col.testTotal", { name }),
      t("csv.col.testTime", { name }),
    );
  }
  lines.push(header);

  for (const student of data.students) {
    const row: CsvCell[] = [
      student.number,
      student.status === "excluded" ? t("teacher.students.statusExcluded") : t("teacher.students.statusActive"),
      student.reason ? t(`teacher.students.reason.${student.reason}`) : null,
    ];

    const mine = data.attempts.filter((attempt) => attempt.student_id === student.id);
    const { cells } = buildCells(data.tasks, mine, data.scores);
    data.tasks.forEach((task, index) => {
      const cell = cells[index];
      const own = mine.filter((attempt) => attempt.task_id === task.id);
      const timed = own.filter((attempt) => attempt.time_spent_ms !== null);
      row.push(
        cell.attempts,
        cell.state === "solved" || cell.state === "scored" ? 1 : 0,
        cell.score,
        timed.length > 0 ? seconds(timed.reduce((sum, a) => sum + (a.time_spent_ms ?? 0), 0)) : null,
      );
    });

    for (const test of data.tests) {
      const score = test.scores.get(student.id);
      row.push(
        score ?? null,
        score === undefined ? null : test.questionCount,
        score === undefined ? null : seconds(test.timeMs.get(student.id) ?? 0),
      );
    }
    lines.push(row);
  }
  return buildCsv(lines);
}
