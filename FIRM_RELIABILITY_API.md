# Firm Reliability API Documentation

## Overview

The Firm Reliability API provides comprehensive metrics for tracking payment reliability across different firms. It calculates average payment delays, on-time percentages, and aging buckets for outstanding balances.

## Architecture

### Database Schema

The following fields have been added to the `claims` table:

```sql
expected_payout_date DATE         -- Expected payment date based on firm pay schedule
actual_payout_date DATE           -- Actual date when payment was received
payout_status payout_status_enum  -- Payment status: unpaid, paid, overdue, not_applicable
completion_date TIMESTAMP         -- Date when claim was marked as completed
```

### Payout Status Lifecycle

- `not_applicable`: Claim is not yet completed (SCHEDULED, IN_PROGRESS, CANCELED)
- `unpaid`: Claim completed, awaiting payment, not yet overdue
- `overdue`: Claim completed, past expected payout date, still unpaid
- `paid`: Payment received and recorded

## API Endpoint

### Base URL
```
/api/firm-reliability
```

### Authentication
Requires admin role authentication.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `firm` | string | Optional. Filter metrics for a specific firm (e.g., `?firm=Sedgwick`) |
| `pretty` | boolean | Optional. Pretty-print JSON output (`?pretty=true` or `?pretty=1`) |

### Examples

#### Get all firms
```
GET /api/firm-reliability
GET /api/firm-reliability?pretty=true
```

#### Get specific firm
```
GET /api/firm-reliability?firm=Sedgwick
GET /api/firm-reliability?firm=ClaimSolution&pretty=true
```

## Response Format

### All Firms Response

```json
{
  "status": "success",
  "data": {
    "generated_at": "2025-01-15T10:30:00.000Z",
    "total_firms": 11,
    "metrics_by_firm": [
      {
        "firm_name": "Sedgwick",
        "total_paid_claims": 45,
        "total_unpaid_claims": 12,
        "avg_days_late": 3.5,
        "on_time_percentage": 78.5,
        "total_outstanding_balance": 1250.50,
        "outstanding_aging": {
          "0-7_days": { "count": 5, "amount": 325.00 },
          "8-14_days": { "count": 4, "amount": 260.00 },
          "15-30_days": { "count": 2, "amount": 130.00 },
          "30plus_days": { "count": 1, "amount": 535.50 }
        },
        "median_days_late": 2,
        "worst_delay_days": 45,
        "best_turnaround_days": -3
      }
    ],
    "overall_summary": {
      "total_claims_tracked": 450,
      "total_paid_claims": 380,
      "total_unpaid_claims": 70,
      "total_outstanding_balance": 8500.75,
      "overall_avg_days_late": 4.2,
      "overall_on_time_percentage": 72.5
    }
  }
}
```

### Single Firm Response

```json
{
  "status": "success",
  "data": {
    "firm_name": "Sedgwick",
    "total_paid_claims": 45,
    "total_unpaid_claims": 12,
    "avg_days_late": 3.5,
    "on_time_percentage": 78.5,
    "total_outstanding_balance": 1250.50,
    "outstanding_aging": {
      "0-7_days": { "count": 5, "amount": 325.00 },
      "8-14_days": { "count": 4, "amount": 260.00 },
      "15-30_days": { "count": 2, "amount": 130.00 },
      "30plus_days": { "count": 1, "amount": 535.50 }
    },
    "median_days_late": 2,
    "worst_delay_days": 45,
    "best_turnaround_days": -3
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Firm not found: InvalidFirm"
}
```

## Metrics Explanation

### Per-Firm Metrics

| Metric | Description | Calculation |
|--------|-------------|-------------|
| `total_paid_claims` | Number of claims paid by this firm | Count of claims with `payout_status = 'paid'` |
| `total_unpaid_claims` | Number of claims awaiting payment | Count of claims with `payout_status IN ('unpaid', 'overdue')` |
| `avg_days_late` | Average number of days late/early | `avg(actual_payout_date - expected_payout_date)` |
| `on_time_percentage` | Percentage of claims paid on or before expected date | `(claims_paid_on_time / total_paid_claims) × 100` |
| `total_outstanding_balance` | Total amount owed for unpaid claims | Sum of `file_total` or `pay_amount` for unpaid claims |
| `outstanding_aging` | Breakdown of unpaid claims by age | Claims grouped by days overdue (0-7, 8-14, 15-30, 30+) |
| `median_days_late` | Median payment delay | Middle value of days late array |
| `worst_delay_days` | Longest payment delay | Maximum days late value |
| `best_turnaround_days` | Fastest payment (negative = early) | Minimum days late value (negative indicates early payment) |

### Outstanding Aging Buckets

