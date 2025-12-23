// Test ClaimSolution payout calculation

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(date1, date2) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((utc2 - utc1) / msPerDay);
}

function getClaimSolutionPayPeriod(completedDate) {
  const day = completedDate.getDay();
  const refCS = new Date('2025-01-02'); // Thursday payout date

  // Find the next Thursday after (or on) the completed date
  const daysUntilThu = (4 - day + 7) % 7 || 7;
  let nextThu = addDays(completedDate, daysUntilThu);

  // Check if this Thursday is on the bi-weekly schedule
  const daysSinceRef = daysBetween(refCS, nextThu);
  const weeksSinceRef = Math.floor(daysSinceRef / 7);
  if (weeksSinceRef % 2 !== 0) {
    nextThu = addDays(nextThu, 7);
  }

  return {
    periodStart: addDays(nextThu, -21), // Thursday 3 weeks ago
    periodEnd: addDays(nextThu, -8),    // Wednesday before payout
    payoutDate: nextThu
  };
}

console.log('\n=== CLAIMSOLUTION PAYOUT CALCULATION TEST ===\n');
console.log('Expected behavior:');
console.log('  Work 12/12/2024 - 12/25/2024 → Paid 1/2/2025');
console.log('  Work 12/26/2024 - 1/8/2025   → Paid 1/16/2025');
console.log('  Work 1/9/2025   - 1/22/2025  → Paid 1/30/2025');
console.log('');

// Test dates from the first period
const testDates = [
  new Date('2024-12-12'), // Thursday - start of period
  new Date('2024-12-15'), // Sunday - middle of period
  new Date('2024-12-20'), // Friday - middle of period
  new Date('2024-12-25'), // Wednesday - end of period
  new Date('2024-12-26'), // Thursday - start of next period
  new Date('2025-01-05'), // Sunday - middle of second period
  new Date('2025-01-08'), // Wednesday - end of second period
  new Date('2025-01-09'), // Thursday - start of third period
];

console.log('Testing work completion dates:\n');
console.log('Work Date       → Period Start  → Period End    → Payout Date    | Status');
console.log('═══════════════════════════════════════════════════════════════════════════');

testDates.forEach(workDate => {
  const period = getClaimSolutionPayPeriod(workDate);

  const workStr = workDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const startStr = period.periodStart.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const endStr = period.periodEnd.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const payStr = period.payoutDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  // Check if work date falls within period
  const inPeriod = workDate >= period.periodStart && workDate <= period.periodEnd;
  const status = inPeriod ? '✓ IN PERIOD' : '✗ NOT IN PERIOD';

  console.log(`${workStr} → ${startStr} → ${endStr} → ${payStr} | ${status}`);
});

// Verify specific examples
console.log('\n\n=== VERIFICATION ===\n');

const dec20 = new Date('2024-12-20'); // Should be in period ending 12/25, paid 1/2
const dec20Period = getClaimSolutionPayPeriod(dec20);
console.log('Work on 12/20/2024:');
console.log(`  Period: ${dec20Period.periodStart.toLocaleDateString()} - ${dec20Period.periodEnd.toLocaleDateString()}`);
console.log(`  Payout: ${dec20Period.payoutDate.toLocaleDateString()}`);
console.log(`  Expected: Period 12/12/2024 - 12/25/2024, Paid 1/2/2025`);
console.log(`  Match: ${dec20Period.payoutDate.toLocaleDateString() === '1/2/2025' ? '✓ YES' : '✗ NO'}`);

const jan5 = new Date('2025-01-05'); // Should be in period ending 1/8, paid 1/16
const jan5Period = getClaimSolutionPayPeriod(jan5);
console.log('\nWork on 1/5/2025:');
console.log(`  Period: ${jan5Period.periodStart.toLocaleDateString()} - ${jan5Period.periodEnd.toLocaleDateString()}`);
console.log(`  Payout: ${jan5Period.payoutDate.toLocaleDateString()}`);
console.log(`  Expected: Period 12/26/2024 - 1/8/2025, Paid 1/16/2025`);
console.log(`  Match: ${jan5Period.payoutDate.toLocaleDateString() === '1/16/2025' ? '✓ YES' : '✗ NO'}`);

console.log('');
