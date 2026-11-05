import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getT } from "@/lib/messages";
import "./teacher.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getT())("teacher.login.title"),
    robots: { index: false, follow: false },
  };
}

export default function TeacherRootLayout({ children }: { children: ReactNode }) {
  return children;
}
