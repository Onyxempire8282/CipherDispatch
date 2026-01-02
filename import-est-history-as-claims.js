/**
 * Historical EST Archive Importer - Creates Actual Claims
 *
 * Scans firm-based archive folders for EST.pdf files and imports historical
 * claims as COMPLETED records in the claims table with proper completion_date.
 *
 * Folder Structure:
 * - Root contains firm folders (e.g., "Firm A", "Firm B")
 * - Each firm folder contains "CLAIMS M-YYYY" or "CLAIMS 1-2024" folders
 * - Each CLAIMS folder contains EST.pdf files
 *
 * Usage:
 *   node import-est-history-as-claims.js <root-path>
 *
 * Example:
 *   node import-est-history-as-claims.js "C:\Archive\EstFiles"
 *
 * Features:
 * - Creates actual claim records in claims table
 * - Sets completion_date as midnight UTC (YYYY-MM-15T00:00:00Z)
 * - Marks claims as status='COMPLETED'
 * - Adds notes indicating historical import
 * - Skips duplicates based on claim_number
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment"
  );
  console.error("Create a .env file or set environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  return folderName.trim();
}

/**
 * Derive firm name from root path
 */
function deriveFirmName(rootPath) {
  return path.basename(path.resolve(rootPath));
}

/**
 * Check if folder matches "CLAIMS M-YYYY" or "CLAIMS 1-2024" pattern
 */
function isClaimsFolder(folderName) {
  const pattern = /^claims\s+(\d{1,2}|M)-\d{4}$/i;
  return pattern.test(folderName.trim());
}

/**
 * Extract month from CLAIMS folder name
 * Returns YYYY-MM format or null if can't parse
 */
function extractMonthFromFolderName(folderName) {
  const numericPattern = /^claims\s+(\d{1,2})-(\d{4})$/i;
  const match = folderName.trim().match(numericPattern);

  if (match) {
    const month = match[1].padStart(2, "0");
    const year = match[2];
    return `${year}-${month}`;
  }

  return null;
}

/**
 * Extract YYYY-MM from file modified timestamp
 */
