/**
 * Pipeline Status Component
 * Displays MONTH-SCOPED status counts that match the calendar view
 * These counts "restart" each month based on appointment_start
 */

import type { MonthlySnapshot } from '../../types/kpi';

interface PipelineStatusProps {
  snapshot: MonthlySnapshot;
}

export function PipelineStatus({ snapshot }: PipelineStatusProps) {
  const { monthScopedCounts, monthName, isComplete } = snapshot;
  const periodLabel = isComplete ? monthName : `${monthName} MTD`;

  return (
    <div className="kpi-pipeline-card">
      <h4 className="kpi-pipeline-card__title">
        Calendar Status ({periodLabel})
      </h4>
      <div className="kpi-pipeline-card__grid">
        <div className="kpi-pipeline-card__row kpi-pipeline-card__row--awaiting">
          <span className="kpi-pipeline-card__row-label">All Active</span>
          <span className="kpi-pipeline-card__row-value" style={{ color: '#e2e8f0' }}>
            {monthScopedCounts.allActive}
          </span>
        </div>

        <div className="kpi-pipeline-card__row kpi-pipeline-card__row--awaiting">
          <span className="kpi-pipeline-card__row-label">Unassigned</span>
          <span className="kpi-pipeline-card__row-value kpi-pipeline-card__row-value--awaiting">
            {monthScopedCounts.unassigned}
          </span>
        </div>

        <div className="kpi-pipeline-card__row kpi-pipeline-card__row--scheduled">
          <span className="kpi-pipeline-card__row-label">Scheduled</span>
          <span className="kpi-pipeline-card__row-value kpi-pipeline-card__row-value--scheduled">
            {monthScopedCounts.scheduled}
          </span>
        </div>

        <div className="kpi-pipeline-card__row kpi-pipeline-card__row--in-progress">
          <span className="kpi-pipeline-card__row-label">In Progress</span>
          <span className="kpi-pipeline-card__row-value kpi-pipeline-card__row-value--in-progress">
            {monthScopedCounts.inProgress}
          </span>
        </div>

        <div className="kpi-pipeline-card__row kpi-pipeline-card__row--completed">
          <span className="kpi-pipeline-card__row-label">Completed</span>
          <span className="kpi-pipeline-card__row-value kpi-pipeline-card__row-value--completed">
            {monthScopedCounts.completed}
          </span>
        </div>

        {monthScopedCounts.canceled > 0 && (
          <div className="kpi-pipeline-card__row" style={{ borderLeftColor: '#6b7280' }}>
            <span className="kpi-pipeline-card__row-label">Canceled</span>
            <span className="kpi-pipeline-card__row-value" style={{ color: '#6b7280' }}>
              {monthScopedCounts.canceled}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
