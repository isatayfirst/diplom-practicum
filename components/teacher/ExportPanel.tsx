import { getT } from "@/lib/messages";
import type { StudyGroup } from "@/lib/tests";

// Блок «Деректерді жүктеу (CSV)»: ссылки на файлы, которые отдаёт только сервер (по cookie учителя).
// Ссылки с download, а не кнопки с JS: скачивание работает и с клавиатуры, и без скриптов.
export default async function ExportPanel({
  classCode,
  classLabel,
  studyGroup,
}: {
  classCode: string;
  classLabel: string;
  studyGroup: StudyGroup;
}) {
  const t = await getT();
  const query = `?class=${encodeURIComponent(classCode)}`;
  // У контрольного класса попыток задач нет: файла попыток для него не бывает.
  const files = [
    ...(studyGroup === "experimental" ? ([["attempts", "teacher.export.attempts"]] as const) : []),
    ["tests", "teacher.export.tests"],
    ["students", "teacher.export.students"],
  ] as const;

  return (
    <section className="t-panel t-export" id="export" aria-labelledby="export-title">
      <h2 id="export-title">{t("teacher.export.title")}</h2>
      <p className="t-muted">
        {t("teacher.export.scope", { label: classLabel })} · {t("teacher.export.period")}: <strong>{t("teacher.export.periodAll")}</strong>
      </p>
      <div className="t-export-links">
        {files.map(([kind, key]) => (
          <a key={kind} className="t-button t-button-outline" href={`/api/teacher/export/${kind}${query}`} download>
            {t(key)}
          </a>
        ))}
      </div>
      <p className="t-muted">{t("teacher.export.note")}</p>
    </section>
  );
}
