# SCORECARD AUDIT — Cipher Dispatch

**Generated:** 2026-03-14

---

## 1. RATING

### Where it's displayed
| File | Line | Usage |
|------|------|-------|
| `ContractorManagement.tsx` | 205 | `c.rating ? c.rating.toFixed(1) : "—"` |
| `ContractorDetail.tsx` | 101 | `contractor.rating ? contractor.rating.toFixed(1) : "---"` |

### Data source
- **Table:** `profiles`
- **Column:** `rating` (numeric, displayed as decimal e.g. `4.5`)
- **Query:** `supabaseCD.from("profiles").select("*")` in ContractorManagement.tsx line 34

### How it's written
- **No frontend code writes or updates the rating field.**
- Not set during contractor invitation (invite-contractor edge function does not include `rating`)
- Not calculated from claims data
- Currently **unmanageable** from the UI — would need to be set directly in Supabase or via a future edit form

---

## 2. ONBOARD STATUS

### Where it's displayed
| File | Line | Usage |
|------|------|-------|
| `ContractorManagement.tsx` | 147 | Count: `contractors.filter(c => c.onboard_status === "pending").length` |
| `ContractorManagement.tsx` | 214-216 | Badge: `"active"` / `"pending"` / null → `"ACTIVE"` / `"PENDING"` / `"—"` |
| `ContractorDetail.tsx` | 109 | `contractor.onboard_status?.toUpperCase() \|\| "---"` |

### Data source
- **Table:** `profiles`
- **Column:** `onboard_status` (text)
- **Valid values:** `"pending"`, `"active"`, or null

### How it's written
- **Set at invitation only** — `invite-contractor` edge function (line 54) sets `onboard_status: "pending"`
- **No frontend code transitions it** from `"pending"` to `"active"` or any other value
- No toggle, no button, no automated trigger
- Currently must be changed directly in Supabase

---

## 3. EDIT PROFILE — Current Capability

### Existing edit capability
The **only** profile field editable after creation is:

| Field | How | File | Line |
|-------|-----|------|------|
| `available` | Toggle button | `ContractorManagement.tsx` | 99-104 |

```typescript
const toggleAvailable = async (c: any) => {
  await supabaseCD.from("profiles")
    .update({ available: !c.available })
    .eq("user_id", c.user_id);
  await load();
};
```

### No edit form exists
- `ContractorDetail.tsx` displays profile info as **read-only** (lines 86-121)
- No edit button or form on the contractor detail page
- No way to modify any field except `available` after invitation

### Fields set at invitation (invite-contractor edge function)
| Field | Set at Invite | Editable After |
|-------|--------------|----------------|
| `full_name` | Yes | No |
| `first_name` | Yes | No |
| `last_name` | Yes | No |
| `email` | Yes (via auth invite) | No |
| `phone` | Yes | No |
| `role` | Yes | No |
| `pay_rate` | Yes | No |
| `license_number` | Yes | No |
| `coverage_cities` | Yes (array) | No |
| `coverage_states` | Yes (array) | No |
| `notes` | Yes | No |
| `available` | No (default) | Yes (toggle) |
| `onboard_status` | Yes (`"pending"`) | No |
| `dispatch_enabled` | Yes (`true`) | No |
| `rating` | No | No |

### Fields that NEED to be editable
To fully manage contractors after onboarding, a profile edit form would need:

1. `full_name` / `first_name` / `last_name` — name corrections
2. `email` — requires auth-level change (Supabase admin API)
3. `role` — promote/demote (admin, dispatch, writer, appraiser)
4. `pay_rate` — rate changes per contractor
5. `rating` — manual performance rating (1.0–5.0)
6. `onboard_status` — transition pending → active
7. `coverage_cities` — update service areas
8. `coverage_states` — update service states
9. `notes` — admin notes about contractor
10. `license_number` — license updates
11. `phone` — contact updates
12. `available` — already implemented (toggle)
13. `active` — deactivate/reactivate account (different from `available`)

### Profiles table schema (from code references)
| Column | Type | Source |
|--------|------|--------|
| `user_id` | UUID | Primary key, references auth.users |
| `role` | TEXT | admin, dispatch, writer, appraiser, pending |
| `full_name` | TEXT | Computed from first + last |
| `first_name` | TEXT | |
| `last_name` | TEXT | |
| `email` | TEXT | |
| `phone` | TEXT | |
| `pay_rate` | NUMERIC | |
| `license_number` | TEXT | |
| `coverage_cities` | TEXT[] | Array |
| `coverage_states` | TEXT[] | Array |
| `notes` | TEXT | |
| `available` | BOOLEAN | |
| `onboard_status` | TEXT | pending, active |
| `rating` | NUMERIC | |
| `dispatch_enabled` | BOOLEAN | |
