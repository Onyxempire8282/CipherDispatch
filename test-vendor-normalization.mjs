// Test vendor name normalization
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fcfkiijmxpnlqxkcsqgb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjZmtpaWpteHBubHF4a2NzcWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MzU5NDgsImV4cCI6MjA1MDIxMTk0OH0.QKWXfmAR4gKV3O_HdkJjZqTTQb4WM3_jbQ4rQoLhymo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Copy of normalization function from firmFeeConfig.ts
function normalizeFirmNameForConfig(firmName) {
  if (!firmName) return '';

  const normalized = firmName.toUpperCase().trim();

  // Map variations to standard names
  if (normalized.includes('G T APPRAISALS') || normalized === 'LEGACY') return 'Legacy';
  if (normalized.includes('SL APPRAISAL') || normalized === 'DOAN') return 'Doan';
  if (normalized.includes('AUTOCLAIMSDI') || normalized.includes('AUTOCLAIMS')) return 'ACD';
  if (normalized.includes('HEAVY EQUIPMENT') || normalized === 'HEA') return 'HEA';
  // ClaimSolution variants: CS, CCS, ClaimSolution
  if (normalized === 'CS' || normalized === 'CCS' || normalized.includes('CLAIMSOLUTION') || normalized.includes('CLAIM SOLUTION')) return 'ClaimSolution';
  if (normalized.includes('AMA')) return 'AMA';
  if (normalized.includes('A TEAM') || normalized.includes('A-TEAM') || normalized.includes('ATEAM')) return 'A-TEAM';
  if (normalized.includes('IANET')) return 'IANET';
  if (normalized.includes('SEDGWK') || normalized === 'SEDGWICK') return 'Sedgwick';
  if (normalized.includes('COMPLETE CLAIMS')) return 'Complete Claims';
  if (normalized.includes('SCA')) return 'SCA';
  if (normalized.includes('FRONTLINE')) return 'Frontline';

  return firmName;
}

console.log('=== VENDOR NAME NORMALIZATION TEST ===\n');

// Test specific problem cases
console.log('Testing problem vendor names:');
console.log('CS →', normalizeFirmNameForConfig('CS'));
console.log('CCS →', normalizeFirmNameForConfig('CCS'));
console.log('ClaimSolution →', normalizeFirmNameForConfig('ClaimSolution'));
console.log('Sedgwick →', normalizeFirmNameForConfig('Sedgwick'));
console.log('SEDGWICK →', normalizeFirmNameForConfig('SEDGWICK'));
console.log();

// Fetch all claims and group by vendor name
console.log('Fetching all claims from database...\n');

const { data: allClaims, error } = await supabase
  .from('claims')
  .select('id, firm_name, status, completion_date, appointment_start, file_total, pay_amount')
  .or('status.eq.COMPLETED,status.eq.SCHEDULED,status.eq.IN_PROGRESS');

if (error) {
  console.error('Error fetching claims:', error);
  process.exit(1);
}

console.log(`Total claims fetched: ${allClaims.length}\n`);

// Group by original firm name
const firmGroups = {};
for (const claim of allClaims) {
  const firmName = claim.firm_name || 'Unknown';
  if (!firmGroups[firmName]) {
    firmGroups[firmName] = [];
  }
  firmGroups[firmName].push(claim);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  CLAIMS GROUPED BY ORIGINAL FIRM NAME');
console.log('═══════════════════════════════════════════════════════════\n');

const firmNames = Object.keys(firmGroups).sort();
for (const firmName of firmNames) {
  const claims = firmGroups[firmName];
  const normalized = normalizeFirmNameForConfig(firmName);
  const isRecognized = normalized !== firmName;

  console.log(`${firmName} (${claims.length} claims)`);
  console.log(`  → Normalizes to: ${normalized} ${isRecognized ? '✓' : '❌ NOT RECOGNIZED'}`);

  // Show breakdown by status
  const completed = claims.filter(c => c.status === 'COMPLETED').length;
  const scheduled = claims.filter(c => c.status === 'SCHEDULED').length;
  const inProgress = claims.filter(c => c.status === 'IN_PROGRESS').length;
  console.log(`  → Status: ${completed} completed, ${scheduled} scheduled, ${inProgress} in progress`);

  // Calculate totals
  let total = 0;
  for (const claim of claims) {
    if (claim.status === 'COMPLETED') {
      total += claim.file_total || claim.pay_amount || 0;
    } else {
      total += claim.pay_amount || 0;
    }
  }
  console.log(`  → Total expected payout: $${total.toFixed(2)}`);
  console.log();
}

// Check specific IANET and ACD claims for Dec 31 payout
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  SPECIFIC PROBLEM CASES - Dec 31 Payouts');
console.log('═══════════════════════════════════════════════════════════\n');

// IANET - Monthly EOM payer, December work → Dec 31 payout
const ianetClaims = allClaims.filter(c => {
  const normalized = normalizeFirmNameForConfig(c.firm_name);
  return normalized === 'IANET';
});

console.log(`IANET Claims (${ianetClaims.length} total):`);
for (const claim of ianetClaims) {
  const workDate = claim.completion_date || claim.appointment_start;
  const amount = claim.status === 'COMPLETED'
    ? (claim.file_total || claim.pay_amount || 0)
    : (claim.pay_amount || 0);
  console.log(`  - ${claim.id}: ${workDate}, $${amount.toFixed(2)}, ${claim.status}`);
}

// ACD - Semi-monthly (15th & EOM)
const acdClaims = allClaims.filter(c => {
  const normalized = normalizeFirmNameForConfig(c.firm_name);
  return normalized === 'ACD';
});

console.log(`\nACD Claims (${acdClaims.length} total):`);
for (const claim of acdClaims) {
  const workDate = claim.completion_date || claim.appointment_start;
  const amount = claim.status === 'COMPLETED'
    ? (claim.file_total || claim.pay_amount || 0)
    : (claim.pay_amount || 0);
  console.log(`  - ${claim.id}: ${workDate}, $${amount.toFixed(2)}, ${claim.status}`);
}

// ClaimSolution variants
const csClaims = allClaims.filter(c => {
  const firmName = (c.firm_name || '').toUpperCase();
  return firmName === 'CS' || firmName === 'CCS' || firmName.includes('CLAIMSOLUTION');
});

console.log(`\nClaimSolution Variants (${csClaims.length} total):`);
for (const claim of csClaims) {
  const normalized = normalizeFirmNameForConfig(claim.firm_name);
  const workDate = claim.completion_date || claim.appointment_start;
  const amount = claim.status === 'COMPLETED'
    ? (claim.file_total || claim.pay_amount || 0)
    : (claim.pay_amount || 0);
  console.log(`  - Original: "${claim.firm_name}" → "${normalized}"`);
  console.log(`    ${claim.id}: ${workDate}, $${amount.toFixed(2)}, ${claim.status}`);
}

console.log('\n✅ Diagnostic complete\n');
