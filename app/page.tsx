import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import LangSwitch from "@/components/LangSwitch";
import ProgressBar from "@/components/ProgressBar";
import RefreshOnReturn from "@/components/RefreshOnReturn";
import TaskPath from "@/components/TaskPath";
import TestList from "@/components/TestList";
import { getHomeState, type HomeState } from "@/lib/home";
import { getT } from "@/lib/messages";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { InactiveStudentError, SESSION_END_PATH } from "@/lib/students";

export const dynamic = "force-dynamic";

async function loadHomeState(studentId: string): Promise<HomeState | null> {
  try {
    return await getHomeState(studentId);
  } catch (error) {
    if (error instanceof InactiveStudentError) redirect(SESSION_END_PATH);
    console.error(error);
    return null;
  }
}

export default async function HomePage() {
  const studentId = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!studentId) redirect("/login");

  const t = await getT();
  const state = await loadHomeState(studentId);

  if (!state) {
    return (
      <main id="content" tabIndex={-1} className="page">
        <div className="page-top">
          <LangSwitch />
        </div>
        <header className="page-header">
          <h1>{t("home.title")}</h1>
        </header>
        <p className="notice notice-error" role="alert">
          {t("home.error")}
        </p>
      </main>
    );
  }

  if (state.variant === "control") {
    return (
      <main id="content" tabIndex={-1} className="page">
        <RefreshOnReturn />
        <div className="page-top">
          <LangSwitch />
        </div>
        <header className="page-header">
          <h1>{t("home.welcome")}</h1>
          <p className="lead">{t("home.controlLead")}</p>
        </header>
        {state.tests.length > 0 ? (
          <TestList tests={state.tests} />
        ) : (
          <p className="notice">{t("tests.empty")}</p>
        )}
      </main>
    );
  }

  const { variant, tasks, solvedCount, nextOrderNo, tests } = state;
  const first = variant === "first";

  return (
    <main id="content" tabIndex={-1} className="page">
      <RefreshOnReturn />
      <div className="page-top">
        <LangSwitch />
      </div>
      <header className="page-header">
        <h1>{t(first ? "home.welcome" : "home.returningTitle")}</h1>
        <p className="lead">{t(first ? "home.firstLead" : "home.returningLead")}</p>
      </header>

      {!first && <ProgressBar solved={solvedCount} total={tasks.length} />}

      {nextOrderNo !== null ? (
        <section className="next-card" aria-labelledby="next-title">
          <p className="next-eyebrow">{t(first ? "home.startEyebrow" : "home.continueEyebrow")}</p>
          <h2 id="next-title" className="next-title">
            {t("home.taskNumber", { number: nextOrderNo })}
          </h2>
          <Link className="next-link" href={`/tasks/${nextOrderNo}`}>
            {t("home.goToTask", { number: nextOrderNo })}
          </Link>
        </section>
      ) : (
        <p className="notice">{t(tasks.length > 0 ? "home.noNext" : "home.empty")}</p>
      )}

      {tests.length > 0 && <TestList tests={tests} />}

      {tasks.length > 0 && <TaskPath tasks={tasks} nextOrderNo={nextOrderNo} />}
    </main>
  );
}
