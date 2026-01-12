# Photo Cleanup Edge Function

## Overview

This Supabase Edge Function automatically deletes photos from the `claim-photos` storage bucket and `claim_photos` database table that are older than 14 days.

## How It Works

1. **Queries Database**: Finds all photos with `created_at` older than 14 days
2. **Deletes from Storage**: Removes the file from the `claim-photos` bucket
3. **Deletes from Database**: Removes the record from `claim_photos` table
4. **Handles Errors Gracefully**:
   - Skips files that don't exist (idempotent)
   - Logs failures without crashing
   - Returns detailed results

## Security Features

- Requires `POST` method (prevents accidental GET requests)
- Uses service role key for elevated permissions
- Optional `CRON_SECRET` authentication
- Never exposes sensitive data in responses

## Deployment

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Deploy the Function

```bash
supabase functions deploy cleanup-old-photos
```

### 4. Set Environment Variables

In Supabase Dashboard → Edge Functions → cleanup-old-photos → Settings:

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_random_secret_string_here (optional but recommended)
```

**IMPORTANT**: The `SUPABASE_SERVICE_ROLE_KEY` should be your **service role key**, not the anon key. This gives the function permission to delete files.

## Scheduling Options

### Option 1: Supabase Cron (Recommended)

Supabase supports native cron jobs. Add to your `supabase/functions/_cron/cron.yaml`:

```yaml
# supabase/functions/_cron/cron.yaml
- name: "cleanup-old-photos"
  schedule: "0 2 * * *"  # Runs at 2 AM daily
  function: "cleanup-old-photos"
  headers:
    authorization: "Bearer YOUR_CRON_SECRET"
```

Then deploy:

```bash
supabase functions deploy _cron
```

### Option 2: GitHub Actions (Alternative)

Create `.github/workflows/cleanup-photos.yml`:

```yaml
name: Cleanup Old Photos

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup function
        run: |
          curl -X POST \
            'https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-photos' \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Add `CRON_SECRET` to your GitHub repository secrets.

### Option 3: External Cron Service

Use services like:
- **Cron-job.org** (free)
- **EasyCron**
- **AWS EventBridge**

Configure them to POST to:
```
https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-photos
```

With header:
```
Authorization: Bearer YOUR_CRON_SECRET
```

### Option 4: Supabase Database Cron (pg_cron)

If you have database cron access, create a SQL function:

```sql
-- First, create a function to call the Edge Function
CREATE OR REPLACE FUNCTION trigger_photo_cleanup()
RETURNS void AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-photos',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_CRON_SECRET'
      ),
      body := '{}'::jsonb
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule it to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-photos-daily',
  '0 2 * * *',
  'SELECT trigger_photo_cleanup();'
);
```

## Testing

### Manual Test

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-photos' \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Test with Old Data

To test without waiting 14 days, temporarily modify the retention period in the function:

```typescript
const RETENTION_DAYS = 1; // Test with 1 day instead of 14
```

Redeploy and test, then change back to 14 days.

### View Logs

```bash
supabase functions logs cleanup-old-photos
```

Or in Supabase Dashboard → Edge Functions → cleanup-old-photos → Logs

## Monitoring

The function returns detailed results:

```json
{
  "message": "Cleanup completed",
  "cutoffDate": "2025-12-28T02:00:00.000Z",
  "totalProcessed": 45,
  "successfullyDeleted": 43,
  "failedDeletions": 2,
  "errors": [
    {
      "photo_id": 123,
      "error": "Storage error: Permission denied"
    }
  ],
  "timestamp": "2026-01-11T02:00:00.000Z"
}
```

Set up monitoring by:
1. Checking Edge Function logs regularly
2. Setting up Supabase alerts for function failures
3. Logging results to a monitoring table (optional enhancement)

## Security Considerations

### 1. Service Role Key Protection
- **NEVER** commit the service role key to Git
- Store it only in Supabase Edge Function environment variables
- Rotate it if compromised

### 2. CRON_SECRET
- Generate a strong random secret: `openssl rand -hex 32`
- Store securely in your cron scheduler
- This prevents unauthorized deletion requests

### 3. RLS Policies
The function bypasses RLS by using the service role key, which is necessary for automated cleanup. Ensure:
- The function code is audited and secure
- Only authorized services can trigger it (via CRON_SECRET)

### 4. Rate Limiting
Consider adding rate limiting if exposed to the public internet:
- Use Supabase Edge Function middleware
- Or place behind a gateway with rate limiting

### 5. Audit Trail (Optional Enhancement)
Log deletions to a separate audit table:

```sql
CREATE TABLE photo_deletion_audit (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER,
  claim_id TEXT,
  storage_path TEXT,
  deleted_at TIMESTAMP DEFAULT NOW(),
  deleted_by TEXT DEFAULT 'cleanup-cron'
);
```

## Troubleshooting

### "Missing Supabase credentials"
- Verify environment variables are set in Edge Function settings
- Check variable names match exactly

### "Permission denied" errors
- Ensure you're using the **service role key**, not anon key
- Check storage bucket policies allow deletion by service role

### Function not running on schedule
- Verify cron syntax is correct
- Check Edge Function logs for errors
- Ensure cron service is properly configured

### Photos not being deleted
- Check the `created_at` field exists and is populated
- Verify photos are actually older than 14 days
- Review function logs for specific errors

## Maintenance

### Adjusting Retention Period

Change `RETENTION_DAYS` in the function code:

```typescript
const RETENTION_DAYS = 30; // Change to 30 days
```

Redeploy the function.

### Disabling Cleanup

To temporarily disable:
1. **Option A**: Disable the cron job
2. **Option B**: Add an environment variable check:

```typescript
const CLEANUP_ENABLED = Deno.env.get("CLEANUP_ENABLED") === "true";

if (!CLEANUP_ENABLED) {
  return new Response(JSON.stringify({ message: "Cleanup disabled" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
```

## Cost Considerations

- **Edge Function**: Free tier includes 500K requests/month
- **Storage Operations**: Minimal cost (deletions are fast)
- **Database Queries**: Indexed queries are efficient
- **Daily execution**: ~30 invocations/month (well within free tier)

## Support

For issues or questions:
1. Check Supabase Edge Function logs
2. Review this README
3. Consult Supabase documentation: https://supabase.com/docs/guides/functions
