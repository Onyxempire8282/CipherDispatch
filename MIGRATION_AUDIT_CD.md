# CIPHER DISPATCH — ARCHITECTURE AUDIT

**Generated:** 2026-03-14
**Scope:** Full repo audit — files, tables, edge functions, auth, env vars
**Purpose:** Migration readiness and dependency mapping

---

## 1. COMPLETE FILE LISTING (src/)

### Components
| File | Type |
|------|------|
| `src/components/ClaimMessageThread.tsx` | Messaging thread |
| `src/components/claimMessageScripts.ts` | Script templates |
| `src/components/claim-message-thread.css` | Messaging styles |
| `src/components/ErrorBoundary.tsx` | Error boundary |
| `src/components/ErrorBoundary.css` | Error boundary styles |
| `src/components/NavBar.tsx` | Navigation bar |
| `src/components/navbar.css` | Nav styles |
| `src/components/PayoutDetailModal.tsx` | Payout detail modal |
| `src/components/PayoutMonthlyView.tsx` | Payout monthly view |
| `src/components/PayoutSummaryCards.tsx` | Payout summary cards |
| `src/components/PayoutUpcomingView.tsx` | Payout upcoming view |
| `src/components/PayoutWeeklyView.tsx` | Payout weekly view |

### Components — Admin
| File | Type |
|------|------|
| `src/components/admin/ContractorManagement.tsx` | Contractor mgmt |
| `src/components/admin/contractor-management.css` | Styles |
| `src/components/admin/FirmFilterCheckboxes.tsx` | Firm filters |

### Components — Auth
| File | Type |
|------|------|
| `src/components/auth/ProtectedRoute.tsx` | Route guard |
| `src/components/auth/RoleGuard.tsx` | Role guard |

### Components — Claims
| File | Type |
|------|------|
| `src/components/claims/ClaimCard.tsx` | Claim card |
| `src/components/claims/MobileAgendaView.tsx` | Mobile agenda |
| `src/components/claims/mobile-agenda.css` | Styles |
| `src/components/claims/MobileClaimDetail.tsx` | Mobile claim detail |
| `src/components/claims/mobile-claim-detail.css` | Styles |
| `src/components/claims/MobileClaimsList.tsx` | Mobile claims list |
| `src/components/claims/mobile-claims.css` | Styles |
| `src/components/claims/MonthlyCalendar.tsx` | Monthly calendar |
| `src/components/claims/monthly-calendar.css` | Styles |
| `src/components/claims/StatusSummary.tsx` | Status summary |

### Components — UI Primitives
| File | Type |
|------|------|
| `src/components/ui/ActionFooter.tsx` | Action footer |
| `src/components/ui/action-footer.css` | Styles |
| `src/components/ui/Badge.tsx` | Badge |
| `src/components/ui/Button.tsx` | Button |
| `src/components/ui/Card.tsx` | Card |
| `src/components/ui/ErrorMessage.tsx` | Error message |
| `src/components/ui/Field.tsx` | Form field |
| `src/components/ui/field.css` | Styles |
| `src/components/ui/LoadingSpinner.tsx` | Loading spinner |
| `src/components/ui/PageHeader.tsx` | Page header |
| `src/components/ui/page-header.css` | Styles |
| `src/components/ui/TabNavigation.tsx` | Tab navigation |

### Routes — Admin
| File | Type |
|------|------|
| `src/routes/admin/Claims.tsx` | Claims dashboard |
| `src/routes/admin/claims.css` | Styles |
| `src/routes/admin/ContractorDetail.tsx` | Contractor detail |
| `src/routes/admin/contractor-detail.css` | Styles |
| `src/routes/admin/KPIDashboard.tsx` | KPI dashboard |
| `src/routes/admin/kpi-dashboard.css` | Styles |
| `src/routes/admin/NewClaim.tsx` | Create/edit claim |
| `src/routes/admin/new-claim.css` | Styles |
| `src/routes/admin/NewSupplement.tsx` | Create supplement |
| `src/routes/admin/new-supplement.css` | Styles |
| `src/routes/admin/PayoutDashboard.tsx` | Payout dashboard |
| `src/routes/admin/VendorProfile.tsx` | Vendor profile |
| `src/routes/admin/vendor-profile.css` | Styles |
| `src/routes/admin/Vendors.tsx` | Vendor list |
| `src/routes/admin/vendors.css` | Styles |
| `src/routes/admin/VendorsPayouts.tsx` | Vendors + payouts |
| `src/routes/admin/vendors-payouts.css` | Styles |

