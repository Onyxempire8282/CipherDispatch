/**
 * Weekly Payouts View Component
 * Groups payouts by week based on payout date
 */

import { WeeklyTotal } from '../utils/payoutForecasting';

interface PayoutWeeklyViewProps {
  weeklyView: WeeklyTotal[];
  maxWeeks?: number;
}

export function PayoutWeeklyView({ weeklyView, maxWeeks = 12 }: PayoutWeeklyViewProps) {
  const weeksToShow = weeklyView.slice(0, maxWeeks);

  return (
    <>
      {weeksToShow.map((week, idx) => (
        <div key={idx} className="period-card">
          <div className="period-card__header">
            <div>
              <div className="period-card__period-label">Week of</div>
              <div className="period-card__period-value">
                {week.weekStart.toLocaleDateString()} - {week.weekEnd.toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="period-card__total-label">Payouts Occurring This Week</div>
              <div className="period-card__total-amount">
                ${week.totalAmount.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="period-card__payout-list">
            {week.payouts.map((payout, pidx) => (
              <div key={pidx} className="period-card__payout-item">
                <div>
                  <span className="period-card__payout-firm">{payout.firm}</span>
                  <span className="period-card__payout-date">
                    {payout.payoutDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="period-card__payout-amount">
                  ${payout.totalExpected.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
