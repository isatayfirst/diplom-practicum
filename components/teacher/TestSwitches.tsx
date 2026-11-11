"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/teacher/ConfirmDialog";
import { useT } from "@/components/LocaleProvider";

export type SwitchView = { kind: "pretest" | "posttest"; open: boolean; questionCount: number };

export default function TestSwitches({ classId, tests }: { classId: string; tests: SwitchView[] }) {
  const t = useT();
  const router = useRouter();
  const [pendingKind, setPendingKind] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Пока страница перечитывает состояние из базы, переключатели заняты: старое значение не вводит в заблуждение.
  const [refreshing, startRefresh] = useTransition();
  // Состояние берётся из базы (через props): переключатель меняется только после ответа сервера.

  async function send(kind: SwitchView["kind"], open: boolean) {
    setPendingKind(kind);
    setError(null);
    try {
      const response = await fetch("/api/teacher/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, kind, open }),
      });
      if (response.ok) startRefresh(() => router.refresh());
      else setError(response.status === 409 ? "noQuestions" : "error");
    } catch {
      setError("error");
    } finally {
      setPendingKind(null);
    }
  }

  function toggle(test: SwitchView) {
    // Итоговый тест открывается только после подтверждения; всё остальное сразу.
    if (test.kind === "posttest" && !test.open) setConfirming(true);
    else void send(test.kind, !test.open);
  }

  return (
    <>
      <ul className="t-switch-list">
        {tests.map((test) => {
          const state = test.open ? t("teacher.tests.open") : t("teacher.tests.closed");
          const name = t(`tests.${test.kind}`);
          const disabled = pendingKind !== null || refreshing || (!test.open && test.questionCount === 0);
          const hintId = `switch-hint-${test.kind}`;
          return (
            <li key={test.kind} className="t-switch-row">
              <div className="t-switch-text">
                <div className="t-switch-name">{name}</div>
                <div className="t-muted">{t(`teacher.tests.${test.kind}Desc`)}</div>
                <div className="t-muted" id={hintId}>
                  {test.questionCount === 0 ? t("teacher.tests.noQuestions") : t("teacher.tests.questions", { count: test.questionCount })}
                </div>
              </div>
              <div className="t-switch-control">
                <span className="t-switch-state">{state}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={test.open}
                  aria-label={t("teacher.tests.switchLabel", { test: name, state })}
                  aria-describedby={hintId}
                  className="t-switch"
                  data-kind={test.kind}
                  // aria-disabled, а не disabled: кнопка остаётся в порядке фокуса, и окно может вернуть на неё фокус.
                  aria-disabled={disabled || undefined}
                  onClick={() => !disabled && toggle(test)}
                >
                  <span className="t-switch-track" aria-hidden="true">
                    <span className="t-switch-thumb" />
                  </span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="t-live" role="status">
        {(pendingKind !== null || refreshing) && <p className="t-muted">{t("teacher.tests.working")}</p>}
      </div>
      <div className="t-live" role="alert">
        {error !== null && (
          <p className="notice notice-error">
            {error === "noQuestions" ? t("teacher.tests.errorNoQuestions") : t("teacher.tests.error")}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title={t("teacher.tests.confirmTitle")}
        titleId="open-test-title"
        confirmLabel={t("teacher.tests.confirmOpen")}
        cancelLabel={t("teacher.tests.confirmCancel")}
        busy={pendingKind !== null}
        onConfirm={async () => {
          await send("posttest", true);
          setConfirming(false);
        }}
        onClose={() => setConfirming(false)}
      >
        <p>{t("teacher.tests.confirmBody")}</p>
      </ConfirmDialog>
    </>
  );
}
