import "server-only";

const LIMIT = 30;
const WINDOW_MS = 60_000;

// Счётчик в памяти процесса: на Vercel у каждого экземпляра он свой.
const requests = new Map<string, number[]>();

export function allowRequest(studentId: string): boolean {
  const now = Date.now();
  const recent = (requests.get(studentId) ?? []).filter((time) => now - time < WINDOW_MS);
  const allowed = recent.length < LIMIT;
  if (allowed) recent.push(now);
  requests.set(studentId, recent);
  return allowed;
}
