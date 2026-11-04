import kk from "@/messages/kk.json";
import ru from "@/messages/ru.json";

export const locale = "kk";

export type MessageKey = keyof typeof ru;

const primary: Partial<Record<MessageKey, string>> = kk;

export function t(key: MessageKey, values: Record<string, string | number> = {}) {
  const text = primary[key] ?? ru[key];
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));
}
