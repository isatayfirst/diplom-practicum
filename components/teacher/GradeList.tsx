"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/LocaleProvider";

export type GradeView = {
  attemptId: string;
  studentNumber: number;
  orderNo: number;
  answer: string;
  score: number | null;
};

type Message = "saved" | "pick" | "stale" | "error" | null;

function GradeItem({ item }: { item: GradeView }) {
  const t = useT();
  const router = useRouter();
  const [score, setScore] = useState<number | null>(item.score);
  const [saved, setSaved] = useState<number | null>(item.score);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const base = `grade-${item.attemptId}`;

  async function save() {
    if (score === null) {
      setMessage("pick");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/teacher/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: item.attemptId, score }),
      });
      if (response.ok) {
        setSaved(score);
        setMessage("saved");
        router.refresh();
      } else setMessage(response.status === 409 ? "stale" : "error");
    } catch {
      setMessage("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="t-grade-item" data-attempt-id={item.attemptId}>
      <div className="t-grade-head">
        <h3>{t("teacher.grade.item", { student: item.studentNumber, task: item.orderNo })}</h3>
        <span className={saved === null ? "t-pill t-pill-warn" : "t-pill t-pill-ok"}>
          {saved === null ? t("teacher.grade.statusPending") : t("teacher.grade.statusScored", { score: saved })}
        </span>
      </div>
      <p className="t-grade-label" id={`${base}-text-label`}>
        {t("teacher.grade.answerLabel")}
      </p>
      <blockquote className="t-grade-answer" aria-labelledby={`${base}-text-label`}>
        {item.answer}
      </blockquote>
      <fieldset className="t-score-set">
        <legend>{t("teacher.grade.scoreLegend")}</legend>
        {[0, 1, 2].map((value) => (
          <label key={value} className="t-score-option">
            <input type="radio" name={`${base}-score`} checked={score === value} onChange={() => setScore(value)} />
            {value}
          </label>
        ))}
        <button type="button" className="t-button t-button-solid" onClick={save} disabled={busy}>
          {busy ? t("teacher.grade.saving") : t("teacher.grade.save")}
        </button>
      </fieldset>
      <p className={message === "saved" ? "t-ok" : "notice notice-error"} role="status" hidden={message === null}>
        {message === "saved" && t("teacher.grade.saved")}
        {message === "pick" && t("teacher.grade.pick")}
        {message === "stale" && t("teacher.grade.stale")}
        {message === "error" && t("teacher.grade.error")}
      </p>
    </li>
  );
}

export default function GradeList({ items }: { items: GradeView[] }) {
  return (
    <ul className="t-grade-list">
      {items.map((item) => (
        <GradeItem key={item.attemptId} item={item} />
      ))}
    </ul>
  );
}
