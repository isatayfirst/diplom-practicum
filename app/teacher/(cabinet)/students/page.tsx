import type { Metadata } from "next";
import StudentsTable, { type StudentView } from "@/components/teacher/StudentsTable";
import { t } from "@/lib/messages";
import { listClasses, loadClassData, MAX_CLASS_SIZE, requireTeacherPage, buildCells, type ClassInfo } from "@/lib/teacher";
import { DASH, lastActivity, pickClass } from "@/lib/teacher-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t("teacher.students.title") };

type Loaded =
  | { kind: "none" }
  | { kind: "error" }
  | { kind: "ok"; cls: ClassInfo; students: StudentView[] };

async function load(code: string | undefined): Promise<Loaded> {
  try {
    const cls = pickClass(await listClasses(), code);
    if (!cls) return { kind: "none" };
    const data = await loadClassData(cls.id, cls.studyGroup);
    const control = cls.studyGroup === "control";
    const pre = data.tests.find((test) => test.kind === "pretest");

    const students = data.students.map((student): StudentView => {
      const mine = data.attempts.filter((attempt) => attempt.student_id === student.id);
      const done = buildCells(data.tasks, mine, data.scores).cells.filter((c) => c.state === "solved" || c.state === "scored").length;
      const score = pre?.scores.get(student.id);
      return {
        id: student.id,
        number: student.number,
        code: student.personalCode,
        excluded: student.status === "excluded",
        reason: student.reason,
        pretest: pre && score !== undefined ? t("teacher.ratio", { value: score, total: pre.questionCount }) : DASH,
        tasks: control ? null : t("teacher.ratio", { value: done, total: data.tasks.length }),
        last: control ? null : lastActivity(mine),
      };
    });
    return { kind: "ok", cls, students };
  } catch (error) {
    console.error(error);
    return { kind: "error" };
  }
}

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  await requireTeacherPage();
  const state = await load((await searchParams).class);

  if (state.kind !== "ok") {
    return (
      <main id="content" tabIndex={-1} className="t-main">
        <h1>{t("teacher.students.title")}</h1>
        <p className={state.kind === "error" ? "notice notice-error" : "notice"} role={state.kind === "error" ? "alert" : undefined}>
          {state.kind === "error" ? t("teacher.error") : t("teacher.noClasses")}
        </p>
      </main>
    );
  }

  const { cls, students } = state;
  const active = students.filter((student) => !student.excluded);

  return (
    <main id="content" tabIndex={-1} className="t-main">
      <header className="no-print">
        <h1>{t("teacher.students.title")}</h1>
        <p className="lead">{t("teacher.students.subtitle", { label: cls.label, count: students.length })}</p>
      </header>

      <section className="t-classcode no-print">
        <div>
          <div className="t-eyebrow">{t("teacher.students.classCode")}</div>
          <div className="t-classcode-value">{cls.code}</div>
          <p>{t("teacher.students.classNote")}</p>
        </div>
      </section>

      <StudentsTable
        classId={cls.id}
        students={students}
        showTasks={cls.studyGroup === "experimental"}
        atLimit={students.length >= MAX_CLASS_SIZE}
      />

      {students.length === 0 && <p className="notice no-print">{t("teacher.students.empty")}</p>}
      <p className="t-muted no-print">{t("teacher.students.note")}</p>

      {/* Печатная версия: на экране скрыта, при печати остаётся только она. */}
      <section className="print-only" aria-hidden="true">
        <h2>{t("teacher.students.printTitle", { label: cls.label })}</h2>
        <p>
          {t("teacher.students.classCode")}: <strong>{cls.code}</strong>
        </p>
        <table className="t-print-table">
          <thead>
            <tr>
              <th scope="col">{t("teacher.students.col.number")}</th>
              <th scope="col">{t("teacher.students.col.code")}</th>
            </tr>
          </thead>
          <tbody>
            {active.map((student) => (
              <tr key={student.id}>
                <th scope="row">№{student.number}</th>
                <td className="t-code">{student.code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
