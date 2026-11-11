import type { Metadata } from "next";
import LangSwitch from "@/components/LangSwitch";
import LoginForm from "@/components/LoginForm";
import { getT } from "@/lib/messages";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("login.title") };
}

export default async function LoginPage() {
  const t = await getT();
  return (
    <main id="content" tabIndex={-1} className="page login-page">
      <div className="page-top">
        <LangSwitch />
      </div>
      <header className="page-header">
        <h1>{t("login.title")}</h1>
        <p className="lead">{t("login.lead")}</p>
      </header>
      <LoginForm />
    </main>
  );
}
