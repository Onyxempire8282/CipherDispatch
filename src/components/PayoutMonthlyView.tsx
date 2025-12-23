/**
 * Monthly Payouts View Component
 * Groups payouts by month based on payout date
 */

import { MonthlyTotal } from '../utils/payoutForecasting';

interface PayoutMonthlyViewProps {
  monthlyView: MonthlyTotal[];
  maxMonths?: number;
}

export function PayoutMonthlyView({ monthlyView, maxMonths = 6 }: PayoutMonthlyViewProps) {
  const monthsToShow = monthlyView.slice(0, maxMonths);

  return (
    <>
      {monthsToShow.map((month, idx) => (
        <div key={idx} className="period-card">
          <div className="period-card__header">
            <div>
              <div className="period-card__period-label">Month</div>
              <div className="period-card__period-value">
                {month.monthName} {month.year}
              </div>
            </div>
            <div>
              <div className="period-card__total-label">
                Payouts Occurring in {month.monthName} (work may be from prior periods)
              </div>
              <div className="period-card__total-amount">
                ${month.totalAmount.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="period-card__payout-list">
            {Object.entries(month.byFirm).map(([firm, amount], fidx) => (
              <div key={fidx} className="period-card__payout-item">
                <div className="period-card__payout-firm">{firm}</div>
                <div className="period-card__payout-amount">
                  ${amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
