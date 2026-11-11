import kk from "@/messages/kk.json";
import ru from "@/messages/ru.json";

// Общий модуль (сервер и браузер): язык, словари и функция перевода.
export const LOCALES = ["kk", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "kk";
export const LANG_COOKIE = "lang";

export type MessageKey = keyof typeof ru;
export type Messages = Record<string, string>;
export type TFunction = (key: MessageKey, values?: Record<string, string | number>) => string;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// Русский словарь — запасной: казахский ключ без перевода показывается по-русски.
export function dictionaryFor(locale: Locale): Messages {
  return locale === "ru" ? ru : { ...ru, ...kk };
}

export function makeT(messages: Messages): TFunction {
  return (key, values = {}) =>
    messages[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));
}
