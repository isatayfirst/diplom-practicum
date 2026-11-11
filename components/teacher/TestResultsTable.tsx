import { getT } from "@/lib/messages";
import type { TestsView } from "@/lib/teacher-view";

export default async function TestResultsTable({ view }: { view: TestsView }) {
  const t = await getT();
  return (
    <div className="t-table-wrap">
      <table className="t-table" data-table="test-results">
        <caption>{t("teacher.tests.resultsCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("teacher.tests.resultsNumber")}</th>
            <th scope="col">{t("tests.pretest")}</th>
            <th scope="col">{t("tests.posttest")}</th>
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row) => (
            <tr key={row.number} data-student-number={row.number}>
              <th scope="row">№{row.number}</th>
              <td className="t-num">{row.values.pretest}</td>
              <td className="t-num">{row.values.posttest}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
