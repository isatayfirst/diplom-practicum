import { t } from "@/lib/messages";
import type { Cell, Overview } from "@/lib/teacher";

function shortText(cell: Cell): string {
  switch (cell.state) {
    case "none":
      return t("teacher.cell.shortNone");
    case "unsolved":
      return t("teacher.cell.shortUnsolved", { count: cell.attempts });
    case "solved":
      return t("teacher.cell.shortSolved", { count: cell.attempts });
    case "pending":
      return t("teacher.cell.shortPending", { count: cell.attempts });
    case "scored":
      return t("teacher.cell.shortScored", { score: cell.score ?? 0 });
  }
}

function wordText(cell: Cell): string {
  switch (cell.state) {
    case "none":
      return t("teacher.cell.none");
    case "unsolved":
      return t("teacher.cell.unsolved", { count: cell.attempts });
    case "solved":
      return t("teacher.cell.solved", { count: cell.attempts });
    case "pending":
      return t("teacher.cell.pending", { count: cell.attempts });
    case "scored":
      return t("teacher.cell.scored", { score: cell.score ?? 0, count: cell.attempts });
  }
}

// Карта: цветная таблица для глаз и та же таблица словами для чтения с экрана.
// Цвет не единственный признак: в цветной ячейке есть знак, в текстовой версии слова.
export default function HeatMap({ overview }: { overview: Overview }) {
  const total = overview.orderNos.length;
  return (
    <section className="t-heat" aria-labelledby="heat-title">
      <h2 id="heat-title">{t("teacher.heat.caption")}</h2>

      <div className="t-table-wrap" aria-hidden="true">
        <table className="t-table t-heat-table" data-table="heat-visual">
          <thead>
            <tr>
              <th scope="col">{t("teacher.heat.student")}</th>
              {overview.orderNos.map((orderNo) => (
                <th scope="col" key={orderNo}>
                  {orderNo}
                </th>
              ))}
              <th scope="col">{t("teacher.heat.done")}</th>
            </tr>
          </thead>
          <tbody>
            {overview.rows.map((row) => (
              <tr key={row.number}>
                <th scope="row">№{row.number}</th>
                {row.cells.map((cell, index) => (
                  <td key={overview.orderNos[index]} className={`t-cell t-cell-${cell.state}`}>
                    {shortText(cell)}
                  </td>
                ))}
                <td className="t-num">{t("teacher.ratio", { value: row.done, total })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="t-legend" aria-hidden="true">
        {(["none", "unsolved", "solved", "pending", "scored"] as const).map((state) => (
          <li key={state}>
            <span className={`t-legend-swatch t-cell-${state}`} />
            {t(`teacher.legend.${state}`)}
          </li>
        ))}
      </ul>

      <details className="t-text-version">
        <summary>{t("teacher.heat.textVersion")}</summary>
        <div className="t-table-wrap">
          <table className="t-table" data-table="heat-text">
            <caption>{t("teacher.heat.textCaption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("teacher.heat.student")}</th>
                {overview.orderNos.map((orderNo) => (
                  <th scope="col" key={orderNo}>
                    {t("home.taskNumber", { number: orderNo })}
                  </th>
                ))}
                <th scope="col">{t("teacher.heat.done")}</th>
              </tr>
            </thead>
            <tbody>
              {overview.rows.map((row) => (
                <tr key={row.number} data-student-number={row.number}>
                  <th scope="row">№{row.number}</th>
                  {row.cells.map((cell, index) => (
                    <td
                      key={overview.orderNos[index]}
                      data-state={cell.state}
                      data-attempts={cell.attempts}
                      data-score={cell.score ?? ""}
                    >
                      {wordText(cell)}
                    </td>
                  ))}
                  <td data-done={row.done}>{t("teacher.ratio", { value: row.done, total })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
