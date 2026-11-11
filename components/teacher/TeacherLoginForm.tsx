"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/LocaleProvider";

type Status = "idle" | "checking" | "invalid" | "locked" | "server" | "network";

export default function TeacherLoginForm() {
  const t = useT();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("checking");
    try {
      const response = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (response.ok) {
        router.replace("/teacher");
        router.refresh();
        return;
      }
      setStatus(response.status === 401 ? "invalid" : response.status === 429 ? "locked" : "server");
    } catch {
      setStatus("network");
    }
  }

  const failed = status !== "idle" && status !== "checking";

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      <label className="answer-label" htmlFor="teacher-code">
        {t("teacher.login.codeLabel")}
      </label>
      <input
        id="teacher-code"
        className="answer-field"
        type="password"
        autoComplete="off"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        aria-invalid={status === "invalid" ? true : undefined}
        aria-describedby={failed ? "teacher-login-status" : undefined}
      />
      <button className="answer-submit" type="submit" aria-disabled={status === "checking"} onClick={(e) => status === "checking" && e.preventDefault()}>
        {status === "checking" ? t("teacher.login.checking") : t("teacher.login.submit")}
      </button>
      <p id="teacher-login-status" className={failed ? "notice notice-error" : "visually-hidden"} role="alert">
        {failed ? t(`teacher.login.${status}`) : ""}
      </p>
    </form>
  );
}
