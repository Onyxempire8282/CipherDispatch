# CIPHER DISPATCH FUNCTIONAL AUDIT
Date: 2026-03-10

---

## BLOCKING (app unusable without fixing)

- BUG-01 | `ClaimDetail.tsx:356` | `navigate()` is undefined — should be `nav()`. Calling `markComplete()` will crash with ReferenceError, preventing appraisers from completing claims via the detail page.
- BUG-02 | `Claims.tsx:568-572` | "Unknown User" shown for ALL assigned claims. The `claims_v` view does not join `profiles`, so `r.profiles?.full_name` is always null. Every assigned claim displays "Unknown User" instead of the appraiser's name.
- BUG-03 | `NewClaim.tsx:188-201` | Multiple form fields collected but never sent to RPC: `claim_type`, `mileage_add`, `photographer_payout`, `appointment_end`, `insurance_company`, `status`, `date_of_loss`, `email`. Data entered by dispatchers is silently discarded on save.

## HIGH (major UX or data problem)

- HIGH-01 | `Claims.tsx:169-171` | NEEDS SCHEDULING tab uses `OR` filter (`assigned_to.is.null,appointment_start.is.null`). A claim with a scheduled date but no assigned appraiser still appears in "Needs Scheduling". Should use AND logic or separate "Needs Assignment" from "Needs Scheduling".
- HIGH-02 | `Claims.tsx:310-340` | Tab badge counts (from server COUNT queries) and status pill counts (from client-side filtered `allClaims`) use different data sources. Counts will disagree, confusing dispatchers.
- HIGH-03 | `NewClaim.tsx:571-585` | `location_type` field still renders in UI and collects input, but was removed from the RPC call. User input is silently discarded.
- HIGH-04 | `NewClaim.tsx:634` | Can save status="SCHEDULED" without appointment times — no validation enforces the requirement that scheduled claims must have dates.
- HIGH-05 | `ClaimDetail.tsx:1376` | `.detail__btn--complete` CSS class referenced but not defined in `claim-detail.css`. Writer "Mark Writing Complete" button has no styling.
- HIGH-06 | `ClaimDetail.tsx:312-316` | Discard edit does not reset form state. If user edits fields, cancels, then re-enters edit mode, the stale edited values persist instead of reverting to original claim data.
- HIGH-07 | `MonthlyCalendar.tsx:73` | Completed claims with `appointment_start` still appear on the calendar. They should be filtered out or visually distinguished to avoid dispatcher confusion.

## MEDIUM (visible problem, workaround exists)

