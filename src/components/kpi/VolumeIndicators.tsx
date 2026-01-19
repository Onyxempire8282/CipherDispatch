/**
 * Volume Indicators Component
 * Displays secondary volume metrics: claims/day, peak day, working days, supplements
 */

import type { MonthlySnapshot } from '../../types/kpi';

interface VolumeIndicatorsProps {
  snapshot: MonthlySnapshot;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return 'N/A';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function VolumeIndicators({ snapshot }: VolumeIndicatorsProps) {
  return (
    <div className="kpi-volume-card">
      <h4 className="kpi-volume-card__title">Volume Indicators</h4>
      <div className="kpi-volume-card__grid">
        <div className="kpi-volume-card__row">
          <span className="kpi-volume-card__row-label">Claims / Working Day</span>
          <span className="kpi-volume-card__row-value kpi-volume-card__row-value--highlight">
            {snapshot.claimsPerWorkingDay.toFixed(1)}
          </span>
        </div>

        <div className="kpi-volume-card__row">
          <span className="kpi-volume-card__row-label">Peak Day Volume</span>
          <span className="kpi-volume-card__row-value">
            {snapshot.peakDayVolume}
            <span className="kpi-volume-card__row-subtext">
              ({formatDate(snapshot.peakDayDate)})
            </span>
          </span>
        </div>

        <div className="kpi-volume-card__row">
          <span className="kpi-volume-card__row-label">Working Days {snapshot.isComplete ? '' : '(MTD)'}</span>
          <span className="kpi-volume-card__row-value">{snapshot.workingDays}</span>
        </div>

        <div className="kpi-volume-card__row">
          <span className="kpi-volume-card__row-label">Supplements</span>
          <span className="kpi-volume-card__row-value">{snapshot.supplementClaims}</span>
        </div>
      </div>
    </div>
  );
}