### Routes — Appraiser
| File | Type |
|------|------|
| `src/routes/appraiser/ClaimDetail.tsx` | Claim detail (main) |
| `src/routes/appraiser/claim-detail.css` | Styles |
| `src/routes/appraiser/Dashboard.tsx` | Appraiser dashboard |
| `src/routes/appraiser/appraiser-dashboard.css` | Styles |
| `src/routes/appraiser/MyClaims.tsx` | My claims list |
| `src/routes/appraiser/my-claims.css` | Styles |
| `src/routes/appraiser/MyRoutes.tsx` | My routes / today's run |
| `src/routes/appraiser/my-routes.css` | Styles |
| `src/routes/appraiser/PhotoCapture.tsx` | Photo capture |
| `src/routes/appraiser/photo-capture.css` | Styles |
| `src/routes/appraiser/Scorecard.tsx` | Appraiser scorecard |
| `src/routes/appraiser/today-run.css` | Today run styles |

### Routes — Public
| File | Type |
|------|------|
| `src/routes/public/ClientPortal.tsx` | Client portal |
| `src/routes/public/client-portal.css` | Styles |
| `src/routes/public/ConfirmAppointment.tsx` | Appointment confirm |
| `src/routes/public/confirm-appointment.css` | Styles |

### Routes — Root
| File | Type |
|------|------|
| `src/routes/App.tsx` | App shell / router |
| `src/routes/app.css` | Styles |
| `src/routes/Login.tsx` | Login page |
| `src/routes/login.css` | Styles |

### Lib / Config / Hooks / Types
| File | Type |
|------|------|
| `src/lib/supabase.ts` | HQ Supabase client |
| `src/lib/supabaseCD.ts` | Claim Cipher Supabase client |
| `src/lib/supabaseAuthz.ts` | Authorization layer |
| `src/lib/leafletConfig.ts` | Leaflet map config |
| `src/config/photoSlots.ts` | Photo slot definitions |
| `src/constants/firmColors.ts` | Firm color map |
| `src/hooks/useIsMobile.ts` | Mobile breakpoint hook |
| `src/hooks/useRole.ts` | Role detection hook |
| `src/types/mileage.ts` | Mileage types |
| `src/types/photoCapture.ts` | Photo capture types |

### Utils
| File | Type |
|------|------|
| `src/utils/claimFilters.ts` | Claim filter logic |
| `src/utils/csvExport.ts` | CSV export |
| `src/utils/dateHelpers.ts` | Date utilities |
| `src/utils/firmFeeConfig.ts` | Firm fee config |
| `src/utils/holidays.ts` | Holiday calendar |
| `src/utils/mileageExport.ts` | Mileage export |
| `src/utils/payoutCalculations.ts` | Payout calculations |
| `src/utils/payoutForecasting.ts` | Payout forecasting |
| `src/utils/payoutLogic.ts` | Payout logic |
| `src/utils/photoCapture.ts` | Photo capture utils |
| `src/utils/routeOperations.ts` | Route operations |
| `src/utils/stateTimezone.ts` | State timezone mapping |
| `src/utils/uploadManager.ts` | Photo upload manager |

### Styles / Assets / Entry
| File | Type |
|------|------|
| `src/main.tsx` | App entry point |
| `src/index.css` | Global styles |
| `src/styles/cipher-theme.css` | Theme tokens |
| `src/styles/payout-dashboard.css` | Payout styles |
| `src/assets/logo.png` | Logo |
| `src/vite-env.d.ts` | Vite env types |
| `src/pwa-env.d.ts` | PWA env types |
| `src/AUDIT_REPORT.md` | Previous audit |

---

## 2. SUPABASE TABLE CALLS

### HQ Database (`supabase` client — aviwltfqlunxxvkajpyt)

