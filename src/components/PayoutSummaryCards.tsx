/**
 * Payout Summary Cards Component
 * Displays This Week, Next Week, and This Month summary statistics
 */

import { PayoutForecast } from '../utils/payoutForecasting';
import {
  getThisWeekPayouts,
  getNextWeekPayouts,
  getThisMonthPayouts,
  calculateTotalPayout
} from '../utils/payoutLogic';

interface PayoutSummaryCardsProps {
  payouts: PayoutForecast[];
}

export function PayoutSummaryCards({ payouts }: PayoutSummaryCardsProps) {
  const thisWeekPayouts = getThisWeekPayouts(payouts);
  const nextWeekPayouts = getNextWeekPayouts(payouts);
  const thisMonthPayouts = getThisMonthPayouts(payouts);

  const thisWeekTotal = calculateTotalPayout(thisWeekPayouts);
  const nextWeekTotal = calculateTotalPayout(nextWeekPayouts);
  const thisMonthTotal = calculateTotalPayout(thisMonthPayouts);

  return (
    <div className="payout-dashboard__summary-grid">
      <div className="payout-dashboard__summary-card payout-dashboard__summary-card--this-week">
        <div className="payout-dashboard__summary-label">
          Payouts Occurring This Week
        </div>
        <div className="payout-dashboard__summary-amount payout-dashboard__summary-amount--this-week">
          ${thisWeekTotal.toFixed(2)}
        </div>
        <div className="payout-dashboard__summary-count">
          {thisWeekPayouts.length} payout{thisWeekPayouts.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="payout-dashboard__summary-card payout-dashboard__summary-card--next-week">
        <div className="payout-dashboard__summary-label">
          Payouts Occurring Next Week
        </div>
        <div className="payout-dashboard__summary-amount payout-dashboard__summary-amount--next-week">
          ${nextWeekTotal.toFixed(2)}
        </div>
        <div className="payout-dashboard__summary-count">
          {nextWeekPayouts.length} payout{nextWeekPayouts.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="payout-dashboard__summary-card payout-dashboard__summary-card--this-month">
        <div className="payout-dashboard__summary-label">
          Payouts Occurring This Month (work may be from prior periods)
        </div>
        <div className="payout-dashboard__summary-amount payout-dashboard__summary-amount--this-month">
          ${thisMonthTotal.toFixed(2)}
        </div>
        <div className="payout-dashboard__summary-count">
          {thisMonthPayouts.length} payout{thisMonthPayouts.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
