import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AnswerPanel from "@/components/AnswerPanel";
import DataTable from "@/components/DataTable";
import LangSwitch from "@/components/LangSwitch";
import TaskChart from "@/components/TaskChart";
import { hasSubmittedText, MAX_TEXT_LENGTH } from "@/lib/answers";
import { getT } from "@/lib/messages";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { InactiveStudentError, SESSION_END_PATH } from "@/lib/students";
import { getDataset, getTask, isOrderNo, type Dataset, type TaskDetail } from "@/lib/tasks";
import { getStudentClass } from "@/lib/tests";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ orderNo: string }> };

const TABLE_ID = "task-table";

function parseOrderNo(value: string): number | null {
  const orderNo = Number(value);
  return /^[1-9]\d*$/.test(value) && isOrderNo(orderNo) ? orderNo : null;
}

type LoadResult = { task: TaskDetail | null; dataset: Dataset | null; textSent: boolean };

async function loadTask(orderNo: number, studentId: string): Promise<LoadResult | null> {
  try {
    // Контрольному классу задачи недоступны: страница отвечает как для несуществующей задачи.
    if ((await getStudentClass(studentId)).studyGroup === "control") {
      return { task: null, dataset: null, textSent: false };
    }
    const task = await getTask(orderNo);
    const dataset = task?.dataset_id ? await getDataset(task.dataset_id) : null;
    const textSent = task?.answer_type === "text" && (await hasSubmittedText(studentId, task.id));
    return { task, dataset, textSent };
  } catch (error) {
    if (error instanceof InactiveStudentError) redirect(SESSION_END_PATH);
    console.error(error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const orderNo = parseOrderNo((await params).orderNo);
  const t = await getT();
  return orderNo ? { title: t("home.taskNumber", { number: orderNo }) } : {};
}

export default async function TaskPage({ params }: PageProps) {
  const t = await getT();
  const orderNo = parseOrderNo((await params).orderNo);
  if (orderNo === null) notFound();

  const studentId = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!studentId) redirect("/login");

  const result = await loadTask(orderNo, studentId);
  if (result && !result.task) notFound();

  const task = result?.task;
  const dataset = result?.dataset;

  return (
    <main id="content" tabIndex={-1} className="page task-page">
      <div className="page-top">
        <Link className="back-link" href="/">
          <span aria-hidden="true">←</span> {t("task.back")}
        </Link>
        <LangSwitch />
      </div>

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

            {dataset && <TaskChart orderNo={task.order_no} dataset={dataset} tableId={TABLE_ID} />}

            {dataset && (
              <DataTable
                id={TABLE_ID}
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
            textSent={result?.textSent ?? false}
            textMaxLength={MAX_TEXT_LENGTH}
          />
        </div>
      )}
    </main>
  );
}
