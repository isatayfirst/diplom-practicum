"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { makeT, type Locale, type Messages, type TFunction } from "@/lib/i18n";

type Value = { locale: Locale; t: TFunction };
const LocaleContext = createContext<Value | null>(null);

// Клиентские компоненты получают словарь только выбранного языка.
export default function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: makeT(messages) }), [locale, messages]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleValue(): Value {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("LocaleProvider is missing");
  return value;
}

export function useT(): TFunction {
  return useLocaleValue().t;
}

export function useLocale(): Locale {
  return useLocaleValue().locale;
}
