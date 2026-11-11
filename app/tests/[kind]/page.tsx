import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import TestRunner from "@/components/TestRunner";
import { getT } from "@/lib/messages";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { InactiveStudentError, SESSION_END_PATH } from "@/lib/students";
import { getStudentClass, getTestState, isTestKind, type TestState } from "@/lib/tests";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ kind: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getT();
  const { kind } = await params;
  return isTestKind(kind) ? { title: t(`tests.${kind}`) } : {};
}

// null: сбой чтения. undefined: теста нет или в нём нет вопросов.
async function loadTest(studentId: string, kind: "pretest" | "posttest") {
  try {
    const { classId } = await getStudentClass(studentId);
    return (await getTestState(studentId, classId, kind)) ?? undefined;
  } catch (error) {
    if (error instanceof InactiveStudentError) redirect(SESSION_END_PATH);
    console.error(error);
    return null;
  }
}

async function BackLink() {
  const t = await getT();
  return (
    <Link className="back-link" href="/">
      <span aria-hidden="true">←</span> {t("tests.back")}
    </Link>
  );
}

export default async function TestPage({ params }: PageProps) {
  const t = await getT();
  const { kind } = await params;
  if (!isTestKind(kind)) notFound();

  const studentId = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!studentId) redirect("/login");

  const state: TestState | null | undefined = await loadTest(studentId, kind);
  if (state === undefined) notFound();

  if (state === null) {
    return (
      <main id="content" tabIndex={-1} className="page">
        <BackLink />
        <p className="notice notice-error" role="alert">
          {t("tests.error")}
        </p>
      </main>
    );
  }

  // Закрытый и завершённый тест вопросов не показывает: решение на сервере.
  if (state.status !== "open") {
    const closed = state.status === "closed";
    return (
      <main id="content" tabIndex={-1} className="page">
        <BackLink />
        <section className="test-card">
          <h1 className="test-done-title">{t(closed ? "tests.closedTitle" : "tests.doneTitle")}</h1>
          <p>{t(closed ? "tests.closedBody" : "tests.doneBody")}</p>
        </section>
      </main>
    );
  }

  // В браузер уходят только текст, варианты и собственные ответы ученика.
  const questions = state.questions.map((question) => ({
    position: question.position,
    statement: question.statement_kk,
    options: question.options,
  }));
  const savedAnswers = Object.fromEntries(
    state.questions.flatMap((question) => {
      const answer = state.answers.get(question.id);
      return answer === undefined ? [] : [[question.position, answer] as const];
    }),
  );
  const firstOpen = state.questions.findIndex((question) => !state.answers.has(question.id));

  return (
    <main id="content" tabIndex={-1} className="page test-page">
      <BackLink />
      <TestRunner
        kind={kind}
        questions={questions}
        savedAnswers={savedAnswers}
        startIndex={firstOpen === -1 ? questions.length - 1 : firstOpen}
      />
    </main>
  );
}
