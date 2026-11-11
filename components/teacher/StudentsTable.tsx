"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import ConfirmDialog from "@/components/teacher/ConfirmDialog";
import { useT } from "@/components/LocaleProvider";

export type StudentView = {
  id: string;
  number: number;
  code: string;
  excluded: boolean;
  reason: "moved" | "class_changed" | "other" | null;
  pretest: string; // уже готовая строка «X / N» или «—»
  tasks: string | null; // «X / 10»; null у контрольного класса
  last: string | null; // готовая подпись; null у контрольного класса
};

const REASONS = ["moved", "class_changed", "other"] as const;
type Reason = (typeof REASONS)[number];

export default function StudentsTable({
  classId,
  students,
  showTasks,
  atLimit,
}: {
  classId: string;
  students: StudentView[];
  showTasks: boolean;
  atLimit: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [target, setTarget] = useState<StudentView | null>(null);
  const [reason, setReason] = useState<Reason>("moved");
  const [busy, setBusy] = useState(false);
  const [excludeError, setExcludeError] = useState(false);
  const tableId = useId();
  const menuButtons = useRef(new Map<string, HTMLButtonElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  const lastTargetId = useRef<string | null>(null);

  // Меню действий закрывается по Esc (фокус возвращается на кнопку «⋯») и по щелчку вне него.
  useEffect(() => {
    if (!menuFor) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        menuButtons.current.get(menuFor)?.focus();
        setMenuFor(null);
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest("[data-row-menu]")) setMenuFor(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [menuFor]);

  async function addStudent() {
    setAdding(true);
    setAddError(null);
    try {
      const response = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      if (response.ok) router.refresh();
      else setAddError(response.status === 409 ? "full" : "error");
    } catch {
      setAddError("error");
    } finally {
      setAdding(false);
    }
  }

  async function exclude() {
    if (!target) return;
    setBusy(true);
    setExcludeError(false);
    try {
      const response = await fetch("/api/teacher/students/exclude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: target.id, reason }),
      });
      if (response.ok) {
        setTarget(null);
        router.refresh();
      } else setExcludeError(true);
    } catch {
      setExcludeError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="t-toolbar no-print">
        <button type="button" className="t-button t-button-outline" onClick={() => window.print()}>
          {t("teacher.students.print")}
        </button>
        <button ref={addButton} type="button" className="t-button t-button-solid" onClick={addStudent} disabled={adding || atLimit}>
          {adding ? t("teacher.students.adding") : t("teacher.students.add")}
        </button>
      </div>
      <p className="notice notice-error" role="alert" hidden={addError === null}>
        {addError === "full" ? t("teacher.students.full", { max: 40 }) : addError ? t("teacher.students.addError") : ""}
      </p>

      <div className="t-table-wrap no-print">
        <table className="t-table" id={tableId}>
          <thead>
            <tr>
              <th scope="col">{t("teacher.students.col.number")}</th>
              <th scope="col">{t("teacher.students.col.code")}</th>
              <th scope="col">{t("teacher.students.col.status")}</th>
              <th scope="col">{t("teacher.students.col.pretest")}</th>
              {showTasks && <th scope="col">{t("teacher.students.col.tasks")}</th>}
              {showTasks && <th scope="col">{t("teacher.students.col.last")}</th>}
              <th scope="col">
                <span className="visually-hidden">{t("teacher.students.col.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const open = menuFor === student.id;
              return (
                <tr key={student.id} className={student.excluded ? "t-row-muted" : undefined} data-student-number={student.number}>
                  <th scope="row">№{student.number}</th>
                  <td className="t-code">{student.code}</td>
                  <td>
                    <span className={student.excluded ? "t-pill t-pill-warn" : "t-pill t-pill-ok"}>
                      {student.excluded ? t("teacher.students.statusExcluded") : t("teacher.students.statusActive")}
                    </span>
                    {student.reason && <span className="t-reason">{t(`teacher.students.reason.${student.reason}`)}</span>}
                  </td>
                  <td className="t-num">{student.pretest}</td>
                  {showTasks && <td className="t-num">{student.tasks}</td>}
                  {showTasks && <td className="t-muted">{student.last}</td>}
                  <td className="t-actions">
                    {!student.excluded && (
                      <span className="t-menu" data-row-menu>
                        <button
                          type="button"
                          className="t-icon-button"
                          aria-label={t("teacher.students.rowActions", { number: student.number })}
                          aria-expanded={open}
                          aria-haspopup="true"
                          ref={(node) => {
                            if (node) menuButtons.current.set(student.id, node);
                            else menuButtons.current.delete(student.id);
                          }}
                          onClick={() => setMenuFor(open ? null : student.id)}
                        >
                          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>
                        {open && (
                          <div className="t-menu-list">
                            <button
                              type="button"
                              autoFocus
                              onClick={() => {
                                setMenuFor(null);
                                setReason("moved");
                                setExcludeError(false);
                                lastTargetId.current = student.id;
                setTarget(student);
                              }}
                            >
                              {t("teacher.students.excludeAction")}
                            </button>
                          </div>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={target !== null}
        title={t("teacher.students.excludeTitle")}
        titleId="exclude-title"
        confirmLabel={busy ? t("teacher.students.excludeWorking") : t("teacher.students.excludeConfirm")}
        cancelLabel={t("teacher.students.excludeCancel")}
        busy={busy}
        onConfirm={exclude}
        // Кнопка «⋯» этой строки; если строку исключили, её кнопки нет: фокус идёт на «Нөмір қосу».
        returnFocus={() => (lastTargetId.current ? menuButtons.current.get(lastTargetId.current) : undefined) ?? addButton.current}
        onClose={() => {
          if (!busy) setTarget(null);
        }}
      >
        <p>{t("teacher.students.excludeBody", { number: target?.number ?? "" })}</p>
        <fieldset className="t-reasons">
          <legend>{t("teacher.students.excludeReason")}</legend>
          {REASONS.map((value) => (
            <label key={value} className="t-reason-option">
              <input type="radio" name="exclude-reason" checked={reason === value} onChange={() => setReason(value)} />
              {t(`teacher.students.reason.${value}`)}
            </label>
          ))}
        </fieldset>
        <p className="notice notice-error" role="alert" hidden={!excludeError}>
          {excludeError ? t("teacher.students.excludeError") : ""}
        </p>
      </ConfirmDialog>
    </>
  );
}
