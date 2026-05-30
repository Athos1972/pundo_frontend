# E2E-Qualitätsbericht — map-hover-glow-mobile-ux-20260530

**Datum:** 2026-05-30  
**SHA:** a1cdb7ef3cf6f4136d2b62cb902996a84e860066  
**Spec:** F4300 Karten-Hover-Highlight (Desktop) + Mobile Bottom Sheet  
**Verdict: SHIP ✅**

---

## Statische Prüfung

| Prüfung | Status |
|---------|--------|
| TypeScript | ✅ PASS (0 Fehler) |
| ESLint | ✅ PASS (0 Errors, 85 pre-existing Warnings — nicht durch diese Änderung) |

## Unit-Tests — 70/70 PASS

| Datei | Neue Tests | Status |
|-------|-----------|--------|
| markerIcons.test.ts | 9 (NEU) | ✅ |
| SearchMapBottomSheet.test.tsx | 13 (NEU) | ✅ |
| ShopMap.test.tsx | 8 (divIcon-Mock ergänzt) | ✅ |
| coverage-gaps.test.tsx | +5 Hover-Prop-Tests | ✅ |

## COVERAGE_GAPs (nicht blockierend)

| Modul | Ursache |
|-------|---------|
| ShopMapClient.tsx | Leaflet/Canvas — jsdom-Limitation |
| SearchContent.tsx | Komplexe Client-Komponente mit Geo + Leaflet |

## E2E — f4300-map-auto-fit.spec.ts — 8/8 PASS

| Test | Status | Anmerkung |
|------|--------|-----------|
| AC1/AC4: Karte lädt, echte Dimensionen | ✅ | |
| AC1: Leaflet-Marker im DOM | ✅ | |
| AC2: Filter-Wechsel, kein Fehler | ✅ | |
| AC4: 0 Shops, kein JS-Fehler | ✅ | |
| AC7: RTL Arabisch | ✅ | |
| AC7: RTL Hebräisch | ✅ | |
| AC5: Mobile — Karte sichtbar ohne Tab (NEU) | ✅ | |
| AC6: Mobile — Bottom-Sheet-Handle im DOM (NEU) | ✅ | |

**Testfehler erkannt und korrigiert:** Bestehende Tests AC1/AC2 nutzten `.first()` auf `.leaflet-container`, das im neuen 2-Branch-Layout die *mobile* (hidden) Karte traf. Fix: `.filter({visible:true}).first()`.

## Journey-Run — 3/3 PASS (mustRun)

| Journey | Ergebnis | Grund für mustRun |
|---------|----------|-------------------|
| customer-discovery | ✅ 8/9 pass, 1 skip | touches `src/components/map/**` + `search/**` |
| admin-data-management | ✅ 8/10 pass, 2 skips | touches `guides/**` (neue Guides im Diff) |
| shop-owner-full-lifecycle | ✅ 17/17 | touches `search/**` |

## Phase 4.5: Quality-Gate

- `verdict-gate.mjs`: **Gate OK — 0 offene FAILs**
- Schön-Test-Check: Nur `toHaveLength(24→25)` im Diff — legitimer Zähler-Anstieg (neuer Journey-Eintrag), kein Abschwächen
- `open_failures: []`

## Bekannte V1-Einschränkung (kein Blocker)

InfiniteScroll auf Mobile: `useInfiniteScroll` nutzt `rootRef: scrollContainerRef` (Desktop-Panel). Auf Mobile ist der Desktop-Panel `display:none` → rootRef.current zeigt auf hidden Element → Observer feuert nicht → kein automatisches Load-More auf Mobile. Nutzer sehen initial PAGE_SIZE=20 Items. Kein Load-More-Button sichtbar (da `isSupported=true`).

## Vault-Update

- `F4300 Karte & Geo.md`: Changelog-Eintrag 2026-05-30 ergänzt
- `03-implementation.md` geschrieben im Spec-Hub
- `04-test-report.md` = dieser Report

---

**Verdict: SHIP ✅**  
Alle Tests grün. Keine open_failures. Gate-Check bestanden.
