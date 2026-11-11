import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LocaleProvider from "@/components/LocaleProvider";
import { dictionaryFor } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/messages";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("meta.title"), description: t("meta.description") };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const t = await getT();
  return (
    <html lang={locale} className={inter.className}>
      <body>
        <LocaleProvider locale={locale} messages={dictionaryFor(locale)}>
          <a className="skip-link" href="#content">
            {t("a11y.skipToContent")}
          </a>
          <div className="lang-bar no-print">
            <LanguageSwitcher />
          </div>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
