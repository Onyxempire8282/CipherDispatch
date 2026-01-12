# Automatic Photo Cleanup System - Technical Overview

## The Problem

Your claims app stores photos in Supabase Storage that don't need to be retained longer than 14 days due to:
- Privacy requirements
- Storage cost optimization
- Regulatory compliance
- Data minimization principles

Manual deletion is error-prone and time-consuming. You need an automated, reliable solution.

## The Solution

A production-grade Supabase Edge Function that:
1. **Runs daily** via cron scheduling
2. **Identifies old photos** using database queries
3. **Deletes from storage** using service role permissions
4. **Removes database records** after successful file deletion
5. **Handles errors gracefully** without crashing
6. **Logs everything** for monitoring and debugging

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CRON TRIGGER                          │
│  (GitHub Actions / Supabase Cron / External Service)       │
└────────────────────────┬────────────────────────────────────┘
                         │ Daily at 2 AM
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Function                         │
│              cleanup-old-photos                             │
│                                                             │
│  1. Authenticate with CRON_SECRET                          │
│  2. Initialize Supabase client (service role)              │
│  3. Query for old photos (created_at < 14 days ago)        │
│  4. For each photo:                                        │
│     a. Delete from Storage bucket                          │
│     b. If successful, delete from database                 │
│     c. Handle errors (skip if file missing)                │
│  5. Return detailed results                                │
└────────┬────────────────────────┬───────────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────────┐
│ Storage Bucket  │    │  Database Table      │
│  claim-photos   │    │  claim_photos        │
│                 │    │                      │
│  Files deleted  │    │  Records deleted     │
└─────────────────┘    └──────────────────────┘
         │                        │
         └────────┬───────────────┘
                  ▼
         ┌────────────────┐
         │   Logs & Audit  │
         │  (Optional)     │
         └────────────────┘
```

## Key Technical Decisions

### 1. Edge Function (Not Database Trigger)

**Why Edge Function?**
- ✅ Full control over error handling
- ✅ Detailed logging and monitoring
- ✅ Can be tested independently
- ✅ Easy to modify retention period
- ✅ Can return detailed results for monitoring

**Why NOT Database Trigger?**
- ❌ Limited error handling in PL/pgSQL
- ❌ Harder to debug
- ❌ Can't easily interact with Storage API
- ❌ Triggers run per-row (inefficient for bulk operations)

### 2. Service Role Key (Not Anon Key)

The function uses the **service role key** because:
- Bypasses Row Level Security (RLS) policies
- Has permission to delete from storage
- Can access all records regardless of auth state
- Required for automated background jobs

**Security measures:**
- Service role key stored only in Edge Function environment
- Function validates CRON_SECRET before executing
- POST-only requests (no GET)
- Comprehensive logging of all operations

### 3. Storage First, Then Database

**Deletion order matters:**

```typescript
// ✅ CORRECT ORDER
1. Delete from storage
2. If successful → Delete from database

// ❌ WRONG ORDER
1. Delete from database
2. Delete from storage
```

**Why?**
- If storage deletion fails, we keep the DB record to retry later
- If DB deletion fails after storage success, we still remove the DB record on next run (idempotent)
- Prevents orphaned files in storage (files without DB records are harder to track)

### 4. Idempotent Design

The function is **idempotent** - you can run it multiple times safely:

- **File already deleted?** → Skip gracefully, remove DB record
- **DB record already gone?** → Query won't find it, no error
- **Run twice in a row?** → Second run finds nothing, returns 0 deletions

This prevents:
- Data corruption
- Duplicate deletion attempts
- Errors from race conditions

### 5. Error Handling Strategy

```typescript
try {
  // Delete from storage
  if (storageError) {
    if (isNotFoundError) {
      // File already gone → OK, proceed to DB deletion
    } else {
      // Real error → Log it, skip this photo, continue with others
      continue;
    }
  }

  // Delete from database
  if (dbError) {
    // Log error, continue with next photo
    continue;
  }

  successCount++;
} catch (error) {
  // Unexpected error → Log it, continue
  errorCount++;
}
```

**Benefits:**
- One failure doesn't crash entire job
- Detailed error reporting per photo
- Job continues even with partial failures

## Scheduling Options Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Supabase Cron** | Native, easy setup, free | Limited to Supabase projects | Most users (recommended) |
| **GitHub Actions** | Version controlled, free for public repos | Requires GitHub | Projects already using GitHub |
| **Cron-job.org** | External, reliable, monitoring UI | Requires external service | Teams wanting external monitoring |
| **Database pg_cron** | Native Postgres, very reliable | Requires database extension | Database-heavy architectures |

## Security Architecture

### 1. Authentication Flow

```
Cron Service → Edge Function
     |              |
     |              ├─ Validate HTTP Method (POST only)
     |              ├─ Verify CRON_SECRET header
     |              └─ Initialize with Service Role Key
     |
     └─ If valid → Execute cleanup
        If invalid → Return 401 Unauthorized
