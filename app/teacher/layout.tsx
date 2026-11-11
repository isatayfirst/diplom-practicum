import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getT } from "@/lib/messages";
import "./teacher.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("teacher.login.title"), robots: { index: false, follow: false } };
}

export default function TeacherRootLayout({ children }: { children: ReactNode }) {
  return children;
}
