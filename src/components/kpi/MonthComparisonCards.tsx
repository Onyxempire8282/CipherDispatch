/**
 * Month Comparison Cards Component
 * Displays the three primary KPI cards: Claims, Revenue, Avg $/Claim
 * With MoM deltas and optional pace projections
 */

import { useState } from 'react';
import type { MonthComparison } from '../../types/kpi';

interface MonthComparisonCardsProps {
  comparison: MonthComparison;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function getDeltaClass(delta: number): string {
  if (delta > 0) return 'kpi-comparison-card__delta-value--positive';
  if (delta < 0) return 'kpi-comparison-card__delta-value--negative';
  return 'kpi-comparison-card__delta-value--neutral';
}

function getDeltaArrow(delta: number): string {
  if (delta > 0) return '▲';
  if (delta < 0) return '▼';
  return '–';
}

export function MonthComparisonCards({ comparison }: MonthComparisonCardsProps) {
  const [showPace, setShowPace] = useState(false);
  const { lastMonth, currentMTD } = comparison;

  return (
    <div className="kpi-comparison-grid">
      {/* Total Claims Card */}
      <div className="kpi-comparison-card kpi-comparison-card--claims">
        <div className="kpi-comparison-card__label">Total Claims</div>
        <div className="kpi-comparison-card__values">
          <div className="kpi-comparison-card__value-block">
            <div className="kpi-comparison-card__value-label">{lastMonth.monthName}</div>
            <div className="kpi-comparison-card__value">{lastMonth.totalClaims}</div>
          </div>
          <div className="kpi-comparison-card__value-block">
            <div className="kpi-comparison-card__value-label">{currentMTD.monthName} MTD</div>
            <div className="kpi-comparison-card__value kpi-comparison-card__value--claims">
              {currentMTD.totalClaims}
            </div>
          </div>
        </div>
        <div className="kpi-comparison-card__delta">
          <span className={`kpi-comparison-card__delta-value ${getDeltaClass(comparison.claimsDelta)}`}>
            {getDeltaArrow(comparison.claimsDelta)} {Math.abs(comparison.claimsDelta)}
          </span>
          <span className="kpi-comparison-card__delta-percent">
            ({formatPercent(comparison.claimsDeltaPercent)})
          </span>
        </div>
        {showPace && (
          <div className="kpi-comparison-card__pace">
            <span className="kpi-comparison-card__pace-value">
              Pace: {comparison.projectedMonthEndClaims} projected
            </span>
          </div>
        )}
        <div className="kpi-comparison-card__pace">
          <button
            className="kpi-comparison-card__pace-toggle"
            onClick={() => setShowPace(!showPace)}
          >
            {showPace ? 'Hide pace' : 'Show pace'}
          </button>
        </div>
      </div>

      {/* Gross Revenue Card */}
      <div className="kpi-comparison-card kpi-comparison-card--revenue">
        <div className="kpi-comparison-card__label">Gross Revenue</div>
        <div className="kpi-comparison-card__values">
          <div className="kpi-comparison-card__value-block">
            <div className="kpi-comparison-card__value-label">{lastMonth.monthName}</div>
            <div className="kpi-comparison-card__value">{formatCurrency(lastMonth.grossRevenue)}</div>
          </div>
          <div className="kpi-comparison-card__value-block">
            <div className="kpi-comparison-card__value-label">{currentMTD.monthName} MTD</div>
            <div className="kpi-comparison-card__value kpi-comparison-card__value--revenue">
              {formatCurrency(currentMTD.grossRevenue)}
            </div>
          </div>
        </div>
        <div className="kpi-comparison-card__delta">
          <span className={`kpi-comparison-card__delta-value ${getDeltaClass(comparison.revenueDelta)}`}>
            {getDeltaArrow(comparison.revenueDelta)} {formatCurrency(Math.abs(comparison.revenueDelta))}
          </span>
          <span className="kpi-comparison-card__delta-percent">
            ({formatPercent(comparison.revenueDeltaPercent)})
          </span>
        </div>
        {showPace && (
          <div className="kpi-comparison-card__pace">
            <span className="kpi-comparison-card__pace-value">
              Pace: {formatCurrency(comparison.projectedMonthEndRevenue)} projected
            </span>
          </div>
        )}
      </div>

      {/* Average Revenue per Claim Card */}
      <div className="kpi-comparison-card kpi-comparison-card--avg">
        <div className="kpi-comparison-card__label">Avg Revenue / Claim</div>
        <div className="kpi-comparison-card__values">
          <div className="kpi-comparison-card__value-block">
            <div className="kpi-comparison-card__value-label">{lastMonth.monthName}</div>
            <div className="kpi-comparison-card__value">
              {formatCurrency(lastMonth.avgRevenuePerClaim)}
            </div>
          </div>
          <div className="kpi-comparison-card__value-block">
            <div className="kpi-comparison-card__value-label">{currentMTD.monthName} MTD</div>
            <div className="kpi-comparison-card__value kpi-comparison-card__value--avg">
              {formatCurrency(currentMTD.avgRevenuePerClaim)}
            </div>
          </div>
        </div>
        <div className="kpi-comparison-card__delta">
          <span className={`kpi-comparison-card__delta-value ${getDeltaClass(comparison.avgRevenueDelta)}`}>
            {getDeltaArrow(comparison.avgRevenueDelta)} {formatCurrency(Math.abs(comparison.avgRevenueDelta))}
          </span>
          <span className="kpi-comparison-card__delta-percent">
            ({formatPercent(comparison.avgRevenueDeltaPercent)})
          </span>
        </div>
      </div>
    </div>
  );
}
