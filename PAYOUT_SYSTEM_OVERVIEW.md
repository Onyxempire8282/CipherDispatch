# Payout Forecasting System - Overview

## Summary of Changes

The payout forecast dashboard now correctly displays future payouts by analyzing **both completed claims** awaiting payment and **scheduled appointments** for upcoming work.

### Why the Previous System Was Blank

1. **Only looked at COMPLETED claims** - The old system only included claims with `status = 'COMPLETED'` and `completion_date` set
2. **Required file_total to be populated** - New claims don't have file_total until they're completed
3. **Excluded several firms** - AMA, A-TEAM, and SCA were explicitly excluded
4. **Database had no completed claims** - Testing showed 0 completed claims in the database

### How the New System Works

The updated system forecasts payouts using a two-pronged approach:

#### 1. Completed Claims (Historical)
- Uses actual `file_total` or `pay_amount` values
- Based on `completion_date` to determine which pay period they fall into
- Awaiting payment in upcoming pay cycles

#### 2. Scheduled Appointments (Forecast)
- Uses `appointment_start` date to predict when work will be done
- **Auto-calculates expected payout** based on firm fee structure
- Formula: `baseFee + (mileage × perMileRate)`
- Predicts which pay period the work will be paid in

## Firm Fee Configuration

Created `src/utils/firmFeeConfig.ts` with standard rates for each firm:

### Weekly Payers
- **Sedgwick**: $200 base + $0.75/mile (pays Wed for Fri-Thu work)
- **Doan**: $180 base + $0.70/mile (pays Thu)

### Bi-Weekly Payers
- **Legacy** (GT Appraisals): $190 base + $0.72/mile (pays Wed)
- **ClaimSolution**: $195 base + $0.73/mile (pays Thu)
- **Complete Claims**: $185 base + $0.71/mile (pays Wed)
- **AMA**: $175 base + $0.68/mile (pays Wed)
- **A-TEAM**: $180 base + $0.70/mile (pays Thu)

### Semi-Monthly Payers
- **ACD** (AutoClaims/AutoClaimsDI): $200 base + $0.75/mile (pays 15th & EOM)

### Monthly Payers
- **HEA**: $210 base + $0.78/mile (pays 15th for previous month)
- **IANET**: $195 base + $0.73/mile (pays EOM)
- **Frontline**: $185 base + $0.71/mile (pays EOM)

### Irregular
- **SCA**: $170 base + $0.65/mile (monthly EOM, low volume)

## Pay Cycle Logic

Each firm has a specific pay cycle defined in `src/utils/payoutForecasting.ts`:

### getPayPeriod(firm, workDate)

This function determines:
1. **Period Start/End**: The date range for work that will be included in a payout
2. **Payout Date**: When the payment will be issued

Examples:
- **Sedgwick**: Work done Fri-Thu is paid the following Wednesday
- **Legacy**: Bi-weekly Wed, work from 2 weeks ago Thu → day before payout
- **ACD**: Semi-monthly - work 1-15 paid on 15th, work 16-EOM paid on last day

## Database Query Changes

Updated `PayoutDashboard.tsx` to fetch:

```typescript
.from('claims')
.select('id, firm_name, completion_date, appointment_start, file_total, pay_amount, mileage, status')
.or('status.eq.COMPLETED,status.eq.SCHEDULED,status.eq.IN_PROGRESS')
.or('completion_date.not.is.null,appointment_start.not.is.null');
```

This includes:
- ✅ Completed claims with completion_date
- ✅ Scheduled claims with appointment_start
- ✅ In-progress claims with either date

## Forecast Calculation Flow

```
For each claim:
  ├─ Is it COMPLETED?
  │  ├─ Yes → Use completion_date, actual file_total/pay_amount
  │  └─ No → Use appointment_start, calculate from firm config
  │
  ├─ Determine work date
  ├─ Calculate expected amount
  ├─ Get firm's pay period for that date
  ├─ Check if work falls within period
  └─ Add to payout forecast for that pay date
```

## Dashboard Views

### 1. Upcoming (30 days)
Shows all payouts expected in next 30 days with:
- Firm name
- Pay period dates
- Payout date
- Expected amount
- Number of claims

### 2. Weekly Totals
Groups payouts by week (Monday-Sunday):
- Week start/end dates
- Total amount for that week
- Breakdown by firm and payout date

### 3. Monthly Totals
Groups payouts by calendar month:
- Month and year
- Total amount for that month
- Breakdown by firm

## Summary Cards

Top of dashboard shows:
- **This Week**: Total expected payouts in next 7 days
- **Next Week**: Total expected for days 8-14
- **This Month**: Total expected for current calendar month

## Admin-Only Visibility

The payout amounts and forecast are **only visible to admins**. The `isAdmin` check from the calendar view ensures appraisers see appointments but not payout data.

## Auto-Population of Fees

When creating/editing claims:
1. Select a firm from dropdown
2. System looks up firm in `FIRM_FEE_CONFIG`
3. Auto-populates `pay_amount` with base fee
4. If mileage is entered, adds mileage charge
5. Total expected payout = base fee + (mileage × rate)

## Testing the System

### With Real Data
Once you have scheduled appointments in the calendar:
1. Navigate to `/admin/payouts`
2. View should show forecasted amounts for upcoming pay cycles
3. Summary cards show totals for this week, next week, this month

### With Test Data
Create test appointments:
```sql
INSERT INTO claims (firm_name, appointment_start, status, mileage)
VALUES
  ('Sedgwick', '2024-12-26 09:00:00', 'SCHEDULED', 25),
  ('Legacy', '2024-12-27 10:00:00', 'SCHEDULED', 30),
  ('ACD', '2024-12-28 14:00:00', 'SCHEDULED', 15);
```

Expected results:
- Sedgwick: $200 + (25 × $0.75) = $218.75, pays Wed 1/1/2025
- Legacy: $190 + (30 × $0.72) = $211.60, pays Wed 1/1/2025 (bi-weekly)
- ACD: $200 + (15 × $0.75) = $211.25, pays Wed 1/15/2025 (semi-monthly)

## Files Modified

1. **src/utils/firmFeeConfig.ts** (NEW)
   - Fee structures for all firms
   - Auto-calculation logic

2. **src/utils/payoutForecasting.ts** (UPDATED)
   - Added AMA, A-TEAM, Frontline, SCA pay cycles
   - Changed to use scheduled appointments
   - Removed firm exclusions
   - Integrated fee calculation

3. **src/routes/admin/PayoutDashboard.tsx** (UPDATED)
   - Query now includes scheduled claims
   - Updated UI text to explain forecast approach
   - Shows both historical and forecasted payouts

## Next Steps

1. ✅ Test with actual scheduled appointments in calendar
2. ✅ Verify forecast amounts match firm fee structures
3. ✅ Confirm pay dates align with historical deposit patterns
4. Consider adding:
   - Ability to override fee amounts per claim
   - Historical accuracy tracking (forecast vs actual)
   - Export forecast to CSV/PDF
   - Notification when payouts are expected