function getMonthFromTimestamp(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const mtime = stats.mtime;
    const year = mtime.getFullYear();
    const month = String(mtime.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  } catch (err) {
    console.error(`Error reading timestamp for ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Scan a CLAIMS folder for EST.pdf files
 */
function scanClaimsFolder(claimsFolderPath, firmName, folderName) {
  const results = [];
  const folderMonth = extractMonthFromFolderName(folderName);

  try {
    const files = fs.readdirSync(claimsFolderPath);

    for (const file of files) {
      if (!file.endsWith(" EST.pdf")) {
        continue;
      }

      const filePath = path.join(claimsFolderPath, file);

      if (isDirectory(filePath)) {
        continue;
      }

      let month = folderMonth;
      if (!month) {
        month = getMonthFromTimestamp(filePath);
      }

      if (!month) {
        console.warn(`  ⚠️  Could not determine month for: ${file}`);
        continue;
      }

      // Extract claim key (remove " EST.pdf" suffix)
      const claimKey = file.replace(/ EST\.pdf$/, "");

      console.log(`    📄 ${file} → Firm: ${firmName}, Month: ${month}`);

      results.push({
        firm: firmName,
        month: month,
        claimKey: claimKey,
        filePath: filePath,
      });
    }
  } catch (err) {
    console.error(
      `Error scanning claims folder ${claimsFolderPath}:`,
      err.message
    );
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

      if (isClaimsFolder(entry)) {
        console.log(`  📂 Scanning: ${entry}`);
        const claimsResults = scanClaimsFolder(entryPath, firmName, entry);
        results.push(...claimsResults);
      }
    }
  } catch (err) {
    console.error(`Error scanning firm folder ${firmFolderPath}:`, err.message);
  }

  return results;
}

/**
 * Scan root path for firm folders OR CLAIMS folders
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

      if (isClaimsFolder(entry)) {
        const firmName = deriveFirmName(rootPath);
        console.log(`\n📂 Found CLAIMS folder at root: ${entry}`);
        console.log(`   Treating as firm: ${firmName}`);
        const claimsResults = scanClaimsFolder(entryPath, firmName, entry);
        results.push(...claimsResults);
      } else {
        const firmName = extractFirmName(entry);
        console.log(`\n🏢 Scanning firm: ${firmName}`);
        const firmResults = scanFirmFolder(entryPath, firmName);
        results.push(...firmResults);
      }
    }
  } catch (err) {
    console.error(`Error scanning root path ${rootPath}:`, err.message);
    process.exit(1);
  }

  return results;
}

/**
 * Create completion_date as midnight UTC on 15th of month
 * Format: YYYY-MM-15T00:00:00Z
 * This avoids timezone shift issues
 */
function createCompletionDate(yearMonth) {
  return `${yearMonth}-15T00:00:00Z`;
}

/**
 * Generate claim_number from firm and claim key
 * Format: FIRM-CLAIMKEY (e.g., "HEA-123456")
 */
function generateClaimNumber(firmName, claimKey) {
  // Get first 3-4 letters of firm name for prefix
  const firmPrefix = firmName
    .replace(/[^A-Z]/gi, "")
    .substring(0, 4)
    .toUpperCase();
  return `${firmPrefix}-${claimKey}`;
}

/**
 * Insert claims into database
 */
async function insertClaims(estFiles, dryRun = false) {
  console.log("\n=== Inserting Historical Claims ===");
  console.log(`Mode: ${dryRun ? "DRY RUN (no database changes)" : "LIVE"}\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of estFiles) {
    const claimNumber = generateClaimNumber(file.firm, file.claimKey);
    const completionDate = createCompletionDate(file.month);
    const completedMonth = file.month;

    // Check if claim already exists
    const { data: existing, error: checkError } = await supabase
      .from("claims")
      .select("id, claim_number")
      .eq("claim_number", claimNumber)
      .single();

    if (existing) {
      console.log(`⏭️  ${claimNumber}: Already exists (skipping)`);
      skipped++;
      continue;
    }

    if (checkError && checkError.code !== "PGRST116") {
      console.error(`❌ ${claimNumber}: Error checking - ${checkError.message}`);
      errors++;
      continue;
    }

    if (dryRun) {
      console.log(
        `✅ [DRY RUN] ${claimNumber}: Would create - Firm: ${file.firm}, Month: ${file.month}`
      );
      inserted++;
      continue;
    }

    // Create new claim record
    const claimData = {
      claim_number: claimNumber,
      customer_name: `Historical Import - ${file.claimKey}`,
      status: "COMPLETED",
      firm_name: file.firm,
      completion_date: completionDate,
      completed_month: completedMonth,
      notes: `Imported from EST archive: ${path.basename(file.filePath)}`,
      created_at: completionDate, // Set created_at to completion date
    };

    const { error: insertError } = await supabase
      .from("claims")
      .insert(claimData);

    if (insertError) {
      console.error(`❌ ${claimNumber}: Error - ${insertError.message}`);
      errors++;
    } else {
      console.log(
        `✅ ${claimNumber}: Created - Firm: ${file.firm}, Month: ${file.month}`
      );
      inserted++;
    }
  }

  console.log(
    `\nSummary: ${inserted} ${dryRun ? "would be inserted" : "inserted"}, ${skipped} skipped, ${errors} errors`
  );

  return { inserted, skipped, errors };
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  // Check for --dry-run flag
  const dryRunIndex = args.indexOf("--dry-run");
  const dryRun = dryRunIndex !== -1;
  if (dryRun) {
    args.splice(dryRunIndex, 1);
  }

  if (args.length === 0) {
    console.error("Usage: node import-est-history-as-claims.js <root-path> [--dry-run]");
    console.error(
      'Example: node import-est-history-as-claims.js "C:\\Archive\\EstFiles"'
    );
    console.error(
      "\nOptions:"
    );
    console.error(
      "  --dry-run    Preview import without making database changes"
    );
    process.exit(1);
  }

  const rootPath = args[0];

  if (!isDirectory(rootPath)) {
    console.error(
      `Error: Root path does not exist or is not a directory: ${rootPath}`
    );
    process.exit(1);
  }

  console.log("=== EST Archive → Claims Importer ===");
  console.log(`Root path: ${rootPath}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Step 1: Scan all EST files
  console.log("Step 1: Scanning archive folders...");
  const estFiles = scanRootPath(rootPath);
  console.log(`\nFound ${estFiles.length} EST files`);

  if (estFiles.length === 0) {
    console.log("No EST files found. Exiting.");
    process.exit(0);
  }

  // Display sample
  console.log("\nSample EST files:");
  estFiles.slice(0, 5).forEach((file) => {
    const claimNumber = generateClaimNumber(file.firm, file.claimKey);
    console.log(
      `  ${claimNumber} - ${file.firm} (${file.month})`
    );
  });

  // Confirm before proceeding (unless dry run)
  if (!dryRun) {
    console.log(
      `\n⚠️  This will create ${estFiles.length} COMPLETED claims in your database.`
    );
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Step 2: Insert claims
  console.log("\nStep 2: Creating claims...");
  const results = await insertClaims(estFiles, dryRun);

  console.log("\n=== Import Complete ===");
  if (dryRun) {
    console.log(
      "\nThis was a DRY RUN. Run without --dry-run to actually import."
    );
  } else {
    console.log(
      `\nRefresh your Intelligence dashboard to see the historical data!`
    );
  }
}

// Run the script
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