| Table | Operation | Files |
|-------|-----------|-------|
| `claims_v` | SELECT | NavBar.tsx, App.tsx, Claims.tsx, ContractorManagement.tsx (×2), ContractorDetail.tsx (×2), KPIDashboard.tsx, NewClaim.tsx, NewSupplement.tsx (×3), PayoutDashboard.tsx (×3), VendorProfile.tsx (×5), VendorsPayouts.tsx, ClaimDetail.tsx (×3), Dashboard.tsx (×3), MyClaims.tsx, MyRoutes.tsx, Scorecard.tsx (×2), ClientPortal.tsx, ConfirmAppointment.tsx, MobileClaimDetail.tsx |
| `claims` | UPDATE | Claims.tsx, MonthlyCalendar.tsx (×2), NewClaim.tsx (×2), PayoutDashboard.tsx, VendorsPayouts.tsx, ClaimDetail.tsx (×2), MyRoutes.tsx (×2), PhotoCapture.tsx, ConfirmAppointment.tsx |
| `claims` | INSERT | NewSupplement.tsx |
| `claims` | DELETE | ClaimDetail.tsx |
| `profiles` | SELECT | Claims.tsx, ContractorManagement.tsx, ContractorDetail.tsx, KPIDashboard.tsx, NewClaim.tsx (×2), NewSupplement.tsx (×2), Scorecard.tsx, App.tsx, ClaimDetail.tsx (×3), Dashboard.tsx, supabaseAuthz.ts |
| `profiles` | UPDATE | ContractorManagement.tsx |
| `vendors` | SELECT | NewClaim.tsx, PayoutDashboard.tsx, VendorProfile.tsx, Vendors.tsx, VendorsPayouts.tsx (×2), ClaimDetail.tsx |
| `vendors` | INSERT | Vendors.tsx, VendorsPayouts.tsx |
| `vendors` | UPDATE | PayoutDashboard.tsx, VendorProfile.tsx, Vendors.tsx, VendorsPayouts.tsx (×2) |
| `vendors` | DELETE | Vendors.tsx, VendorsPayouts.tsx |
| `claim_messages` | SELECT | ClaimMessageThread.tsx |
| `claim_messages` | INSERT | ClaimMessageThread.tsx, ClaimDetail.tsx, MobileClaimDetail.tsx |
| `portal_clients` | SELECT | ClientPortal.tsx |
| `routes` | SELECT | routeOperations.ts |
| `routes` | UPDATE | routeOperations.ts (×2) |
| `mileage_logs` | SELECT | mileageExport.ts, routeOperations.ts (×2) |
| `mileage_logs` | INSERT | routeOperations.ts |
| `mileage_logs` | DELETE | routeOperations.ts (×2) |

### Claim Cipher Database (`supabaseCD` client — qrouuoycvxxxutkxkxpp)

| Table | Operation | Files |
|-------|-----------|-------|
| `claim_photos` | SELECT | ClaimDetail.tsx, PhotoCapture.tsx |
| `claim_photos` | INSERT | ClaimDetail.tsx (×2), uploadManager.ts |
| `claim_photos` | DELETE | ClaimDetail.tsx (×2) |

### Storage Buckets (Claim Cipher)

| Bucket | Operation | Files |
|--------|-----------|-------|
| `claim-photos` | upload | ClaimDetail.tsx, uploadManager.ts |
| `claim-photos` | remove | ClaimDetail.tsx |
| `claim-photos` | getPublicUrl | uploadManager.ts |

---

## 3. SUPABASE EDGE FUNCTIONS

### Deployed in Repo (`supabase/functions/`)

| Function | File | Purpose |
|----------|------|---------|
| `notify-status-change` | `supabase/functions/notify-status-change/index.ts` | Status change notifications |
| `notify-claim-cancelled` | `supabase/functions/notify-claim-cancelled/index.ts` | Cancellation notifications |
| `notify-appraiser-assigned` | `supabase/functions/notify-appraiser-assigned/index.ts` | Appraiser assignment email |
| `invite-contractor` | `supabase/functions/invite-contractor/index.ts` | Contractor invitation |
| `sla-check` | `supabase/functions/sla-check/index.ts` | SLA monitoring |
| `create-claim` | `supabase/functions/create-claim/index.ts` | Claim creation RPC |
| `cleanup-old-photos` | `supabase/functions/cleanup-old-photos/index.ts` | Photo cleanup cron |
| `stripe-webhook` | `supabase/functions/stripe-webhook/index.ts` | Stripe payment webhook |

