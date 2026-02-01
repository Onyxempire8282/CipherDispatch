# Claims API Setup Guide

## Overview

API endpoint for automated claim creation from Make.com webhooks.

**Endpoint:** `POST https://<project-ref>.supabase.co/functions/v1/create-claim`

**Responsibility:**
- Validate hard-required fields
- Insert claim (lookup-before-insert)
- Return claim_id

**No side effects:** No emails, assignment, routing, or notifications.

---

## Idempotency

**Unique key:** `(firm, claim_number)`

If a request arrives with the same `firm` + `claim_number`:
- No duplicate is created
- **No fields are modified**
- Existing `claim_id` is returned

Enforced by:
- Database unique index on `(firm, claim_number)`
- Lookup-before-insert logic in Edge Function

---

## Validation

### Hard-Required Fields (Blocking)

These fields **must be present** or the request fails with `400`:

| Field | Description |
|-------|-------------|
| `firm` | Vendor/firm name (part of unique key) |
| `claim_number` | Claim identifier (part of unique key) |
| `customer_name` | Customer's full name |
| `address_line1` | Street address |
| `city` | City |
| `state` | State (2-letter code) |
| `zip` | ZIP code |

### Soft-Required Fields (Non-Blocking)

These fields are captured when available but **do not block** claim creation:

| Field | Description |
|-------|-------------|
| `file_number` | Vendor's internal reference number |
| `insurance_company` | Insurance company name |
| `customer_phone` | Customer phone number |
| `location_name` | Name at inspection location |
| `location_phone` | Phone at inspection location |

Missing soft-required fields are stored as `null` and can be completed manually later.

---

## 1. Database Migration

Run this SQL in Supabase SQL Editor (`database/migrations/add_makecom_fields.sql`):

```sql
-- Rename columns to match Make.com field names
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'firm_name') THEN
    ALTER TABLE claims RENAME COLUMN firm_name TO firm;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'firm') THEN
    ALTER TABLE claims ADD COLUMN firm TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'postal_code') THEN
    ALTER TABLE claims RENAME COLUMN postal_code TO zip;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'zip') THEN
    ALTER TABLE claims ADD COLUMN zip TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'phone') THEN
    ALTER TABLE claims RENAME COLUMN phone TO customer_phone;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'customer_phone') THEN
    ALTER TABLE claims ADD COLUMN customer_phone TEXT;
  END IF;
END $$;

-- Add new columns
ALTER TABLE claims ADD COLUMN IF NOT EXISTS file_number TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS location_phone TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'created';

-- Drop old constraints
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claims_claim_number_key') THEN
    ALTER TABLE claims DROP CONSTRAINT claims_claim_number_key;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_claims_firm_claim_unique;

-- Create unique index on (firm, claim_number)
CREATE UNIQUE INDEX idx_claims_firm_claim_unique
  ON claims (COALESCE(firm, ''), claim_number);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_claims_file_number ON claims (file_number) WHERE file_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claims_claim_status ON claims (claim_status) WHERE archived_at IS NULL;
```

---

## 2. Environment Variables

### Add API Key Secret

Go to **Supabase Dashboard > Project Settings > Edge Functions > Secrets**:

| Secret Name | Description |
|------------|-------------|
| `CLAIMS_API_KEY` | API key for Make.com authentication |

Generate a secure key:
```powershell
# PowerShell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```

---

## 3. Deploy Edge Function

```bash
# Link project (once)
supabase link --project-ref qrouuoycvxxxutkxkxpp
```

---

## 4. Make.com Configuration

### HTTP Module Settings

| Setting | Value |
|---------|-------|
| URL | `https://qrouuoycvxxxutkxkxpp.supabase.co/functions/v1/create-claim` |
| Method | `POST` |
| Headers | `Content-Type: application/json`<br>`x-api-key: <your-api-key>` |

### Request Body

```json
{
  "firm": "{{firm}}",
  "claim_number": "{{claim_number}}",
  "customer_name": "{{customer_name}}",
  "address_line1": "{{address_line1}}",
  "city": "{{city}}",
  "state": "{{state}}",
  "zip": "{{zip}}",
  "file_number": "{{file_number}}",
  "insurance_company": "{{insurance_company}}",
  "customer_phone": "{{customer_phone}}",
  "location_name": "{{location_name}}",
  "location_phone": "{{location_phone}}"
}
```

---

## 5. API Reference

### Request

