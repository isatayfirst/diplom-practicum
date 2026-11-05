import { buildExport, EXPORT_FILE_PART, isExportKind } from "@/lib/export";
import { getT } from "@/lib/messages";
import { listClasses, teacherDenied } from "@/lib/teacher";

// Часть имени файла только из латиницы, цифр, «_» и «-»; для ASCII-запасного имени.
function asciiName(name: string): string {
  return name.replace(/[^A-Za-z0-9_.-]/g, "_");
}

// Для filename*: encodeURIComponent оставляет ' ( ) *, а RFC 5987 их требует кодировать.
function encodeRfc5987(name: string): string {
  return encodeURIComponent(name).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

// Скачать CSV по классу: только сервер и только по cookie учителя.
// 401 без cookie учителя; 400 неверный вид файла или нет класса; 404 неизвестный класс;
// 403 у контрольного класса нет файла попыток (задач у него нет).
export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const denied = await teacherDenied();
  if (denied) return denied;

  try {
    const { kind } = await params;
    const code = new URL(request.url).searchParams.get("class");
    if (!isExportKind(kind) || !code) return Response.json({ error: "bad_request" }, { status: 400 });

    const cls = (await listClasses()).find((item) => item.code === code);
    if (!cls) return Response.json({ error: "not_found" }, { status: 404 });
    if (kind === "attempts" && cls.studyGroup === "control") return Response.json({ error: "forbidden" }, { status: 403 });

    const t = await getT();
    const body = await buildExport(kind, cls, t("teacher.export.periodAll"));

    const date = new Date().toISOString().slice(0, 10);
    const name = `${cls.code.replace(/[\\/:*?"<>|\s]/g, "_")}_${EXPORT_FILE_PART[kind]}_all-time_${date}.csv`;
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${asciiName(name)}"; filename*=UTF-8''${encodeRfc5987(name)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
