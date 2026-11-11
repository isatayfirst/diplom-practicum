"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useLocale, useT } from "@/components/LocaleProvider";
import { LOCALES, type Locale } from "@/lib/t";

// Две кнопки в форме: без JS форма работает обычным запросом (POST /api/lang с возвратом на страницу).
// С JS язык ставится запросом и страница обновляется на месте: фокус остаётся на нажатой кнопке.
// У каждой кнопки свой lang, у текущей aria-pressed.
export default function LangSwitch({ className }: { className?: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();

  async function choose(event: FormEvent<HTMLFormElement>) {
    const code = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value as Locale | undefined;
    if (!code) return;
    event.preventDefault();
    if (code === locale) return;
    try {
      const response = await fetch("/api/lang", {
        method: "POST",
        body: new URLSearchParams({ lang: code }),
        redirect: "manual",
      });
      // redirect: "manual" даёт «непрозрачный» ответ с кодом 0: cookie при этом уже поставлена.
      if (response.type !== "opaqueredirect" && !response.ok) throw new Error("lang");
      router.refresh();
    } catch {
      // Запасной путь: обычная отправка формы с выбранным языком.
      const form = event.currentTarget as HTMLFormElement;
      const field = document.createElement("input");
      field.type = "hidden";
      field.name = "lang";
      field.value = code;
      form.append(field);
      form.submit();
    }
  }

  return (
    <form
      action="/api/lang"
      method="post"
      onSubmit={choose}
      className={className ? `lang-switch ${className}` : "lang-switch"}
      role="group"
      aria-label={t("lang.label")}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="submit"
          name="lang"
          value={code}
          lang={code}
          aria-pressed={code === locale}
          className="lang-switch-button"
        >
          {t(`lang.${code}`)}
        </button>
      ))}
    </form>
  );
}
