import Link from "next/link";
import type { PathTask } from "@/lib/home";
import { getT } from "@/lib/messages";

type TaskPathProps = { tasks: PathTask[]; nextOrderNo: number | null };

function CheckIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default async function TaskPath({ tasks, nextOrderNo }: TaskPathProps) {
  const t = await getT();
  return (
    <section className="path-section" aria-labelledby="path-title">
      <h2 id="path-title">{t("home.pathLabel")}</h2>
      <ol className="task-path">
        {tasks.map((task) => {
          const isNext = task.order_no === nextOrderNo;
          const state = task.solved ? "solved" : task.scored ? "scored" : task.pending ? "pending" : isNext ? "next" : "open";
          const statusId = `task-status-${task.order_no}`;

          return (
            <li key={task.order_no} className={`task-step task-step-${state}`}>
              <span className="task-marker" aria-hidden="true">
                {task.solved || task.scored ? <CheckIcon /> : task.pending ? <PendingIcon /> : task.order_no}
              </span>
              <article className="task-card">
                <div className="task-meta">
                  <h3>
                    <Link
                      className="task-link"
                      href={`/tasks/${task.order_no}`}
                      aria-current={isNext ? "step" : undefined}
                      aria-describedby={statusId}
                    >
                      {t("home.taskNumber", { number: task.order_no })}
                    </Link>
                  </h3>
                  <span id={statusId} className="task-status">
                    {t(`home.status.${state}`)}
                  </span>
                </div>
                <p className="task-skill-line">{t(`skill.${task.skill}`)}</p>
                <p>{task.statement_kk}</p>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
