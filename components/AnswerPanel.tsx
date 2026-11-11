"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useT } from "@/components/LocaleProvider";
import type { MessageKey, TFunction } from "@/lib/i18n";

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
  textSent: boolean;
  textMaxLength: number;
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

function statusMessage(t: TFunction, status: Exclude<Status, "idle">, answerType: AnswerType): string {
  if (status === "invalid_format") return t(invalidMessage[answerType]);
  if (status === "checking" && answerType === "text") return t("answer.sending");
  return t(`answer.${status}`);
}

export default function AnswerPanel({
  orderNo,
  answerType,
  options,
  textSent,
  textMaxLength,
}: AnswerPanelProps) {
  const t = useT();
  const fieldId = useId();
  const hintId = useId();
  const statusId = useId();
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [sent, setSent] = useState(textSent);
  const lastRequest = useRef(0);
  const openedAt = useRef(0);

  useEffect(() => {
    openedAt.current = performance.now();
  }, []);

  const invalid = status === "incorrect" || status === "invalid_format";
  const describedBy = answerType === "choice" ? statusId : `${hintId} ${statusId}`;
  // Отправленный вывод остаётся отмеченным, пока ученик пишет новый.
  const shownStatus = status === "idle" && sent ? "teacher" : status;

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

    if (request !== lastRequest.current) return;
    setStatus(next);
    if (next === "teacher") {
      setSent(true);
      setAnswer("");
    }
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
            maxLength={textMaxLength}
            value={answer}
            onChange={(event) => changeAnswer(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
          <p id={hintId} className="answer-hint">
            {t("answer.textHint", { max: textMaxLength })}
          </p>
        </>
      )}

      <div id={statusId} role="status" className="answer-status-region">
        {shownStatus !== "idle" && (
          <p className={`answer-status answer-status-${shownStatus}`}>
            <span aria-hidden="true" className="answer-status-icon">
              {statusIcon[shownStatus]}
            </span>
            <span>
              {statusMessage(t, shownStatus, answerType)}
              {shownStatus === "unauthorized" && (
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
        {t(answerType === "text" ? "answer.submitText" : "answer.submit")}
      </button>
    </form>
  );
}
