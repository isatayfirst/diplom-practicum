// Сборка CSV для Excel и статистических пакетов. Только чистые функции, без доступа к базе.

// UTF-8 с BOM: без него Excel читает файл в старой кодировке и ломает кириллицу и казахские буквы.
export const BOM = "﻿";
// Точка с запятой: Excel с русской или казахской локалью делит строку по ней, а запятую оставляет в одной колонке.
export const DELIMITER = ";";
export const NEWLINE = "\r\n";

export type CsvValue = string | number | null;

// Ячейка, начинающаяся с этих знаков, читалась бы Excel как формула: перед ней ставится апостроф.
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvValue): string {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(DELIMITER));
  return BOM + lines.map((line) => line + NEWLINE).join("");
}
