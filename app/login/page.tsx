import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import { getT } from "@/lib/messages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("login.title") };
}

export default async function LoginPage() {
  const t = await getT();
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
