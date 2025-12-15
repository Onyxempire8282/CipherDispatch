# Supabase Storage Setup for Photos

## Issue: Photos not displaying

If photos are uploaded but not showing in the app, you need to make the `claim-photos` storage bucket **public**.

## Steps to Fix:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `qrouuoycvxxxutkxkxpp`

2. **Open Storage Settings**
   - Click on **Storage** in the left sidebar
   - Find the `claim-photos` bucket
   - Click on the **Settings** (gear icon) for `claim-photos`

3. **Make Bucket Public**
   - Toggle **Public bucket** to ON
   - Click **Save**

4. **Verify RLS Policies (if needed)**
   - Go to **Storage** > **Policies**
   - Ensure there's a SELECT policy that allows public access:

   ```sql
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'claim-photos');
   ```

5. **Test the Fix**
   - Go to a claim that has photos uploaded
   - Photos should now display properly
   - You can also test by uploading a new photo

## Alternative: Check Existing Photos

If you want to see if photos exist in storage:

1. Go to **Storage** > `claim-photos` bucket
2. Navigate to `claim/{claim_id}/` folders
3. You should see `.jpg` files if photos were uploaded

## Photo Storage Structure

Photos are stored at:
```
claim-photos/
  claim/{claim_id}/
    {uuid}.jpg
    {uuid}.jpg
    ...
```

Each photo is:
- Automatically compressed to max 1600px width/height
- Limited to 1.5MB file size
- Stored as JPEG format

## Related Tables

- **claims** - Main claim data
- **claim_photos** - Photo metadata with `storage_path` references
- **Storage bucket: claim-photos** - Actual photo files

If you continue to have issues, check the browser console (F12) for error messages when viewing a claim detail page.
