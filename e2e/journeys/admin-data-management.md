---
id: admin-data-management
title: Admin Data Management Sweep
status: implemented
spec-file: e2e/journeys/admin-data-management.spec.ts
priority: P3
owner-agent: designer
proposed-in-spec: journey-catalog-system-20260423
touches-modules:
  - src/app/(system-admin)/**
  - src/app/(customer)/guides/**
  - src/components/ui/**
touches-roles:
  - admin
  - guest
touches-states:
  - Brand.exists:true
  - Category.has_children:true
  - Guide.status:published
status-changed-at: 2026-04-23T15:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: 2026-04-25T19:51:00Z
last-result: FAIL
last-run-sha: f10484b574a297b5e0ce06ecf09c79c3c9fdfda0
---

### Journey: Admin Data Management Sweep

**Ziel:** Admin-User durchläuft alle wesentlichen Datenverwaltungs-Bereiche in einer Kette: Brands, Categories (Tree + CRUD), Shop-Owner-Moderation, Guides — und verifiziert dass die verwalteten Daten auf der public-facing Seite erscheinen.

**Trigger-Regel:** Wenn src/app/(system-admin)/**, guides/**, BrandCard, CategoryTree im Diff (P3).

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| `brand-with-logo` | Brand MIT Logo-Upload | Bild-Upload + Anzeige testen |
| `brand-without-logo` | Brand OHNE Logo | Fallback-Avatar testen |
| `category-parent` | Top-Level-Kategorie | Tree-Root-Rendering |
| `category-child` | Sub-Kategorie unter parent | Tree-Expand/Collapse |
| `guide-published` | Guide im Status published | Public-Sichtbarkeit |

**Schritte (Runbook):**

1. Admin legt brand-with-logo an → Logo erscheint in Brand-Übersicht
2. Admin legt brand-without-logo an → Fallback korrekt
3. Admin navigiert Category-Tree: parent expandieren → child sichtbar → collapse
4. Admin legt category-child unter parent an → erscheint im Tree
5. Admin öffnet Shop-Owner-Moderation: pending Owner ablehnen (mit Begründung)
6. Als Guest: /guides → guide-published erscheint in Listing
7. Guide öffnen → Inhalt + Navigation korrekt, RTL-Durchgang mit lang=ar
8. Cleanup: Alle Test-Fixtures löschen