### Shared Modules (`supabase/functions/_shared/`)

| File | Purpose |
|------|---------|
| `cors.ts` | CORS headers |
| `supabase.ts` | Shared Supabase client |
| `stripe.ts` | Stripe client |
| `stateTimezone.ts` | State timezone mapping |

### Cron Jobs

| File | Purpose |
|------|---------|
| `supabase/functions/_cron/cron.yaml` | Scheduled function config |

### Functions Called from Frontend

| Function | Called Via | Files |
|----------|-----------|-------|
| `notify-status-change` | `supabase.functions.invoke()` | MonthlyCalendar.tsx, ClaimDetail.tsx (×2), MyRoutes.tsx, ConfirmAppointment.tsx |
| `invite-contractor` | `supabase.functions.invoke()` | ContractorManagement.tsx |
| `sla-check` | `supabase.functions.invoke()` | KPIDashboard.tsx |
| `notify-appraiser-assigned` | `fetch()` to CD functions URL | NewClaim.tsx, ClaimDetail.tsx (×2) |
| `notify-claim-cancelled` | `fetch()` to CD functions URL | ClaimDetail.tsx |

---

## 4. AUTH-RELATED CALLS

| Method | File | Line | Context |
|--------|------|------|---------|
| `supabase.auth.signInWithPassword()` | Login.tsx | 14 | Email/password login |
| `supabase.auth.signOut()` | NavBar.tsx | 114 | Logout button |
| `supabase.auth.signOut()` | App.tsx | 107 | Logout action |
| `supabase.auth.getUser()` | NavBar.tsx | 95 | Current user for nav |
| `supabase.auth.getUser()` | App.tsx | 59 | Session check on load |
| `supabase.auth.getUser()` | NewClaim.tsx | 150 | Set created_by |
| `supabase.auth.getUser()` | ClaimDetail.tsx | 124 | Viewed-by tracking |
| `supabase.auth.getUser()` | ClaimDetail.tsx | 384 | Assignment notification |
| `supabase.auth.getUser()` | ClaimDetail.tsx | 673 | Cancel notification |
| `supabase.auth.getUser()` | Dashboard.tsx | 62 | Appraiser dashboard |
| `supabase.auth.getUser()` | MyRoutes.tsx | 86 | Route filtering |
| `supabaseClient.auth.getSession()` | supabaseAuthz.ts | 54 | Initial session bootstrap |
| `supabase.auth.onAuthStateChange()` | App.tsx | — | Session listener |

### Authorization Layer

| File | Purpose |
|------|---------|
| `src/lib/supabaseAuthz.ts` | Role-based authorization (admin, dispatch, appraiser, writer) |
| `src/components/auth/ProtectedRoute.tsx` | Route-level auth guard |
| `src/components/auth/RoleGuard.tsx` | Component-level role guard |
| `src/hooks/useRole.ts` | React hook for current user role |

---

## 5. REFERENCES TO HQ / aviwltfqlunxxvkajpyt / CLAIM CIPHER

### HQ Supabase Project (aviwltfqlunxxvkajpyt)

| Location | Reference |
|----------|-----------|
| `.env` | `VITE_SUPABASE_URL=https://aviwltfqlunxxvkajpyt.supabase.co` |
| `.env` | `VITE_SUPABASE_ANON_KEY=sb_publishable_ZNd6UHF9PAgD3EPnP4M68w_4keZzSor` |
| `src/lib/supabase.ts` | Client using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| `deploy.yml` | Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `supabase/functions/sla-check/index.ts` | Queries `claims_v` via HQ URL |

### Claim Cipher Project (qrouuoycvxxxutkxkxpp)

