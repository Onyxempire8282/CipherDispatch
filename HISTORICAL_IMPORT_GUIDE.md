# Historical Data Import Guide

## ⚠️ IMPORTANT: Two Different Import Scripts

There are **TWO** import scripts with different purposes:

### ✅ CORRECT: `import-est-history.js`
**Use this for Intelligence dashboard analytics**

- **What it does:** Imports historical data into `monthly_performance_log` and `monthly_firm_activity` tables
- **Purpose:** Provides historical context for Intelligence dashboard charts and analytics
- **Result:** Data appears ONLY in Business Intelligence charts, NOT in All Claims dashboard
- **Tables affected:**
  - `monthly_performance_log` - Overall monthly performance metrics
  - `monthly_firm_activity` - Per-firm monthly activity

**Usage:**
```bash
node import-est-history.js "C:\Path\To\Archive\Folder"
```

---

### ❌ WRONG: `import-est-history-as-claims.js`
**DO NOT USE for analytics - Creates actual claim records**

- **What it does:** Creates COMPLETED claim records in the main `claims` table
- **Purpose:** Was designed for creating actual claims from historical data (NOT for analytics)
- **Result:** Historical data appears in ALL CLAIMS dashboard as real assignments
- **Problem:** Pollutes active claims list with historical data
- **Tables affected:**
  - `claims` - Main claims table (creates actual claim records)

**When to use:** ONLY if you need to create actual claim records from historical files (rare)

---

## How to Fix Accidental Import

If you ran `import-est-history-as-claims.js` by mistake:

1. **Run the cleanup script:**
   ```sql
   -- File: delete-historical-claims.sql
   -- First preview what will be deleted
   -- Then uncomment the DELETE statement
   ```

2. **Re-import using correct script:**
   ```bash
   node import-est-history.js "C:\Path\To\Archive\Folder"
   ```

3. **Verify:**
   - All Claims dashboard shows only active claims
   - Intelligence dashboard still shows historical data in charts

---

## File Structure Expected

Both scripts expect the same folder structure:

```
Archive Root/
├── Firm A/
│   ├── CLAIMS 1-2024/
│   │   ├── 12345 EST.pdf
│   │   └── 67890 EST.pdf
│   ├── CLAIMS 2-2024/
│   └── CLAIMS 12-2024/
├── Firm B/
│   ├── CLAIMS 1-2024/
│   └── CLAIMS 3-2024/
```

Or flat structure:
```
Archive Root (Firm Name)/
├── CLAIMS 1-2024/
├── CLAIMS 2-2024/
└── CLAIMS 12-2024/
```

---

## Which Script Should I Use?

| Goal | Use This Script |
|------|-----------------|
| Show historical trends in Intelligence dashboard | ✅ `import-est-history.js` |
| Populate charts with past performance data | ✅ `import-est-history.js` |
| Analyze seasonality from historical data | ✅ `import-est-history.js` |
| Create actual claims from archived files | ❌ `import-est-history-as-claims.js` (rarely needed) |

---

## How Intelligence Charts Work

Intelligence dashboard charts pull data from:

1. **Live data:** Current claims from `claims` table
2. **Historical data:** Past performance from `monthly_performance_log` and `monthly_firm_activity` tables

Using `import-est-history.js` populates the historical tables without affecting the active claims list.

---

## Summary

- ✅ **For analytics:** Use `import-est-history.js`
- ❌ **NOT for analytics:** Don't use `import-est-history-as-claims.js`
- 🧹 **If you made a mistake:** Run `delete-historical-claims.sql` to clean up
