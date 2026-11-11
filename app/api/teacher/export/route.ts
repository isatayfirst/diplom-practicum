import { getT } from "@/lib/messages";
import { listClasses, loadClassData, teacherDenied } from "@/lib/teacher";
import { buildExportCsv, exportFileName } from "@/lib/teacher-export";

// CSV одного класса: только с cookie учителя (иначе 401, в том числе с cookie ученика).
export async function GET(request: Request) {
  const denied = await teacherDenied();
  if (denied) return denied;

  const code = new URL(request.url).searchParams.get("class");
  if (!code) return Response.json({ error: "bad_request" }, { status: 400 });

  try {
    const cls = (await listClasses()).find((item) => item.code === code);
    if (!cls) return Response.json({ error: "not_found" }, { status: 404 });

    const [t, data] = await Promise.all([getT(), loadClassData(cls.id, cls.studyGroup)]);
    const now = new Date();
    return new Response(buildExportCsv(t, cls, data, now), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFileName(cls, now)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
