"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createT, type Locale, type Messages, type TFn } from "@/lib/t";

type Value = { locale: Locale; t: TFn };

const LocaleContext = createContext<Value | null>(null);

// Словарь выбранного языка приходит с сервера: клиентские компоненты читают его через useT.
export default function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: createT(messages) }), [locale, messages]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleValue(): Value {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("LocaleProvider is missing");
  return value;
}

export function useLocale(): Locale {
  return useLocaleValue().locale;
}

export function useT(): TFn {
  return useLocaleValue().t;
}
