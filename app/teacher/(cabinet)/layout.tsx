import { Suspense, type ReactNode } from "react";
import TeacherNav from "@/components/teacher/TeacherNav";
import { listClasses, requireTeacherPage, type ClassInfo } from "@/lib/teacher";

export const dynamic = "force-dynamic";

async function loadClasses(): Promise<ClassInfo[]> {
  try {
    return await listClasses();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Рамка кабинета: без cookie учителя даже эта часть страницы не отдаётся.
export default async function CabinetLayout({ children }: { children: ReactNode }) {
  await requireTeacherPage();
  const classes = await loadClasses();

  return (
    <div className="t-shell">
      <Suspense fallback={null}>
        <TeacherNav
          classes={classes.map(({ code, label, studyGroup }) => ({ code, label, studyGroup }))}
          current={classes[0]?.code ?? null}
        />
      </Suspense>
      {children}
    </div>
  );
}
