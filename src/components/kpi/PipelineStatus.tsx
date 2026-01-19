/**
 * Pipeline Status Component
 * Displays point-in-time pipeline counts: awaiting, scheduled, in progress, completed (MTD)
 */

import type { MonthlySnapshot } from '../../types/kpi';

interface PipelineStatusProps {
  snapshot: MonthlySnapshot;
}

export function PipelineStatus({ snapshot }: PipelineStatusProps) {
  const { pipeline, completedThisPeriod, monthName, isComplete } = snapshot;

  return (
    <div className="kpi-pipeline-card">
      <h4 className="kpi-pipeline-card__title">Pipeline Status</h4>
      <div className="kpi-pipeline-card__grid">
        <div className="kpi-pipeline-card__row kpi-pipeline-card__row--awaiting">
          <span className="kpi-pipeline-card__row-label">Awaiting Scheduling</span>
          <span className="kpi-pipeline-card__row-value kpi-pipeline-card__row-value--awaiting">
            {pipeline.awaitingScheduling}
          </span>
        </div>

        <div className="kpi-pipeline-card__row kpi-pipeline-card__row--scheduled">
          <span className="kpi-pipeline-card__row-label">Scheduled</span>
          <span className="kpi-pipeline-card__row-value kpi-pipeline-card__row-value--scheduled">
            {pipeline.scheduled}
          </span>
        </div>

        <div className="kpi-pipeline-card__row kpi-pipeline-card__row--in-progress">
          <span className="kpi-pipeline-card__row-label">In Progress</span>
          <span className="kpi-pipeline-card__row-value kpi-pipeline-card__row-value--in-progress">
            {pipeline.inProgress}
          </span>
        </div>

        <div className="kpi-pipeline-card__row kpi-pipeline-card__row--completed">
          <span className="kpi-pipeline-card__row-label">
            Completed ({isComplete ? monthName : `${monthName} MTD`})
          </span>
          <span className="kpi-pipeline-card__row-value kpi-pipeline-card__row-value--completed">
            {completedThisPeriod}
          </span>
        </div>
      </div>
    </div>
  );
}
