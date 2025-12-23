// Test script to calculate payout forecasts from actual database
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load .env file manually
const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/['"]/g, ''); // Remove quotes if any
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || 'https://qrouuoycvxxxutkxkxpp.supabase.co';
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb3V1b3ljdnh4eHV0a3hreHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODMyNDgsImV4cCI6MjA3Nzc1OTI0OH0.LXKVdTXNgHgoILlHJcSaGnzyWlaT0-oBxbEgl5ipA48';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Import forecasting logic (we'll copy the functions here for Node.js compatibility)

// Normalize firm names per deposit data mapping
function normalizeFirmName(firmName) {
  if (!firmName) return 'Unknown';

  const normalized = firmName.toUpperCase().trim();

  if (normalized.includes('G T APPRAISALS') || normalized === 'LEGACY') return 'Legacy';
  if (normalized.includes('SL APPRAISAL') || normalized === 'DOAN') return 'Doan';
  if (normalized.includes('AUTOCLAIMSDI') || normalized === 'ACD') return 'ACD';
  if (normalized.includes('HEAVY EQUIPMENT') || normalized === 'HEA') return 'HEA';
  if (normalized.includes('CLAIMSOLUTION 16005709')) return 'ClaimSolution';
  if (normalized.includes('AMA CLAIM SOLUTI')) return 'AMA';
  if (normalized.includes('A TEAM')) return 'A-TEAM';
  if (normalized.includes('IANET')) return 'IANET';
  if (normalized.includes('SEDGWK') || normalized === 'SEDGWICK') return 'Sedgwick';
  if (normalized.includes('COMPLETE CLAIMS')) return 'Complete Claims';
  if (normalized.includes('SCA ENTERPR')) return 'SCA';

  return firmName;
}

// Helper functions
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

function adjustForWeekend(date) {
  const day = date.getDay();
  if (day === 0) return addDays(date, 1); // Sun → Mon
  if (day === 6) return addDays(date, 2); // Sat → Mon
  return date;
}

