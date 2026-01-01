# How to Import Historical EST Data - Step by Step

## Prerequisites Checklist

- [ ] You have archive folders with EST.pdf files
- [ ] The folders follow this structure: `Firm Name/CLAIMS M-YYYY/filename EST.pdf`
- [ ] You ran the SQL migration file in Supabase (create-monthly-performance-log.sql)

---

## Step 1: Open Terminal in Project Folder

### On Windows:
1. Open File Explorer
2. Navigate to: `C:\Users\vlong\Projects\auto-appraisal`
3. Click in the address bar at the top
4. Type `cmd` and press Enter
5. A command prompt window will open in this folder

### Alternative (VS Code):
1. Open the project in VS Code
2. Press `` Ctrl + ` `` (backtick) to open terminal
3. Make sure you're in the project root folder

---

## Step 2: Verify Environment Variables

1. Make sure your `.env` file exists in the project root
2. It should contain these lines:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

**To check:**
```bash
type .env
```

If you see the Supabase URL and key, you're good to go.

---

## Step 3: Locate Your Archive Folder

Find the root folder that contains your firm folders. It should look like this:

```
📁 Your Archive Root Folder
  ├── 📁 Firm A
  │   ├── 📁 CLAIMS M-2023
  │   │   ├── ABC123 EST.pdf
  │   │   └── DEF456 EST.pdf
  │   └── 📁 CLAIMS M-2024
  │       └── GHI789 EST.pdf
  ├── 📁 Firm B
  │   └── 📁 CLAIMS M-2024
  │       └── JKL012 EST.pdf
  └── 📁 Firm C
      └── 📁 CLAIMS M-2024
          └── MNO345 EST.pdf
```

**Write down the full path to this root folder.**

Example:
- `C:\Archive\EstFiles`
- `D:\Documents\CipherDispatch Archives\EST`

---

## Step 4: Run the Import Script

In the terminal (from Step 1), type:

```bash
node import-est-history.js "YOUR-ARCHIVE-PATH-HERE"
```

### Real Examples:

**Example 1:**
```bash
node import-est-history.js "C:\Archive\EstFiles"
```

**Example 2:**
```bash
node import-est-history.js "D:\Documents\CipherDispatch Archives\EST"
```

**Important:**
- Use quotes around the path if it contains spaces
- Use the FULL path to your archive root folder
- Press Enter to run

---

## Step 5: Watch the Output

You'll see output like this:

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

Step 3: Aggregating overall monthly performance...
Aggregated into 4 monthly entries

Monthly performance summary:
  2023-11: 45 claims, 2 firms
  2023-12: 58 claims, 3 firms
  2024-01: 52 claims, 2 firms

=== Inserting Monthly Performance Logs ===
✅ 2023-11: 45 claims, 2 firms, velocity 2.1
✅ 2023-12: 58 claims, 3 firms, velocity 2.6
✅ 2024-01: 52 claims, 2 firms, velocity 2.4

Summary: 3 inserted, 0 skipped

=== Inserting Firm Activity Logs ===
✅ 2023-11 - Firm A: 35 claims
✅ 2023-11 - Firm B: 10 claims
...

Summary: 8 inserted, 0 skipped

=== Import Complete ===
```

---

## Step 6: Verify the Import

### Option A: Check the API
1. Open your browser
2. Go to: `https://onyxempire8282.github.io/CipherDispatch/api/monthly-history?pretty=true`
3. You should see your historical data

### Option B: Check the Dashboard
1. Go to: `https://onyxempire8282.github.io/CipherDispatch/admin/intelligence`
2. Scroll down to see the historical charts:
   - Monthly Completed Claims
   - Monthly Velocity Trend
   - Burnout Ratio by Month
   - Firm Activity Heatmap
3. They should now show your imported data

---

## Troubleshooting

### Error: "Cannot find module @supabase/supabase-js"
**Solution:**
```bash
npm install
```
Then try running the import again.

---

### Error: "VITE_SUPABASE_URL must be set"
**Solution:**
1. Check that `.env` file exists
2. Make sure it has both lines:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. No extra spaces or quotes

---

### Error: "Root path does not exist"
**Solution:**
1. Double-check your folder path
2. Make sure the path is in quotes
3. Verify the folder exists

**To test the path, try:**
```bash
dir "C:\Your\Archive\Path"
```
You should see your firm folders listed.

---

### "No EST files found"
**Check these:**
1. ✅ Folder names are exactly `CLAIMS M-2023`, `CLAIMS M-2024`, etc.
2. ✅ Files end with ` EST.pdf` (note the space before EST)
3. ✅ You're pointing to the ROOT folder (contains firm folders), not a firm folder

**Correct structure:**
```
C:\Archive\EstFiles\          <-- Point to this folder
  └── Firm A\
      └── CLAIMS M-2024\
          └── ABC123 EST.pdf
```

---

### Already Imported Data
If you run the script twice, it will show:
```
⏭️  2024-01: Already exists (52 claims)
```
This is normal - it skips duplicates automatically.

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│  QUICK IMPORT STEPS                                     │
├─────────────────────────────────────────────────────────┤
│  1. Open terminal in: C:\Users\vlong\Projects\auto-    │
│     appraisal                                           │
│                                                         │
│  2. Run:                                                │
│     node import-est-history.js "YOUR-PATH"              │
│                                                         │
│  3. Wait for "=== Import Complete ==="                  │
│                                                         │
│  4. Check: /admin/intelligence                          │
└─────────────────────────────────────────────────────────┘
```

---

## Need Help?

1. Make sure you're in: `C:\Users\vlong\Projects\auto-appraisal`
2. Check `.env` file exists and has Supabase credentials
3. Verify your archive folder structure matches the expected format
4. Read the error message carefully - it will tell you what's wrong

If you see `=== Import Complete ===`, you're done! 🎉
