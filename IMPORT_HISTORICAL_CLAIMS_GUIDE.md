# Import Historical EST Data as Claims - Guide

## Overview

This guide explains how to import your 2 years of historical EST data as actual COMPLETED claims in the claims table, which will populate the Intelligence dashboard charts with historical trends.

---

## New Script: `import-est-history-as-claims.js`

### What It Does

- ✅ Scans your EST.pdf archive folders
- ✅ Creates actual claim records in the `claims` table
- ✅ Sets `status = "COMPLETED"`
- ✅ Sets `completion_date` as midnight UTC (YYYY-MM-15T00:00:00Z)
- ✅ Uses 15th of each month to avoid timezone issues
- ✅ Generates unique claim numbers: `FIRM-CLAIMKEY` (e.g., "HEA-123456")
- ✅ Skips duplicates automatically
- ✅ Supports dry-run mode to preview before importing

### Why This Approach?

**Before:** `import-est-history.js` inserted into `monthly_performance_log` and `monthly_firm_activity` tables.

**Problem:** Intelligence charts now read directly from the `claims` table for live data.

**Solution:** Import historical data as actual COMPLETED claims so charts show complete trends from 2023-2026.

---

## Usage

### Step 1: Test with Dry Run (RECOMMENDED)

Preview what will be imported **without making any database changes**:

```bash
node import-est-history-as-claims.js "C:\Archive\EstFiles" --dry-run
```

This will:
- ✅ Scan all EST files
- ✅ Show what claim numbers would be created
- ✅ Display firm names and months
- ✅ Count total claims to import
- ❌ NOT create any database records

**Example Output:**
```
=== EST Archive → Claims Importer ===
Root path: C:\Archive\EstFiles
Mode: DRY RUN

Step 1: Scanning archive folders...

🏢 Scanning firm: HEA
  📂 Scanning: CLAIMS 1-2023
    📄 12345 EST.pdf → Firm: HEA, Month: 2023-01
    📄 12346 EST.pdf → Firm: HEA, Month: 2023-01
  📂 Scanning: CLAIMS 2-2023
    📄 12347 EST.pdf → Firm: HEA, Month: 2023-02

Found 487 EST files

Sample EST files:
  HEA-12345 - HEA (2023-01)
  HEA-12346 - HEA (2023-01)
  HEA-12347 - HEA (2023-02)

=== Inserting Historical Claims ===
Mode: DRY RUN (no database changes)

✅ [DRY RUN] HEA-12345: Would create - Firm: HEA, Month: 2023-01
✅ [DRY RUN] HEA-12346: Would create - Firm: HEA, Month: 2023-01
...

Summary: 487 would be inserted, 0 skipped, 0 errors

=== Import Complete ===
This was a DRY RUN. Run without --dry-run to actually import.
```

### Step 2: Review the Preview

Check the output:
- ✅ Verify firm names are correct
- ✅ Check claim numbers look right
- ✅ Confirm months are accurate
- ✅ Review total count

### Step 3: Run the Actual Import

Once you're satisfied with the dry run preview:

```bash
node import-est-history-as-claims.js "C:\Archive\EstFiles"
```

