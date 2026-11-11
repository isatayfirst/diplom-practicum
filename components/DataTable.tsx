"use client";

import { useId, useState } from "react";
import { useT } from "@/components/LocaleProvider";

type DataTableProps = {
  id: string;
  caption: string;
  columns: string[];
  rows: string[][];
};

// Отметки помогают ученику не сбиться в строках. Они живут только в браузере.
export default function DataTable({ id, caption, columns, rows }: DataTableProps) {
  const t = useT();
  const captionId = useId();
  const [marked, setMarked] = useState<ReadonlySet<number>>(new Set());

  function toggle(index: number) {
    setMarked((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }

  return (
    <section className="data-table">
      <h2 id={captionId}>{caption}</h2>
      <p className="table-hint">{t("task.tableHint")}</p>
      <div id={id} className="table-scroll" role="region" aria-labelledby={captionId} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col" className="mark-cell">
                <span className="visually-hidden">{t("task.rowMark")}</span>
              </th>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row[0]}
                className={marked.has(index) ? "row-marked" : undefined}
                onClick={(event) => {
                  if (!(event.target instanceof HTMLInputElement)) toggle(index);
                }}
              >
                <td className="mark-cell">
                  <label>
                    <input
                      type="checkbox"
                      checked={marked.has(index)}
                      onChange={() => toggle(index)}
                      aria-label={t("task.rowSelect", { row: row[0] })}
                    />
                  </label>
                </td>
                {row.map((cell, cellIndex) =>
                  cellIndex === 0 ? (
                    <th key={cellIndex} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={cellIndex}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
