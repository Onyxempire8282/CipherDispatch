# CIPHER DISPATCH -- Claims Pipeline Tabs & Vendor Profile Audit

## Date: 2026-03-10

---

## Area A: Claims Table Filter Tabs

### Files Modified
- `src/routes/admin/Claims.tsx` -- Added PipelineTab type (all_active, needs_scheduling, in_progress, completed), PIPELINE_TABS constant, activeTab state, tabCounts state, loadTabCounts() with 4 parallel COUNT queries, server-side query filtering per tab in load(), calcCycleTime() helper, completed table view with 8 columns (claim#, customer, firm, type, file_total, created, completed_at, cycle time), status pills hidden on completed tab, completed_at added to Claim type
- `src/routes/admin/claims.css` -- Added .claims__tab-bar, .claims__tab, .claims__tab--active, .claims__tab-badge, .claims__completed-wrap, .claims__completed-table (thead/tbody), .claims__completed-row, .claims__completed-th--right, .claims__completed-link, .claims__completed-name, .claims__completed-firm, .claims__completed-type, .claims__completed-amount, .claims__completed-date, .claims__cycle-time, responsive breakpoints for tabs and table

### Assumptions
- Tab queries are server-side (each tab fires a distinct Supabase query)
- "Needs Scheduling" = not completed/canceled AND (unassigned OR no appointment)
- "In Progress" = status IN (SCHEDULED, IN_PROGRESS, WRITING)
- Badge counts use lightweight HEAD/count queries in parallel
- Status filter pills are hidden on the Completed tab (not relevant)
- Completed table shows cycle time calculated from created_at to completed_at
- Existing search bar still works across all tabs

---

## Area B: Vendor Firm Profile Page

### Files Created
- `src/routes/admin/VendorProfile.tsx` -- Vendor profile page at /admin/vendors/:id with 4 sections: (1) Firm Header with color swatch, name, status badge, 4 summary stats (total/open/completed/revenue); (2) Fee Configuration with fee_auto/fee_heavy_duty/fee_photos_scope/default_insurance_company inputs and Save Fees button; (3) Contact & Profile with contact_name/email/phone, pay schedule, base fee, date added; (4) Claim History with 4 quick-stat pills, sortable paginated table (20 per page), sortable columns (claim#, customer, status, amount, created)
- `src/routes/admin/vendor-profile.css` -- Full BEM CSS for .vprof block with section cards, stats grid, fee grid, info grid, history table, sortable headers, pagination, responsive breakpoints

### Files Modified
- `src/routes/admin/VendorsPayouts.tsx` -- Added useNavigate import, useRole hook, dynamic NavBar role, "VIEW PROFILE" button on each vendor card navigating to /admin/vendors/:id
- `src/routes/admin/vendors-payouts.css` -- Added .vendor-card__profile-btn with amber outline styling and hover state
- `src/main.tsx` -- Added VendorProfile import, /admin/vendors/:id route (requiredRole: admin)

### Assumptions
- Fee fields (fee_auto, fee_heavy_duty, fee_photos_scope, default_insurance_company) already exist from prior migration
- Contact fields (contact_name, contact_email, contact_phone) require new migration
- Vendor profile is admin-only (not dispatch)
- Claim history pagination is 20 claims per page
- Sortable columns: claim_number, customer_name, status, file_total, created_at
- Revenue stat calculated from file_total or pay_amount on completed claims
- Profile page is read-only for contact info (edited via vendor modal on main page), fees are editable inline

---

## Migration Applied

### File: `supabase/migrations/20260310_vendor_profile_fields.sql`

| Table | Column | Type | Notes |
|-------|--------|------|-------|
| vendors | contact_name | TEXT | Optional contact person name |
| vendors | contact_email | TEXT | Optional contact email |
| vendors | contact_phone | TEXT | Optional contact phone |

---

## Summary of All Files

### Created (3 files)
1. `src/routes/admin/VendorProfile.tsx`
2. `src/routes/admin/vendor-profile.css`
3. `supabase/migrations/20260310_vendor_profile_fields.sql`

### Modified (5 files)
1. `src/routes/admin/Claims.tsx`
2. `src/routes/admin/claims.css`
3. `src/routes/admin/VendorsPayouts.tsx`
4. `src/routes/admin/vendors-payouts.css`
5. `src/main.tsx`
