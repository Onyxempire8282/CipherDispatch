// Debug ClaimSolution payout not showing

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

  console.log(`  Work date day of week: ${day} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day]})`);
  console.log(`  Days until Thursday: ${daysUntilThu}`);
  console.log(`  Next Thursday: ${nextThu.toLocaleDateString()}`);

  // Check if this Thursday is on the bi-weekly schedule
  const daysSinceRef = daysBetween(refCS, nextThu);
  const weeksSinceRef = Math.floor(daysSinceRef / 7);

  console.log(`  Days from ref (1/2/2025) to nextThu: ${daysSinceRef}`);
  console.log(`  Weeks from ref: ${weeksSinceRef}`);
  console.log(`  Is odd week? ${weeksSinceRef % 2 !== 0}`);

  if (weeksSinceRef % 2 !== 0) {
    nextThu = addDays(nextThu, 7);
    console.log(`  Adjusted to next bi-weekly Thursday: ${nextThu.toLocaleDateString()}`);
  }

  const period = {
    periodStart: addDays(nextThu, -21),
    periodEnd: addDays(nextThu, -8),
    payoutDate: nextThu
  };

  console.log(`  Period: ${period.periodStart.toLocaleDateString()} - ${period.periodEnd.toLocaleDateString()}`);
  console.log(`  Payout: ${period.payoutDate.toLocaleDateString()}`);

  // Check if work date is in period
  const inPeriod = completedDate >= period.periodStart && completedDate <= period.periodEnd;
  console.log(`  Work date in period? ${inPeriod}`);

  return period;
}

console.log('\n=== CLAIMSOLUTION DEBUG TEST ===\n');

const testDates = [
  new Date('2024-12-20'), // Friday - recent past
  new Date('2024-12-23'), // Monday - today
  new Date('2024-12-19'), // Thursday
  new Date('2025-01-05'), // Sunday - future
];

testDates.forEach(workDate => {
  console.log(`\nTesting work date: ${workDate.toLocaleDateString()} (${workDate.toDateString()})`);
  getClaimSolutionPayPeriod(workDate);
});
