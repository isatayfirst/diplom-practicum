import { getT } from "@/lib/messages";

type ProgressBarProps = { solved: number; total: number };

export default async function ProgressBar({ solved, total }: ProgressBarProps) {
  const t = await getT();
  return (
    <div className="progress">
      <p className="progress-text">{t("home.progressText", { solved, total })}</p>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={solved}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={t("home.progressLabel")}
      >
        <span className="progress-fill" style={{ width: `${(solved / total) * 100}%` }} />
      </div>
    </div>
  );
}
