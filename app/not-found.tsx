import Link from "next/link";
import { t } from "@/lib/messages";

export default function NotFound() {
  return (
    <main id="content" tabIndex={-1} className="page">
      <header className="page-header">
        <h1>{t("notFound.title")}</h1>
        <p className="lead">{t("notFound.text")}</p>
      </header>
      <Link className="back-link" href="/">
        <span aria-hidden="true">←</span> {t("task.back")}
      </Link>
    </main>
  );
}
