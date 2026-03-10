# CIPHER DISPATCH -- Comprehensive Redesign Audit

## Date: 2026-03-09

---

## Area 1: Role System

### Files Created
- `src/hooks/useRole.ts` -- useRole() hook with role, userId, fullName, can(action) permission checker (20+ permissions mapped)
- `src/components/auth/RoleGuard.tsx` -- Inline role guard component for content visibility by role

### Files Modified
- `src/lib/supabaseAuthz.ts` -- Exported `AppRole` type ("admin" | "dispatch" | "writer" | "appraiser"), expanded isAdmin to include dispatch, added role getter, updated scopedClaimsQuery for writer visibility
- `src/components/NavBar.tsx` -- 4 role-specific tab arrays (ADMIN_TABS, DISPATCH_TABS, WRITER_TABS, APPRAISER_TABS), 4 bottom nav arrays, ROLE_LABEL map, AppRole prop type
- `src/routes/App.tsx` -- 3-way dashboard rendering (admin/dispatch, writer, appraiser), AppRole import, realtime stats
- `src/main.tsx` -- Route requiredRole arrays updated for all 4 roles, new route imports

### Assumptions
- Dispatch role gets admin-level query access but no vendor/payout management
- Writer role sees all claims (read-only) but cannot create or assign
- Existing "admin" users remain unchanged
- New roles require database migration to expand constraint

---

## Area 2: Dashboard Redesign

### Files Modified
- `src/routes/App.tsx` -- New stat strip (Unassigned, In Field Today, At Risk, Pending Review), Supabase Realtime subscription on claims table, SLA alert strip (24h unassigned, 4h estimate pending), emoji icons replaced with DM Mono abbreviations (CLM, NEW, ARC, FRM, CAL, TEM, KPI, RTE), CTA card variant for New Claim
- `src/routes/app.css` -- Added .dashboard__stat-num--warn, .dashboard__stat-num--danger, .dashboard__sla-strip, .dashboard__sla-alert, .dashboard__op-icon--mono, .dashboard__op-card--cta, .dashboard__link-icon--mono

### Assumptions
- SLA thresholds: 24h for unassigned claims, 4h for pending estimates
- "At Risk" = unassigned + created > 24h ago
- "In Field Today" = has appointment_start matching today's date
- "Pending Review" = pipeline_stage is photos_complete or estimate_writing
- Realtime subscription triggers full stat reload on any claims table change

---

## Area 3: Create Claim Form

### Files Modified
- `src/routes/admin/NewClaim.tsx` -- Sections reordered (Assignment & Firm first), added ClaimType type, claim_type selector (auto/heavy_duty/photos_scope), getFeeForType() helper, fee auto-fill from vendor fee columns, mileage_add field, photographer_payout field (shown for photos_scope only), fee summary section (base + mileage - photographer = total), default_insurance_company auto-fill, useRole hook for NavBar
- `src/routes/admin/new-claim.css` -- Added .new-claim__fee-summary, .new-claim__fee-row, .new-claim__fee-total

### Assumptions
- Fee lookup falls back to pay_amount if specific fee column is null
- Photographer payout only shown when claim_type is photos_scope
- Fee summary is read-only display, file_total not saved separately on create (calculated on save)

---

## Area 4: Claim Detail Page

### Files Modified
- `src/routes/appraiser/ClaimDetail.tsx` -- All 40+ emoji instances removed, status dropdown replaced with 6 explicit buttons (Mark Scheduled, In Progress, Send to Writer, Mark Complete, Cancel Claim, Delete Claim), isAdmin checks expanded to include dispatch role, useRole import added

### Assumptions
- Button system uses existing .btn base classes (--ghost, --primary, --danger, --sm)
- Dispatch users get same edit/status capabilities as admin
- Writer role retains existing "Mark Writing Complete" button visibility
- Lightbox transform style and photo backgroundImage kept as dynamic CSS (allowed exception)

---

