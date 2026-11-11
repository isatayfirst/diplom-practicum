import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, dictionaryFor, isLocale, LANG_COOKIE, makeT, type Locale, type TFunction } from "@/lib/i18n";

export type { MessageKey, TFunction, Locale } from "@/lib/i18n";

// Язык берётся из cookie `lang`; нет cookie или значение неизвестно — казахский.
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getT(): Promise<TFunction> {
  return makeT(dictionaryFor(await getLocale()));
}
