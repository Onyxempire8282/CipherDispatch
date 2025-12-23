/**
 * Upcoming Payouts View Component
 * Displays payouts for the next 30 days
 */

import { PayoutForecast } from '../utils/payoutForecasting';

interface PayoutUpcomingViewProps {
  payouts: PayoutForecast[];
  onPayoutClick: (payout: PayoutForecast) => void;
}

export function PayoutUpcomingView({ payouts, onPayoutClick }: PayoutUpcomingViewProps) {
  if (payouts.length === 0) {
    return (
      <div className="payout-dashboard__empty-state">
        No upcoming payouts in the next 30 days
      </div>
    );
  }

  return (
    <>
      {payouts.map((payout, idx) => (
        <div
          key={idx}
          className="payout-card"
          onClick={() => onPayoutClick(payout)}
        >
          <div>
            <div className="payout-card__field-label">Firm</div>
            <div className="payout-card__firm-name">
              {payout.firm}
            </div>
          </div>
          <div>
            <div className="payout-card__field-label">Work Period</div>
            <div className="payout-card__period">
              {payout.periodStart.toLocaleDateString()} - {payout.periodEnd.toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="payout-card__field-label">Payout Date</div>
            <div className="payout-card__date">
              {payout.payoutDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </div>
          </div>
          <div className="payout-card__amount-section">
            <div className="payout-card__claim-count">
              {payout.claimCount} claim{payout.claimCount !== 1 ? 's' : ''} →
            </div>
            <div className="payout-card__amount">
              ${payout.totalExpected.toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
