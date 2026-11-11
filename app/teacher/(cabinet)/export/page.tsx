import type { Metadata } from "next";
import { getT } from "@/lib/messages";
import { listClasses, loadClassData, requireTeacherPage, type ClassData, type ClassInfo } from "@/lib/teacher";
import { periodOf } from "@/lib/teacher-export";
import { pickClass } from "@/lib/teacher-view";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("teacher.export.title") };
}

type Loaded = { kind: "none" } | { kind: "error" } | { kind: "ok"; cls: ClassInfo; data: ClassData };

async function load(code: string | undefined): Promise<Loaded> {
  try {
    const cls = pickClass(await listClasses(), code);
    if (!cls) return { kind: "none" };
    return { kind: "ok", cls, data: await loadClassData(cls.id, cls.studyGroup) };
  } catch (error) {
    console.error(error);
    return { kind: "error" };
  }
}

export default async function ExportPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const t = await getT();
  await requireTeacherPage();
  const state = await load((await searchParams).class);

  if (state.kind !== "ok") {
    return (
      <main id="content" tabIndex={-1} className="t-main">
        <h1>{t("teacher.export.title")}</h1>
        <p className={state.kind === "error" ? "notice notice-error" : "notice"} role={state.kind === "error" ? "alert" : undefined}>
          {state.kind === "error" ? t("teacher.error") : t("teacher.noClasses")}
        </p>
      </main>
    );
  }

  const { cls, data } = state;
  const period = periodOf(data);

  return (
    <main id="content" tabIndex={-1} className="t-main">
      <header>
        <h1>{t("teacher.export.title")}</h1>
        <p className="lead">{t("teacher.export.lead", { label: cls.label })}</p>
      </header>

      <section className="t-panel" aria-labelledby="export-title">
        <h2 id="export-title">{cls.label}</h2>
        <p>{period ? t("teacher.export.period", period) : t("teacher.export.noPeriod")}</p>
        <p className="t-muted">{t("teacher.export.contents")}</p>
        <p className="t-muted">{t("teacher.export.excluded")}</p>
        <p className="t-muted">{t("teacher.export.privacy")}</p>
        <div className="t-actions">
          <a
            className="t-button t-button-solid t-link-button"
            href={`/api/teacher/export?class=${encodeURIComponent(cls.code)}`}
            download
          >
            {t("teacher.export.button")}
          </a>
        </div>
      </section>
    </main>
  );
}
