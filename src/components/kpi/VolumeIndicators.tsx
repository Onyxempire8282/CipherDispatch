/**
 * Volume Indicators Component
 * Displays BOTH calendar workload (appointment-based) AND completed production metrics
 * Clearly separates the two different anchors
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
  const periodLabel = snapshot.isComplete ? snapshot.monthName : `${snapshot.monthName} MTD`;

  return (
    <div className="kpi-volume-card">
      <h4 className="kpi-volume-card__title">Volume Indicators ({periodLabel})</h4>
      <div className="kpi-volume-card__grid">
        {/* Calendar Workload Section */}
        <div className="kpi-volume-card__row" style={{ background: '#1e3a5f' }}>
          <span className="kpi-volume-card__row-label" style={{ color: '#93c5fd' }}>
            Calendar Appointments
          </span>
          <span className="kpi-volume-card__row-value kpi-volume-card__row-value--highlight">
            {snapshot.calendarClaims}
          </span>
        </div>

        <div className="kpi-volume-card__row">
          <span className="kpi-volume-card__row-label">Appts / Working Day</span>
          <span className="kpi-volume-card__row-value">
            {snapshot.calendarClaimsPerWorkingDay.toFixed(1)}
          </span>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #4a5568', margin: '8px 0' }} />

        {/* Completed Production Section */}
        <div className="kpi-volume-card__row" style={{ background: '#1a3d2e' }}>
          <span className="kpi-volume-card__row-label" style={{ color: '#86efac' }}>
            Completed (by completion date)
          </span>
          <span className="kpi-volume-card__row-value" style={{ color: '#10b981' }}>
            {snapshot.totalClaims}
          </span>
        </div>

        <div className="kpi-volume-card__row">
          <span className="kpi-volume-card__row-label">Completed / Working Day</span>
          <span className="kpi-volume-card__row-value">
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
