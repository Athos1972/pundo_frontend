# Journey: Reaktive Sprachnavigation

```yaml
id: reactive-language-switch
title: "Reaktive Sprachnavigation: Labels ohne Reload (E2E-08)"
status: implemented
priority: P1
owner-agent: coder
proposed-in-spec: header-nav-rename-businesses-20260530
spec-file: e2e/journeys/reactive-language-switch.spec.ts
status-changed-at: 2026-05-30T16:45:00Z
status-changed-by-spec: header-nav-rename-businesses-20260530
touches-modules:
  - src/app/(customer)/layout.tsx
  - src/lib/useLang.ts
  - src/components/layout/Header.tsx
  - src/components/layout/Footer.tsx
  - src/components/layout/NavLinks.tsx
  - src/components/layout/FooterLinks.tsx
  - src/components/layout/BottomTabBar.tsx
  - src/components/spotted/SpottedGlobalButton.tsx
  - src/components/search/SearchSimilarButton.tsx
  - src/components/ui/LanguageSwitcher.tsx
touches-roles:
  - guest
last-run: 2026-06-03T14:47:00Z
last-result: PASS
last-run-sha: HEAD
```

## Motivation

Das `(customer)/layout.tsx` rendert bei Client-Navigation zwischen Sprach-Segmenten (`/de` → `/en`)
nicht neu — Next.js App Router preserves shared layouts. Alle Client Components, die `lang` als
Server-Prop erhalten, müssen `useLang()` nutzen um via `usePathname()` reaktiv zu bleiben. Ohne
diesen Hook zeigen Header, Footer, FABs nach dem Klick auf den LanguageSwitcher weiterhin die alte
Sprache bis zum nächsten Page-Refresh.

Dieser Bug bestand unentdeckt, weil kein E2E-Test die Sequenz
„Klick LanguageSwitcher → Label sofort aktualisiert (ohne Reload)" abdeckte.

## Acceptance Criteria

| # | Given | When | Then |
|---|---|---|---|
| AC1 | Seite ist auf `/de` geladen | User klickt EN im LanguageSwitcher | Header-Nav zeigt sofort „Businesses" (ohne Reload) |
| AC2 | Seite ist auf `/de` geladen | User klickt EN | Footer zeigt sofort „For Businesses" und „Guides" |
| AC3 | Seite ist auf `/en` geladen | User klickt DE | Header-Nav zeigt sofort „Anbieter", Footer „Für Anbieter" |
| AC4 | Seite ist auf `/de` geladen | User klickt AR | Header-Nav-Labels auf Arabisch, `html[dir=rtl]` gesetzt |
| AC5 | Beliebige Sprache aktiv | Page-Refresh | Labels entsprechen der aktuellen URL-Sprache |

## Runbook

```
PORT: 3500 (Frontend Test), 8500 (Backend Test)
Fixtures: keine — nutzt Live-DB pundo_test
```

### Setup
1. Navigiere zu `http://localhost:3500/de`
2. Warte auf vollständiges Laden (Header sichtbar)

### Schritt 1 — DE Ausgangszustand prüfen (AC5)
```
assert: header nav a[0].text == "Anbieter"
assert: footer nav contains "Für Anbieter"
assert: footer nav contains "Ratgeber"
```

### Schritt 2 — Wechsel DE → EN via LanguageSwitcher (AC1, AC2)
```
click: button[title="EN"]
waitForURL: **/en**
// KEIN page.reload() — Labels müssen reaktiv sein
assert: header nav a[0].text == "Businesses"
assert: footer nav contains "For Businesses"
assert: footer nav contains "Guides"
```

### Schritt 3 — Wechsel EN → DE (AC3)
```
click: button[title="DE"]
waitForURL: **/de**
assert: header nav a[0].text == "Anbieter"
assert: footer nav contains "Für Anbieter"
```

### Schritt 4 — Wechsel zu AR (AC4)
```
click: button[title="AR"] (Mobile: Globus-Button öffnen → AR wählen)
waitForURL: **/ar**
assert: html[dir] == "rtl"
assert: header nav contains "الأعمال التجارية"
```

## Anti-Pattern Detection

Wenn AC1 fehlschlägt (Header zeigt nach EN-Klick noch „Anbieter"):
→ Betroffene Komponente nutzt `lang`-Prop direkt statt `useLang()`
→ Fix: `import { useLang } from '@/lib/useLang'` + `const lang = useLang(fallbackLang)`

## Spec-Datei

`e2e/journeys/reactive-language-switch.spec.ts` (vom /coder zu erstellen)
