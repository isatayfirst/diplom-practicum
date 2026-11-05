import type { Metadata } from "next";
import type { ReactNode } from "react";
import { t } from "@/lib/messages";
import "./teacher.css";

export const metadata: Metadata = {
  title: t("teacher.login.title"),
  robots: { index: false, follow: false },
};

export default function TeacherRootLayout({ children }: { children: ReactNode }) {
  return children;
}
