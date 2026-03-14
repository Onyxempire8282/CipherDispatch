# VENDORS TABLE AUDIT — Cipher Dispatch

**Generated:** 2026-03-14

---

## 1. EVERY COLUMN READ OR WRITTEN

### Columns Read
| Column | Read By |
|--------|---------|
| `id` | Vendors, VendorsPayouts, VendorProfile, NewClaim, ClaimDetail |
| `name` | All 6 files |
| `color` | Vendors, VendorsPayouts, VendorProfile |
| `active` | Vendors, VendorsPayouts, VendorProfile, NewClaim, ClaimDetail, PayoutDashboard |
| `created_at` | Vendors, VendorsPayouts, VendorProfile |
| `pay_amount` | Vendors, VendorsPayouts, VendorProfile, NewClaim |
| `pay_schedule_type` | VendorsPayouts, PayoutDashboard, ClaimDetail |
| `pay_day` | VendorsPayouts, PayoutDashboard, ClaimDetail |
| `reference_date` | VendorsPayouts, PayoutDashboard, ClaimDetail |
| `fee_auto` | VendorProfile, NewClaim |
| `fee_heavy_duty` | VendorProfile, NewClaim |
| `fee_photos_scope` | VendorProfile, NewClaim |
| `default_insurance_company` | VendorProfile, NewClaim |
| `contact_name` | VendorProfile |
| `contact_email` | VendorProfile |
| `contact_phone` | VendorProfile |

### Columns Written
| Column | Written By |
|--------|-----------|
| `name` | Vendors, VendorsPayouts |
| `color` | Vendors, VendorsPayouts |
| `active` | Vendors, VendorsPayouts |
| `pay_amount` | Vendors, VendorsPayouts |
| `pay_cycle_type` | Vendors, VendorsPayouts |
| `reference_pay_date` | Vendors, VendorsPayouts |
| `reference_date` | PayoutDashboard, VendorsPayouts |
| `reference_date_updated_at` | PayoutDashboard, VendorsPayouts |
| `fee_auto` | VendorProfile |
| `fee_heavy_duty` | VendorProfile |
| `fee_photos_scope` | VendorProfile |
| `default_insurance_company` | VendorProfile |

---

## 2. EVERY FILE THAT CALLS .from('vendors')

| # | File | Line(s) |
|---|------|---------|
| 1 | `src/routes/admin/Vendors.tsx` | 71, 158, 166, 185 |
| 2 | `src/routes/admin/VendorsPayouts.tsx` | 129, 156, 246, 251, 265, 279, 354 |
| 3 | `src/routes/admin/PayoutDashboard.tsx` | 61, 247 |
| 4 | `src/routes/admin/VendorProfile.tsx` | 76, 144 |
| 5 | `src/routes/admin/NewClaim.tsx` | 121 |
| 6 | `src/routes/appraiser/ClaimDetail.tsx` | 160 |

Utility (no DB access, consumes vendor data as parameter):
- `src/utils/payoutForecasting.ts` — defines `FirmSchedule` interface

---

## 3. DATA USAGE BY FILE

### `src/routes/admin/Vendors.tsx`
**Purpose:** Legacy vendor management CRUD
- SELECT `.select("*").order("name")` — load all vendors for admin list
- INSERT — add new vendor with name, color, pay_cycle_type, reference_pay_date, pay_amount, active
- UPDATE — edit existing vendor fields
- DELETE — remove vendor by ID

### `src/routes/admin/VendorsPayouts.tsx`
**Purpose:** Primary vendor management + payout forecasting dashboard
- SELECT `.select("*").order("name")` — load all vendors for management UI
- SELECT `.select("name, pay_schedule_type, pay_day, reference_date, color").eq("active", true)` — load active vendor schedules for payout forecasting
- INSERT — add new vendor
- UPDATE — edit vendor, toggle active status
- UPDATE `.eq("name", firmName)` — update bi-weekly reference_date for payout anchor
- DELETE — remove vendor

### `src/routes/admin/PayoutDashboard.tsx`
**Purpose:** Read-only payout forecast display
- SELECT `.select("name, pay_schedule_type, pay_day, reference_date").eq("active", true)` — load active vendor schedules
- UPDATE — update reference_date and reference_date_updated_at when admin edits bi-weekly anchor

### `src/routes/admin/VendorProfile.tsx`
**Purpose:** Individual vendor profile page with fee configuration
- SELECT `.select("*").eq("id", id).single()` — load single vendor by ID
- UPDATE — save fee config: fee_auto, fee_heavy_duty, fee_photos_scope, default_insurance_company

### `src/routes/admin/NewClaim.tsx`
**Purpose:** Populate firm dropdown and auto-fill default fees on claim creation
- SELECT `.select("id, name, pay_amount, fee_auto, fee_heavy_duty, fee_photos_scope, default_insurance_company").eq("active", true).order("name")` — load active vendors for firm dropdown
- Fee logic: `fee_auto ?? pay_amount` for auto claims, `fee_heavy_duty ?? pay_amount` for heavy duty, `fee_photos_scope ?? pay_amount` for photos/scope

### `src/routes/appraiser/ClaimDetail.tsx`
**Purpose:** Load vendor schedule data for payout forecast on claim detail view
- SELECT `.select("id, name, pay_schedule_type, pay_day, reference_date").eq("active", true).order("name")` — load active vendor schedules
- Builds `firmSchedules` map → used by `getPayPeriod()` when marking claim complete

### `src/utils/payoutForecasting.ts`
**Purpose:** Pure utility — no DB access
- Defines `FirmSchedule` interface: `pay_schedule_type, pay_day, reference_date`
- Exports `getPayPeriod()` and `forecastPayouts()` functions
- Consumes vendor schedule data injected as parameter from calling files

---

## 4. OBSERVATIONS

### Column Naming Inconsistency
Two naming conventions exist for the same concept:
- **Legacy:** `pay_cycle_type`, `reference_pay_date` (Vendors.tsx, VendorsPayouts.tsx CRUD forms)
- **Current:** `pay_schedule_type`, `pay_day`, `reference_date` (PayoutDashboard, ClaimDetail reads)

This suggests the schema was evolved — the payout system reads `pay_schedule_type` but the vendor form writes `pay_cycle_type`. These may be different columns or aliased.

### Missing Migrations
The following columns are used in code but have no SQL migration file:
- `pay_schedule_type`
- `pay_day`
- `reference_date`
- `reference_date_updated_at`

These were likely added directly via Supabase UI.

### Access Patterns
- **Only active vendors** are loaded for dropdowns and payout forecasting (`.eq("active", true)`)
- **All vendors** (including inactive) are loaded for admin management views
- **Appraiser access is read-only** — ClaimDetail.tsx only selects, never writes
