/**
 * Team Contributions Component
 * Displays admin, photography, and inspection metrics
 * Acknowledges team member contributions without performance scoring
 */

import type { TeamMetrics } from '../../types/kpi';

interface TeamContributionsProps {
  metrics: TeamMetrics;
  monthName: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDays(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}d`;
}

export function TeamContributions({ metrics, monthName }: TeamContributionsProps) {
  const { admin, photography, inspection } = metrics;

  return (
    <div className="kpi-team-grid">
      {/* Admin / Scheduling (Nneka) */}
      <div className="kpi-team-card">
        <div className="kpi-team-card__header">
          <div className="kpi-team-card__icon kpi-team-card__icon--admin">
            S
          </div>
          <div>
            <h4 className="kpi-team-card__title">Admin</h4>
            <p className="kpi-team-card__subtitle">Scheduling & Invoicing</p>
          </div>
        </div>
        <div className="kpi-team-card__metrics">
          <div className="kpi-team-card__metric">
            <span className="kpi-team-card__metric-label">Claims Scheduled</span>
            <span className="kpi-team-card__metric-value">{admin.claimsScheduled}</span>
          </div>
          <div className="kpi-team-card__metric">
            <span className="kpi-team-card__metric-label">Claims Invoiced</span>
            <span className="kpi-team-card__metric-value">{admin.claimsInvoiced}</span>
          </div>
          <div className="kpi-team-card__metric">
            <span className="kpi-team-card__metric-label">Avg Scheduling Lag</span>
            <span className="kpi-team-card__metric-value">{formatDays(admin.avgSchedulingLag)}</span>
          </div>
        </div>
      </div>

      {/* Photography (Arianna) */}
      <div className="kpi-team-card">
        <div className="kpi-team-card__header">
          <div className="kpi-team-card__icon kpi-team-card__icon--photo">
            P
          </div>
          <div>
            <h4 className="kpi-team-card__title">Photography</h4>
            <p className="kpi-team-card__subtitle">Field Work</p>
          </div>
        </div>
        <div className="kpi-team-card__metrics">
          <div className="kpi-team-card__metric">
            <span className="kpi-team-card__metric-label">Claims with Photos</span>
            <span className="kpi-team-card__metric-value">{photography.claimsWithPhotos}</span>
          </div>
          <div className="kpi-team-card__metric">
            <span className="kpi-team-card__metric-label">Total Photos</span>
            <span className="kpi-team-card__metric-value">{photography.totalPhotosUploaded}</span>
          </div>
          <div className="kpi-team-card__metric">
            <span className="kpi-team-card__metric-label">Avg Photos / Claim</span>
            <span className="kpi-team-card__metric-value">{photography.avgPhotosPerClaim.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Inspection (Vernon) */}
      <div className="kpi-team-card">
        <div className="kpi-team-card__header">
          <div className="kpi-team-card__icon kpi-team-card__icon--inspect">
            I
          </div>
          <div>
            <h4 className="kpi-team-card__title">Inspection</h4>
            <p className="kpi-team-card__subtitle">Estimates & Supplements</p>
          </div>
        </div>
        <div className="kpi-team-card__metrics">
          <div className="kpi-team-card__metric">
            <span className="kpi-team-card__metric-label">Claims Inspected</span>
            <span className="kpi-team-card__metric-value">{inspection.claimsInspected}</span>
          </div>
          <div className="kpi-team-card__metric">
            <span className="kpi-team-card__metric-label">Supplements</span>
            <span className="kpi-team-card__metric-value">{inspection.supplementsProcessed}</span>
          </div>
          <div className="kpi-team-card__metric">
            <span className="kpi-team-card__metric-label">Avg File Total</span>
            <span className="kpi-team-card__metric-value">{formatCurrency(inspection.avgFileTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