- MED-01 | `Claims.tsx:456,512` | Scientific notation risk for claim numbers. If `claim_number` is stored as numeric in DB, large values (e.g., 4720210000000) render as `#4.72021E+12`. Verify column is TEXT type.
- MED-02 | `NewClaim.tsx:144-146` | Only 3 fields validated (claim #, customer name, address). No format validation on phone, email, VIN (17 chars), year range, ZIP format, or appointment end > start.
- MED-03 | `App.tsx:172` | Dashboard "Create New Claim" card links to `/admin/claims/new` — the only legacy `/admin/*` path remaining. No clean URL alias exists for this route.
- MED-04 | `ClaimDetail.tsx:389` | After deleting a claim, redirects to `/admin/claims` (legacy path) instead of `/claims`.
- MED-05 | Multiple files | `--status-completed: #4a9e6b` (green) used for completion indicators across the app. Should align with amber-only accent system per design codex.
- MED-06 | `NewClaim.tsx:157` | `file_number` is always set to `null`, never exposed in form. Field exists in RPC but serves no purpose.

## LOW (polish, design violations)

- LOW-01 | `claim-detail.css:231,258,268` | Green buttons (#10b981): Save Changes, Open in Google Maps, Mark as Paid. Should be amber or ghost variant.
- LOW-02 | `claim-detail.css:691,861` | Green download links (#10b981) for photo download and lightbox download.
- LOW-03 | `Button.tsx:34` | Primary button variant uses `bg-blue-600` (Tailwind blue). Should be amber per design system.
- LOW-04 | `Button.tsx:37` | Success button variant uses `bg-status-completed` (green). Should be amber.
- LOW-05 | `Badge.tsx:57` | Info badge variant uses `bg-blue-600`. Should use amber or steel.
- LOW-06 | `ErrorMessage.tsx:44` | Retry link uses `text-blue-400`. Should use amber.
- LOW-07 | `LoadingSpinner.tsx:29` | Spinner uses `border-blue-500`. Should use amber.
- LOW-08 | `TabNavigation.tsx:94-111` | Active tab uses `border-blue-500`, `text-blue-400`, `bg-blue-600`. All should be amber.
- LOW-09 | `FirmFilterCheckboxes.tsx:79,102,120` | Uses `text-green-400`, `text-red-400`, `text-blue-500` Tailwind classes. Should use design tokens.
- LOW-10 | `Card.tsx:24` | Uses `rounded-lg` — border-radius must be 0 per design system.
- LOW-11 | `Button.tsx:30` | Uses `rounded` — border-radius must be 0.
- LOW-12 | `ErrorMessage.tsx:17` | Uses `rounded-lg` — border-radius must be 0.
- LOW-13 | `FirmFilterCheckboxes.tsx:66,71` | Uses `rounded-lg`, `rounded-t-lg` — border-radius must be 0.
- LOW-14 | `ProtectedRoute.tsx:83` | Uses `rounded-lg` — border-radius must be 0.
- LOW-15 | `StatusSummary.tsx:68` | Uses `rounded-lg` — border-radius must be 0.
- LOW-16 | `FirmFilterCheckboxes.tsx:74` | Emoji in JSX: `🏢` building emoji.
- LOW-17 | `PhotoCapture.tsx:569` | Emoji in JSX: `✓` checkmark.
- LOW-18 | `ClientPortal.tsx:169` | Emoji in JSX: `✓ Confirmed`.
- LOW-19 | `ConfirmAppointment.tsx:132` | Emoji in JSX: `✓ Confirm My Appointment`.
- LOW-20 | `ClaimDetail.tsx:1327` | Emoji in JSX: `✓ Customer confirmed appointment`.
- LOW-21 | `MobileClaimDetail.tsx:292` | Emoji in JSX: `✓ Customer confirmed`.
- LOW-22 | `PayoutDetailModal.tsx:116` | Emoji in JSX: `✓` checkmark.
- LOW-23 | `ClientPortal.tsx:217` | Inline style with direct CSS: `style={{ color: "#4ade80", borderColor: "#4ade80" }}`.
- LOW-24 | `NewClaim.tsx:598` | Inline style: `style={{ height: "100%", width: "100%" }}`.
- LOW-25 | `ClaimDetail.tsx:1515` | Inline style: `style={{ height: "100%", width: "100%" }}`.
- LOW-26 | `kpi-dashboard.css:283,292,498` | Green colors (#4ade80) for KPI positive indicators.
- LOW-27 | `kpi-dashboard.css:303` | Blue color (#60a5fa) for KPI chart border.
- LOW-28 | `claim-detail.css:468` | Blue color (#60a5fa) for IN_PROGRESS supplement status.
- LOW-29 | `KPIDashboard.tsx:127,130,165` | Inline color values (#60a5fa, #4ade80) for chart colors instead of design tokens.

---

## SCORECARD

| Area | Score | Notes |
|------|-------|-------|
| Navigation | 9/10 | All nav links match routes. One legacy `/admin/claims/new` path remains. |
| Dashboard | 8/10 | Stats use proper parallel COUNT queries. Archived card removed. One legacy link. |
| Create Claim | 4/10 | Multiple fields silently discarded on save. Minimal validation. Location type orphaned. |
| Claim Detail | 5/10 | ReferenceError crash in markComplete. Green buttons. Edit discard broken. Missing CSS class. |
| Claims List | 5/10 | "Unknown User" on all assigned claims. Needs Scheduling filter logic wrong. Count mismatch. |
| Calendar | 7/10 | Data loads correctly. Legend is collapsible. Completed claims still show. Toolbar cleaned. |
| Vendors & Payouts | 9/10 | Full CRUD. Payout forecasting works. Summary cards calculate correctly. |
| Contractors | 9/10 | Cards display correctly. Detail page loads scorecard. All queries working. |
| Design System | 3/10 | 29 design violations: green/blue colors, border-radius, emoji, inline styles throughout. |
| **OVERALL** | **6/10** | Core infrastructure solid. Data integrity issues in create flow. Design system inconsistently applied. |

---

## RECOMMENDED FIX ORDER

### BLOCKING — Fix Immediately
1. **BUG-01**: Fix `navigate` → `nav` in ClaimDetail.tsx line 356 (crash on mark complete)
2. **BUG-02**: Fix "Unknown User" — join profiles in claims query or add profile lookup
3. **BUG-03**: Pass all collected form fields to `create_claim` RPC (claim_type, insurance_company, appointment_end, date_of_loss, email, status, mileage_add, photographer_payout)

### HIGH — Fix This Sprint
4. **HIGH-01**: Fix NEEDS SCHEDULING filter — change OR to AND or split into separate tabs
5. **HIGH-02**: Unify tab counts and status pill counts to use same data source
6. **HIGH-03**: Remove orphaned location_type field from NewClaim UI
7. **HIGH-04**: Add validation requiring appointment times when status is SCHEDULED
8. **HIGH-05**: Add `.detail__btn--complete` CSS class to claim-detail.css
9. **HIGH-06**: Reset edit form state to original claim values on discard
10. **HIGH-07**: Filter completed claims from calendar or add visual distinction

### MEDIUM — Fix Next Sprint
11. **MED-01**: Verify claim_number is TEXT type in database; cast to string if numeric
12. **MED-02**: Add format validation for phone, email, VIN, ZIP, year, appointment range
13. **MED-03**: Add clean URL `/claims/new` route alias
14. **MED-04**: Update post-delete redirect to `/claims`
15. **MED-05**: Replace green status color with amber or design-system-approved alternative
16. **MED-06**: Remove unused `file_number` from RPC or expose in form

### LOW — Design Debt Backlog
17. **LOW-01 to LOW-02**: Replace green button colors with amber/ghost variants in claim-detail.css
18. **LOW-03 to LOW-08**: Replace all Tailwind blue classes with amber in UI primitives (Button, Badge, ErrorMessage, LoadingSpinner, TabNavigation)
19. **LOW-10 to LOW-15**: Remove all border-radius from Card, Button, ErrorMessage, FirmFilter, ProtectedRoute, StatusSummary
20. **LOW-16 to LOW-22**: Replace emoji characters with styled text or CSS-based indicators
21. **LOW-23 to LOW-25**: Move inline styles to CSS files
22. **LOW-26 to LOW-29**: Replace green/blue hardcoded colors in KPI and supplement status with design tokens
