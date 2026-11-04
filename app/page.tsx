import Link from "next/link";
import { t } from "@/lib/messages";
import { getTasks, type TaskListItem } from "@/lib/tasks";

export const dynamic = "force-dynamic";

async function loadTasks(): Promise<TaskListItem[] | null> {
  try {
    return await getTasks();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default async function HomePage() {
  const tasks = await loadTasks();

  return (
    <main id="content" tabIndex={-1} className="page">
      <header className="page-header">
        <h1>{t("home.title")}</h1>
        <p className="lead">{t("home.lead")}</p>
        {tasks && tasks.length > 0 && (
          <p className="count">{t("home.count", { count: tasks.length })}</p>
        )}
      </header>

      {tasks === null && (
        <p className="notice notice-error" role="alert">
          {t("home.error")}
        </p>
      )}

      {tasks?.length === 0 && <p className="notice">{t("home.empty")}</p>}

      {tasks && tasks.length > 0 && (
        <ol className="task-path" aria-label={t("home.pathLabel")}>
          {tasks.map((task) => (
            <li key={task.id} className="task-step">
              <span className="task-marker" aria-hidden="true">
                {task.order_no}
              </span>
              <article className="task-card">
                <div className="task-meta">
                  <h2>
                    <Link className="task-link" href={`/tasks/${task.order_no}`}>
                      {t("home.taskNumber", { number: task.order_no })}
                    </Link>
                  </h2>
                  <span className="task-skill">{t(`skill.${task.skill}`)}</span>
                </div>
                <p>{task.statement_kk}</p>
              </article>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