| Location | Reference |
|----------|-----------|
| `.env` | `VITE_CD_SUPABASE_URL=https://qrouuoycvxxxutkxkxpp.supabase.co` |
| `.env` | `VITE_CD_SUPABASE_ANON_KEY=...` |
| `.env` | `VITE_CD_SUPABASE_STORAGE_URL=https://qrouuoycvxxxutkxkxpp.supabase.co/storage/v1` |
| `.env` | `VITE_CD_SUPABASE_FUNCTIONS_URL=https://qrouuoycvxxxutkxkxpp.supabase.co/functions/v1` |
| `src/lib/supabaseCD.ts` | Client using `VITE_CD_SUPABASE_URL` + `VITE_CD_SUPABASE_ANON_KEY` |
| `src/utils/uploadManager.ts` | Storage URL fallback |
| `deploy.yml` | Secrets: `VITE_CD_SUPABASE_URL`, `VITE_CD_SUPABASE_ANON_KEY`, `VITE_CD_SUPABASE_STORAGE_URL`, `VITE_CD_SUPABASE_FUNCTIONS_URL` |

### Service Role Key

| Location | Reference |
|----------|-----------|
| `.env` | `SUPABASE_SERVICE_ROLE_KEY=...` (NOT used in frontend code, server-only) |

---

## 6. ENVIRONMENT VARIABLES

| Variable | Used In | Purpose |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | `supabase.ts` | HQ database URL |
| `VITE_SUPABASE_ANON_KEY` | `supabase.ts` | HQ anon key |
| `VITE_CD_SUPABASE_URL` | `supabaseCD.ts` | Claim Cipher database URL |
| `VITE_CD_SUPABASE_ANON_KEY` | `supabaseCD.ts`, `NewClaim.tsx`, `ClaimDetail.tsx` | CD anon key (also used in fetch headers) |
| `VITE_CD_SUPABASE_STORAGE_URL` | `uploadManager.ts` | CD storage bucket URL |
| `VITE_CD_SUPABASE_FUNCTIONS_URL` | `NewClaim.tsx`, `ClaimDetail.tsx` | CD edge functions base URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Not used in frontend | Server-only key (in .env but unused) |

---

## 7. TWO-DATABASE ARCHITECTURE SUMMARY

```
┌─────────────────────────────────────────┐
│         FRONTEND (GitHub Pages)         │
│         React + Vite + TypeScript       │
├───────────────┬─────────────────────────┤
│               │                         │
│   supabase    │      supabaseCD         │
│   (HQ client) │    (CD client)          │
│               │                         │
├───────────────┼─────────────────────────┤
│               │                         │
│  HQ PROJECT   │   CLAIM CIPHER PROJECT  │
│  aviwltfqlun  │   qrouuoycvxxx          │
│               │                         │
│  Tables:      │   Tables:               │
│  - claims     │   - claim_photos        │
│  - claims_v   │                         │
│  - profiles   │   Storage:              │
│  - vendors    │   - claim-photos bucket │
│  - claim_msgs │                         │
│  - portal_cli │   Edge Functions:       │
│  - routes     │   - notify-appraiser-   │
│  - mileage_   │     assigned            │
│    logs       │                         │
│               │                         │
│  Edge Funcs:  │                         │
│  - notify-    │                         │
│    status-chg │                         │
│  - invite-    │                         │
│    contractor │                         │
│  - sla-check  │                         │
│  - create-    │                         │
│    claim      │                         │
│  - cleanup-   │                         │
│    old-photos │                         │
│  - stripe-    │                         │
│    webhook    │                         │
│  - notify-    │                         │
│    claim-     │                         │
│    cancelled  │                         │
│               │                         │
│  Auth:        │   Auth:                 │
│  - signIn     │   - persistSession:     │
│  - signOut    │     false               │
│  - getUser    │   - no auth state       │
│  - getSession │                         │
│  - authz layer│                         │
└───────────────┴─────────────────────────┘
```

### Key Architectural Notes

1. **Auth lives on HQ only** — `supabaseCD` has `persistSession: false`, no auth state management
2. **claims_v is a view** — reads use `claims_v`, writes use `claims` table directly
3. **Photo storage is split** — metadata in CD `claim_photos`, files in CD `claim-photos` bucket
4. **Edge functions span both projects** — most on HQ, `notify-appraiser-assigned` on CD
5. **RLS on HQ** — policies check `profiles.role` for admin/dispatch/appraiser/writer
6. **Realtime** — configured for `claims` table changes (Claims.tsx) and `claim_messages` (ClaimMessageThread.tsx)