// Main pay period calculation
function getPayPeriod(firm, completedDate) {
  const normalized = normalizeFirmName(firm);
  const day = completedDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  switch(normalized) {
    case 'Sedgwick': {
      // Pays WEDNESDAY
      const daysUntilWed = (3 - day + 7) % 7 || 7;
      const payoutWed = addDays(completedDate, daysUntilWed);

      return {
        periodStart: addDays(payoutWed, -5),
        periodEnd: addDays(payoutWed, -1),
        payoutDate: payoutWed
      };
    }

    case 'Legacy': {
      // Bi-weekly Wednesday
      const refLegacy = new Date('2024-12-18');
      const daysUntilWed = (3 - day + 7) % 7 || 7;
      let nextWed = addDays(completedDate, daysUntilWed);

      const daysSinceRef = daysBetween(refLegacy, nextWed);
      const weeksSinceRef = Math.floor(daysSinceRef / 7);
      if (weeksSinceRef % 2 !== 0) {
        nextWed = addDays(nextWed, 7);
      }

      return {
        periodStart: addDays(nextWed, -13),
        periodEnd: addDays(nextWed, -1),
        payoutDate: nextWed
      };
    }

    case 'ClaimSolution': {
      // Bi-weekly Thursday
      const refCS = new Date('2024-12-19');
      const daysUntilThu = (4 - day + 7) % 7 || 7;
      let nextThu = addDays(completedDate, daysUntilThu);

      const daysSinceRef = daysBetween(refCS, nextThu);
      const weeksSinceRef = Math.floor(daysSinceRef / 7);
      if (weeksSinceRef % 2 !== 0) {
        nextThu = addDays(nextThu, 7);
      }

      return {
        periodStart: addDays(nextThu, -13),
        periodEnd: nextThu,
        payoutDate: nextThu
      };
    }

    case 'Complete Claims': {
      // Bi-weekly Wednesday
      const refCC = new Date('2024-12-04');
      const daysUntilWed = (3 - day + 7) % 7 || 7;
      let nextWed = addDays(completedDate, daysUntilWed);

      const daysSinceRef = daysBetween(refCC, nextWed);
      const weeksSinceRef = Math.floor(daysSinceRef / 7);
      if (weeksSinceRef % 2 !== 0) {
        nextWed = addDays(nextWed, 7);
      }

      return {
        periodStart: addDays(nextWed, -13),
        periodEnd: addDays(nextWed, -1),
        payoutDate: nextWed
      };
    }

    case 'Doan': {
      // Weekly Thursday
      const daysUntilThu = (4 - day + 7) % 7 || 7;
      const payoutThu = addDays(completedDate, daysUntilThu);

      return {
        periodStart: addDays(payoutThu, -6),
        periodEnd: payoutThu,
        payoutDate: payoutThu
      };
    }

    case 'ACD': {
      // Semi-monthly: 15th & EOM
      const currMonth = completedDate.getMonth();
      const currYear = completedDate.getFullYear();
      const currDay = completedDate.getDate();

      if (currDay <= 15) {
        const payout15 = new Date(currYear, currMonth, 15);
        return {
          periodStart: new Date(currYear, currMonth, 1, 0, 0, 0),
          periodEnd: new Date(currYear, currMonth, 15, 23, 59, 59),
          payoutDate: adjustForWeekend(payout15)
        };
      } else {
        const lastDay = new Date(currYear, currMonth + 1, 0).getDate();
        const payoutEOM = new Date(currYear, currMonth, lastDay);
        return {
          periodStart: new Date(currYear, currMonth, 16, 0, 0, 0),
          periodEnd: new Date(currYear, currMonth, lastDay, 23, 59, 59),
          payoutDate: adjustForWeekend(payoutEOM)
        };
      }
    }

    case 'HEA': {
      // Monthly on 15th
      const heaMonth = completedDate.getMonth();
      const heaYear = completedDate.getFullYear();
      const heaDay = completedDate.getDate();

      if (heaDay < 15) {
        const payout15 = new Date(heaYear, heaMonth, 15);
        return {
          periodStart: new Date(heaYear, heaMonth - 1, 1, 0, 0, 0),
          periodEnd: new Date(heaYear, heaMonth, 0, 23, 59, 59),
          payoutDate: adjustForWeekend(payout15)
        };
      } else {
        const payout15Next = new Date(heaYear, heaMonth + 1, 15);
        return {
          periodStart: new Date(heaYear, heaMonth, 1, 0, 0, 0),
          periodEnd: new Date(heaYear, heaMonth + 1, 0, 23, 59, 59),
          payoutDate: adjustForWeekend(payout15Next)
        };
      }
    }

    case 'IANET': {
      // Monthly end-of-month
      const ianetMonth = completedDate.getMonth();
      const ianetYear = completedDate.getFullYear();
      const lastDay = new Date(ianetYear, ianetMonth + 1, 0).getDate();
      const payoutEOM = new Date(ianetYear, ianetMonth, lastDay);

      return {
        periodStart: new Date(ianetYear, ianetMonth, 1, 0, 0, 0),
        periodEnd: new Date(ianetYear, ianetMonth, lastDay, 23, 59, 59),
        payoutDate: adjustForWeekend(payoutEOM)
      };
    }

    default:
      throw new Error(`Unknown or excluded firm: ${normalized}`);
  }
}

// Main forecasting function
function forecastPayouts(claims) {
  const completedClaims = claims.filter(c =>
    c.status === 'COMPLETED' &&
    c.completion_date &&
    c.file_total > 0
  );

  const payoutMap = new Map();

  for (const claim of completedClaims) {
    const completedDate = new Date(claim.completion_date);
    const firmNormalized = normalizeFirmName(claim.firm_name);

    // Skip excluded firms
    if (['SCA', 'A-TEAM', 'AMA'].includes(firmNormalized)) continue;

    try {
      const period = getPayPeriod(firmNormalized, completedDate);

      // Only include if work falls in valid period
      if (completedDate >= period.periodStart && completedDate <= period.periodEnd) {
        const key = `${firmNormalized}|${period.payoutDate.toISOString()}`;

        if (!payoutMap.has(key)) {
          payoutMap.set(key, {
            payoutDate: period.payoutDate,
            firm: firmNormalized,
            totalExpected: 0,
            claimIds: [],
            claimCount: 0,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd
          });
        }

        const payout = payoutMap.get(key);
        payout.totalExpected += claim.file_total;
        payout.claimIds.push(claim.id);
        payout.claimCount++;
      }
    } catch (error) {
      console.warn(`Could not process claim ${claim.id} for firm ${firmNormalized}`);
    }
  }

  return Array.from(payoutMap.values())
    .sort((a, b) => a.payoutDate.getTime() - b.payoutDate.getTime());
}

