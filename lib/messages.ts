import "server-only";
import { cookies } from "next/headers";
import kk from "@/messages/kk.json";
import ru from "@/messages/ru.json";
import { createT, LANG_COOKIE, parseLocale, type Locale, type MessageKey, type Messages, type TFn } from "@/lib/t";

export type { Locale, MessageKey, TFn } from "@/lib/t";

const kazakh: Partial<Record<MessageKey, string>> = kk;

// Словарь языка целиком: фраза, которой нет в казахском, берётся из русского.
export function dictionary(locale: Locale): Messages {
  return locale === "kk" ? { ...ru, ...kazakh } : ru;
}

// Язык запроса из cookie `lang`; неизвестное значение даёт казахский.
export async function getLocale(): Promise<Locale> {
  return parseLocale((await cookies()).get(LANG_COOKIE)?.value);
}

export async function getT(): Promise<TFn> {
  return createT(dictionary(await getLocale()));
}
