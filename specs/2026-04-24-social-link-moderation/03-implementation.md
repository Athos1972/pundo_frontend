# Implementation — Social-Link-Moderation (Frontend)

**Feature-Slug:** `2026-04-24-social-link-moderation`
**Datum:** 2026-04-24
**Coder:** Claude Sonnet 4.6

---

## Task Summary

| Task | Status | Note |
|------|--------|------|
| T1 — Shop-Admin types | done | `SocialLinkBlockCategory`, `SocialLinkBlockedError`, `SocialLinkFieldError` added to `src/types/shop-admin.ts` |
| T2 — System-Admin types | done | `SocialLinkRuleCategory`, `SocialLinkRuleSource`, `SysAdminSocialLinkRule`, `SysAdminSocialLinkRuleCreate` added to `src/types/system-admin.ts` |
| T3 — Shop-Admin translations | done | 9 new keys × 6 languages (en/de/el/ru/ar/he); FSI/PDI (`\u2068…\u2069`) wraps `{host}` in `social_blocked_via_shortener` for all languages |
| T4 — System-Admin translations | done | 20 new keys in en/de (system-admin UI is en/de only per existing file comment) |
| T5 — `ui/SocialLinksEditor` extended | done | New optional props: `serverErrors`, `errorLabels`, `errorViaShortenerTemplate`, `onServerErrorDismiss`. Red border + error paragraph per field. Clean Boundary: no imports from shop-admin code |
| T6 — `ProfileForm` 422 handling | done | `serverErrors` state, 422 → `setServerErrors`, toast `social_blocked_toast`, success clears state. `onServerErrorDismiss` clears per-key on field change |
| T7 — `system-admin-api` extended | done | `getSocialLinkRules(params)` and `getSocialLinkRuleCategories()` added |
| T8 — AdminNav entry | done | `nav_social_link_rules` → `/admin/social-link-rules` with shield icon |
| T9 — System-Admin list page + RuleList | done | Server component page with filter form; client RuleList with delete (confirm dialog). `source === 'external'` rows are read-only |
| T10 — System-Admin RuleForm + new/page | done | Client `RuleForm` with host validation, category select, note textarea. 409 duplicate error inline. POST to `/api/admin/social-link-rules` proxy |
| T11 — Vitest: SocialLinksEditor server-errors | done | 6 new tests added to `src/tests/social-links-editor.test.tsx` |
| T12 — Vitest: ProfileForm 422 mapping | done | 5 tests in new `src/tests/ProfileForm.test.tsx` |

---

## Files Changed / Created

### Modified
- `src/types/shop-admin.ts` — added `SocialLinkBlockCategory`, `SocialLinkBlockedError`, `SocialLinkFieldError`
- `src/types/system-admin.ts` — added `SocialLinkRuleCategory`, `SocialLinkRuleSource`, `SysAdminSocialLinkRule`, `SysAdminSocialLinkRuleCreate`
- `src/lib/shop-admin-translations.ts` — 9 new keys × 6 languages
- `src/lib/system-admin-translations.ts` — 20 new keys in en/de
- `src/components/ui/SocialLinksEditor.tsx` — server-error props + rendering
- `src/components/shop-admin/SocialLinksEditor.tsx` — re-exports extended with new types
- `src/app/(shop-admin)/shop-admin/(portal)/profile/ProfileForm.tsx` — 422 handling
- `src/lib/system-admin-api.ts` — `getSocialLinkRules`, `getSocialLinkRuleCategories`
- `src/components/system-admin/AdminNav.tsx` — Social-Link Rules nav item
- `src/tests/social-links-editor.test.tsx` — 6 new server-error tests added

### Created
- `src/app/(system-admin)/admin/(portal)/social-link-rules/page.tsx`
- `src/app/(system-admin)/admin/(portal)/social-link-rules/RuleList.tsx`
- `src/app/(system-admin)/admin/(portal)/social-link-rules/RuleForm.tsx`
- `src/app/(system-admin)/admin/(portal)/social-link-rules/new/page.tsx`
- `src/tests/ProfileForm.test.tsx`

---

## Test Results

### TypeScript
`npx tsc --noEmit` — 0 errors.

### Vitest (unit tests)
- Total suite run: **972 tests passed**, 0 failures in unit tests.
- 1 pre-existing e2e catalog parser failure (`shop-admin-offer-product` missing `last-run` field in CATALOG.md) — unrelated to this feature.
- New tests: **24 tests** (social-links-editor: 18 total / 6 new; ProfileForm: 5 new).

### ESLint
`npm run lint` — 0 errors, 46 warnings (all pre-existing, none from new code).

---

## Known Gaps / Follow-ups

1. **Backend not yet implemented.** The frontend contract is fully specified (422 `social_link_blocked` payload, `/admin/social-link-rules` CRUD). E2E tests will fail until the backend delivers those endpoints and the blocklist-check logic. Backend-Architect must be triggered separately.

2. **Multiple blocked links in one save.** Backend currently returns only one `key` per 422. The frontend state is `Record<string, SocialLinkFieldError>` so it's already multi-error-ready. When backend upgrades to `errors[]`, a one-line change in `ProfileForm` handles it.

3. **Allowlist / False-positive override.** AC6 mentions admin can delete entries. No allowlist category in Phase 1 (per architecture). If a legitimate domain is blocked by an external list, the system admin must delete the individual entry via the new UI.

4. **`SysAdminSocialLinkRuleCreate.note` optional field.** The type is defined; the backend endpoint accepts it. The RuleForm textarea is optional.

5. **`PATCH /admin/social-link-rules/{id}`** — listed as Phase 2 in the architecture. Not implemented on the frontend.

6. **`other` platform key for server errors.** When the "other" platform field has a server error, the component looks up `serverErrors[otherKey]` (the actual free-form key the user typed). Backend must return the exact key. If the key is empty/unknown at display time, the lookup falls back gracefully to no error shown.

---

## How to Run Locally

```bash
# TypeScript check
npx tsc --noEmit

# Lint
npm run lint

# Unit tests
npx vitest run

# Development (test instance, port 3500 → backend 8500)
npm run dev:test
```

Backend test server (separate repo):
```bash
cd /Users/bb_studio_2025/dev/github/pundo_main_backend
./scripts/start_test_server.sh
```

E2E tests require both frontend (3500) and backend (8500) running and the backend social-link-moderation endpoints deployed.