```

### 2. Secrets Management

```
┌───────────────────────────────────────────┐
│           SECRETS STORAGE                  │
├───────────────────────────────────────────┤
│ SUPABASE_SERVICE_ROLE_KEY                 │
│   Stored: Edge Function Environment       │
│   Access: Edge Function only              │
│   Never: In Git, Frontend, Logs           │
├───────────────────────────────────────────┤
│ CRON_SECRET                                │
│   Stored: Cron Service + Edge Function    │
│   Purpose: Authenticate cron requests     │
│   Never: In Git, Public configs           │
└───────────────────────────────────────────┘
```

### 3. Defense in Depth

1. **Network Layer**: HTTPS only
2. **Application Layer**: POST method required, CRON_SECRET validation
3. **Authorization Layer**: Service role key with full access
4. **Audit Layer**: Comprehensive logging of all operations

## Performance Considerations

### Query Optimization

```sql
-- ✅ OPTIMIZED (uses index on created_at)
SELECT * FROM claim_photos
WHERE created_at < NOW() - INTERVAL '14 days'
ORDER BY created_at ASC;

-- Add index if not exists:
CREATE INDEX idx_claim_photos_created_at ON claim_photos(created_at);
```

### Batch Size

Current implementation processes all old photos in one run. For very large datasets:

**Current (good for <1000 photos/day):**
```typescript
// Process all photos found
for (const photo of oldPhotos) {
  await deletePhoto(photo);
}
```

**Scaled version (for >1000 photos/day):**
```typescript
const BATCH_SIZE = 100;
const { data: oldPhotos } = await supabase
  .from("claim_photos")
  .select("*")
  .lt("created_at", cutoffDate)
  .limit(BATCH_SIZE);
```

Run multiple times per day or increase batch size as needed.

## Monitoring & Observability

### 1. Function Returns Detailed Results

```json
{
  "message": "Cleanup completed",
  "cutoffDate": "2025-12-28T02:00:00.000Z",
  "totalProcessed": 150,
  "successfullyDeleted": 148,
  "failedDeletions": 2,
  "errors": [
    {
      "photo_id": 123,
      "error": "Storage error: network timeout"
    },
    {
      "photo_id": 456,
      "error": "Database error: constraint violation"
    }
  ],
  "timestamp": "2026-01-11T02:00:00.000Z"
}
```

### 2. Logging Strategy

- **Console logs**: Captured by Supabase Edge Function logs
- **Structured logging**: Include photo IDs, timestamps, error details
- **Log levels**: Info (normal ops), Error (failures), Debug (detailed flow)

### 3. Monitoring Queries

```sql
-- Check for photos that should have been deleted
SELECT COUNT(*) as overdue_deletions
FROM claim_photos
WHERE created_at < NOW() - INTERVAL '15 days';

-- Check storage vs database consistency
SELECT
  (SELECT COUNT(*) FROM claim_photos) as db_count,
  -- Compare with storage bucket count via API
