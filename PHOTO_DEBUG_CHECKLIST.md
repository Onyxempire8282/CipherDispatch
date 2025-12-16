# Supabase Photo Debug Checklist

## Step 1: Check What the 3 Policies Are

1. **Go to Supabase Dashboard**
   - Storage > claim-photos bucket
   - Click **"Policies"** tab

2. **Check if you have these policies:**
   - ✅ **SELECT policy** for `public` or `authenticated` role
   - ✅ **INSERT policy** for `authenticated` role
   - ✅ **DELETE policy** for `authenticated` role

3. **CRITICAL: Check the SELECT policy**
   - Does it say `TO public` or `TO authenticated`?
   - If it says `TO authenticated`, that's the problem!
   - Photos won't display on GitHub Pages (public access)

## Step 2: Verify Photos Actually Exist

1. **Go to Storage > claim-photos bucket**
2. **Browse the files:**
   - Should see folders like: `claim/{claim-id}/`
   - Inside should be `.jpg` files
3. **If NO folders exist:**
   - Photos were never uploaded
   - Try uploading a new photo from ClaimDetail page

## Step 3: Test Photo URL Directly

1. **Find a photo in storage browser**
2. **Click on the photo file**
3. **Copy the public URL** (should look like):
   ```
   https://qrouuoycvxxxutkxkxpp.supabase.co/storage/v1/object/public/claim-photos/claim/{id}/{uuid}.jpg
   ```
4. **Paste URL in new browser tab**
   - ✅ **Photo loads** = Policies are correct, code issue
   - ❌ **Error/403** = Policy issue, need to fix SELECT policy

## Step 4: Check Browser Console

1. **Open a claim detail page that should have photos**
2. **Press F12** (open Developer Tools)
3. **Go to Console tab**
4. **Look for errors like:**
   - `403 Forbidden` = Policy issue
   - `404 Not Found` = Photo doesn't exist or wrong path
   - `CORS error` = Supabase CORS settings (rare)

## Step 5: Check the claim_photos Table

1. **Go to Supabase > Table Editor > claim_photos**
2. **Verify records exist:**
   - Should have rows with `claim_id` and `storage_path`
   - Example `storage_path`: `claim/abc123/def456.jpg`
3. **If table is empty:**
   - Photos were never recorded in database
   - Upload may have failed silently

## Quick Fix: Run This SQL

If the SELECT policy is wrong, run this in **SQL Editor**:

```sql
-- Drop any existing SELECT policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users read" ON storage.objects;

-- Create PUBLIC read access (allows anyone to view photos)
CREATE POLICY "Public read access for claim photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'claim-photos');
```

## Expected Behavior After Fix:

1. **Photo count shows**: "📸 Photos (3)"
2. **Photo thumbnails appear** in grid layout
3. **Clicking photo** opens lightbox with full-size image
4. **Download button works**
5. **No errors in console**

## What to Report Back:

Tell me:
1. **What are the 3 policy names?** (from Storage > Policies tab)
2. **Can you see folders in the storage browser?** (Yes/No)
3. **What happens when you click a .jpg file in storage?** (Loads, Error 403, etc.)
4. **Any errors in browser console (F12)?** (Copy/paste the error)
