# Payout Variance API Documentation

## Overview

The Payout Variance API tracks the difference between expected payouts (forecasted) and actual payments received. It provides historical performance data and projections based on rolling averages, helping you understand payment trends and forecast future cash flow.

## What It Tracks

### Expected Payouts
Based on the existing payout forecasting logic (`payoutForecasting.ts`):
- Uses firm-specific pay cycles (weekly, bi-weekly, monthly, semi-monthly)
- Calculates when you should receive payment for completed claims
- Groups expected payouts by week

### Actual Payments
Based on the `actual_payout_date` field in the database:
- Tracks when payments were actually received
- Groups actual payments by the week they were received

### Variance
- **Positive Variance**: Expected more than received (under-collected)
- **Negative Variance**: Received more than expected (over-collected)
- **Percentage**: How close actual was to expected

## API Endpoint

### Base URL
```
/api/payout-variance
```

### Authentication
Requires admin role authentication.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `historical` | number | 12 | Number of past weeks to include |
| `projection` | number | 4 | Number of future weeks to project |
| `pretty` | boolean | false | Pretty-print JSON output |

### Examples

```
GET /api/payout-variance
GET /api/payout-variance?pretty=true
GET /api/payout-variance?historical=8&projection=2
GET /api/payout-variance?historical=12&projection=4&pretty=true
```

## Response Format

```json
{
  "status": "success",
  "data": {
    "generated_at": "2025-12-30T10:00:00.000Z",
    "period_start": "2025-10-07T00:00:00.000Z",
    "period_end": "2026-01-27T00:00:00.000Z",
    "total_weeks": 16,
    "historical_weeks": 12,
    "projection_weeks": 4,
    "weekly_data": [
      {
        "week_start": "2025-10-07T00:00:00.000Z",
        "week_end": "2025-10-13T23:59:59.999Z",
        "week_label": "Oct 7, 2025",
        "expected_payout": 5250.00,
        "actual_paid": 4875.50,
        "variance": 374.50,
        "variance_percentage": -7.1,
        "is_projection": false,
        "claim_count_expected": 15,
        "claim_count_actual": 14
      },
      {
        "week_start": "2025-12-30T00:00:00.000Z",
        "week_end": "2026-01-05T23:59:59.999Z",
        "week_label": "Dec 30, 2025",
        "expected_payout": 4823.45,
        "actual_paid": 4823.45,
        "variance": 0.00,
        "variance_percentage": 0.0,
        "is_projection": true,
        "claim_count_expected": 0,
        "claim_count_actual": 0
      }
    ],
    "summary": {
      "total_expected": 58500.00,
      "total_actual": 54230.75,
      "total_variance": 4269.25,
      "avg_weekly_expected": 4875.00,
      "avg_weekly_actual": 4519.23,
      "avg_weekly_variance": 355.77,
      "accuracy_percentage": 92.7
    },
    "rolling_average": {
      "period": 4,
      "avg_expected": 4823.45,
      "avg_actual": 4670.12,
      "avg_variance": 153.33
    }
  }
}
```

## Data Fields Explained

### Weekly Data

| Field | Description |
|-------|-------------|
| `week_start` | Monday of the week (ISO 8601) |
| `week_end` | Sunday of the week (ISO 8601) |
| `week_label` | Human-readable week label (e.g., "Oct 7, 2025") |
| `expected_payout` | Total expected to receive this week (from forecasts) |
| `actual_paid` | Total actually received this week (from `actual_payout_date`) |
| `variance` | Difference (expected - actual). Positive = under-collected |
| `variance_percentage` | `((actual / expected) * 100) - 100`. Negative = under-target |
| `is_projection` | `true` if this is a future projection, `false` if historical |
| `claim_count_expected` | Number of claims expected to be paid |
| `claim_count_actual` | Number of claims actually paid |

### Summary

| Field | Description |
|-------|-------------|
| `total_expected` | Sum of expected payouts (historical weeks only) |
| `total_actual` | Sum of actual payments (historical weeks only) |
| `total_variance` | Total difference (historical weeks only) |
| `avg_weekly_expected` | Average expected per week |
| `avg_weekly_actual` | Average actual per week |
| `avg_weekly_variance` | Average variance per week |
| `accuracy_percentage` | `(total_actual / total_expected) * 100` |

### Rolling Average

Based on the last 4 weeks of historical data, used for projections:

| Field | Description |
|-------|-------------|
| `period` | Number of weeks averaged (always 4) |
| `avg_expected` | Average weekly expected (last 4 weeks) |
| `avg_actual` | Average weekly actual (last 4 weeks) |
| `avg_variance` | Average weekly variance (last 4 weeks) |

## How Projections Work

Future weeks use a **4-week rolling average** from historical data:

1. Take the last 4 weeks of historical data
2. Calculate average expected, actual, and variance
3. Use these averages as the projected values for future weeks

This provides a trend-based projection that adapts to recent payment patterns.

## Prerequisites

### Database Migration Required

The payout variance API requires the payout tracking fields to be added to the database first:

**Run**: `add-payout-tracking-fields.sql`

This adds:
- `expected_payout_date` - When you expect to be paid
- `actual_payout_date` - When you were actually paid
- `payout_status` - Payment status
- `completion_date` - When claim was completed

### Data Population Needed

For accurate variance tracking, you need to:

