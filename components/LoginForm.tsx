"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { useT } from "@/components/LocaleProvider";

type Status = "idle" | "checking" | "invalid" | "server" | "network";

const REQUEST_TIMEOUT_MS = 15000;

const statusIcon: Record<Exclude<Status, "idle">, string> = {
  checking: "…",
  invalid: "!",
  server: "!",
  network: "!",
};

export default function LoginForm() {
  const t = useT();
  const router = useRouter();
  const classFieldId = useId();
  const codeFieldId = useId();
  const hintId = useId();
  const statusId = useId();
  const [classCode, setClassCode] = useState("");
  const [personalCode, setPersonalCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // Ошибка общая: она не говорит, какое из полей неверно.
  const invalid = status === "invalid";

  function change(setValue: (value: string) => void, value: string) {
    setValue(value);
    if (status !== "checking") setStatus("idle");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (status === "checking") return;
    setStatus("checking");

    let next: Status = "network";
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classCode, personalCode }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        router.replace("/");
        return;
      }
      next = response.status === 401 ? "invalid" : "server";
    } catch {
      next = "network";
    }
    setStatus(next);
  }

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      <label className="answer-label" htmlFor={classFieldId}>
        {t("login.classLabel")}
      </label>
      <input
        id={classFieldId}
        className="answer-field"
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={classCode}
        onChange={(event) => change(setClassCode, event.target.value)}
        aria-invalid={invalid}
        aria-describedby={statusId}
      />

      <label className="answer-label" htmlFor={codeFieldId}>
        {t("login.codeLabel")}
      </label>
      <input
        id={codeFieldId}
        className="answer-field"
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={5}
        value={personalCode}
        onChange={(event) => change(setPersonalCode, event.target.value)}
        aria-invalid={invalid}
        aria-describedby={`${hintId} ${statusId}`}
      />
      <p id={hintId} className="answer-hint">
        {t("login.codeHint")}
      </p>

      <div id={statusId} role="status" className="answer-status-region">
        {status !== "idle" && (
          <p className={`answer-status login-status-${status}`}>
            <span aria-hidden="true" className="answer-status-icon">
              {statusIcon[status]}
            </span>
            {t(`login.${status}`)}
          </p>
        )}
      </div>

      <button type="submit" className="answer-submit" aria-disabled={status === "checking"}>
        {t("login.submit")}
      </button>
    </form>
  );
}
