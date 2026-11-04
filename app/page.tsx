import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProgressBar from "@/components/ProgressBar";
import RefreshOnReturn from "@/components/RefreshOnReturn";
import TaskPath from "@/components/TaskPath";
import { getHomeState, type HomeState } from "@/lib/home";
import { t } from "@/lib/messages";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

async function loadHomeState(studentId: string): Promise<HomeState | null> {
  try {
    return await getHomeState(studentId);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default async function HomePage() {
  const studentId = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!studentId) redirect("/login");

  const state = await loadHomeState(studentId);

  if (!state) {
    return (
      <main id="content" tabIndex={-1} className="page">
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
        <header className="page-header">
          <h1>{t("home.welcome")}</h1>
        </header>
        <p className="notice">{t("home.control")}</p>
      </main>
    );
  }

  const { variant, tasks, solvedCount, nextOrderNo } = state;
  const first = variant === "first";

  return (
    <main id="content" tabIndex={-1} className="page">
      <RefreshOnReturn />
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

      {tasks.length > 0 && <TaskPath tasks={tasks} nextOrderNo={nextOrderNo} />}
    </main>
  );
}
