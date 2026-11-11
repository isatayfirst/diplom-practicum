// CSV для Excel в казахской и русской локали: разделитель «;», строки CRLF, UTF-8 с BOM.
export const CSV_BOM = "\uFEFF";
export const CSV_SEPARATOR = ";";
export const CSV_EOL = "\r\n";

export type CsvCell = string | number | null;

// Ячейка, которую Excel мог бы выполнить как формулу, начинается с = + - @, табуляции или возврата каретки.
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvCell): string {
  if (value === null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function csvLine(cells: CsvCell[]): string {
  return cells.map(csvCell).join(CSV_SEPARATOR);
}

// Строки — массивы ячеек; пустой массив даёт пустую строку файла.
export function buildCsv(lines: CsvCell[][]): string {
  return CSV_BOM + lines.map(csvLine).join(CSV_EOL) + CSV_EOL;
}