## Area 5: Claims Table

### Files Modified
- `src/routes/admin/Claims.tsx` -- Added pipeline_stage and claim_type to Claim type, pipeline_stage badge on claim cards (shown when not "received"), useRole hook for NavBar, isAdmin check expanded to include dispatch

### Assumptions
- Pipeline stage badge shows stage name with underscores replaced by spaces
- "received" stage is hidden (default/initial state)
- Existing status filter pills remain as primary filter mechanism

---

## Area 6: Appraiser Scorecard

### Files Created
- `src/routes/admin/ContractorDetail.tsx` -- Contractor detail page at /admin/contractors/:id with profile info, 90-day scorecard (open claims, completed, completion rate, avg days, total claims, revenue), open claims list, recent completed list
- `src/routes/admin/contractor-detail.css` -- Full BEM CSS for .cd block, responsive grid layouts, claim row styling
- `src/routes/appraiser/Scorecard.tsx` -- Appraiser self-service scorecard at /appraiser/scorecard, reuses cd__ CSS classes, shows 90-day performance + open claims + recent completed

### Files Modified
- `src/components/admin/ContractorManagement.tsx` -- Card click now navigates to /admin/contractors/:id (was setSelected), useNavigate import, useRole for NavBar
- `src/main.tsx` -- Added ContractorDetail and Scorecard imports, /admin/contractors/:id route (admin/dispatch), /appraiser/scorecard route (appraiser)
- `src/components/NavBar.tsx` -- Added "Scorecard" tab to APPRAISER_TABS, "Score" to APPRAISER_BOTTOM_NAV

### Assumptions
- Contractor detail and appraiser scorecard share the same CSS (cd__ block)
- 90-day window for all performance metrics
- Revenue calculated from pay_amount on completed claims
- Scorecard shows max 10 recent completed claims

---

## Migration Applied

### File: `supabase/migrations/20260309_redesign_roles_pipeline.sql`

| Table | Column/Constraint | Type | Notes |
|-------|-------------------|------|-------|
| profiles | role CHECK | expanded | admin, dispatch, writer, appraiser |
| claims | pipeline_stage | TEXT DEFAULT 'received' | 11 values with CHECK constraint |
| claims | completed_at | TIMESTAMPTZ | Backfilled from updated_at for COMPLETED |
| claims | claim_type | TEXT DEFAULT 'auto' | auto, heavy_duty, photos_scope |
| claims | mileage_add | NUMERIC(10,2) DEFAULT 0 | |
| claims | photographer_payout | NUMERIC(10,2) DEFAULT 0 | |
| vendors | fee_auto | NUMERIC(10,2) | |
| vendors | fee_heavy_duty | NUMERIC(10,2) | |
| vendors | fee_photos_scope | NUMERIC(10,2) | |
| vendors | default_insurance_company | TEXT | |

### Backfill Logic
- pipeline_stage derived from status + assigned_to + appointment_start
- completed_at set to updated_at for existing COMPLETED claims

---

## Summary of All Files

### Created (7 files)
1. `src/hooks/useRole.ts`
2. `src/components/auth/RoleGuard.tsx`
3. `src/routes/admin/ContractorDetail.tsx`
4. `src/routes/admin/contractor-detail.css`
5. `src/routes/appraiser/Scorecard.tsx`
6. `supabase/migrations/20260309_redesign_roles_pipeline.sql`
7. `DESIGN_AUDIT.md`

### Modified (12 files)
1. `src/lib/supabaseAuthz.ts`
2. `src/components/NavBar.tsx`
3. `src/components/admin/ContractorManagement.tsx`
4. `src/routes/App.tsx`
5. `src/routes/app.css`
6. `src/routes/admin/Claims.tsx`
7. `src/routes/admin/NewClaim.tsx`
8. `src/routes/admin/new-claim.css`
9. `src/routes/appraiser/ClaimDetail.tsx`
10. `src/main.tsx`
