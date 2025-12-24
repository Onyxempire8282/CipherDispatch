// Test script to calculate payout forecasts for specific date ranges
import { forecastPayouts, getWeeklyView, Claim } from './src/utils/payoutForecasting';

// Mock claims data - you'll need to replace this with actual data from your database
const mockClaims: Claim[] = [
  // Add your actual claims here
  // Example:
  // { id: '1', firm_name: 'G T Appraisals', completion_date: '2024-12-20', file_total: 500, status: 'COMPLETED' },
];

function calculateWeekPayout(startDate: Date, endDate: Date) {
  const payouts = forecastPayouts(mockClaims);

  // Filter payouts for the specific week
  const weekPayouts = payouts.filter(p =>
    p.payoutDate >= startDate && p.payoutDate <= endDate
  );

  const total = weekPayouts.reduce((sum, p) => sum + p.totalExpected, 0);

  console.log(`\n=== Payout Forecast for ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()} ===`);
  console.log(`\nTotal Expected: $${total.toFixed(2)}`);
  console.log(`Number of Payouts: ${weekPayouts.length}\n`);

  weekPayouts.forEach(payout => {
    console.log(`${payout.firm}:`);
    console.log(`  Payout Date: ${payout.payoutDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`);
    console.log(`  Period: ${payout.periodStart.toLocaleDateString()} - ${payout.periodEnd.toLocaleDateString()}`);
    console.log(`  Amount: $${payout.totalExpected.toFixed(2)}`);
    console.log(`  Claims: ${payout.claimCount}`);
    console.log('');
  });

  return total;
}

// Calculate for 12/26/2024 - 1/2/2025
const weekStart = new Date('2024-12-26');
const weekEnd = new Date('2025-01-02');
calculateWeekPayout(weekStart, weekEnd);

// Show weekly view
console.log('\n=== Weekly View (First 4 Weeks) ===');
const payouts = forecastPayouts(mockClaims);
const weeklyView = getWeeklyView(payouts);
weeklyView.slice(0, 4).forEach((week, idx) => {
  console.log(`\nWeek ${idx + 1}: ${week.weekStart.toLocaleDateString()} - ${week.weekEnd.toLocaleDateString()}`);
  console.log(`Total: $${week.totalAmount.toFixed(2)}`);
  week.payouts.forEach(p => {
    console.log(`  - ${p.firm}: $${p.totalExpected.toFixed(2)} (${p.payoutDate.toLocaleDateString()})`);
  });
});