**Safety Features:**
- 5-second countdown before starting (Ctrl+C to cancel)
- Skips claims that already exist (won't create duplicates)
- Shows progress for each claim created
- Final summary of inserted/skipped/errors

**Example Output:**
```
⚠️  This will create 487 COMPLETED claims in your database.
Press Ctrl+C to cancel, or wait 5 seconds to continue...

Step 2: Creating claims...

=== Inserting Historical Claims ===
Mode: LIVE

✅ HEA-12345: Created - Firm: HEA, Month: 2023-01
✅ HEA-12346: Created - Firm: HEA, Month: 2023-01
⏭️  HEA-12347: Already exists (skipping)
...

Summary: 485 inserted, 2 skipped, 0 errors

=== Import Complete ===

Refresh your Intelligence dashboard to see the historical data!
```

---

## Expected Results

### Claims Created

Each EST file becomes a claim with:

```javascript
{
  claim_number: "HEA-123456",           // Firm prefix + claim key
  customer_name: "Historical Import - 123456",
  status: "COMPLETED",
  firm_name: "HEA",
  completion_date: "2023-01-15T00:00:00Z",  // Midnight UTC on 15th
  completed_month: "2023-01",
  notes: "Imported from EST archive: 123456 EST.pdf",
  created_at: "2023-01-15T00:00:00Z"
}
```

### Intelligence Dashboard

After import and refresh:

✅ **Business Seasonality Wave**
- Shows trends from 2023 → 2026
- Multiple years visible for comparison

✅ **Monthly Velocity Trend**
- Historical velocity data visible
- Per-firm trends over 2+ years

✅ **Claims Completed by Month**
- Complete monthly trends
- Year-over-year comparison

✅ **Firm Activity by Year**
- Multi-year firm performance
- Growth/decline patterns visible

---

## Important Notes

### Completion Dates

Claims are set to the **15th of each month at midnight UTC**:
- `2023-01-15T00:00:00Z` for January 2023 claims
- `2023-02-15T00:00:00Z` for February 2023 claims
- etc.

**Why the 15th?**
- Mid-month is representative of the month
- Midnight UTC avoids ALL timezone issues
- Consistent with our timezone fix strategy

### Claim Numbers

Format: `FIRM-CLAIMKEY`

Examples:
- `HEA-123456` (HEA firm, claim key 123456)
- `SEDG-789012` (Sedgwick firm, claim key 789012)
- `IANA-555001` (IANET firm, claim key 555001)

**Uniqueness:**
- Based on claim_number field
- Script checks for duplicates before inserting
- Re-running is safe - won't create duplicates

### Historical vs Current Claims

**Historical Claims:**
- `customer_name` starts with "Historical Import"
- `notes` contains "Imported from EST archive"
- Can filter these out if needed

**Current Claims:**
- Normal customer names
- Created through app UI
- Have full details

---

## Filtering Historical Claims (Optional)

If you want to filter out historical claims from your Claims page:

### Option A: Filter in Query
Update the query to exclude historical imports:

```typescript
.not("customer_name", "ilike", "Historical Import%")
```

### Option B: Add Import Flag
Add a boolean field `is_historical_import` to mark imported claims.

---

## Troubleshooting

### "No EST files found"
- Check the root path is correct
- Verify folder structure matches: `Firm/CLAIMS M-YYYY/*.EST.pdf`
- Ensure folders are named "CLAIMS 1-2024", "CLAIMS 12-2023", etc.

### "Already exists (skipping)"
- This is normal - the script found existing claims
- Safe to ignore
- Means you've already imported that claim

### Errors During Insert
- Check Supabase connection (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env)
- Verify claims table has proper permissions
- Check for database triggers that might be blocking

### Wrong Months Showing
- Verify folder names: "CLAIMS 1-2024" = January 2024
- If folders aren't named with months, script uses file modification dates
- Touch up folder names to match pattern if needed

---

## Verification

After import, verify the data:

### 1. Check Database

Run in Supabase SQL Editor:

```sql
-- Count imported claims by month
SELECT
  completed_month,
  firm_name,
  COUNT(*) as claims
FROM claims
WHERE customer_name LIKE 'Historical Import%'
  AND status = 'COMPLETED'
GROUP BY completed_month, firm_name
ORDER BY completed_month DESC;

-- Sample imported claims
SELECT
  claim_number,
  firm_name,
  completion_date,
  completed_month,
  notes
FROM claims
WHERE customer_name LIKE 'Historical Import%'
ORDER BY completion_date DESC
LIMIT 10;
```

### 2. Check Intelligence Dashboard

1. Go to Intelligence dashboard
2. Hard refresh (Ctrl+Shift+R)
3. Look for:
   - Multiple years on Business Seasonality Wave (2023, 2024, 2025, 2026)
   - Historical trends on Monthly Velocity
   - Complete monthly data on Claims Completed chart
   - Multi-year firm activity

---

## Comparison with Old Script

| Feature | Old Script (`import-est-history.js`) | New Script (`import-est-history-as-claims.js`) |
|---------|--------------------------------------|-----------------------------------------------|
| **Target Table** | `monthly_performance_log`, `monthly_firm_activity` | `claims` |
| **Data Type** | Aggregated monthly summaries | Individual claim records |
| **Intelligence Charts** | ❌ Not visible (charts query claims table) | ✅ Visible in all charts |
| **Claims Page** | ❌ Not visible | ✅ Visible (can filter out) |
| **Accuracy** | Aggregated counts only | Individual claim records |
| **Timezone Safety** | N/A | ✅ Midnight UTC dates |

---

## Summary

1. ✅ Run dry run first: `node import-est-history-as-claims.js <path> --dry-run`
2. ✅ Review output, verify it looks correct
3. ✅ Run actual import: `node import-est-history-as-claims.js <path>`
4. ✅ Wait for completion (5s countdown, then imports)
5. ✅ Refresh Intelligence dashboard to see historical trends

**Result:** 2+ years of historical data visible in all Intelligence charts! 📊
