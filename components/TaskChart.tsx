import { getT } from "@/lib/messages";
import type { Dataset } from "@/lib/tasks";

type TaskChartProps = { orderNo: number; dataset: Dataset; tableId: string };

// Связь задачи с диаграммой хранится здесь: поля в базе для неё нет.
// Номера — это колонки таблицы задачи: подписи столбцов и их значения.
const CHARTS: Record<number, { labelColumn: number; valueColumn: number }> = {
  4: { labelColumn: 0, valueColumn: 1 },
};

const WIDTH = 320;
const HEIGHT = 262;
const LEFT = 24;
const RIGHT = 320;
const TOP = 48;
const BOTTOM = 210;
const TICK_STEP = 5;

function parseValue(text: string): number | null {
  const value = Number(text.replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) ? value : null;
}

// Показывает только значения таблицы: ни разниц, ни тренда, ни вывода здесь быть не должно.
export default async function TaskChart({ orderNo, dataset, tableId }: TaskChartProps) {
  const t = await getT();
  const chart = CHARTS[orderNo];
  if (!chart) return null;

  const { columns, rows } = dataset.data;
  const labelName = columns[chart.labelColumn];
  const valueName = columns[chart.valueColumn];

  const points = rows.flatMap((row) => {
    const value = parseValue(row[chart.valueColumn]);
    return value === null
      ? []
      : [{ label: row[chart.labelColumn], text: row[chart.valueColumn], value }];
  });
  const skipped = rows.filter((row) => parseValue(row[chart.valueColumn]) === null);
  if (points.length === 0) return null;

  const axisMax = Math.ceil(Math.max(...points.map((p) => p.value)) / TICK_STEP) * TICK_STEP;
  const ticks = Array.from({ length: axisMax / TICK_STEP + 1 }, (_, i) => i * TICK_STEP);
  const y = (value: number) => BOTTOM - (value / axisMax) * (BOTTOM - TOP);
  const slot = (RIGHT - LEFT) / points.length;
  const barWidth = slot - 12;

  return (
    <>
      <figure className="chart">
        <figcaption>{t("chart.caption", { label: dataset.label, name: dataset.name })}</figcaption>
        <svg
          role="img"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          aria-label={t("chart.ariaLabel", {
            x: labelName,
            y: valueName,
            values: points.map((p) => `${p.label} — ${p.text}`).join("; "),
          })}
        >
          <text x={0} y={16}>
            {valueName}
          </text>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                className={tick === 0 ? "chart-baseline" : "chart-grid"}
                x1={LEFT}
                x2={RIGHT}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text x={LEFT - 6} y={y(tick) + 5} textAnchor="end">
                {tick}
              </text>
            </g>
          ))}
          {points.map((point, index) => {
            const center = LEFT + slot * (index + 0.5);
            return (
              <g key={point.label}>
                <rect
                  className="chart-bar"
                  x={center - barWidth / 2}
                  y={y(point.value)}
                  width={barWidth}
                  height={BOTTOM - y(point.value)}
                  rx={3}
                />
                <text className="chart-value" x={center} y={y(point.value) - 6} textAnchor="middle">
                  {point.text}
                </text>
                {/* Год есть в названии таблицы, поэтому под столбцом только день и месяц. */}
                <text x={center} y={BOTTOM + 20} textAnchor="middle">
                  {point.label.slice(0, 5)}
                </text>
              </g>
            );
          })}
          <text x={(LEFT + RIGHT) / 2} y={HEIGHT - 6} textAnchor="middle">
            {labelName}
          </text>
        </svg>
        {skipped.length > 0 && (
          <p className="chart-note">
            {t("chart.skipped", {
              rows: skipped
                .map((row) => `${row[chart.labelColumn]} (${row[chart.valueColumn]})`)
                .join("; "),
            })}
          </p>
        )}
      </figure>
      <a className="chart-table-link" href={`#${tableId}`}>
        {t("chart.tableLink")}
      </a>
    </>
  );
}
