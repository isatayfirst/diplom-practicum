import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnswerPanel from "@/components/AnswerPanel";
import DataTable from "@/components/DataTable";
import { t } from "@/lib/messages";
import { getDataset, getTask, isOrderNo, type Dataset, type TaskDetail } from "@/lib/tasks";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ orderNo: string }> };

function parseOrderNo(value: string): number | null {
  const orderNo = Number(value);
  return /^[1-9]\d*$/.test(value) && isOrderNo(orderNo) ? orderNo : null;
}

type LoadResult = { task: TaskDetail | null; dataset: Dataset | null };

async function loadTask(orderNo: number): Promise<LoadResult | null> {
  try {
    const task = await getTask(orderNo);
    const dataset = task?.dataset_id ? await getDataset(task.dataset_id) : null;
    return { task, dataset };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const orderNo = parseOrderNo((await params).orderNo);
  return orderNo ? { title: t("home.taskNumber", { number: orderNo }) } : {};
}

export default async function TaskPage({ params }: PageProps) {
  const orderNo = parseOrderNo((await params).orderNo);
  if (orderNo === null) notFound();

  const result = await loadTask(orderNo);
  if (result && !result.task) notFound();

  const task = result?.task;
  const dataset = result?.dataset;

  return (
    <main id="content" tabIndex={-1} className="page task-page">
      <Link className="back-link" href="/">
        <span aria-hidden="true">←</span> {t("task.back")}
      </Link>

      {!task && (
        <p className="notice notice-error" role="alert">
          {t("task.error")}
        </p>
      )}

      {task && (
        <div className="task-layout">
          <div className="task-content">
            <header className="task-card">
              <div className="task-meta">
                <h1 className="task-title">{t("home.taskNumber", { number: task.order_no })}</h1>
                <span className="task-skill">{t(`skill.${task.skill}`)}</span>
              </div>
              <p>{task.statement_kk}</p>
            </header>

            {dataset && (
              <DataTable
                caption={t("task.tableCaption", { label: dataset.label, name: dataset.name })}
                columns={dataset.data.columns}
                rows={dataset.data.rows}
              />
            )}
          </div>

          <AnswerPanel
            orderNo={task.order_no}
            answerType={task.answer_type}
            options={task.options ?? []}
          />
        </div>
      )}
    </main>
  );
}