```

### 4. Alerts to Set Up

1. **Function failure** → Email/Slack alert
2. **Zero deletions for 7 days** → May indicate photos not being uploaded
3. **High failure rate** → Storage or permissions issue
4. **Old photos accumulating** → Function not running

## Cost Analysis

### Free Tier Limits (Supabase)
- Edge Functions: 500,000 invocations/month
- Database: 500 MB storage, unlimited queries
- Storage: 1 GB, bandwidth extra

### Usage Estimates
- **Daily invocations**: 1
- **Monthly invocations**: 30
- **Photos deleted/month**: ~450 (15/day avg)
- **Database queries/day**: 1-2
- **Storage deletions/day**: 15

### Projected Costs
- **Edge Function**: $0 (30 << 500K free)
- **Database**: $0 (minimal data)
- **Storage**: $0 (within free tier)

**Total: $0/month** ✅

Only pay if you exceed:
- 500K Edge Function invocations (16,666 per day)
- 1 GB storage
- 2 GB egress bandwidth

## Compliance & Legal

### Data Retention Policy

This implementation supports compliance with:
- **GDPR**: Right to erasure, data minimization
- **CCPA**: Data deletion requirements
- **HIPAA**: Minimum necessary principle (if storing PHI)
- **SOC 2**: Secure data lifecycle management

### Audit Trail

Optional audit table tracks:
- What was deleted (photo_id, claim_id, path)
- When it was deleted (deleted_at)
- Why it was deleted (retention_policy)
- Who deleted it (cleanup-cron)

Useful for:
- Compliance audits
- Debugging
- Capacity planning
- Legal inquiries

## Testing Strategy

### 1. Unit Testing (Pre-deployment)

```bash
# Test function locally with Supabase CLI
supabase functions serve cleanup-old-photos

# Call locally
curl -X POST 'http://localhost:54321/functions/v1/cleanup-old-photos' \
  -H "Authorization: Bearer test-secret"
```

### 2. Integration Testing (Post-deployment)

```bash
# Test with production data
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-photos' \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 3. Dry-Run Mode (Optional Enhancement)

Add to function:
```typescript
const DRY_RUN = Deno.env.get("DRY_RUN") === "true";

if (DRY_RUN) {
  console.log(`[DRY RUN] Would delete photo ${photo.id}`);
  // Don't actually delete
}
```

## Disaster Recovery

### Accidental Deletion

If the function deletes photos incorrectly:

1. **Immediate response:**
   - Disable the cron job
   - Check Supabase logs for what was deleted
   - Review audit table (if implemented)

2. **Recovery:**
   - Check if Supabase Storage backups are enabled
   - Restore from backup if available
   - Contact users if photos are unrecoverable

3. **Prevention:**
   - Always test with DRY_RUN first
   - Enable Supabase Storage versioning
   - Implement audit table
   - Test with small retention period first (1-2 days)

### Function Failure

If function stops running:

1. **Detection:**
   - Monitor logs for function invocations
   - Set up alerts for zero daily invocations
   - Query for accumulating old photos

2. **Recovery:**
   - Check cron service is running
   - Verify environment variables
   - Review function logs for errors
   - Manually trigger function to catch up

## Extension Ideas

### 1. Soft Delete (Quarantine)

Instead of immediate deletion:
```typescript
// Move to quarantine bucket for 7 days
await supabase.storage
  .from('claim-photos-quarantine')
  .upload(path, file);

// Delete from main bucket
await supabase.storage
  .from('claim-photos')
  .remove([path]);
```

### 2. Selective Retention

Keep certain photos longer:
```sql
-- Only delete non-flagged photos
SELECT * FROM claim_photos
WHERE created_at < NOW() - INTERVAL '14 days'
  AND is_flagged = false;
```

### 3. Compression Before Deletion

Compress old photos instead of deleting:
```typescript
// Compress to lower quality/resolution
// Move to archive bucket
// Delete original
```

### 4. Notification System

Email admins with deletion summary:
```typescript
await sendEmail({
  to: 'admin@company.com',
  subject: 'Daily Photo Cleanup Report',
  body: `Deleted ${count} photos from ${claimCount} claims`
});
```

## Conclusion

This implementation provides:
- ✅ **Automation**: No manual intervention needed
- ✅ **Reliability**: Handles errors gracefully
- ✅ **Security**: Service role with CRON_SECRET protection
- ✅ **Observability**: Comprehensive logging and monitoring
- ✅ **Compliance**: Supports data retention policies
- ✅ **Cost-effective**: $0 within free tier
- ✅ **Production-ready**: Battle-tested patterns

The system is designed to run reliably for years with minimal maintenance. Just monitor the logs occasionally and adjust retention period if requirements change.
