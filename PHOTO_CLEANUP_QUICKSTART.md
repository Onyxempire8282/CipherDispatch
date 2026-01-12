# Photo Cleanup - Quick Start Guide

## 5-Minute Setup

### 1. Deploy the Function
```bash
# Install Supabase CLI (if needed)
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy
supabase functions deploy cleanup-old-photos
```

### 2. Set Environment Variables

In Supabase Dashboard → Edge Functions → cleanup-old-photos → Settings:

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your service role key from API settings>
CRON_SECRET=<generate with: openssl rand -hex 32>
```

### 3. Test It

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-photos' \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### 4. Schedule It

**Option A: Supabase Cron** (Easiest)

Create `supabase/functions/_cron/cron.yaml`:
```yaml
- name: "cleanup-old-photos"
  schedule: "0 2 * * *"
  function: "cleanup-old-photos"
  headers:
    authorization: "Bearer YOUR_CRON_SECRET"
```

Deploy: `supabase functions deploy _cron`

**Option B: GitHub Actions**

Create `.github/workflows/cleanup-photos.yml`:
```yaml
name: Daily Photo Cleanup
on:
  schedule:
    - cron: '0 2 * * *'
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST '${{ secrets.FUNCTION_URL }}' \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Option C: Cron-job.org**

1. Go to https://cron-job.org
2. Create job with:
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-photos`
   - Method: POST
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`
   - Schedule: Daily at 2 AM

### 5. Monitor

```bash
# View logs
supabase functions logs cleanup-old-photos --tail

# Check for old photos
psql "postgresql://..." -c \
  "SELECT COUNT(*) FROM claim_photos WHERE created_at < NOW() - INTERVAL '14 days';"
```

## Done! 🎉

Photos older than 14 days will be automatically deleted daily.

---

## Configuration

### Change Retention Period

Edit `supabase/functions/cleanup-old-photos/index.ts`:
```typescript
const RETENTION_DAYS = 30; // Change from 14 to 30 days
```

Redeploy: `supabase functions deploy cleanup-old-photos`

### Disable Temporarily

Remove or comment out the cron configuration.

### View Deletion History

```sql
-- See today's deletions (if audit table enabled)
SELECT * FROM photo_deletion_audit
WHERE deleted_at::date = CURRENT_DATE;

-- Count deletions by day
SELECT DATE(deleted_at), COUNT(*)
FROM photo_deletion_audit
GROUP BY DATE(deleted_at)
ORDER BY DATE(deleted_at) DESC;
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing credentials" | Add env vars in Edge Function settings |
| "Unauthorized" | Check CRON_SECRET matches |
| Not deleting | Verify service role key (not anon key) |
| Cron not running | Check cron syntax and timezone |

## Files Reference

- `supabase/functions/cleanup-old-photos/index.ts` - Main function
- `supabase/functions/cleanup-old-photos/README.md` - Detailed docs
- `PHOTO_CLEANUP_DEPLOYMENT.md` - Full deployment guide
- `PHOTO_CLEANUP_OVERVIEW.md` - Technical deep dive
- `photo-cleanup-audit-table.sql` - Optional audit table

## Support

- Edge Function logs: Supabase Dashboard → Edge Functions → Logs
- Docs: https://supabase.com/docs/guides/functions
- Test locally: `supabase functions serve cleanup-old-photos`
