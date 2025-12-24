# Payout Forecast Fixes - Summary

## Issues Identified and Fixed

### 1. ClaimSolution Vendor Name Normalization ✅ FIXED

**Problem:**
- Claims with vendor name "CS" were not recognized → excluded from payouts
- Claims with vendor name "CCS" were incorrectly mapped to "Complete Claims" instead of "ClaimSolution"
- This caused ClaimSolution payouts to be missing from the forecast entirely

**Root Cause:**
The vendor name normalization function in `src/utils/firmFeeConfig.ts` was missing mappings for "CS" and "CCS" variants.

**Fix:**
Updated `normalizeFirmNameForConfig()` in two files:
- `src/utils/firmFeeConfig.ts` (line 94)
- `src/constants/firmColors.ts` (line 25)

Changed from:
```typescript
if (normalized.includes('CLAIMSOLUTION') || normalized.includes('CLAIM SOLUTION')) return 'ClaimSolution';
if (normalized.includes('COMPLETE CLAIMS') || normalized === 'CCS') return 'Complete Claims';
```

To:
```typescript
// ClaimSolution variants: CS, CCS, ClaimSolution
if (normalized === 'CS' || normalized === 'CCS' || normalized.includes('CLAIMSOLUTION') || normalized.includes('CLAIM SOLUTION')) return 'ClaimSolution';
if (normalized.includes('COMPLETE CLAIMS')) return 'Complete Claims';
```

**Impact:**
- All ClaimSolution claims (regardless of whether they're labeled "CS", "CCS", or "ClaimSolution") now:
  - Appear in the payout forecast
  - Use the correct bi-weekly Thursday payout schedule
  - Display with the correct ClaimSolution color (pink #EC4899) instead of grey

---

### 2. Payout Total Mismatch (IANET, ACD, etc.) ✅ FIXED

**Problem:**
- IANET Dec 31 payout: Row showed $695.04, modal showed $667.57 (discrepancy: $27.47)
- ACD Dec 31 payout: Row showed $968.88, modal showed $557.47 (discrepancy: $411.41)
- Other firms showed matching totals

**Root Cause:**
When a **SCHEDULED** claim has no `pay_amount` value:
- The **forecast logic** (payout row) used the firm's base fee (e.g., $195 for IANET, $200 for ACD)
- The **modal detail logic** used $0
- This created a mismatch in totals

**Fix:**
Updated `src/components/PayoutDetailModal.tsx`:

1. Added import:
```typescript
import { calculateExpectedPayout } from '../utils/firmFeeConfig';
```

2. Updated total calculation (line 67):
```typescript
// Before:
return sum + (c.pay_amount || 0);

// After:
return sum + (c.pay_amount || calculateExpectedPayout(c.firm_name) || 0);
```

3. Updated individual claim amount calculation (line 125):
```typescript
// Before:
const amount = claim.status === 'COMPLETED'
  ? (claim.file_total || claim.pay_amount || 0)
  : (claim.pay_amount || 0);

// After:
const amount = claim.status === 'COMPLETED'
  ? (claim.file_total || claim.pay_amount || 0)
  : (claim.pay_amount || calculateExpectedPayout(claim.firm_name) || 0);
```

4. Updated display label to show when base fee is used (line 216):
```typescript
{claim.status === 'COMPLETED'
  ? (claim.file_total ? 'file_total' : 'pay_amount')
  : (claim.pay_amount ? 'pay_amount (scheduled)' : 'base fee (scheduled)')}
```

**Impact:**
- Payout row totals now **exactly match** modal detail totals
- Users can see when a scheduled claim is using the base fee estimate vs. an actual pay_amount
- More accurate forecasting for scheduled appointments without explicit pay amounts

---

## Files Modified

1. `src/utils/firmFeeConfig.ts` - Fixed vendor name normalization
2. `src/constants/firmColors.ts` - Fixed color mapping for CS/CCS
3. `src/components/PayoutDetailModal.tsx` - Fixed total calculation logic

## Testing

Created diagnostic scripts:
- `test-vendor-normalization.mjs` - Verifies vendor name mappings
- `test-payout-logic-comparison.mjs` - Validates forecast vs modal totals match

## Build Status

✅ Build successful with no errors

## Expected Outcomes

After deploying these fixes:

1. **ClaimSolution payouts will appear** in the forecast dashboard with correct:
   - Bi-weekly Thursday payout schedule
   - Pink color coding
   - Proper aggregation regardless of "CS", "CCS", or "ClaimSolution" spelling

2. **IANET and ACD payout totals will match** between:
   - The upcoming payout row
   - The detail modal view
   - Any scheduled claims without pay_amount will use firm base fees

3. **Color consistency** across the application:
   - Calendar events
   - Claim cards
   - Payout forecasts
   - All use the same color mapping with vendor normalization

4. **No duplicate firm groups**:
   - "SEDGWICK" and "Sedgwick" will be treated as the same firm
   - Case-insensitive normalization prevents duplicate listings

---

## Date: 2024-12-24
