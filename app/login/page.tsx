import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: t("login.title") };

export default function LoginPage() {
  return (
    <main id="content" tabIndex={-1} className="page login-page">
      <header className="page-header">
        <h1>{t("login.title")}</h1>
        <p className="lead">{t("login.lead")}</p>
      </header>
      <LoginForm />
    </main>
  );
}
