import type { CSSProperties } from "react";

export function ProgressMeter({ label, value, max }: {
  label: string; value: number; max: number;
}) {
  const limit = Math.max(1, max);
  const current = Math.min(limit, Math.max(0, value));
  return (
    <span className="progress-meter"
      role="progressbar" aria-label={label} aria-valuemin={0} aria-valuenow={current} aria-valuemax={limit}
      aria-valuetext={`${current} из ${limit}`} style={{ "--meter-width": `${current / limit * 100}%` } as CSSProperties}>
      <span className="progress-meter-fill" aria-hidden="true" />
    </span>
  );
}
