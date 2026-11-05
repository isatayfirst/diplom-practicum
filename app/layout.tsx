import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import LocaleProvider from "@/components/LocaleProvider";
import { dictionary, getLocale, getT } from "@/lib/messages";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const t = await getT();

  return (
    <html lang={locale} className={inter.className}>
      <body>
        <a className="skip-link" href="#content">
          {t("a11y.skipToContent")}
        </a>
        <LocaleProvider locale={locale} messages={dictionary(locale)}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
