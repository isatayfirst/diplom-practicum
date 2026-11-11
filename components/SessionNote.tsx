import { getT } from "@/lib/messages";

// Сеанс живёт 8 часов (cookie): об этом говорим на входе и на главной, таймера нет.
export default async function SessionNote() {
  const t = await getT();
  return <p className="session-note">{t("session.note")}</p>;
}
