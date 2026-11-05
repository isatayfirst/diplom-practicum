import Link from "next/link";
import { t } from "@/lib/messages";
import type { TestStatus, TestSummary } from "@/lib/tests";

const statusIcon: Record<TestStatus, string> = {
  closed: "—",
  open: "▶",
  finished: "✓",
};

type TestListProps = { tests: TestSummary[] };

export default function TestList({ tests }: TestListProps) {
  return (
    <section className="test-list" aria-labelledby="tests-title">
      <h2 id="tests-title">{t("tests.title")}</h2>
      <ul className="test-items">
        {tests.map((test) => {
          const started = test.answeredCount > 0;
          const hint =
            test.status === "open" ? (started ? "tests.hint.continue" : "tests.hint.open") : `tests.hint.${test.status}`;
          return (
            <li key={test.kind} className={`test-item test-item-${test.status}`}>
              <span className="test-icon" aria-hidden="true">
                {statusIcon[test.status]}
              </span>
              <div className="test-item-text">
                <p className="test-name">{t(`tests.${test.kind}`)}</p>
                <p className="test-hint">
                  <span className="test-status">{t(`tests.status.${test.status}`)}</span>{" "}
                  {t(hint as "tests.hint.open", { count: test.questionCount })}
                </p>
              </div>
              {test.status === "open" && (
                <Link className="test-link" href={`/tests/${test.kind}`}>
                  {t(started ? "tests.continue" : "tests.start")}
                  <span className="visually-hidden">: {t(`tests.${test.kind}`)}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
