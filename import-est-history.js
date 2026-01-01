/**
 * Historical EST Archive Importer
 *
 * Scans firm-based archive folders for EST.pdf files and imports historical
 * monthly performance data into the monthly_performance_log table.
 *
 * Folder Structure:
 * - Root contains firm folders (e.g., "Firm A", "Firm B")
 * - Each firm folder contains "CLAIMS M-YYYY" folders
 * - Each CLAIMS folder contains EST.pdf files
 *
 * Usage:
 *   node import-est-history.js <root-path>
 *
 * Example:
 *   node import-est-history.js "C:\Archive\EstFiles"
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment');
  console.error('Create a .env file or set environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constants
const MAX_SAFE_CAPACITY = 200; // From monthlyPerformance.ts

/**
 * Extract YYYY-MM from file modified timestamp
 */
function getMonthFromTimestamp(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const mtime = stats.mtime;
    const year = mtime.getFullYear();
    const month = String(mtime.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } catch (err) {
    console.error(`Error reading timestamp for ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Check if a path is a directory
 */
function isDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (err) {
    return false;
  }
}

/**
 * Extract firm name from folder name
 */
function extractFirmName(folderName) {
  // Clean up common patterns
  return folderName.trim();
}

/**
 * Check if folder matches "CLAIMS M-YYYY" pattern
 */
function isClaimsFolder(folderName) {
  // Match patterns like:
  // - "CLAIMS M-2024"
  // - "CLAIMS M-2023"
  // - "Claims M-2024" (case insensitive)
  const pattern = /^claims\s+m-\d{4}$/i;
  return pattern.test(folderName.trim());
}

/**
 * Scan a CLAIMS folder for EST.pdf files
 */
function scanClaimsFolder(claimsFolderPath, firmName) {
  const results = [];

  try {
    const files = fs.readdirSync(claimsFolderPath);

    for (const file of files) {
      // Only process files ending with " EST.pdf"
      if (!file.endsWith(' EST.pdf')) {
        continue;
      }

      const filePath = path.join(claimsFolderPath, file);

      // Skip directories
      if (isDirectory(filePath)) {
        continue;
      }

      // Extract month from file timestamp
      const month = getMonthFromTimestamp(filePath);
      if (!month) {
        continue;
      }

      // Extract claim key (remove " EST.pdf" suffix)
      const claimKey = file.replace(/ EST\.pdf$/, '');

      results.push({
        firm: firmName,
        month: month,
        claimKey: claimKey,
        filePath: filePath
      });
    }
  } catch (err) {
    console.error(`Error scanning claims folder ${claimsFolderPath}:`, err.message);
  }

  return results;
}

/**
 * Scan a firm folder for CLAIMS M-YYYY folders
 */
function scanFirmFolder(firmFolderPath, firmName) {
  const results = [];

  try {
    const entries = fs.readdirSync(firmFolderPath);

    for (const entry of entries) {
      const entryPath = path.join(firmFolderPath, entry);

      if (!isDirectory(entryPath)) {
        continue;
      }

      // Check if this is a CLAIMS folder
      if (isClaimsFolder(entry)) {
        console.log(`  Scanning: ${entry}`);
        const claimsResults = scanClaimsFolder(entryPath, firmName);
        results.push(...claimsResults);
      }
    }
  } catch (err) {
    console.error(`Error scanning firm folder ${firmFolderPath}:`, err.message);
  }

  return results;
}

/**
 * Scan root path for firm folders
 */
function scanRootPath(rootPath) {
  const results = [];

  try {
    const entries = fs.readdirSync(rootPath);

    for (const entry of entries) {
      const entryPath = path.join(rootPath, entry);

      if (!isDirectory(entryPath)) {
        continue;
      }

      // Assume each directory is a firm folder
      const firmName = extractFirmName(entry);
      console.log(`\nScanning firm: ${firmName}`);

      const firmResults = scanFirmFolder(entryPath, firmName);
      results.push(...firmResults);
    }
  } catch (err) {
    console.error(`Error scanning root path ${rootPath}:`, err.message);
    process.exit(1);
  }

  return results;
}

/**
 * Aggregate EST files by firm and month
 */
function aggregateByFirmAndMonth(estFiles) {
  const aggregated = {};

  for (const file of estFiles) {
    const key = `${file.firm}|${file.month}`;

    if (!aggregated[key]) {
      aggregated[key] = {
        firm: file.firm,
        month: file.month,
        claimKeys: new Set(),
        files: []
      };
    }

    aggregated[key].claimKeys.add(file.claimKey);
    aggregated[key].files.push(file.filePath);
  }

  // Convert to array with completed_claims count
  return Object.values(aggregated).map(item => ({
    firm: item.firm,
    month: item.month,
    completed_claims: item.claimKeys.size,
    sample_files: item.files.slice(0, 3) // Keep sample files for verification
  }));
}

/**
 * Aggregate overall monthly performance (across all firms)
 */
function aggregateByMonth(firmMonthData) {
  const aggregated = {};

  for (const item of firmMonthData) {
    if (!aggregated[item.month]) {
      aggregated[item.month] = {
        month: item.month,
        completed_claims: 0,
        firms_active: new Set()
      };
    }

    aggregated[item.month].completed_claims += item.completed_claims;
    aggregated[item.month].firms_active.add(item.firm);
  }

  // Convert to array
  return Object.values(aggregated).map(item => ({
    month: item.month,
    completed_claims: item.completed_claims,
    firms_active: item.firms_active.size,
    backlog: 0, // Unknown from EST files
    avg_velocity: 0, // Will be calculated
    burnout_ratio: 0 // Will be calculated
  }));
}

/**
 * Calculate business days in a month
 */
function getBusinessDaysInMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);

  let count = 0;
  const current = new Date(firstOfMonth);

  while (current <= lastOfMonth) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Insert monthly performance log entries
 */
async function insertMonthlyPerformance(monthlyData) {
  console.log('\n=== Inserting Monthly Performance Logs ===');

  let inserted = 0;
  let skipped = 0;

  for (const data of monthlyData) {
    // Check if month already exists
    const { data: existing, error: checkError } = await supabase
      .from('monthly_performance_log')
      .select('month')
      .eq('month', data.month)
      .single();

    if (existing) {
      console.log(`⏭️  ${data.month}: Already exists (${existing.completed_claims} claims)`);
      skipped++;
      continue;
    }

    // Calculate metrics
    const businessDays = getBusinessDaysInMonth(data.month);
    const avgVelocity = businessDays > 0 ? data.completed_claims / businessDays : 0;
    const burnoutRatio = data.completed_claims / MAX_SAFE_CAPACITY;

    // Insert new record
    const { error: insertError } = await supabase
      .from('monthly_performance_log')
      .insert({
        month: data.month,
        completed_claims: data.completed_claims,
        backlog: data.backlog,
        avg_velocity: Math.round(avgVelocity * 100) / 100,
        burnout_ratio: Math.round(burnoutRatio * 1000) / 1000,
        firms_active: data.firms_active
      });

    if (insertError) {
      console.error(`❌ ${data.month}: Error - ${insertError.message}`);
    } else {
      console.log(`✅ ${data.month}: ${data.completed_claims} claims, ${data.firms_active} firms, velocity ${avgVelocity.toFixed(1)}`);
      inserted++;
    }
  }

  console.log(`\nSummary: ${inserted} inserted, ${skipped} skipped`);
}

/**
 * Insert firm activity entries
 */
async function insertFirmActivity(firmMonthData) {
  console.log('\n=== Inserting Firm Activity Logs ===');

  let inserted = 0;
  let skipped = 0;

  for (const data of firmMonthData) {
    // Check if entry already exists
    const { data: existing, error: checkError } = await supabase
      .from('monthly_firm_activity')
      .select('month, firm_name')
      .eq('month', data.month)
      .eq('firm_name', data.firm)
      .single();

    if (existing) {
      console.log(`⏭️  ${data.month} - ${data.firm}: Already exists`);
      skipped++;
      continue;
    }

    // Insert new record
    const { error: insertError } = await supabase
      .from('monthly_firm_activity')
      .insert({
        month: data.month,
        firm_name: data.firm,
        claims_completed: data.completed_claims,
        revenue_generated: 0 // Unknown from EST files
      });

    if (insertError) {
      console.error(`❌ ${data.month} - ${data.firm}: Error - ${insertError.message}`);
    } else {
      console.log(`✅ ${data.month} - ${data.firm}: ${data.completed_claims} claims`);
      inserted++;
    }
  }

  console.log(`\nSummary: ${inserted} inserted, ${skipped} skipped`);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node import-est-history.js <root-path>');
    console.error('Example: node import-est-history.js "C:\\Archive\\EstFiles"');
    process.exit(1);
  }

  const rootPath = args[0];

  // Verify root path exists
  if (!isDirectory(rootPath)) {
    console.error(`Error: Root path does not exist or is not a directory: ${rootPath}`);
    process.exit(1);
  }

  console.log('=== EST Archive Historical Importer ===');
  console.log(`Root path: ${rootPath}\n`);

  // Step 1: Scan all EST files
  console.log('Step 1: Scanning archive folders...');
  const estFiles = scanRootPath(rootPath);
  console.log(`\nFound ${estFiles.length} EST files`);

  if (estFiles.length === 0) {
    console.log('No EST files found. Exiting.');
    process.exit(0);
  }

  // Step 2: Aggregate by firm and month
  console.log('\nStep 2: Aggregating by firm and month...');
  const firmMonthData = aggregateByFirmAndMonth(estFiles);
  console.log(`Aggregated into ${firmMonthData.length} firm-month entries`);

  // Display sample
  console.log('\nSample firm-month data:');
  firmMonthData.slice(0, 5).forEach(item => {
    console.log(`  ${item.month} - ${item.firm}: ${item.completed_claims} claims`);
  });

  // Step 3: Aggregate by month (overall)
  console.log('\nStep 3: Aggregating overall monthly performance...');
  const monthlyData = aggregateByMonth(firmMonthData);
  console.log(`Aggregated into ${monthlyData.length} monthly entries`);

  // Display sample
  console.log('\nMonthly performance summary:');
  monthlyData.sort((a, b) => a.month.localeCompare(b.month)).forEach(item => {
    console.log(`  ${item.month}: ${item.completed_claims} claims, ${item.firms_active} firms`);
  });

  // Step 4: Insert into database
  console.log('\nStep 4: Inserting into database...');
  await insertMonthlyPerformance(monthlyData);
  await insertFirmActivity(firmMonthData);

  console.log('\n=== Import Complete ===');
}

// Run the script
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
