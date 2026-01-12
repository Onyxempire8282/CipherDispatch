# Photo Cleanup System - Deployment Guide

## Quick Start

This guide walks you through deploying an automated photo cleanup system that deletes photos older than 14 days.

## Prerequisites

1. Supabase CLI installed
2. Access to your Supabase project
3. Service role key from Supabase dashboard

## Step-by-Step Deployment

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser for authentication.

### Step 3: Link Your Project

Find your project reference ID:
1. Go to Supabase Dashboard
2. Settings → General → Project URL
3. Extract the project ref (e.g., if URL is `https://abcdefgh.supabase.co`, ref is `abcdefgh`)

Link the project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 4: Deploy the Edge Function

```bash
supabase functions deploy cleanup-old-photos
```

Expected output:
```
Deploying function cleanup-old-photos...
Function cleanup-old-photos deployed successfully!
Function URL: https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-photos
```

### Step 5: Set Environment Variables

#### Get Your Service Role Key
1. Supabase Dashboard → Settings → API
2. Copy the **service_role** key (not the anon key!)

#### Set Variables in Supabase Dashboard
1. Supabase Dashboard → Edge Functions → cleanup-old-photos
2. Click "Settings" tab
3. Add these secrets:

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key
CRON_SECRET=your_generated_secret_here
```

**Generate CRON_SECRET:**
```bash
# On Linux/Mac:
openssl rand -hex 32

# On Windows (PowerShell):
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

### Step 6: Test the Function Manually

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-photos' \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "message": "No photos to delete",
  "cutoffDate": "2025-12-28T...",
  "processed": 0
}
```

### Step 7: Schedule the Function

#### Option A: Supabase Cron (Easiest)

Create `supabase/functions/_cron/cron.yaml`:

```yaml
- name: "cleanup-old-photos"
  schedule: "0 2 * * *"  # Daily at 2 AM UTC
  function: "cleanup-old-photos"
  headers:
    authorization: "Bearer YOUR_CRON_SECRET"
```

Deploy:
```bash
supabase functions deploy _cron
```

#### Option B: GitHub Actions

Create `.github/workflows/cleanup-photos.yml`:

```yaml
name: Daily Photo Cleanup

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger photo cleanup
        run: |
          curl -X POST '${{ secrets.SUPABASE_FUNCTION_URL }}' \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Add GitHub Secrets:
1. Repository → Settings → Secrets → Actions → New repository secret
2. Add `SUPABASE_FUNCTION_URL`: `https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-photos`
3. Add `CRON_SECRET`: your generated secret

#### Option C: External Cron Service (Cron-job.org)

1. Go to https://cron-job.org (free)
2. Create account and add new cron job
3. Configure:
   - **Title**: Photo Cleanup
   - **URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-photos`
   - **Method**: POST
   - **Headers**:
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     Content-Type: application/json
     ```
   - **Schedule**: Daily at 2:00 AM

## Verification

### Check Function Logs

Via CLI:
```bash
supabase functions logs cleanup-old-photos --tail
```

Via Dashboard:
1. Edge Functions → cleanup-old-photos → Logs tab

### Monitor Deletions

Create a test query to check old photos:
```sql
SELECT
  COUNT(*) as old_photos,
  MIN(created_at) as oldest_photo
FROM claim_photos
WHERE created_at < NOW() - INTERVAL '14 days';
```

## Troubleshooting

### "Missing Supabase credentials"
**Solution**: Add environment variables in Edge Function settings (see Step 5)

### "Unauthorized" response
**Solution**: Check that CRON_SECRET matches in function env and cron request

### Function deploys but doesn't delete
**Solution**:
1. Verify service role key is correct (not anon key)
2. Check storage bucket permissions
3. Review function logs for errors

### Cron not triggering
**Solution**:
1. Verify cron syntax: https://crontab.guru
2. Check timezone (UTC vs local)
3. Test function manually first

## Security Checklist

- [ ] Service role key stored only in Supabase environment variables
- [ ] Service role key NOT in git repository
- [ ] CRON_SECRET generated and stored securely
- [ ] Function requires POST method
- [ ] Function validates authorization header
- [ ] Storage policies allow service role to delete
- [ ] Function logs are monitored

## Rollback

If you need to disable or remove the function:

### Disable Cron
Delete or comment out the cron configuration

### Remove Function
```bash
supabase functions delete cleanup-old-photos
```

### Restore from Backup
If you need to restore accidentally deleted photos:
1. Check if you have storage backups enabled
2. Use Supabase Dashboard → Storage → claim-photos → Restore

## Monitoring Recommendations

1. **Set up alerts**: Monitor function failures in Supabase Dashboard
2. **Weekly review**: Check logs weekly for errors
3. **Storage metrics**: Monitor storage usage trends
4. **Cost tracking**: Review Edge Function invocations monthly

## Adjusting Retention Period

To change from 14 days to a different period:

1. Edit `supabase/functions/cleanup-old-photos/index.ts`
2. Change: `const RETENTION_DAYS = 14;` to desired value
3. Redeploy: `supabase functions deploy cleanup-old-photos`

## Cost Estimate

- **Edge Function invocations**: 30/month (daily) - **FREE** (within 500K free tier)
- **Database queries**: Minimal - **FREE**
- **Storage deletions**: ~450 photos/month (15/day avg) - **FREE**

**Total estimated cost**: $0/month (within free tier limits)

## Support

- Supabase Docs: https://supabase.com/docs/guides/functions
- Edge Functions API: https://supabase.com/docs/reference/javascript/functions-invoke
- Community: https://github.com/supabase/supabase/discussions

## Next Steps

After deployment:
1. ✅ Test manually (Step 6)
2. ✅ Set up scheduling (Step 7)
3. ✅ Monitor logs for first week
4. ✅ Verify photos are being deleted
5. ✅ Set up monitoring alerts
