/**
 * Efficiency Snapshot Component
 * Displays scheduling efficiency metrics and weekday distribution
 * Weekend columns hidden unless values > 0
 */

import type { EfficiencyMetrics } from '../../types/kpi';
import { shouldShowWeekends } from '../../utils/kpiCalculations';

interface EfficiencySnapshotProps {
  metrics: EfficiencyMetrics;
  monthName: string;
}

export function EfficiencySnapshot({ metrics, monthName }: EfficiencySnapshotProps) {
  const { weekdayDistribution, multiClaimDays, avgAppointmentSpacing, claimsPerWeek } = metrics;
  const weekendVisibility = shouldShowWeekends(weekdayDistribution);

  // Calculate current week claims
  const currentWeekNum = getCurrentWeekNumber();
  const claimsThisWeek = claimsPerWeek[currentWeekNum] ?? 0;

  // Get max for bar scaling
  const weekdayValues = [
    weekdayDistribution.monday,
    weekdayDistribution.tuesday,
    weekdayDistribution.wednesday,
    weekdayDistribution.thursday,
    weekdayDistribution.friday,
  ];
  if (weekendVisibility.showSaturday) weekdayValues.push(weekdayDistribution.saturday);
  if (weekendVisibility.showSunday) weekdayValues.push(weekdayDistribution.sunday);
  const maxValue = Math.max(...weekdayValues, 1);

  return (
    <div className="kpi-efficiency-card">
      <h4 className="kpi-efficiency-card__title">Efficiency Snapshot ({monthName})</h4>

      <div className="kpi-efficiency-card__summary">
        <div className="kpi-efficiency-card__summary-item">
          <span className="kpi-efficiency-card__summary-label">This Week</span>
          <span className="kpi-efficiency-card__summary-value">{claimsThisWeek}</span>
        </div>
        <div className="kpi-efficiency-card__summary-item">
          <span className="kpi-efficiency-card__summary-label">Multi-Claim Days</span>
          <span className="kpi-efficiency-card__summary-value">{multiClaimDays}</span>
        </div>
        <div className="kpi-efficiency-card__summary-item">
          <span className="kpi-efficiency-card__summary-label">Avg Spacing</span>
          <span className="kpi-efficiency-card__summary-value">
            {avgAppointmentSpacing !== null ? `${avgAppointmentSpacing}m` : 'N/A'}
          </span>
        </div>
      </div>

      <div className="kpi-efficiency-card__weekday-section">
        <div className="kpi-efficiency-card__weekday-label">Claims by Weekday</div>
        <div className="kpi-efficiency-card__weekday-grid">
          <WeekdayBar label="Mon" value={weekdayDistribution.monday} max={maxValue} />
          <WeekdayBar label="Tue" value={weekdayDistribution.tuesday} max={maxValue} />
          <WeekdayBar label="Wed" value={weekdayDistribution.wednesday} max={maxValue} />
          <WeekdayBar label="Thu" value={weekdayDistribution.thursday} max={maxValue} />
          <WeekdayBar label="Fri" value={weekdayDistribution.friday} max={maxValue} />
          {weekendVisibility.showSaturday && (
            <WeekdayBar label="Sat" value={weekdayDistribution.saturday} max={maxValue} />
          )}
          {weekendVisibility.showSunday && (
            <WeekdayBar label="Sun" value={weekdayDistribution.sunday} max={maxValue} />
          )}
        </div>
      </div>
    </div>
  );
}

interface WeekdayBarProps {
  label: string;
  value: number;
  max: number;
}

function WeekdayBar({ label, value, max }: WeekdayBarProps) {
  const height = max > 0 ? Math.max(4, (value / max) * 60) : 4;

  return (
    <div className="kpi-efficiency-card__weekday-bar">
      <div
        className="kpi-efficiency-card__weekday-bar-fill"
        style={{ height: `${height}px` }}
      />
      <span className="kpi-efficiency-card__weekday-bar-count">{value}</span>
      <span className="kpi-efficiency-card__weekday-bar-label">{label}</span>
    </div>
  );
}

function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000; // milliseconds in a week
  return Math.ceil((diff + start.getDay() * 86400000) / oneWeek);
}
