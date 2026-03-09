# Cipher Dispatch Design Audit

**Date:** 2026-03-08
**Subject:** Cipher Dispatch (auto-appraisal) vs. Claim Cipher Design System
**Purpose:** Identify every deviation from the Claim Cipher reference design system so each file can be brought into full compliance.

---

## Reference Design System (Abbreviated)

| Token | Value |
|-------|-------|
| --plate | #0e0f11 |
| --steel | #161a1d |
| --steel-mid | #1e2328 |
| --steel-lift | #252b31 |
| --input-bg | #0a0c0e |
| --rivet | #2e353d |
| --rivet-hi | #3d464f |
| --amber | #e8952a |
| --white | #edeae4 |
| --text-hi | #b8bdc2 |
| --text | #8f9399 |
| --text-dim | #6b7480 |
| --muted | #4a5058 |
| --green | #4caf6e |
| --red | #c0392b |

**Typography:** Bebas Neue (headings), DM Mono (labels/buttons/badges 10-11px, uppercase, tracked), Barlow 300 (body)
**Buttons:** DM Mono 11px, 0.12em, uppercase, padding 12px 28px, NO border-radius
**Inputs:** --input-bg, 1px --rivet border, border-top --rivet-hi, inset shadow, NO border-radius
**Cards:** --steel bg, 1px --rivet border, border-left 3px --rivet or --amber, header --steel-mid
**Navigation:** 72px height, DM Mono 11px tabs, amber active
**Modals:** rgba(7,8,10,0.88) overlay, blur(10px), --steel bg, border-top 2px amber
**Border-radius:** ZERO everywhere (only exceptions: nav-logo img, rivet dots, spinners use 50%)

---

## Compliant Files (No Action Needed)

The following files properly follow the Claim Cipher design system:

- `src/styles/cipher-theme.css`
- `src/index.css`
- `src/routes/login.css`
- `src/routes/app.css`
- `src/routes/admin/claims.css`
- `src/routes/admin/new-claim.css`
- `src/routes/admin/vendors.css`
- `src/styles/payout-dashboard.css`
- `src/components/navbar.css`
- `src/components/ui/page-header.css`
- `src/components/ui/field.css`
- `src/components/ui/action-footer.css`
- `src/components/claims/monthly-calendar.css`

---

## Files With Partial Compliance

### FILE: `src/routes/appraiser/my-claims.css`

| # | Element | Current | Expected | Severity |
|---|---------|---------|----------|----------|
| 1 | `.my-claims__error-box` | `border-radius: 8px` | `border-radius: 0` (zero radius rule) | HIGH |
| 2 | `.my-claims__retry-btn` | `border-radius: 6px` | `border-radius: 0` | HIGH |
| 3 | `.my-claims__retry-btn` | No font-family specified, inherits system font | `font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase` | HIGH |
| 4 | `.my-claims__retry-btn` | `padding: 12px 24px` | `padding: 12px 28px` (btn base) | LOW |
| 5 | `.my-claims__search` | `border-radius: 6px` | `border-radius: 0` | HIGH |
| 6 | `.my-claims__search` | `background: var(--plate); border: 2px solid var(--rivet)` | `background: var(--input-bg); border: 1px solid var(--rivet); border-top: 1px solid var(--rivet-hi); box-shadow: inset 0 1px 3px rgba(0,0,0,0.4)` | HIGH |
| 7 | `.my-claims__search` | `font-size: 14px` (no family set) | `font-family: 'Barlow', sans-serif; font-size: 13px` | MEDIUM |
| 8 | `.my-claims__search` | `padding: 8px 16px` | `padding: 11px 14px` | LOW |
| 9 | `.my-claims__toggle-btn` | `border-radius: 6px` | `border-radius: 0` | HIGH |
| 10 | `.my-claims__toggle-btn` | `font-weight: bold; font-size: 15px` | `font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase` | HIGH |
| 11 | `.my-claims__toggle-btn` | `padding: 8px 16px` | `padding: 12px 28px` | MEDIUM |
| 12 | `.my-claims__status-pill` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 13 | `.my-claims__status-pill` | `font-weight: bold; font-size: 14px` | `font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase` | HIGH |
| 14 | `.my-claims__status-label` | `font-size: 12px; opacity: 0.9` | `font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase` (badge pattern) | MEDIUM |
| 15 | `.my-claims__group-header` | `font-size: 18px; font-weight: bold` | `font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--amber)` (section title pattern) | HIGH |
| 16 | `.my-claims__card` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 17 | `.my-claims__card` | Missing `border-left: 3px solid var(--rivet)` | Card pattern requires left accent border | MEDIUM |
| 18 | `.my-claims__card:hover` | `transform: translateY(-4px)` | Excessive hover lift; design system uses subtle transforms | LOW |
| 19 | `.my-claims__card-number` | `font-size: 20px; font-weight: bold` | `font-family: 'Bebas Neue'; font-size: 20px` or `DM Mono` card title pattern | MEDIUM |
| 20 | `.my-claims__card-badge` | `border-radius: 4px` | `border-radius: 0` | HIGH |
| 21 | `.my-claims__card-badge` | `font-size: 11px; font-weight: bold` | `font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase` | MEDIUM |
| 22 | `.my-claims__card-section-title` | `font-weight: bold` (no family) | `font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.14em; font-size: 10px` (field label pattern) | MEDIUM |

