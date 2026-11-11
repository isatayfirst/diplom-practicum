import type { Metadata } from "next";
import TestResultsTable from "@/components/teacher/TestResultsTable";
import TestSwitches from "@/components/teacher/TestSwitches";
import { getT } from "@/lib/messages";
import { listClasses, loadClassData, requireTeacherPage, type ClassInfo } from "@/lib/teacher";
import { buildTestsView, pickClass, type TestsView } from "@/lib/teacher-view";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("teacher.tests.title") };
}

type Loaded = { kind: "none" } | { kind: "error" } | { kind: "ok"; cls: ClassInfo; view: TestsView };

async function load(code: string | undefined): Promise<Loaded> {
  const t = await getT();
  try {
    const cls = pickClass(await listClasses(), code);
    if (!cls) return { kind: "none" };
    return { kind: "ok", cls, view: buildTestsView(t, await loadClassData(cls.id, cls.studyGroup)) };
  } catch (error) {
    console.error(error);
    return { kind: "error" };
  }
}

export default async function TestsPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const t = await getT();
  await requireTeacherPage();
  const state = await load((await searchParams).class);

  if (state.kind !== "ok") {
    return (
      <main id="content" tabIndex={-1} className="t-main">
        <h1>{t("teacher.tests.title")}</h1>
        <p className={state.kind === "error" ? "notice notice-error" : "notice"} role={state.kind === "error" ? "alert" : undefined}>
          {state.kind === "error" ? t("teacher.error") : t("teacher.noClasses")}
        </p>
      </main>
    );
  }

  const { cls, view } = state;
  const group = t(`teacher.group.${cls.studyGroup}`);

  return (
    <main id="content" tabIndex={-1} className="t-main">
      <header>
        <h1>{t("teacher.tests.title")}</h1>
        <p className="lead">{cls.label} · {group}</p>
      </header>

      <section className="t-panel" aria-labelledby="manage-title">
        <h2 id="manage-title">{t("teacher.tests.manage")}</h2>
        <p className="t-muted">{t("teacher.tests.manageHint")}</p>
        <TestSwitches classId={cls.id} tests={view.columns} />
      </section>

      <TestResultsTable view={view} />
      <p className="t-muted">{t("teacher.tests.resultsNote")}</p>
    </main>
  );
}
