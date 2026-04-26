# Journey Report: customer-discovery — B2250-001 Mobile Shop-Suche
**Datum:** 2026-04-26  
**Scope:** B2250-001 — Mobile UI: Shops-Link + Shop-Suchfeld fehlen  
**SHA:** 42d8ba2dff737a5a24640af1d8f4fee8cb88d776  
**Ergebnis:** ✅ 8 passed, 1 skipped (optional)

---

## Testergebnis

| Schritt | Test | Ergebnis |
|---------|------|----------|
| 1 | Startseite zeigt Suchleiste | ✅ PASS |
| 2 | Suchbegriff → Suchergebnis-Seite | ✅ PASS |
| 3 | Suchergebnisse zeigen min. 1 Karte | ✅ PASS |
| 4 | Klick auf ProductCard → Detailseite | ✅ PASS |
| 5 | Produktdetailseite: Name und Preis | ✅ PASS |
| 6 | Karten-Element auf Produktdetailseite | ⏭ SKIP (optional) |
| 7 | Shop-Detailseite als Guest erreichbar | ✅ PASS |
| 8 | Shop-Detailseite: Name + Adresse | ✅ PASS |
| 9 | Back-Navigation funktioniert | ✅ PASS |

---

## Qualitäts-Gate — Phasen

| Phase | Status | Details |
|-------|--------|---------|
| TypeScript | ✅ PASS | 0 Fehler |
| ESLint | ✅ PASS | 0 Errors, 49 Warnings (alle pre-existing) |
| Unit-Tests (Vitest) | ✅ PASS | 990/990 (+6 neue Tests) |
| Smoke-Tests (Playwright) | ✅ PASS | 8/8 |
| Journey: customer-discovery | ✅ PASS | 8/9 (1 optional skip) |

---

## Implementierte Änderungen (B2250-001)

### 1. `src/components/layout/Header.tsx`
- **Mobile Icon-Buttons** hinzugefügt: Suche (Lupe-SVG) und Shops (Haus-SVG) als `<Link>`-Icons in `<div class="flex md:hidden ...">` 
- Nur auf Mobile sichtbar (`flex md:hidden`), Desktop-Nav bleibt unverändert (`hidden md:flex`)
- Icons tragen `aria-label` aus Translations → screenreader-konform
- RTL-Unterstützung via `rtl:ml-0 rtl:mr-auto rtl:flex-row-reverse`

### 2. `src/app/(customer)/shops/ShopsContent.tsx`
- **Shop-Suchfeld** oben in der Filterleiste hinzugefügt
- Debounce: 300ms zwischen Tastatureingabe und API-Aufruf
- API-Parameter `q` an `getShops()` weitergegeben
- Lupe-SVG als visueller Indikator (positioniert absolut links/RTL-right)
- `aria-label` und `placeholder` aus Translations

### 3. `src/lib/translations.ts`
- `search` und `shop_search_placeholder` in allen 6 Sprachen (EN, DE, RU, EL, AR, HE) ergänzt

### 4. Fixes (Infrastruktur)
- `pundo_main_backend/scripts/prepare_e2e_db.py`: `pg_terminate_backend()` vor TRUNCATE — verhindert Deadlock durch offene Verbindungen
- `e2e/global-setup.ts`: Backend + alle Uvicorn-Worker (`pkill`) vor DB-Reset stoppen; 2s Wartezeit
- `e2e/journeys/customer-discovery.md`: Drift-Fix `shops/[id]/**` → `shops/[slug]/**`
- `.claude/skills/e2e-tester/SKILL.md`: Pflichtregeln für Backend+Frontend vor E2E dokumentiert

---

## Bekannte Pre-existing Issues (nicht B2250-001)

- **Hydration-Mismatch** in `SearchContent.tsx:187` (`isSupported`-Branch): `IntersectionObserver` ist im SSR nicht verfügbar → Client-seitige Hydration schlägt kurz fehl. Kein Test-Blocker (React recovers), aber technisches Debt. ⚠️

---

## Nicht-implementiert (User-Entscheidung)

- **LanguageSwitcher als Dropdown**: War im ursprünglichen Scope (Architektur-Aufgabe 2), wurde vom User bewusst zurückgezogen. LanguageSwitcher bleibt als Chips-Reihe.