---

### FILE: `src/routes/appraiser/claim-detail.css`

| # | Element | Current | Expected | Severity |
|---|---------|---------|----------|----------|
| 1 | `.detail` | `background: linear-gradient(135deg, var(--plate)...var(--steel-mid))` | `background: var(--plate)` (flat, no gradient) | HIGH |
| 2 | `.detail__header` | `background: linear-gradient(135deg, var(--amber) 0%, #764ba2 100%)` | `background: var(--steel-mid); border-bottom: 1px solid var(--rivet)` or page-header pattern | HIGH |
| 3 | `.detail__header` | `border-radius: 12px` | `border-radius: 0` | HIGH |
| 4 | `.detail__header` | Uses `#764ba2` (purple) | Not a design token; should use amber/steel palette | HIGH |
| 5 | `.detail__header-title` | `font-size: 28px; font-weight: bold` | `font-family: 'Bebas Neue'; font-size: 32px` (page title) | MEDIUM |
| 6 | `.detail__section` | `border-radius: 12px` | `border-radius: 0` | HIGH |
| 7 | `.detail__section` | `background: var(--steel-mid)` | `background: var(--steel)` (card bg), header uses --steel-mid | MEDIUM |
| 8 | `.detail__section-title` | `font-size: 22px; font-weight: bold; color: var(--white)` | `font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--amber)` | HIGH |
| 9 | `.detail__label` | `font-size: 15px; font-weight: 600; letter-spacing: 0.5px` | `font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-hi)` | HIGH |
| 10 | `.detail__input, .detail__select, .detail__textarea` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 11 | `.detail__input...` | `background: var(--steel-lift); border: 2px solid var(--rivet-hi)` | `background: var(--input-bg); border: 1px solid var(--rivet); border-top: 1px solid var(--rivet-hi); box-shadow: inset 0 1px 3px rgba(0,0,0,0.4)` | HIGH |
| 12 | `.detail__input...` | `font-size: 17px` | `font-size: 13px; font-family: 'Barlow'` | MEDIUM |
| 13 | `.detail__btn` | `border-radius: 8px; font-weight: 600; font-size: 15px` | `border-radius: 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; padding: 12px 28px` | HIGH |
| 14 | `.detail__btn--photo-capture` | `background: linear-gradient(135deg, var(--amber), #d97706)` | `background: var(--amber); border: 1px solid var(--amber)` (flat, no gradient) | MEDIUM |
| 15 | `.detail__btn--edit` | `background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3)` | Ghost button: `background: transparent; border: 1px solid var(--rivet); color: var(--muted)` | MEDIUM |
| 16 | `.detail__btn--save` | `background: linear-gradient(135deg, #10b981, #059669)` | `background: var(--green)` or amber primary; no gradient, use token | HIGH |
| 17 | `.detail__btn--cancel` | `background: rgba(239,68,68,0.9)` | Danger button: `background: rgba(192,57,43,0.1); border: 1px solid rgba(192,57,43,0.4); color: var(--red)` | HIGH |
| 18 | `.detail__btn--back` | `background: linear-gradient(135deg, #667eea, #764ba2)` | `#667eea` and `#764ba2` are not design tokens; use ghost or steel button | BLOCKING |
| 19 | `.detail__btn--disabled` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 20 | `.detail__link` | `color: #818cf8` | Not a design token; use `var(--amber)` for links | HIGH |
| 21 | `.detail__payout-heading` | `color: #a78bfa` | Not a design token; use `var(--amber)` for section headings | HIGH |
| 22 | `.detail__payout-badge` | `border-radius: 20px` | `border-radius: 0` | HIGH |
| 23 | `.detail__payout-badge--paid` | `background: #10b981` | Use `var(--green)` (#4caf6e) | MEDIUM |
| 24 | `.detail__payout-badge--overdue` | `background: #ef4444` | Use `var(--red)` (#c0392b) | MEDIUM |
| 25 | `.detail__firm-swatch` | `border-radius: 4px` | `border-radius: 0` | LOW |
| 26 | `.detail__notes-box` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 27 | `.detail__status-badge` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 28 | `.detail__status-select` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 29 | `.detail__status-select` | `background: var(--steel-lift); border: 2px solid var(--rivet-hi)` | Input pattern: `background: var(--input-bg); border: 1px solid var(--rivet); border-top: 1px solid var(--rivet-hi)` | HIGH |
| 30 | `.detail__map-wrap` | `border-radius: 12px` | `border-radius: 0` | HIGH |
| 31 | `.detail__map-empty` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 32 | `.detail__photo-label` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 33 | `.detail__photo-label--camera` | `background: linear-gradient(135deg, #667eea, #764ba2)` | Non-token colors; use amber primary or ghost button | BLOCKING |
| 34 | `.detail__photo-label--gallery` | `background: #10b981` | Use `var(--green)` or amber button | MEDIUM |
| 35 | `.detail__photo-btn-download` | `border-radius: 8px; background: linear-gradient(...)` | `border-radius: 0; background: var(--amber)` | HIGH |
| 36 | `.detail__photo-tip` | `border-radius: 8px; border-left: 4px solid #667eea` | `border-radius: 0; border-left: 3px solid var(--amber)` | HIGH |
| 37 | `.detail__photo-thumb` | `border-radius: 4px; border: 2px solid #ddd` | `border-radius: 0; border: 1px solid var(--rivet)` | HIGH |
| 38 | `.detail__photo-download` | `border-radius: 4px; background: #4CAF50` | `border-radius: 0; background: var(--green)` | MEDIUM |
| 39 | `.detail__lightbox-close` | `border-radius: 50px; background: white` | Non-token; use `background: var(--steel); color: var(--white); border-radius: 0` or minimal close btn | HIGH |
| 40 | `.detail__lightbox-zoom-btn` | `border-radius: 6px; background: #667eea` | `border-radius: 0; background: var(--amber)` or ghost button | HIGH |
| 41 | `.detail__lightbox-zoom-level` | `border-radius: 4px` | `border-radius: 0` | LOW |
| 42 | `.detail__lightbox-rotate-btn` | `border-radius: 6px; background: #667eea` | `border-radius: 0; background: var(--amber)` | HIGH |
| 43 | `.detail__lightbox-btn` | `border-radius: 6px; background: #667eea` | `border-radius: 0; background: var(--amber)` | HIGH |
| 44 | `.detail__lightbox-download` | `border-radius: 6px; background: #4CAF50` | `border-radius: 0; background: var(--green)` | MEDIUM |
| 45 | `.detail__lightbox-delete` | `border-radius: 6px; background: #f44336` | `border-radius: 0; background: rgba(192,57,43,0.1); border: 1px solid var(--red); color: var(--red)` (danger pattern) | HIGH |

---

### FILE: `src/routes/appraiser/photo-capture.css`

| # | Element | Current | Expected | Severity |
|---|---------|---------|----------|----------|
| 1 | `.capture` | `background: linear-gradient(135deg, var(--plate)...var(--steel-mid))` | `background: var(--plate)` (flat) | HIGH |
| 2 | `.capture__card` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 3 | `.capture__card--active-slot` | `border: 2px solid #667eea` | `border: 2px solid var(--amber)` (#667eea is not a token) | HIGH |
| 4 | `.capture__upload-status` | `border-radius: 6px` | `border-radius: 0` | HIGH |
| 5 | `.capture__type-btn` | `border-radius: 8px; font-size: 18px; font-weight: bold` | `border-radius: 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; padding: 12px 28px` | HIGH |
| 6 | `.capture__back-btn` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 7 | `.capture__photo-img` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 8 | `.capture__retake-btn` | `border-radius: 6px; font-weight: bold` | `border-radius: 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase` | HIGH |
| 9 | `.capture__capture-btn` | `border-radius: 8px; background: #667eea; font-size: 18px; font-weight: bold` | `border-radius: 0; background: var(--amber); font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase` | BLOCKING |
| 10 | `.capture__next-btn` | `border-radius: 8px; font-weight: bold` | `border-radius: 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase` | HIGH |
| 11 | `.capture__slot-btn` | `border-radius: 6px` | `border-radius: 0` | HIGH |
| 12 | `.capture__slot-btn--current` | `background: #667eea` | `background: var(--amber)` or `var(--amber-dim)` | HIGH |
| 13 | `.capture__complete-btn` | `border-radius: 8px; font-size: 20px; font-weight: bold` | `border-radius: 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase` | HIGH |
| 14 | `.capture__next-banner` | `border-radius: 8px` | `border-radius: 0` | MEDIUM |
| 15 | `.capture__orientation-warn` | `border-radius: 12px` | `border-radius: 0` | MEDIUM |
| 16 | `.capture__card-title` | `font-size: 16px` (no family) | `font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--amber)` (card title pattern) | HIGH |

---

### FILE: `src/routes/appraiser/my-routes.css`

| # | Element | Current | Expected | Severity |
|---|---------|---------|----------|----------|
| 1 | `.routes` | `background: linear-gradient(135deg, var(--plate)...var(--steel))` | `background: var(--plate)` (flat) | HIGH |
| 2 | `.routes__summary` | `border-radius: 8px` | `border-radius: 0` | HIGH |
| 3 | `.routes__success` | `border-radius: 8px; background: #065f46; color: #d1fae5` | `border-radius: 0; background: rgba(76,175,110,0.1); border: 1px solid var(--green); color: var(--green)` | HIGH |
| 4 | `.routes__error` | `border-radius: 8px; background: #7f1d1d; color: #fecaca` | `border-radius: 0; background: rgba(192,57,43,0.1); border: 1px solid var(--red); color: var(--red)` | HIGH |
| 5 | `.routes__empty` | `border-radius: 12px` | `border-radius: 0` | HIGH |
| 6 | `.routes__card` | `border-radius: 12px` | `border-radius: 0` | HIGH |
| 7 | `.routes__card` | Missing `border-left: 3px solid var(--rivet)` | Card pattern requires left accent border | MEDIUM |
| 8 | `.routes__card-date` | `font-size: 18px; font-weight: 600` | Should use `font-family: var(--font-mono)` or Bebas for headings | MEDIUM |
| 9 | `.routes__badge` | `border-radius: 12px` | `border-radius: 0` | HIGH |
| 10 | `.routes__badge` | `font-size: 12px; font-weight: 600` | `font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em` (badge pattern) | MEDIUM |
| 11 | `.routes__close-btn` | `border-radius: 8px; font-weight: 600` | `border-radius: 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; padding: 12px 28px` | HIGH |
| 12 | `.routes__close-btn:hover` | `background: #047857` | Use token or darken with filter; #047857 is not a design token | MEDIUM |
| 13 | `.routes__closed-banner` | `border-radius: 8px; background: #1a3d2e` | `border-radius: 0; background: rgba(76,175,110,0.1)` using token | HIGH |

---

## Files That Do Not Follow The Design System At All

### FILE: `src/routes/appraiser/ClaimDetail.css` (LEGACY DUPLICATE)

**Assessment: 220 lines of entirely wrong styles. Uses Tailwind-era palette, non-BEM classes, zero design tokens. This file should be deleted if it is truly a legacy duplicate of `claim-detail.css`.**

| # | Element | Current | Expected | Severity |
|---|---------|---------|----------|----------|
| 1 | `.claim-detail-container` | `background: linear-gradient(135deg, #0f172a, #1e293b, #334155)` | `background: var(--plate)` | BLOCKING |
| 2 | `.claim-detail-header` | `background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 12px; border: 1px solid #667eea` | Page header pattern with --steel-mid, no radius, no purple | BLOCKING |
| 3 | `.section-card` | `background: #2d3748; border: 1px solid #4a5568; border-radius: 12px` | `background: var(--steel); border: 1px solid var(--rivet); border-radius: 0` | BLOCKING |
| 4 | `.section-header` | `color: #e2e8f0; border-bottom: 2px solid #4a5568` | `font-family: var(--font-mono); font-size: 11px; color: var(--amber); border-bottom: 1px solid var(--rivet)` | BLOCKING |
| 5 | `.form-input, .form-select` | `background: #1a202c; border: 2px solid #4a5568; border-radius: 8px; color: #e2e8f0` | `background: var(--input-bg); border: 1px solid var(--rivet); border-radius: 0; color: var(--white)` | BLOCKING |
| 6 | `.form-input:focus` | `border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1)` | `border-color: var(--amber)` with amber glow | BLOCKING |
| 7 | `.form-label` | `color: #a0aec0; font-size: 14px` | `font-family: var(--font-mono); font-size: 10px; color: var(--text-hi); letter-spacing: 0.14em` | BLOCKING |
| 8 | `.button` | `border-radius: 8px; font-size: 15px; font-weight: 600` | Btn base: `border-radius: 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase` | BLOCKING |
| 9 | `.button-primary` | `background: #667eea` | `background: var(--amber); color: #000` | BLOCKING |
| 10 | `.button-success` | `background: #4CAF50` | `background: var(--green)` (#4caf6e) | BLOCKING |
| 11 | `.button-warning` | `background: #FF9800` | `background: var(--amber)` (#e8952a) | BLOCKING |
| 12 | `.button-danger` | `background: #ef4444` | `background: rgba(192,57,43,0.1); border: 1px solid var(--red); color: var(--red)` | BLOCKING |
| 13 | `.button-info` | `background: #2196F3` | No blue in design system; use ghost or steel variant | BLOCKING |
| 14 | `.photo-item` | `border-radius: 12px` | `border-radius: 0` | BLOCKING |
| 15 | `.status-badge` | `border-radius: 8px` | `border-radius: 0` | BLOCKING |
| 16 | `.status-completed` | `background: #4CAF50` | Use `var(--status-completed)` token | BLOCKING |
| 17 | `.status-in-progress` | `background: #FF9800` | Use `var(--status-progress)` token | BLOCKING |
| 18 | `.status-scheduled` | `background: #2196F3` | Use `var(--status-scheduled)` token | BLOCKING |
| 19 | `.map-container` | `border-radius: 12px` | `border-radius: 0` | BLOCKING |
| 20 | All class names | Non-BEM: `.claim-detail-container`, `.section-card`, `.form-input`, `.button` | Should use BEM: `.detail__*` pattern | BLOCKING |

---

### FILE: `src/components/claims/mobile-agenda.css`

**Assessment: 403 lines, entirely wrong color palette (#1a202c, #2d3748, #4a5568, #667eea). No design token usage. Should be rewritten from scratch.**

| # | Element | Current | Expected | Severity |
|---|---------|---------|----------|----------|
| 1 | `.mobile-agenda` | `background: linear-gradient(135deg, #1a202c, #2d3748)` | `background: var(--plate)` | BLOCKING |
| 2 | `.mobile-agenda__header` | `border-bottom: 1px solid #4a5568` | `border-bottom: 1px solid var(--rivet)` | BLOCKING |
| 3 | `.mobile-agenda__date` | `color: #e2e8f0` | `color: var(--white)` (#edeae4) | BLOCKING |
| 4 | `.mobile-agenda__date-detail` | `color: #a0aec0` | `color: var(--text-sub)` | BLOCKING |
| 5 | `.mobile-agenda__nav-btn` | `background: #374151; border-radius: 6px; color: #e2e8f0` | `background: var(--steel-lift); border-radius: 0; color: var(--text-hi)` | BLOCKING |
| 6 | `.mobile-agenda__nav-btn--active` | `background: #667eea` | `background: var(--amber)` | BLOCKING |
| 7 | `.mobile-agenda__backlog-btn` | `background: #2d3748; border: 2px solid #4a5568; border-radius: 8px; color: #e2e8f0` | `background: var(--steel); border: 1px solid var(--rivet); border-radius: 0; color: var(--white)` | BLOCKING |
| 8 | `.mobile-agenda__backlog-count` | `background: #667eea; border-radius: 12px` | `background: var(--amber); border-radius: 0` | BLOCKING |
| 9 | `.mobile-agenda__empty-text` | `color: #a0aec0` | `color: var(--text-sub)` | BLOCKING |
| 10 | `.mobile-agenda__empty-btn` | `background: #667eea; border-radius: 6px; font-size: 14px; font-weight: 600` | `background: var(--amber); border-radius: 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase` | BLOCKING |
| 11 | `.mobile-agenda__empty-btn--secondary` | `border: 2px solid #4a5568; color: #a0aec0` | Ghost: `border: 1px solid var(--rivet); color: var(--muted)` | BLOCKING |
| 12 | `.mobile-agenda__item` | `background: #2d3748; border-radius: 8px; color: #e2e8f0; border-left: 4px solid #9CA3AF` | `background: var(--steel); border-radius: 0; color: var(--white); border-left: 3px solid var(--rivet)` | BLOCKING |
| 13 | `.mobile-agenda__item-time` | `color: #e2e8f0` | `color: var(--white)` | BLOCKING |
| 14 | `.mobile-agenda__item-status` | `border-radius: 3px` | `border-radius: 0` | BLOCKING |
| 15 | `.mobile-agenda__item-client` | `color: #cbd5e0` | `color: var(--text-hi)` | BLOCKING |
| 16 | `.mobile-agenda__item-location` | `color: #718096` | `color: var(--text-dim)` | BLOCKING |
| 17 | `.mobile-agenda__item-divider` | `color: #4a5568` | `color: var(--muted)` | BLOCKING |
| 18 | `.mobile-agenda__overlay` | `background: rgba(0,0,0,0.6)` | `background: rgba(7,8,10,0.88); backdrop-filter: blur(10px)` (modal overlay) | BLOCKING |
| 19 | `.mobile-agenda__sheet` | `background: #1a202c; border-top-left-radius: 16px; border-top-right-radius: 16px` | `background: var(--steel); border-radius: 0; border-top: 2px solid var(--amber)` | BLOCKING |
| 20 | `.mobile-agenda__sheet-header` | `border-bottom: 1px solid #4a5568` | `background: var(--steel-mid); border-bottom: 1px solid var(--rivet)` | BLOCKING |
| 21 | `.mobile-agenda__sheet-title` | `color: #e2e8f0` | `font-family: 'Bebas Neue'; font-size: 24px; color: var(--white)` (modal title) | BLOCKING |
| 22 | `.mobile-agenda__sheet-close` | `background: #374151; border-radius: 50%; color: #e2e8f0` | `background: var(--steel-lift); border-radius: 0; color: var(--text-hi)` | BLOCKING |
| 23 | `.mobile-agenda__sheet-empty` | `color: #718096` | `color: var(--text-dim)` | BLOCKING |
| 24 | `.mobile-agenda__backlog-item` | `background: #2d3748; border-radius: 8px; color: #e2e8f0; border-left: 4px solid #9CA3AF` | `background: var(--steel); border-radius: 0; color: var(--white); border-left: 3px solid var(--rivet)` | BLOCKING |
| 25 | `.mobile-agenda__backlog-item-customer` | `color: #cbd5e0` | `color: var(--text-hi)` | BLOCKING |
| 26 | `.mobile-agenda__backlog-item-location` | `color: #718096` | `color: var(--text-dim)` | BLOCKING |
| 27 | All typography | System defaults used throughout | Should use DM Mono for labels/badges, Barlow 300 for body, Bebas for headings | BLOCKING |

---

### FILE: `src/components/claims/mobile-claim-detail.css`

**Assessment: 514 lines, entirely wrong color palette (#0f172a, #1e293b, #374151, #667eea). No design token usage. Should be rewritten from scratch.**

| # | Element | Current | Expected | Severity |
|---|---------|---------|----------|----------|
| 1 | `.mobile-detail` | `background: linear-gradient(135deg, #0f172a, #1e293b)` | `background: var(--plate)` | BLOCKING |
| 2 | `.mobile-detail__header` | `background: linear-gradient(135deg, #667eea, #764ba2)` | `background: rgba(14,15,17,0.98); border-bottom: 1px solid var(--rivet)` (nav pattern) | BLOCKING |
| 3 | `.mobile-detail__back` | `border-radius: 8px; background: rgba(255,255,255,0.2)` | `border-radius: 0; background: var(--steel-lift)` | BLOCKING |
| 4 | `.mobile-detail__status` | `border-radius: 4px` | `border-radius: 0` | BLOCKING |
| 5 | `.mobile-detail__edit-btn` | `border-radius: 6px; background: rgba(255,255,255,0.2)` | `border-radius: 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase` | BLOCKING |
| 6 | `.mobile-detail__save-btn` | `border-radius: 6px; background: #10b981` | `border-radius: 0; background: var(--green)` with btn pattern | BLOCKING |
| 7 | `.mobile-detail__cancel-btn` | `border-radius: 6px` | `border-radius: 0` | BLOCKING |
| 8 | `.mobile-detail__banner` | `background: #1e293b; border-bottom: 1px solid #374151` | `background: var(--steel-mid); border-bottom: 1px solid var(--rivet)` | BLOCKING |
| 9 | `.mobile-detail__customer-name` | `color: #e2e8f0` | `font-family: 'Bebas Neue'; color: var(--white)` | BLOCKING |
| 10 | `.mobile-detail__firm-badge` | `border-radius: 4px` | `border-radius: 0` | BLOCKING |
| 11 | `.mobile-detail__photo-capture-btn` | `border-radius: 8px; background: linear-gradient(135deg, #f59e0b, #d97706)` | `border-radius: 0; background: var(--amber)` | BLOCKING |
| 12 | `.mobile-detail__section` | `background: #374151; border-radius: 8px` | `background: var(--steel); border: 1px solid var(--rivet); border-radius: 0; border-left: 3px solid var(--rivet)` | BLOCKING |
| 13 | `.mobile-detail__section-header` | `color: #e2e8f0` | `font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--amber)` | BLOCKING |
| 14 | `.mobile-detail__section-chevron` | `color: #a0aec0` | `color: var(--text-sub)` | BLOCKING |
| 15 | `.mobile-detail__section-content` | `border-top: 1px solid #4a5568` | `border-top: 1px solid var(--rivet)` | BLOCKING |
| 16 | `.mobile-detail__field-label` | `color: #a0aec0; font-size: 11px; letter-spacing: 0.5px` | `font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em; color: var(--text-hi)` | BLOCKING |
| 17 | `.mobile-detail__field-value` | `color: #e2e8f0` | `color: var(--white)` | BLOCKING |
| 18 | `.mobile-detail__field-value--link` | `color: #818cf8` | `color: var(--amber)` | BLOCKING |
| 19 | `.mobile-detail__field-empty` | `color: #718096` | `color: var(--text-dim)` | BLOCKING |
| 20 | `.mobile-detail__maps-btn` | `border-radius: 8px; background: #10b981` | `border-radius: 0; background: var(--green)` with btn pattern | BLOCKING |
| 21 | `.mobile-detail__notes` | `background: #2d3748; border-radius: 6px; color: #e2e8f0` | `background: var(--steel); border: 1px solid var(--rivet); border-radius: 0; color: var(--white)` | BLOCKING |
| 22 | `.mobile-detail__photo` | `border-radius: 6px; border: 2px solid #4a5568` | `border-radius: 0; border: 1px solid var(--rivet)` | BLOCKING |
| 23 | `.mobile-detail__status-current` | `background: #2d3748; border-radius: 6px` | `background: var(--steel); border-radius: 0` | BLOCKING |
| 24 | `.mobile-detail__status-label` | `color: #a0aec0` | `color: var(--text-sub)` | BLOCKING |
| 25 | `.mobile-detail__status-badge` | `border-radius: 4px` | `border-radius: 0` | BLOCKING |
| 26 | `.mobile-detail__action-btn` | `border-radius: 6px` | `border-radius: 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase` | BLOCKING |
| 27 | `.mobile-detail__action-btn--scheduled` | `background: #2196F3` | Use `var(--status-scheduled)` token | BLOCKING |
| 28 | `.mobile-detail__action-btn--progress` | `background: #FF9800` | Use `var(--status-progress)` token | BLOCKING |
| 29 | `.mobile-detail__action-btn--complete` | `background: #4CAF50` | Use `var(--status-completed)` token | BLOCKING |
| 30 | `.mobile-detail__danger-warning` | `border-radius: 6px` | `border-radius: 0` | BLOCKING |
| 31 | `.mobile-detail__delete-btn` | `border-radius: 8px; background: #ef4444` | `border-radius: 0; background: rgba(192,57,43,0.1); border: 1px solid var(--red); color: var(--red)` (danger btn) | BLOCKING |
| 32 | `.mobile-detail__action-bar` | `background: #1e293b; border-top: 1px solid #374151` | `background: var(--steel-mid); border-top: 1px solid var(--rivet)` | BLOCKING |
| 33 | `.mobile-detail__complete-btn` | `border-radius: 8px; background: linear-gradient(135deg, #4CAF50, #45a049)` | `border-radius: 0; background: var(--green)` | BLOCKING |

---

### FILE: `src/components/claims/mobile-claims.css`

**Assessment: 446 lines, entirely wrong color palette (#0f172a, #1e293b, #374151, #667eea, #764ba2). No design token usage. Should be rewritten from scratch.**

| # | Element | Current | Expected | Severity |
|---|---------|---------|----------|----------|
| 1 | `.mobile-claims` | `background: linear-gradient(135deg, #0f172a, #1e293b)` | `background: var(--plate)` | BLOCKING |
| 2 | `.mobile-claims__header` | `background: linear-gradient(135deg, #667eea, #764ba2)` | `background: rgba(14,15,17,0.98); border-bottom: 1px solid var(--rivet)` | BLOCKING |
| 3 | `.mobile-claims__title` | `color: white` | `color: var(--white)` (#edeae4, not pure white) | BLOCKING |
| 4 | `.mobile-claims__search-btn` | `border-radius: 8px; background: rgba(255,255,255,0.2)` | `border-radius: 0; background: var(--steel-lift)` | BLOCKING |
| 5 | `.mobile-claims__search-input` | `border-radius: 8px; background: rgba(255,255,255,0.95); color: #1e293b` | `border-radius: 0; background: var(--input-bg); color: var(--white); border: 1px solid var(--rivet)` | BLOCKING |
| 6 | `.mobile-claims__search-input::placeholder` | `color: #64748b` | `color: var(--text-dim)` | BLOCKING |
| 7 | `.mobile-claims__search-close` | `border-radius: 8px` | `border-radius: 0` | BLOCKING |
| 8 | `.mobile-claims__filters` | `background: #1e293b` | `background: var(--steel-mid)` | BLOCKING |
| 9 | `.mobile-claims__filter-pill` | `background: #374151; color: #a0aec0; border-radius: 20px` | `background: var(--steel-lift); color: var(--text-sub); border-radius: 0` | BLOCKING |
| 10 | `.mobile-claims__filter-pill--active` | `background: #667eea` | `background: var(--amber-dim); color: var(--amber); border-bottom: 2px solid var(--amber)` | BLOCKING |
| 11 | `.mobile-claims__sort` | `background: #1e293b; border-bottom: 1px solid #374151` | `background: var(--steel-mid); border-bottom: 1px solid var(--rivet)` | BLOCKING |
| 12 | `.mobile-claims__sort-select` | `background-color: #374151; border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0` | `background: var(--input-bg); border: 1px solid var(--rivet); border-radius: 0; color: var(--white)` | BLOCKING |
| 13 | `.mobile-claims__sort-select:focus` | `border-color: #667eea` | `border-color: var(--amber)` | BLOCKING |
| 14 | `.mobile-claims__empty-text` | `color: #e2e8f0` | `color: var(--white)` | BLOCKING |
| 15 | `.mobile-claims__empty-subtext` | `color: #718096` | `color: var(--text-dim)` | BLOCKING |
| 16 | `.mobile-claims__card` | `background: #374151; border-radius: 8px; color: #e2e8f0; border-left: 4px solid #9CA3AF` | `background: var(--steel); border-radius: 0; color: var(--white); border-left: 3px solid var(--rivet)` | BLOCKING |
| 17 | `.mobile-claims__card-number` | `color: #e2e8f0` | `color: var(--white)` | BLOCKING |
| 18 | `.mobile-claims__card-status` | `border-radius: 3px` | `border-radius: 0` | BLOCKING |
| 19 | `.mobile-claims__card-row2` | `color: #f1f5f9` | `color: var(--text-hi)` | BLOCKING |
| 20 | `.mobile-claims__card-row3` | `color: #a0aec0` | `color: var(--text-sub)` | BLOCKING |
| 21 | `.mobile-claims__card-time-sep` | `color: #64748b` | `color: var(--text-dim)` | BLOCKING |
| 22 | `.mobile-claims__fab` | `background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%` | `background: var(--amber); border-radius: 50%` (FAB is allowed 50%) | BLOCKING |
| 23 | `.mobile-claims__fab` | `box-shadow: 0 4px 12px rgba(102,126,234,0.4)` | Amber-based shadow if any | BLOCKING |
| 24 | All typography | System defaults used throughout | Should use DM Mono for labels/badges, Barlow 300 for body | BLOCKING |

---

## Summary

### Total Mismatches by Severity

| Severity | Count |
|----------|-------|
| BLOCKING | 124 |
| HIGH | 71 |
| MEDIUM | 22 |
| LOW | 5 |
| **Total** | **222** |

### Mismatches by Element Type

| Element Type | Count | Notes |
|--------------|-------|-------|
| **Border-radius** | 82 | Most pervasive issue. Every appraiser/mobile file has rounded corners. |
| **Colors (hardcoded)** | 68 | #667eea, #764ba2, #2d3748, #4a5568, #1e293b, #0f172a, etc. |
| **Typography** | 32 | Missing DM Mono for labels/buttons/badges, Bebas for headings, Barlow for body |
| **Buttons** | 18 | Wrong font, size, padding, radius, gradients instead of flat |
| **Inputs** | 8 | Wrong bg, border style, missing inset shadow, radius |
| **Cards** | 7 | Wrong bg color, missing left border accent, radius |
| **Modals/Overlays** | 4 | Wrong overlay opacity, missing blur, wrong sheet styling |
| **Gradients** | 9 | Used where flat colors should be |
| **Links** | 2 | #818cf8 instead of amber |

### Pages Ranked by Work Required (Most to Least)

| Rank | File | Mismatches | Severity |
|------|------|-----------|----------|
| 1 | `mobile-claims.css` | 24 | All BLOCKING |
| 2 | `mobile-claim-detail.css` | 33 | All BLOCKING |
| 3 | `mobile-agenda.css` | 27 | All BLOCKING |
| 4 | `ClaimDetail.css` (legacy) | 20 | All BLOCKING (candidate for deletion) |
| 5 | `claim-detail.css` | 45 | Mix of BLOCKING/HIGH |
| 6 | `photo-capture.css` | 16 | Mix of BLOCKING/HIGH |
| 7 | `my-claims.css` | 22 | All HIGH/MEDIUM |
| 8 | `my-routes.css` | 13 | All HIGH/MEDIUM |

### Pages That Are Close to Compliant

These files use the correct tokens and patterns with only border-radius and minor typography issues:
- `my-claims.css` -- tokens mostly correct, needs radius removal and DM Mono typography
- `my-routes.css` -- tokens mostly correct, needs radius removal and DM Mono typography

### Shared Issues Across All Non-Compliant Pages

1. **border-radius used everywhere** -- The zero-radius rule is violated in every non-compliant file. Buttons, cards, badges, inputs, banners, modals, photos all have 3px-20px radius.

2. **#667eea / #764ba2 used as primary accent** -- These Tailwind indigo/purple colors appear in buttons, headers, active states, and highlights across all mobile files and the appraiser claim-detail. Should be `var(--amber)` (#e8952a).

3. **Hardcoded Tailwind palette instead of tokens** -- #1a202c, #2d3748, #374151, #4a5568, #e2e8f0, #a0aec0 used instead of --plate, --steel, --steel-lift, --rivet, --white, --text-sub.

4. **No font-family declarations** -- Mobile files and appraiser pages rely on system defaults. DM Mono (labels/buttons/badges), Bebas Neue (headings), and Barlow 300 (body) are absent.

5. **Gradient backgrounds where flat is required** -- `linear-gradient(135deg, ...)` used on page backgrounds, headers, and buttons. The design system uses flat solid colors exclusively.

6. **Wrong input styling** -- Inputs use --steel-lift or hardcoded dark bg instead of --input-bg, 2px borders instead of 1px, missing inset shadow, missing border-top differentiation.

7. **Button styling completely off** -- Buttons lack DM Mono, letter-spacing, uppercase transform, and correct padding. Many use Material UI / Tailwind colors (#4CAF50, #2196F3, #FF9800).

---

## Recommended Action Plan

1. **Delete** `src/routes/appraiser/ClaimDetail.css` if confirmed as legacy duplicate
2. **Rewrite from scratch** the three mobile files (mobile-agenda, mobile-claim-detail, mobile-claims) using design tokens
3. **Fix** claim-detail.css and photo-capture.css by replacing hardcoded colors with tokens, removing gradients and border-radius, applying correct typography
4. **Polish** my-claims.css and my-routes.css by removing border-radius and adding DM Mono typography
