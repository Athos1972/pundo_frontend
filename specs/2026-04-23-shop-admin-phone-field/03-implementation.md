# Implementation: Shop Admin Phone Field (FINDING-1)

## Task Summary

| Task | Status | Notes |
|---|---|---|
| T1 — Read backend Shop model to confirm DB column name | Done | Column is `phone: Mapped[Optional[str]]` on `shops` table |
| T2 — Add `phone` to `ShopProfileResponse` Pydantic model | Done | `ingestor/schemas/shop_owner.py` |
| T3 — Add `phone` to `ShopProfilePatch` Pydantic model | Done | `ingestor/schemas/shop_owner.py` |
| T4 — Add write block for `phone` in `patch_shop()` | Done | Same null-explicit-clear pattern as `whatsapp_number` |
| T5 — Include `phone=shop.phone` in both response builders | Done | `get_shop()` and `patch_shop()` response constructors |
| T6 — Fix `_make_shop` test factory to include `phone=None` | Done | MagicMock lacked `phone` attr, causing 500 in test |
| T7 — Add `phone?: string | null` to `AdminShop` interface | Done | `src/types/shop-admin.ts` |
| T8 — Add `phone` translation key in all 6 languages | Done | `src/lib/shop-admin-translations.ts` |
| T9 — Add `phone` `FormField` input to `ProfileForm.tsx` | Done | Placed before `whatsapp_number`, same `type="tel"` pattern |
| T10 — Wire `phone` into the PATCH request body | Done | `ProfileForm.tsx` `handleSubmit` |

## Files Changed

### Backend (`/Users/bb_studio_2025/dev/github/pundo_main_backend`)

| File | Change |
|---|---|
| `ingestor/schemas/shop_owner.py` | Added `phone: Optional[str] = None` to `ShopProfileResponse` and `ShopProfilePatch` |
| `ingestor/api/shop_owner_shop.py` | Added `phone=shop.phone` to both `ShopProfileResponse` constructions; added `phone` write block in `patch_shop()` |
| `ingestor/tests/test_shop_owner_shop_api.py` | Added `phone=None` to `_make_shop()` defaults |

### Frontend (`/Users/bb_studio_2025/dev/github/pundo_frontend`)

| File | Change |
|---|---|
| `src/types/shop-admin.ts` | Added `phone?: string | null` to `AdminShop` interface |
| `src/lib/shop-admin-translations.ts` | Added `phone` key in all 6 languages: en, de, el, ru, ar, he |
| `src/app/(shop-admin)/shop-admin/(portal)/profile/ProfileForm.tsx` | Added `phone` FormField (tel input, before whatsapp_number); added `phone` to PATCH body |

## Known Gaps / Follow-ups

- No migration needed — `phone` column already exists in the `shops` table.
- The backend does not validate phone number format for `phone` (unlike `whatsapp_number`, which has a `normalize_whatsapp` validator). If format normalization is desired, a separate validator should be added.
- `phone_alt` column exists on the Shop model but is not exposed — intentionally out of scope for this task.

## How to Run Locally

### Backend tests
```
cd /Users/bb_studio_2025/dev/github/pundo_main_backend
.venv/bin/python -m pytest ingestor/tests/ -v -x
```

### Frontend type check + lint
```
cd /Users/bb_studio_2025/dev/github/pundo_frontend
npx tsc --noEmit
npm run lint
```

### Frontend unit tests
```
cd /Users/bb_studio_2025/dev/github/pundo_frontend
npx vitest run
```

### Test server (for E2E)
- Backend: `./scripts/start_test_server.sh` (port 8500, DB: pundo_test)
- Frontend: `npm run dev:test` (port 3500)
