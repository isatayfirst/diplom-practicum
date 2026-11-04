"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { t, type MessageKey } from "@/lib/messages";

type AnswerType = "number" | "choice" | "text";
type Status =
  | "idle"
  | "checking"
  | "correct"
  | "incorrect"
  | "invalid_format"
  | "teacher"
  | "network"
  | "server"
  | "unauthorized"
  | "rateLimited";

type AnswerPanelProps = {
  orderNo: number;
  answerType: AnswerType;
  options: string[];
};

const REQUEST_TIMEOUT_MS = 15000;

const invalidMessage: Record<AnswerType, MessageKey> = {
  number: "answer.invalidNumber",
  choice: "answer.invalidChoice",
  text: "answer.invalidText",
};

const statusIcon: Record<Exclude<Status, "idle">, string> = {
  checking: "…",
  correct: "✓",
  incorrect: "✕",
  invalid_format: "!",
  teacher: "✎",
  network: "!",
  server: "!",
  unauthorized: "!",
  rateLimited: "…",
};

function statusMessage(status: Exclude<Status, "idle">, answerType: AnswerType): string {
  if (status === "invalid_format") return t(invalidMessage[answerType]);
  return t(`answer.${status}`);
}

export default function AnswerPanel({ orderNo, answerType, options }: AnswerPanelProps) {
  const fieldId = useId();
  const hintId = useId();
  const statusId = useId();
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const lastRequest = useRef(0);
  const openedAt = useRef(0);

  useEffect(() => {
    openedAt.current = performance.now();
  }, []);

  const invalid = status === "incorrect" || status === "invalid_format";
  const describedBy = answerType === "number" ? `${hintId} ${statusId}` : statusId;

  function changeAnswer(value: string) {
    // Вердикт относится к прежнему ответу, а запрос в пути уже не нужен.
    lastRequest.current += 1;
    setAnswer(value);
    setStatus("idle");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (status === "checking") return;

    const request = ++lastRequest.current;
    setStatus("checking");

    let next: Status = "network";
    try {
      const response = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo,
          answer,
          timeSpentMs: Math.round(performance.now() - openedAt.current),
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        const { verdict } = (await response.json()) as { verdict: Status };
        next = verdict;
      } else if (response.status === 401) {
        next = "unauthorized";
      } else if (response.status === 429) {
        next = "rateLimited";
      } else if (response.status >= 500) {
        next = "server";
      }
    } catch {
      next = "network";
    }

    if (request === lastRequest.current) setStatus(next);
  }

  return (
    <form className="answer-panel" onSubmit={submit} noValidate>
      {answerType === "choice" && (
        <fieldset
          className="answer-options"
          role="radiogroup"
          aria-invalid={invalid}
          aria-describedby={describedBy}
        >
          <legend>{t("answer.choiceLabel")}</legend>
          {options.map((option) => (
            <label key={option} className="answer-option">
              <input
                type="radio"
                name={fieldId}
                value={option}
                checked={answer === option}
                onChange={() => changeAnswer(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      )}

      {answerType === "number" && (
        <>
          <label className="answer-label" htmlFor={fieldId}>
            {t("answer.numberLabel")}
          </label>
          <input
            id={fieldId}
            className="answer-field"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={answer}
            onChange={(event) => changeAnswer(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
          <p id={hintId} className="answer-hint">
            {t("answer.numberHint")}
          </p>
        </>
      )}

      {answerType === "text" && (
        <>
          <label className="answer-label" htmlFor={fieldId}>
            {t("answer.textLabel")}
          </label>
          <textarea
            id={fieldId}
            className="answer-field"
            rows={3}
            value={answer}
            onChange={(event) => changeAnswer(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
        </>
      )}

      <div id={statusId} role="status" className="answer-status-region">
        {status !== "idle" && (
          <p className={`answer-status answer-status-${status}`}>
            <span aria-hidden="true" className="answer-status-icon">
              {statusIcon[status]}
            </span>
            <span>
              {statusMessage(status, answerType)}
              {status === "unauthorized" && (
                <>
                  {" "}
                  <Link href="/login">{t("answer.loginLink")}</Link>
                </>
              )}
            </span>
          </p>
        )}
      </div>

      <button type="submit" className="answer-submit" aria-disabled={status === "checking"}>
        {t("answer.submit")}
      </button>
    </form>
  );
}