```http
POST /functions/v1/create-claim
Content-Type: application/json
x-api-key: your-api-key-here

{
  "firm": "ACD",
  "claim_number": "1E01E019271691",
  "customer_name": "Timothy Houston",
  "address_line1": "2101 Harlee Street Apt201",
  "city": "Fayetteville",
  "state": "NC",
  "zip": "28303",
  "file_number": "NC2601-2858716",
  "insurance_company": "ESIS",
  "customer_phone": "(910) 916-4973",
  "location_name": "Houston,Timothy",
  "location_phone": "(910) 916-4973"
}
```

### Response: New Claim (201)

```json
{
  "success": true,
  "claim_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Claim created successfully",
  "action": "created"
}
```

### Response: Claim Already Exists (200)

```json
{
  "success": true,
  "claim_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Claim already exists",
  "action": "existing"
}
```

### Response: Missing Required Fields (400)

```json
{
  "success": false,
  "message": "Missing required fields: firm, city, zip"
}
```

### Response: Unauthorized (401)

```json
{
  "success": false,
  "message": "Unauthorized: Invalid or missing API key"
}
```

---

## 6. Field Mapping

All fields match exactly between Make.com, Edge Function, and database:

| Make.com Field | Edge Function Field | Database Column | Required |
|---------------|---------------------|-----------------|----------|
| `firm` | `firm` | `firm` | **Hard** |
| `claim_number` | `claim_number` | `claim_number` | **Hard** |
| `customer_name` | `customer_name` | `customer_name` | **Hard** |
| `address_line1` | `address_line1` | `address_line1` | **Hard** |
| `city` | `city` | `city` | **Hard** |
| `state` | `state` | `state` | **Hard** |
| `zip` | `zip` | `zip` | **Hard** |
| `file_number` | `file_number` | `file_number` | Soft |
| `insurance_company` | `insurance_company` | `insurance_company` | Soft |
| `customer_phone` | `customer_phone` | `customer_phone` | Soft |
| `location_name` | `location_name` | `location_name` | Soft |
| `location_phone` | `location_phone` | `location_phone` | Soft |

**Auto-set on new claims:**
- `claim_status` = "created"
- `status` = "IN_PROGRESS"

---

## 7. HTTP Status Codes

| Status | Meaning | Make.com Action |
|--------|---------|-----------------|
| 201 | New claim created | Success |
| 200 | Claim already exists (no changes made) | Success |
| 400 | Missing hard-required fields | Mark as error |
| 401 | Invalid API key | Mark as error |
| 405 | Wrong HTTP method | Mark as error |
| 500 | Server error | Mark as error |

---

## 8. Behavioral Guarantees

| Guarantee | Description |
|-----------|-------------|
| No duplicates | `(firm, claim_number)` enforced unique at database level |
| Idempotent | Retries return same `claim_id`, no modifications |
| No field updates | Existing claims are never modified |
| No side effects | No emails, routing, assignment, or notifications |
| Soft fields nullable | Missing soft-required fields stored as `null` |

---

## 9. Testing

### PowerShell (Full Request)

```powershell
$body = @{
  firm = "ACD"
  claim_number = "TEST-CLAIM-001"
  customer_name = "Test Customer"
  address_line1 = "123 Test Street"
  city = "Test City"
  state = "NC"
  zip = "12345"
  file_number = "TEST-001"
  insurance_company = "Test Insurance"
  customer_phone = "(555) 123-4567"
  location_name = "Test Location"
  location_phone = "(555) 123-4567"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://qrouuoycvxxxutkxkxpp.supabase.co/functions/v1/create-claim" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json"; "x-api-key" = "YOUR_API_KEY" } `
  -Body $body
```

### PowerShell (Minimal - Hard-Required Only)

```powershell
$body = @{
  firm = "ACD"
  claim_number = "TEST-MINIMAL-001"
  customer_name = "Minimal Test"
  address_line1 = "456 Minimal Ave"
  city = "Minimal City"
  state = "NC"
  zip = "54321"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://qrouuoycvxxxutkxkxpp.supabase.co/functions/v1/create-claim" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json"; "x-api-key" = "YOUR_API_KEY" } `
  -Body $body
```

### cURL

```bash
curl -X POST \
  "https://qrouuoycvxxxutkxkxpp.supabase.co/functions/v1/create-claim" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"firm":"ACD","claim_number":"TEST-001","customer_name":"Test","address_line1":"123 Main St","city":"Raleigh","state":"NC","zip":"27601"}'
```

---

## 10. Troubleshooting

```bash
# View function logs
supabase functions logs create-claim
```

| Issue | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | Bad API key | Check `CLAIMS_API_KEY` secret |
| 400 Missing fields | Hard-required field empty | Ensure all 7 hard-required fields present |
| 500 Server error | DB credentials | Function should have auto-injected credentials |
| Duplicate not detected | Different firm | Same claim_number with different firm creates new record |
