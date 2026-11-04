import { checkAnswer, getAnswerKey } from "@/lib/answers";
import { isOrderNo } from "@/lib/tasks";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const { orderNo, answer } = (body ?? {}) as { orderNo?: unknown; answer?: unknown };

  if (!isOrderNo(orderNo)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const key = await getAnswerKey(orderNo);
    if (!key) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ verdict: checkAnswer(key, answer) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
