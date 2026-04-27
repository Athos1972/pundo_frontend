---
id: social-link-moderation
title: Social-Link-Moderation (Anti-Adult / Anti-NSFW Blocklist)
status: implemented
spec-file: e2e/journeys/social-link-moderation.spec.ts
priority: P1
owner-agent: coder
proposed-in-spec: social-link-moderation-20260424
touches-modules:
  - src/app/(shop-admin)/shop-admin/(portal)/profile/**
  - src/components/shop-admin/SocialLinksEditor.tsx
  - src/components/shop-admin/LinkPreview.tsx
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
  - admin
touches-states:
  - SocialLink.status:pending
  - SocialLink.status:approved
  - SocialLink.status:rejected
  - SocialLink.blocked:true
status-changed-at: 2026-04-24T14:00:00Z
status-changed-by-spec: social-link-moderation-20260424
last-run: 2026-04-26T21:15:00Z
last-result: PASS
last-run-sha: fd0d7241a5c0395857bb289c5f1ae76a574d157c
---

# Journey: social-link-moderation

**Status:** implemented
**Priority:** P1
**Last run:** 2026-04-25 (PASS)

## Purpose

Verify the social-link moderation system prevents adult/NSFW content from being
added to shop profiles via social media links:
1. Blocklisted domains are rejected immediately (AC1)
2. Non-blocklisted domains are accepted (AC2)
3. Admin can manage the blocklist (AC3)
4. Shortener domains are resolved before checking (AC4)
5. Link preview shows correct status indicators (AC5)

## Pre-conditions

- Shop-owner logged in at /shop-admin/profile (test instance port 3500)
- Backend at port 8500 is running with social_link_blocklist seeded
- Admin token available via global-setup

## Steps

### AC1: Blocklisted domain rejected
1. POST /api/v1/shop-owner/social-links with blocked domain (e.g., onlyfans.com)
2. Assert: 422 response with "blocked" reason

### AC2: Allowed domain accepted
1. POST /api/v1/shop-owner/social-links with valid domain (e.g., instagram.com)
2. Assert: 201 or 200 response

### AC3: Admin blocklist management
1. Admin reads GET /api/v1/admin/social-link-rules
2. Admin adds new rule via POST
3. Assert: new rule in list

### AC4: Shortener resolution
1. POST with a shortened URL pointing to blocked domain
2. Assert: blocked (shortener is resolved before check)

### AC5: UI link preview
1. Navigate to /shop-admin/profile
2. Add a social link in the UI
3. Assert: appropriate status badge visible

## Notes

- Blocklist is seeded by prepare_e2e_db.py (5 entries)
- Tests use API-first pattern; UI tests require StorageState from global-setup
