"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { t } from "@/lib/messages";

export type ClassOption = { code: string; label: string; studyGroup: "experimental" | "control" };

const LINKS = [
  { href: "/teacher", key: "teacher.nav.overview" },
  { href: "/teacher/students", key: "teacher.nav.students" },
  { href: "/teacher/tests", key: "teacher.nav.tests" },
] as const;

export default function TeacherNav({ classes, current }: { classes: ClassOption[]; current: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const [leaving, setLeaving] = useState(false);
  // Выбранный класс живёт в адресе (?class=код): страницы читают его на сервере.
  const selected = search.get("class") ?? current ?? "";
  const query = selected ? `?class=${encodeURIComponent(selected)}` : "";

  async function logout() {
    setLeaving(true);
    try {
      await fetch("/api/teacher/logout", { method: "POST" });
    } finally {
      router.replace("/teacher/login");
      router.refresh();
    }
  }

  return (
    <aside className="t-side no-print">
      <div className="t-brand">
        <span className="t-brand-mark" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
          </svg>
        </span>
        <span>
          <span className="t-brand-name">{t("teacher.brand")}</span>
          <span className="t-brand-role">{t("teacher.role")}</span>
        </span>
      </div>

      {classes.length > 0 && (
        <div className="t-field">
          <label htmlFor="teacher-class">{t("teacher.class")}</label>
          <select
            id="teacher-class"
            className="t-select"
            value={selected}
            onChange={(event) => router.push(`${pathname}?class=${encodeURIComponent(event.target.value)}`)}
          >
            {classes.map((item) => (
              <option key={item.code} value={item.code}>
                {t("teacher.classOption", { label: item.label, group: t(`teacher.group.${item.studyGroup}`) })}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav aria-label={t("teacher.nav.label")} className="t-nav">
        {LINKS.map((link) => (
          <Link key={link.href} href={`${link.href}${query}`} aria-current={pathname === link.href ? "page" : undefined}>
            {t(link.key)}
          </Link>
        ))}
      </nav>

      <button type="button" className="t-logout" onClick={logout} disabled={leaving}>
        {t("teacher.logout")}
      </button>
    </aside>
  );
}