- **0-7 days**: Claims that are 0-7 days past expected payout date
- **8-14 days**: Claims that are 8-14 days late
- **15-30 days**: Claims that are 15-30 days late
- **30+ days**: Claims that are more than 30 days overdue

### Overall Summary Metrics

- `total_claims_tracked`: Total number of claims with expected payout dates
- `total_paid_claims`: Sum of paid claims across all firms
- `total_unpaid_claims`: Sum of unpaid claims across all firms
- `total_outstanding_balance`: Total amount owed across all firms
- `overall_avg_days_late`: Weighted average days late across all firms
- `overall_on_time_percentage`: Weighted on-time percentage across all firms

## Data Population

### Setting Expected Payout Date

The `expected_payout_date` should be calculated using the existing payout forecasting logic when a claim is marked as COMPLETED:

```typescript
import { getPayPeriod, normalizeFirmName } from './utils/payoutForecasting';

// When claim is completed
const completionDate = new Date();
const period = getPayPeriod(normalizeFirmName(claim.firm_name), completionDate);

await supabase
  .from('claims')
  .update({
    status: 'COMPLETED',
    completion_date: completionDate.toISOString(),
    expected_payout_date: period.payoutDate.toISOString().split('T')[0], // Date only
    payout_status: 'unpaid'
  })
  .eq('id', claimId);
```

### Recording Actual Payment

When payment is received:

```typescript
await supabase
  .from('claims')
  .update({
    actual_payout_date: '2025-01-15', // Date payment received
    payout_status: 'paid'
  })
  .eq('id', claimId);
```

### Marking Claims as Overdue

Run a periodic job to mark unpaid claims as overdue:

```sql
UPDATE claims
SET payout_status = 'overdue'
WHERE payout_status = 'unpaid'
  AND expected_payout_date < CURRENT_DATE;
```

## Implementation Files

### Database
- `add-payout-tracking-fields.sql` - Database migration

### Backend Logic
- `src/utils/firmReliability.ts` - Calculation engine
  - `generateFirmReliabilityReport()` - Generate full report
  - `getFirmMetrics(firmName)` - Get single firm metrics
  - `fetchPaymentClaims()` - Fetch all payment data

### API Endpoint
- `src/routes/api/FirmReliability.tsx` - API endpoint component
- `src/main.tsx` - Route registration

## Usage Examples

### JavaScript/TypeScript

```typescript
// Fetch all firms
const response = await fetch('/api/firm-reliability');
const data = await response.json();

if (data.status === 'success') {
  console.log('Total firms:', data.data.total_firms);
  console.log('Overall avg days late:', data.data.overall_summary.overall_avg_days_late);

  data.data.metrics_by_firm.forEach(firm => {
    console.log(`${firm.firm_name}: ${firm.on_time_percentage}% on-time`);
  });
}

// Fetch specific firm
const sedgwick = await fetch('/api/firm-reliability?firm=Sedgwick');
const sedgwickData = await sedgwick.json();
console.log('Sedgwick metrics:', sedgwickData.data);
```

### Python

```python
import requests

# Fetch all firms
response = requests.get('https://your-domain.com/api/firm-reliability')
data = response.json()

if data['status'] == 'success':
    for firm in data['data']['metrics_by_firm']:
        print(f"{firm['firm_name']}: {firm['on_time_percentage']}% on-time")
```

### cURL

```bash
# Fetch all firms (pretty-printed)
curl "https://your-domain.com/api/firm-reliability?pretty=true"

# Fetch specific firm
curl "https://your-domain.com/api/firm-reliability?firm=Sedgwick&pretty=true"
```

## Migration Steps

1. **Run database migration**:
   ```sql
   -- Execute add-payout-tracking-fields.sql in Supabase SQL Editor
   ```

2. **Backfill expected payout dates** (if needed):
   ```typescript
   // Use existing payoutForecasting logic to calculate and update
   ```

3. **Update claim completion workflow**:
   - Set `expected_payout_date` when marking claim as COMPLETED
   - Set `payout_status` to 'unpaid'

4. **Create payment recording workflow**:
   - Add UI or process to record when payments are received
   - Update `actual_payout_date` and `payout_status` to 'paid'

5. **Set up overdue monitoring**:
   - Create scheduled task to mark overdue claims
   - Optional: Send alerts for overdue payments

## Future Enhancements

- **Trend Analysis**: Track metrics over time (monthly/quarterly trends)
- **Predictions**: Predict expected payment dates based on historical data
- **Alerts**: Automated alerts for overdue payments or declining reliability
- **Comparison**: Compare current period vs historical averages
- **Visualization**: Charts and graphs for reliability trends
- **CSV Export**: Download metrics as CSV for reporting
