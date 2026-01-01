# EST Archive Historical Importer

This script imports historical monthly performance data from archived EST.pdf files into the `monthly_performance_log` and `monthly_firm_activity` tables.

## Folder Structure Expected

```
Root Archive Folder/
├── Firm A/
│   ├── CLAIMS M-2023/
│   │   ├── ABC123 EST.pdf
│   │   ├── DEF456 EST.pdf
│   │   └── GHI789 EST.pdf
│   └── CLAIMS M-2024/
│       ├── JKL012 EST.pdf
│       └── MNO345 EST.pdf
├── Firm B/
│   ├── CLAIMS M-2023/
│   │   └── PQR678 EST.pdf
│   └── CLAIMS M-2024/
│       └── STU901 EST.pdf
└── Firm C/
    └── CLAIMS M-2024/
        └── VWX234 EST.pdf
```

## Prerequisites

1. **Environment Variables**: Ensure your `.env` file contains:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Database Tables**: Run the SQL migration first:
   ```sql
   -- Run create-monthly-performance-log.sql in Supabase
   ```

3. **Node.js**: Version 18+ with ES modules support

## Usage

```bash
node import-est-history.js <root-archive-path>
```

### Example

```bash
# Windows
node import-est-history.js "C:\Archive\EstFiles"

# macOS/Linux
node import-est-history.js "/Users/yourname/Archive/EstFiles"
```

## What the Script Does

### Step 1: Scan Archive Folders
- Recursively scans all firm folders in the root path
- Looks for folders matching pattern `CLAIMS M-YYYY`
- Identifies files ending with ` EST.pdf`

### Step 2: Extract Data
- **Completed Date**: Extracted from file's modified timestamp
- **Completed Month**: Derived as `YYYY-MM` from timestamp
- **Firm**: Extracted from parent folder name
- **Claim Key**: Filename with ` EST.pdf` suffix removed

### Step 3: Aggregate Data

**By Firm and Month:**
```json
{
  "firm": "Firm A",
  "month": "2024-01",
  "completed_claims": 42
}
```

**Overall Monthly Performance:**
```json
{
  "month": "2024-01",
  "completed_claims": 85,
  "firms_active": 3,
  "avg_velocity": 4.25,
  "burnout_ratio": 0.425
}
```

### Step 4: Insert into Database
- **Duplicate Check**: Skips months that already exist
- **monthly_performance_log**: Overall monthly metrics
- **monthly_firm_activity**: Firm-specific activity per month

## Calculated Fields

| Field | Calculation |
|-------|-------------|
| `completed_claims` | Count of unique EST.pdf files |
| `avg_velocity` | `completed_claims / business_days_in_month` |
| `burnout_ratio` | `completed_claims / MAX_SAFE_CAPACITY (200)` |
| `firms_active` | Count of unique firms with completions |
| `backlog` | Set to 0 (unknown from archives) |
| `revenue_generated` | Set to 0 (unknown from archives) |

## Output Example

```
=== EST Archive Historical Importer ===
Root path: C:\Archive\EstFiles

Scanning firm: Firm A
  Scanning: CLAIMS M-2023
  Scanning: CLAIMS M-2024

Scanning firm: Firm B
  Scanning: CLAIMS M-2024

Found 127 EST files

Step 2: Aggregating by firm and month...
Aggregated into 8 firm-month entries

Sample firm-month data:
  2023-11 - Firm A: 35 claims
  2023-12 - Firm A: 42 claims
  2024-01 - Firm A: 38 claims

Step 3: Aggregating overall monthly performance...
Aggregated into 4 monthly entries

Monthly performance summary:
  2023-11: 45 claims, 2 firms
  2023-12: 58 claims, 3 firms
  2024-01: 52 claims, 2 firms
  2024-02: 47 claims, 3 firms

=== Inserting Monthly Performance Logs ===
✅ 2023-11: 45 claims, 2 firms, velocity 2.1
✅ 2023-12: 58 claims, 3 firms, velocity 2.6
⏭️  2024-01: Already exists (52 claims)
✅ 2024-02: 47 claims, 3 firms, velocity 2.4

Summary: 3 inserted, 1 skipped

=== Inserting Firm Activity Logs ===
✅ 2023-11 - Firm A: 35 claims
✅ 2023-11 - Firm B: 10 claims
...
Summary: 7 inserted, 1 skipped

=== Import Complete ===
```

## Important Notes

1. **File Timestamps**: The script uses the file's modified timestamp to determine the completion month. Ensure timestamps are accurate before running.

2. **Duplicate Prevention**: The script checks if a month or firm-month combination already exists before inserting. It will skip duplicates.

3. **Firm Name Extraction**: Firm names are extracted from folder names. Ensure folder names match your firm naming convention.

4. **Unknown Fields**:
   - `backlog` is set to 0 (not determinable from archives)
   - `revenue_generated` is set to 0 (not available in EST files)

5. **Business Days**: The script calculates business days (excluding weekends) for velocity calculations.

## Troubleshooting

### "VITE_SUPABASE_URL must be set"
- Check your `.env` file exists and contains valid Supabase credentials
- Ensure you're running the script from the project root

### "Root path does not exist"
- Verify the path you provided is correct
- Use quotes around paths with spaces
- Use forward slashes or escaped backslashes on Windows

### "No EST files found"
- Verify your folder structure matches the expected pattern
- Check that folders are named exactly `CLAIMS M-YYYY`
- Ensure files end with ` EST.pdf` (note the space)

### Database Errors
- Ensure the SQL migration has been run
- Check Supabase credentials are correct
- Verify you have write permissions to the tables

## After Import

1. Visit `/admin/intelligence` to see the historical charts populated
2. Check `/api/monthly-history?pretty=true` to verify data
3. The monthly performance gauge will now show historical context

## Clean Up

After a successful import, you can:
- Archive the import script
- Keep it for future imports of additional historical data
- Run it again to import new archive folders (it will skip duplicates)
