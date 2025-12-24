// Compare payout forecast logic vs modal total logic
// This tests for the IANET/ACD total mismatch issue

// Simulate a claim
const mockClaims = [
  // COMPLETED claim with file_total
  { id: '1', status: 'COMPLETED', completion_date: '2024-12-15', file_total: 200, pay_amount: null, firm_name: 'IANET' },

  // COMPLETED claim with pay_amount only
  { id: '2', status: 'COMPLETED', completion_date: '2024-12-16', file_total: null, pay_amount: 150, firm_name: 'IANET' },

  // SCHEDULED claim with pay_amount
  { id: '3', status: 'SCHEDULED', appointment_start: '2024-12-20', file_total: null, pay_amount: 100, firm_name: 'IANET' },

  // SCHEDULED claim WITHOUT pay_amount (uses base fee in forecast!)
  { id: '4', status: 'SCHEDULED', appointment_start: '2024-12-21', file_total: null, pay_amount: null, firm_name: 'IANET' },
];

// Base fee config
const FIRM_BASE_FEES = {
  'IANET': 195,
  'ACD': 200,
  'ClaimSolution': 195
};

function calculateExpectedPayout(firmName) {
  return FIRM_BASE_FEES[firmName] || 0;
}

console.log('=== PAYOUT LOGIC COMPARISON TEST ===\n');

// Forecast logic (from payoutForecasting.ts lines 342-351)
console.log('FORECAST LOGIC (what appears in payout row):');
let forecastTotal = 0;
for (const claim of mockClaims) {
  let expectedAmount = 0;

  if (claim.status === 'COMPLETED' && claim.completion_date !== undefined) {
    expectedAmount = claim.file_total || claim.pay_amount || 0;
  } else if (claim.appointment_start !== undefined || claim.status === 'SCHEDULED') {
    // Use pay_amount if set in calendar, otherwise use firm's base fee
    expectedAmount = claim.pay_amount || calculateExpectedPayout(claim.firm_name) || 0;
  }

  forecastTotal += expectedAmount;
  console.log(`  Claim ${claim.id} (${claim.status}): $${expectedAmount}`);
}
console.log(`  TOTAL: $${forecastTotal}\n`);

// Modal logic (from PayoutDetailModal.tsx lines 61-68)
console.log('MODAL LOGIC (what appears in detail view):');
let modalTotal = 0;
for (const claim of mockClaims) {
  let amount = 0;

  if (claim.status === 'COMPLETED') {
    amount = claim.file_total || claim.pay_amount || 0;
  } else {
    // For scheduled claims, use pay_amount (what was entered in calendar)
    amount = claim.pay_amount || 0;
  }

  modalTotal += amount;
  console.log(`  Claim ${claim.id} (${claim.status}): $${amount}`);
}
console.log(`  TOTAL: $${modalTotal}\n`);

// Analysis
console.log('═══════════════════════════════════════════════════════════');
console.log(`DISCREPANCY: $${forecastTotal - modalTotal}`);
console.log('═══════════════════════════════════════════════════════════\n');

if (forecastTotal !== modalTotal) {
  console.log('❌ MISMATCH FOUND!');
  console.log('\nROOT CAUSE:');
  console.log('When a SCHEDULED claim has no pay_amount:');
  console.log('  - Forecast uses firm base fee (e.g., $195)');
  console.log('  - Modal shows $0');
  console.log('\nFIX: Modal should also use firm base fee for scheduled claims without pay_amount\n');
} else {
  console.log('✅ No discrepancy with this test data\n');
}
