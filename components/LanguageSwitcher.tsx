"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useT } from "@/components/LocaleProvider";
import { LOCALES, type Locale } from "@/lib/i18n";

// Выбор языка хранится в cookie `lang` (её ставит POST /api/lang), страница обновляется на сервере.
export default function LanguageSwitcher() {
  const t = useT();
  const current = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function choose(lang: Locale) {
    if (lang === current || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/lang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang }),
      });
      if (response.ok) router.refresh();
    } catch {
      // Сбой сети: язык остаётся прежним, можно нажать снова.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="group" aria-label={t("lang.label")} aria-busy={busy} className="lang-switch">
      {LOCALES.map((lang) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          className="lang-button"
          aria-pressed={lang === current}
          onClick={() => choose(lang)}
        >
          {t(`lang.${lang}`)}
        </button>
      ))}
    </div>
  );
}
