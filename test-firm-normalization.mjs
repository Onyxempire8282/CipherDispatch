// Test firm name normalization to see which variations work

function normalizeFirmNameForConfig(firmName) {
  if (!firmName) return '';

  const normalized = firmName.toUpperCase().trim();

  // Map variations to standard names
  if (normalized.includes('G T APPRAISALS') || normalized === 'LEGACY') return 'Legacy';
  if (normalized.includes('SL APPRAISAL') || normalized === 'DOAN') return 'Doan';
  if (normalized.includes('AUTOCLAIMSDI') || normalized.includes('AUTOCLAIMS')) return 'ACD';
  if (normalized.includes('HEAVY EQUIPMENT') || normalized === 'HEA') return 'HEA';
  if (normalized.includes('CLAIMSOLUTION')) return 'ClaimSolution';
  if (normalized.includes('AMA')) return 'AMA';
  if (normalized.includes('A TEAM') || normalized.includes('A-TEAM') || normalized.includes('ATEAM')) return 'A-TEAM';
  if (normalized.includes('IANET')) return 'IANET';
  if (normalized.includes('SEDGWK') || normalized === 'SEDGWICK') return 'Sedgwick';
  if (normalized.includes('COMPLETE CLAIMS')) return 'Complete Claims';
  if (normalized.includes('SCA')) return 'SCA';
  if (normalized.includes('FRONTLINE')) return 'Frontline';

  return firmName;
}

console.log('\n=== FIRM NAME NORMALIZATION TEST ===\n');
console.log('Testing various firm name variations:\n');

const testCases = [
  // ClaimSolution variations
  'ClaimSolution',
  'CLAIMSOLUTION',
  'ClaimSolution 16005709',
  'CLAIMSOLUTION 16005709',
  'Claim Solution',

  // Complete Claims variations
  'Complete Claims',
  'COMPLETE CLAIMS',
  'CCS',

  // A-TEAM variations
  'A-TEAM',
  'ATEAM',
  'A TEAM',
  'a-team',

  // Sedgwick variations
  'Sedgwick',
  'SEDGWICK',
  'SEDGWK',

  // ACD variations
  'ACD',
  'AutoClaimsDI',
  'AUTOCLAIMSDI',
  'AutoClaims',

  // Other firms
  'Legacy',
  'G T Appraisals',
  'Doan',
  'SL Appraisal',
  'HEA',
  'Heavy Equipment',
  'IANET',
  'AMA',
  'Frontline',
  'SCA'
];

const FIRM_COLORS = {
  Sedgwick: "#9CA3AF",
  ACD: "#F59E0B",
  ClaimSolution: "#8B5CF6",
  "Complete Claims": "#EF4444",
  Doan: "#10B981",
  Legacy: "#3B82F6",
  AMA: "#FACC15",
  IANET: "#92400E",
  "A-TEAM": "#06B6D4",
  HEA: "#6366F1",
  Frontline: "#1F2937",
  SCA: "#78350F"
};

console.log('INPUT FIRM NAME                → NORMALIZED NAME      → HAS COLOR');
console.log('═══════════════════════════════════════════════════════════════════');

testCases.forEach(testName => {
  const normalized = normalizeFirmNameForConfig(testName);
  const hasColor = normalized in FIRM_COLORS;
  const colorStatus = hasColor ? '✓ YES' : '✗ NO';
  const colorCode = hasColor ? FIRM_COLORS[normalized] : 'N/A';

  console.log(`${testName.padEnd(30)} → ${normalized.padEnd(20)} → ${colorStatus} ${colorCode}`);
});

console.log('\n\n=== CONFIGURED FIRMS ===\n');
console.log('These firms are configured in the system:');
Object.keys(FIRM_COLORS).forEach(firm => {
  console.log(`  ✓ ${firm.padEnd(20)} → ${FIRM_COLORS[firm]}`);
});

console.log('\n\n=== PAYOUT CYCLES ===\n');
const payCycles = {
  'Sedgwick': 'Weekly Wednesday (Fri-Thu work)',
  'Doan': 'Weekly Thursday',
  'Legacy': 'Bi-weekly Wednesday',
  'ClaimSolution': 'Bi-weekly Thursday',
  'Complete Claims': 'Bi-weekly Wednesday',
  'AMA': 'Bi-weekly Wednesday',
  'A-TEAM': 'Bi-weekly Thursday',
  'ACD': 'Semi-monthly (15th & EOM)',
  'HEA': 'Monthly 15th (for previous month)',
  'IANET': 'Monthly EOM',
  'Frontline': 'Monthly EOM',
  'SCA': 'Monthly EOM (irregular)'
};

Object.entries(payCycles).forEach(([firm, cycle]) => {
  console.log(`  ${firm.padEnd(20)} → ${cycle}`);
});

console.log('\n\nTo test ClaimSolution payout, create a claim with:');
console.log('  firm_name: "ClaimSolution" or "CLAIMSOLUTION 16005709"');
console.log('  appointment_start: (any future date)');
console.log('  pay_amount: (any amount > 0)');
console.log('');
