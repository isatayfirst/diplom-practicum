import type ru from "@/messages/ru.json";

// Общая часть переводов: без чтения cookie и без самих файлов, поэтому годится и клиенту.
export const LOCALES = ["kk", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "kk";
export const LANG_COOKIE = "lang";
export const LANG_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export type MessageKey = keyof typeof ru;
export type Messages = Record<MessageKey, string>;
export type TFn = (key: MessageKey, values?: Record<string, string | number>) => string;

// Любое значение, кроме известного языка, даёт казахский.
export function parseLocale(value: string | undefined | null): Locale {
  return (LOCALES as readonly string[]).includes(value ?? "") ? (value as Locale) : DEFAULT_LOCALE;
}

export function createT(messages: Messages): TFn {
  return (key, values = {}) => messages[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));
}
