import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { locale, t } from "@/lib/messages";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: t("meta.title"),
  description: t("meta.description"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={locale} className={inter.className}>
      <body>
        <a className="skip-link" href="#content">
          {t("a11y.skipToContent")}
        </a>
        {children}
      </body>
    </html>
  );
}
