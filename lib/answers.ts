import "server-only";
import { createServerClient, type AnswerType } from "@/lib/tasks";

export type Verdict = "correct" | "incorrect" | "invalid_format" | "teacher";

type AnswerKey = {
  answer_type: AnswerType;
  options: string[] | null;
  correct_value: number | null;
  tolerance: number | null;
  correct_option: string | null;
};

// Эталоны читаются только здесь. Наружу уходит лишь вердикт.
export async function getAnswerKey(orderNo: number): Promise<AnswerKey | null> {
  const { data, error } = await createServerClient()
    .from("tasks")
    .select("answer_type, options, correct_value, tolerance, correct_option")
    .eq("order_no", orderNo)
    .returns<AnswerKey[]>()
    .maybeSingle();

  // В сообщение идёт только код ошибки: текст базы может цитировать данные запроса.
  if (error) throw new Error(`tasks: ${error.code}`);
  return data;
}

function parseNumber(answer: string): number | null {
  const text = answer.trim();
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(text)) return null;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function checkAnswer(key: AnswerKey, answer: unknown): Verdict {
  if (typeof answer !== "string") return "invalid_format";

  if (key.answer_type === "text") {
    return answer.trim() === "" ? "invalid_format" : "teacher";
  }

  if (key.answer_type === "choice") {
    if (!key.options?.includes(answer)) return "invalid_format";
    return answer === key.correct_option ? "correct" : "incorrect";
  }

  const value = parseNumber(answer);
  if (value === null) return "invalid_format";
  // Округление убирает шум двоичных дробей: 2,26 − 2,25 должно быть ровно 0,01.
  const difference = Number(Math.abs(value - Number(key.correct_value)).toFixed(9));
  return difference <= (key.tolerance ?? 0) ? "correct" : "incorrect";
}
