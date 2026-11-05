import type { Metadata } from "next";
import GradeList from "@/components/teacher/GradeList";
import HeatMap from "@/components/teacher/HeatMap";
import TestResultsTable from "@/components/teacher/TestResultsTable";
import { t } from "@/lib/messages";
import {
  buildOverview,
  listClasses,
  loadAnswers,
  loadClassData,
  requireTeacherPage,
  type ClassInfo,
  type GradeItem,
  type Overview,
} from "@/lib/teacher";
import { buildTestsView, DASH, formatNumber, formatRatio, pickClass, type TestsView } from "@/lib/teacher-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t("teacher.overview.title") };

type Loaded =
  | { kind: "none" }
  | { kind: "error" }
  | { kind: "ok"; cls: ClassInfo; overview: Overview; grade: GradeItem[]; tests: TestsView };

async function load(code: string | undefined): Promise<Loaded> {
  try {
    const cls = pickClass(await listClasses(), code);
    if (!cls) return { kind: "none" };
    const data = await loadClassData(cls.id, cls.studyGroup);
    const { overview, grade } = buildOverview(data);
    const answers = await loadAnswers(grade.map((item) => item.attemptId));
    return {
      kind: "ok",
      cls,
      overview,
      grade: grade
        .map((item) => ({ ...item, answer: answers.get(item.attemptId) ?? "" }))
        // Порядок не зависит от оценки: после сохранения строка остаётся на месте, под рукой и под фокусом.
        .sort((a, b) => a.studentNumber - b.studentNumber || a.orderNo - b.orderNo),
      tests: buildTestsView(data),
    };
  } catch (error) {
    console.error(error);
    return { kind: "error" };
  }
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="t-card">
      <div className="t-card-label">{label}</div>
      <div className="t-card-value">{value}</div>
    </div>
  );
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  await requireTeacherPage();
  const state = await load((await searchParams).class);

  if (state.kind !== "ok") {
    return (
      <main id="content" tabIndex={-1} className="t-main">
        <h1>{t("teacher.overview.title")}</h1>
        <p className={state.kind === "error" ? "notice notice-error" : "notice"} role={state.kind === "error" ? "alert" : undefined}>
          {state.kind === "error" ? t("teacher.error") : t("teacher.noClasses")}
        </p>
      </main>
    );
  }

  const { cls, overview, grade, tests } = state;
  const control = cls.studyGroup === "control";
  const total = overview.orderNos.length;
  const post = tests.columns.find((column) => column.kind === "posttest");

  return (
    <main id="content" tabIndex={-1} className="t-main">
      <header>
        <h1>{t("teacher.overview.title")}</h1>
        <p className="lead">
          {t(control ? "teacher.overview.subtitleControl" : "teacher.overview.subtitleExperimental", { label: cls.label })}
        </p>
      </header>

      <div className="t-cards">
        <Card label={t("teacher.card.active")} value={String(tests.rows.length)} />
        {control ? (
          <>
            <Card label={t("teacher.card.pretestAvg")} value={tests.pretestAverage} />
            <Card label={t("teacher.card.posttest")} value={post?.open ? t("teacher.tests.open") : t("teacher.tests.closed")} />
          </>
        ) : (
          <>
            <Card label={t("teacher.card.avgDone")} value={formatRatio(overview.avgDone, total)} />
            <Card label={t("teacher.card.avgAttempts")} value={overview.avgAttempts === null ? DASH : formatNumber(overview.avgAttempts)} />
            <Card
              label={t("teacher.card.busiest")}
              value={overview.busiestOrderNo === null ? DASH : t("teacher.card.taskNumber", { number: overview.busiestOrderNo })}
            />
          </>
        )}
      </div>

      {tests.rows.length === 0 ? (
        <p className="notice">{t("teacher.empty.students")}</p>
      ) : control ? (
        <TestResultsTable view={tests} />
      ) : (
        <HeatMap overview={overview} />
      )}

      {overview.excludedCount > 0 && <p className="t-muted">{t("teacher.excludedNote", { count: overview.excludedCount })}</p>}

      {!control && (
        <section className="t-grade" aria-labelledby="grade-title">
          <h2 id="grade-title">{t("teacher.grade.title")}</h2>
          <p className="t-muted">{t("teacher.grade.lead")}</p>
          {grade.length === 0 ? <p className="notice">{t("teacher.grade.empty")}</p> : <GradeList items={grade} />}
        </section>
      )}
    </main>
  );
}
