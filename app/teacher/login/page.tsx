import TeacherLoginForm from "@/components/teacher/TeacherLoginForm";
import { t } from "@/lib/messages";

export default function TeacherLoginPage() {
  return (
    <main id="content" tabIndex={-1} className="page login-page">
      <header className="page-header">
        <h1>{t("teacher.login.title")}</h1>
        <p className="lead">{t("teacher.login.lead")}</p>
      </header>
      <TeacherLoginForm />
    </main>
  );
}