1. **Set expected_payout_date** when completing claims:
   ```typescript
   import { getPayPeriod, normalizeFirmName } from './utils/payoutForecasting';

   const completionDate = new Date();
   const period = getPayPeriod(normalizeFirmName(claim.firm_name), completionDate);

   await supabase
     .from('claims')
     .update({
       status: 'COMPLETED',
       completion_date: completionDate.toISOString(),
       expected_payout_date: period.payoutDate.toISOString().split('T')[0],
       payout_status: 'unpaid'
     })
     .eq('id', claimId);
   ```

2. **Record actual_payout_date** when payment is received:
   ```typescript
   await supabase
     .from('claims')
     .update({
       actual_payout_date: '2025-12-30',
       payout_status: 'paid'
     })
     .eq('id', claimId);
   ```

## Usage Examples

### JavaScript/TypeScript

```typescript
// Fetch variance report
const response = await fetch('/api/payout-variance?pretty=true');
const result = await response.json();

if (result.status === 'success') {
  const data = result.data;

  console.log('Summary:');
  console.log(`Total Expected: $${data.summary.total_expected}`);
  console.log(`Total Actual: $${data.summary.total_actual}`);
  console.log(`Variance: $${data.summary.total_variance}`);
  console.log(`Accuracy: ${data.summary.accuracy_percentage}%`);

  console.log('\nWeekly Breakdown:');
  data.weekly_data.forEach(week => {
    console.log(`${week.week_label}: Expected $${week.expected_payout}, Actual $${week.actual_paid}, Variance $${week.variance}`);
  });
}
```

### Python

```python
import requests

response = requests.get('https://your-domain.com/api/payout-variance')
data = response.json()['data']

print(f"Accuracy: {data['summary']['accuracy_percentage']}%")
print(f"Total Variance: ${data['summary']['total_variance']}")

for week in data['weekly_data']:
    week_type = 'PROJECTION' if week['is_projection'] else 'HISTORICAL'
    print(f"{week['week_label']} ({week_type}): ${week['variance']}")
```

### cURL

```bash
# Get variance report (pretty-printed)
curl "https://your-domain.com/api/payout-variance?pretty=true"

# Get last 8 weeks + 2 week projection
curl "https://your-domain.com/api/payout-variance?historical=8&projection=2&pretty=true"
```

## Interpreting Results

### Variance Interpretation

- **Positive Variance** (Expected > Actual):
  - You expected to collect more than you actually received
  - Possible reasons: Late payments, partial payments, unpaid claims
  - Action: Follow up on overdue payments

- **Negative Variance** (Actual > Expected):
  - You collected more than expected
  - Possible reasons: Early payments, unexpected payments, bulk payments
  - Action: Verify forecasts are accurate

- **Near-Zero Variance**:
  - Actual closely matches expected
  - Indicates accurate forecasting and reliable payment patterns

### Accuracy Percentage

- **>95%**: Excellent forecast accuracy and payment reliability
- **85-95%**: Good accuracy, minor deviations
- **75-85%**: Moderate accuracy, review late/missing payments
- **<75%**: Poor accuracy, investigate forecasting logic or payment issues

### Projection Reliability

Projections are based on rolling averages, so:
- **Stable patterns** → More reliable projections
- **Volatile patterns** → Less reliable projections
- Review `rolling_average` section to understand projection basis

## Use Cases

### Cash Flow Forecasting
Use the weekly projections to:
- Predict upcoming revenue
- Plan for expenses
- Identify potential cash flow gaps

### Payment Pattern Analysis
Use historical variance to:
- Identify which weeks have highest variance
- Spot trends (improving or declining accuracy)
- Detect seasonal patterns

### Firm Reliability Correlation
Combine with `/api/firm-reliability` to:
- Compare firms that pay on time vs those that don't
- Correlate variance with specific firm payment delays
- Optimize firm selection based on payment reliability

### Performance Monitoring
Track over time to:
- Measure improvement in forecast accuracy
- Monitor collection effectiveness
- Set targets for variance reduction

## Implementation Files

### Backend Logic
- `src/utils/payoutVariance.ts` - Variance calculation engine
  - `generatePayoutVarianceReport()` - Main function
  - `calculateWeeklyExpected()` - Expected payout aggregation
  - `calculateWeeklyActual()` - Actual payment aggregation
  - `calculateRollingAverage()` - Projection logic

### API Endpoint
- `src/routes/api/PayoutVariance.tsx` - API endpoint component
- `src/main.tsx` - Route registration

### Dependencies
- Uses existing payout forecasting logic (`payoutForecasting.ts`)
- Requires firm reliability database schema (`add-payout-tracking-fields.sql`)

## Limitations

1. **Data Dependency**: Requires `actual_payout_date` to be populated manually
2. **Forecast Accuracy**: Expected payouts rely on accurate completion dates
3. **Projection Accuracy**: 4-week rolling average may not capture long-term trends
4. **Week Boundaries**: Uses Monday-Sunday weeks (may not align with accounting periods)

## Future Enhancements

- **Firm-Specific Variance**: Break down variance by firm
- **Trend Analysis**: Detect improving/declining variance trends
- **Alerts**: Notify when variance exceeds thresholds
- **Forecast Tuning**: Adjust forecasts based on historical variance
- **Custom Periods**: Support monthly/quarterly aggregation
- **Export**: Download variance data as CSV
- **Visualization**: Charts showing variance over time
