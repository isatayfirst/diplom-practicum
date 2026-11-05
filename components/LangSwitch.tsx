import { getLocale, getT } from "@/lib/messages";
import { LOCALES } from "@/lib/t";

// Две кнопки в форме: работает без JS. Выбор ставит cookie `lang` (POST /api/lang)
// и возвращает на ту же страницу. У каждой кнопки свой lang, у текущей aria-pressed.
export default async function LangSwitch({ className }: { className?: string }) {
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  return (
    <form
      action="/api/lang"
      method="post"
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
