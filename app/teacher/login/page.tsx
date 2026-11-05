import LangSwitch from "@/components/LangSwitch";
import TeacherLoginForm from "@/components/teacher/TeacherLoginForm";
import { getT } from "@/lib/messages";

export default async function TeacherLoginPage() {
  const t = await getT();
  return (
    <main id="content" tabIndex={-1} className="page login-page">
      <div className="page-top">
        <LangSwitch />
      </div>
      <header className="page-header">
        <h1>{t("teacher.login.title")}</h1>
        <p className="lead">{t("teacher.login.lead")}</p>
      </header>
      <TeacherLoginForm />
    </main>
  );
}
