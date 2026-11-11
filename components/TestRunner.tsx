"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

type Question = { position: number; statement: string; options: string[] };

type TestRunnerProps = {
  kind: "pretest" | "posttest";
  questions: Question[];
  // position -> ответ этого ученика, сохранённый раньше
  savedAnswers: Record<number, string>;
  startIndex: number;
};

type Problem = "pick" | "network" | "server" | "rateLimited" | "unauthorized" | "closed" | "incomplete";

const REQUEST_TIMEOUT_MS = 15000;
const LETTERS = ["A", "B", "C", "D", "E", "F"];

const problemMessage: Record<Problem, MessageKey> = {
  pick: "tests.pick",
  network: "tests.network",
  server: "tests.server",
  rateLimited: "tests.rateLimited",
  unauthorized: "tests.unauthorized",
  closed: "tests.closed",
  incomplete: "tests.incomplete",
};

type Outcome = "ok" | "finished" | Problem;

async function post(path: string, payload: object): Promise<Outcome> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) return "ok";
    if (response.status === 401) return "unauthorized";
    if (response.status === 403) return "closed";
    if (response.status === 429) return "rateLimited";
    if (response.status === 409) {
      const { error } = (await response.json().catch(() => ({}))) as { error?: string };
      return error === "incomplete" ? "incomplete" : "finished";
    }
    return response.status >= 500 ? "server" : "network";
  } catch {
    return "network";
  }
}

export default function TestRunner({ kind, questions, savedAnswers, startIndex }: TestRunnerProps) {
  const t = useT();
  const [index, setIndex] = useState(startIndex);
  const [answers, setAnswers] = useState<Record<number, string>>(savedAnswers);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [done, setDone] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openedAt = useRef(0);
  const moved = useRef(false);

  const question = questions[index];
  const total = questions.length;
  const last = index === total - 1;
  const selected = answers[question.position] ?? null;

  useEffect(() => {
    openedAt.current = performance.now();
    // Фокус на вопрос после перехода или завершения, чтобы читалка прочитала новый текст.
    if (moved.current) headingRef.current?.focus();
  }, [index, done]);

  if (done) {
    return (
      <section className="test-card" aria-labelledby="test-done">
        <h1 id="test-done" ref={headingRef} tabIndex={-1} className="test-done-title">
          {t("tests.doneTitle")}
        </h1>
        <p>{t("tests.doneBody")}</p>
        <Link className="test-link" href="/">
          {t("tests.back")}
        </Link>
      </section>
    );
  }

  function choose(option: string) {
    setAnswers((current) => ({ ...current, [question.position]: option }));
    setProblem(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!selected) {
      setProblem("pick");
      return;
    }

    setSaving(true);
    setProblem(null);
    let outcome = await post("/api/test/answer", {
      kind,
      position: question.position,
      answer: selected,
      timeSpentMs: Math.round(performance.now() - openedAt.current),
    });
    if (outcome === "ok" && last) outcome = await post("/api/test/finish", { kind });
    setSaving(false);

    moved.current = true;
    if (outcome === "finished" || (outcome === "ok" && last)) {
      setDone(true);
    } else if (outcome === "ok") {
      setIndex(index + 1);
    } else {
      setProblem(outcome);
    }
  }

  return (
    <form className="test-card" onSubmit={submit} noValidate>
      <div className="test-head">
        <p className="test-title">{t(`tests.${kind}`)}</p>
        <p className="test-counter">{t("tests.counter", { current: index + 1, total })}</p>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={t("tests.progressLabel", { current: index + 1, total })}
      >
        <span className="progress-fill" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <h1 id="test-question" ref={headingRef} tabIndex={-1} className="test-question">
        {question.statement}
      </h1>

      <fieldset
        key={question.position}
        className="test-options"
        role="radiogroup"
        aria-labelledby="test-question"
        aria-describedby="test-status"
      >
        {question.options.map((option, optionIndex) => (
          <label key={option} className="test-option">
            <input
              type="radio"
              name={`question-${question.position}`}
              value={option}
              checked={selected === option}
              onChange={() => choose(option)}
            />
            <span className="test-letter" aria-hidden="true">
              {selected === option ? "✓" : LETTERS[optionIndex]}
            </span>
            <span>{option}</span>
          </label>
        ))}
      </fieldset>

      <div id="test-status" role="status" className="answer-status-region">
        {saving && <p className="test-note">{t("tests.saving")}</p>}
        {problem && (
          <p className="answer-status answer-status-incorrect">
            <span aria-hidden="true" className="answer-status-icon">
              !
            </span>
            <span>
              {t(problemMessage[problem])}
              {problem === "unauthorized" && (
                <>
                  {" "}
                  <Link href="/login">{t("answer.loginLink")}</Link>
                </>
              )}
            </span>
          </p>
        )}
      </div>

      <button type="submit" className="answer-submit test-next" aria-disabled={saving}>
        {t(last ? "tests.finish" : "tests.next")}
      </button>
    </form>
  );
}