// Main test execution
async function runTest() {
  console.log('\n=== PAYOUT FORECAST TEST ===\n');
  console.log('Fetching completed claims from database...\n');

  // First, let's see ALL claims to understand the data
  const { data: allClaims, error: allError } = await supabase
    .from('claims')
    .select('id, firm_name, completion_date, file_total, status, customer_name, claim_number')
    .limit(50);

  if (allError) {
    console.error('Error fetching all claims:', allError);
    return;
  }

  console.log(`Total claims in database: ${allClaims.length}\n`);
  console.log('Sample of claims:');
  allClaims.slice(0, 10).forEach(c => {
    console.log(`  - ${c.claim_number || 'no number'} | ${c.customer_name} | Status: ${c.status} | file_total: ${c.file_total} | completion_date: ${c.completion_date}`);
  });
  console.log('');

  const { data: claims, error } = await supabase
    .from('claims')
    .select('id, firm_name, completion_date, file_total, status, customer_name, claim_number')
    .eq('status', 'COMPLETED')
    .not('completion_date', 'is', null)
    .gt('file_total', 0);

  if (error) {
    console.error('Error fetching claims:', error);
    return;
  }

  console.log(`✓ Fetched ${claims.length} completed claims with file_total > 0\n`);

  // Generate all payouts
  const allPayouts = forecastPayouts(claims);

  // Filter for 12/26/2024 - 1/2/2025
  const weekStart = new Date('2024-12-26');
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date('2025-01-02');
  weekEnd.setHours(23, 59, 59, 999);

  const weekPayouts = allPayouts.filter(p =>
    p.payoutDate >= weekStart && p.payoutDate <= weekEnd
  );

  const weekTotal = weekPayouts.reduce((sum, p) => sum + p.totalExpected, 0);

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  PAYOUT FORECAST FOR 12/26/2024 - 1/2/2025`);
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`💰 TOTAL EXPECTED: $${weekTotal.toFixed(2)}`);
  console.log(`📊 NUMBER OF PAYOUTS: ${weekPayouts.length}\n`);

  if (weekPayouts.length > 0) {
    console.log('BREAKDOWN BY FIRM:\n');
    weekPayouts.forEach(payout => {
      console.log(`─────────────────────────────────────────────────────────`);
      console.log(`🏢 ${payout.firm}`);
      console.log(`   📅 Payout Date: ${payout.payoutDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`);
      console.log(`   📆 Period: ${payout.periodStart.toLocaleDateString()} - ${payout.periodEnd.toLocaleDateString()}`);
      console.log(`   💵 Amount: $${payout.totalExpected.toFixed(2)}`);
      console.log(`   📋 Claims: ${payout.claimCount}`);
      console.log('');
    });
  } else {
    console.log('⚠️  No payouts scheduled for this week\n');
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  // Show next few weeks for context
  console.log('UPCOMING WEEKS (Next 4 weeks):\n');
  for (let i = 0; i < 4; i++) {
    const start = addDays(new Date('2024-12-26'), i * 7);
    const end = addDays(start, 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const payouts = allPayouts.filter(p => p.payoutDate >= start && p.payoutDate <= end);
    const total = payouts.reduce((sum, p) => sum + p.totalExpected, 0);

    console.log(`Week ${i + 1}: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
    console.log(`   Total: $${total.toFixed(2)} (${payouts.length} payout${payouts.length !== 1 ? 's' : ''})`);
    if (payouts.length > 0) {
      payouts.forEach(p => {
        console.log(`   - ${p.firm}: $${p.totalExpected.toFixed(2)} on ${p.payoutDate.toLocaleDateString()}`);
      });
    }
    console.log('');
  }
}

runTest().then(() => {
  console.log('✅ Test complete\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
