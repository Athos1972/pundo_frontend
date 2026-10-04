# Phase 3.1: E2E-Szenarien — e2e-tester, pundo_frontend

Referenz zu `../e2e-tester.md`. Wird nur bei der genannten Phase gelesen.

## Grundprinzip: DOM-Präsenz ≠ Korrekte Darstellung

**"Sichtbar" bedeutet nicht "korrekt geladen".** Ein `<img>`-Element existiert im DOM, auch wenn das Bild broken ist. Ein `<p>`-Element ist da, auch wenn es leer ist. Ein Link ist klickbar, auch wenn er auf eine 404-Seite zeigt.

E2E-Tests prüfen **Observable Outcomes** — was der User tatsächlich sieht, nicht was im DOM steht.

| Datenkategorie | DOM-Prüfung (reicht nicht) | Observable-Outcome-Prüfung (Pflicht) |
|---|---|---|
| Bilder | `img` existiert | `img.naturalWidth > 0` — Bild wurde tatsächlich geladen |
| Text-Felder | Element vorhanden | `textContent` nicht leer, enthält erwarteten Wert |
| Preise | Preiscontainer sichtbar | Enthält gültiges Format (Zahl + Währung) |
| Links | `<a>` vorhanden | Href nicht leer, kein 404 bei navigation |
| Network-Requests | Request wurde gemacht | Response-Status 200 (kein Redirect zu Docs/Error-Pages) |

**Broken-Image-Check in Playwright:**
```typescript
// Prüft ob mindestens eine erwartete Bild-Gruppe tatsächlich lädt
const images = page.locator('img[src]')
const count = await images.count()
if (count > 0) {
  const loaded = await page.evaluate(() =>
    [...document.images].filter(i => i.complete && i.naturalWidth > 0).length
  )
  expect(loaded).toBeGreaterThan(0) // mind. 1 Bild geladen (kein komplett-broken)
}
```

**Network-Redirect-Check:**
```typescript
// Fängt 3xx-Redirects auf unerwartete Ziele ab (z.B. CDN-Hotlinking-Block)
page.on('response', r => {
  if (r.status() >= 300 && r.status() < 400) {
    const location = r.headers()['location'] ?? ''
    expect(location).not.toContain('guidelines') // Brandfetch-Block-Muster
    expect(location).not.toContain('docs.')
  }
})
```

---

### E2E-01: Startseite lädt korrekt

```bash
npx playwright test --grep "Startseite"
```

**Akzeptanzkriterien:**

| # | Prüfung | Kriterium |
|---|---------|-----------|
| 1 | HTTP-Status | 200 |
| 2 | Suchleiste vorhanden | `input[type=search]` oder SearchBar-Selektor sichtbar |
| 3 | Kein JS-Fehler | Console ohne Errors |
| 4 | Kein 404 für Assets | Network: keine fehlgeschlagenen Requests |

---

### E2E-02: Suchfunktion

```bash
npx playwright test --grep "Suche"
```

**Akzeptanzkriterien:**

| # | Prüfung | Kriterium |
|---|---------|-----------|
| 1 | Suche mit Eingabe | URL wechselt zu `/{lang}/search?q=...` |
| 2 | Ergebnisse angezeigt | Mindestens 1 ProductCard sichtbar (wenn Backend läuft) |
| 3 | Leere Suche | Keine JS-Fehler, sinnvolles Fallback-UI |
| 4 | Ladezustand | Loading-Skeleton oder Spinner erscheint kurz |

---

### E2E-03: RTL-Layout (Arabisch, Hebräisch)

**Priorität: Hoch** — RTL-Fehler sind für AR/HE-Nutzer vollständig funktionsverhindernd.

**Akzeptanzkriterien:**

| # | Prüfung | Kriterium |
|---|---------|-----------|
| 1 | `dir` Attribut für AR | `<html dir="rtl">` wenn Sprache = ar |
| 2 | `dir` Attribut für HE | `<html dir="rtl">` wenn Sprache = he |
| 3 | `dir` LTR für EN/DE/EL/RU | `<html dir="ltr">` für alle anderen |
| 4 | Layout gespiegelt | Flex-Richtung, Text-Ausrichtung visuell korrekt |

Bestehende Specs: `e2e/language-smoke.spec.ts`, `e2e/language-picker.spec.ts` (Routen immer `/{lang}/…`, z. B. `/ar`, nie `/?lang=ar`). Erwartung: `dir` kommt aus `isRTL()` in `src/lib/lang.ts`.

---

### E2E-04: Produkt-Detailseite

**Akzeptanzkriterien:**

| # | Prüfung | Kriterium |
|---|---------|-----------|
| 1 | Route erreichbar | `/{lang}/products/[slug]` gibt 200 oder sinnvolles 404 |
| 2 | Produkt-Daten angezeigt | Name, Bild geladen (`img.naturalWidth > 0`) oder expliziter Fallback-Container sichtbar, Preise sichtbar |
| 3 | OfferList angezeigt | Mindestens 1 Angebot oder leerer Zustand |
| 4 | Back-Button funktioniert | Klick navigiert zurück |
| 5 | Kein JS-Fehler | Console ohne Errors |
| 6 | Related-Products-Carousel | `[role="listitem"]` Count ≥ 1; bei Tablet-Breite (768px) mind. 2 Cards im sichtbaren Bereich (`getBoundingClientRect().right < carouselWidth`) |

Carousel-Check als Vorlage: `e2e/main.spec.ts` bzw. `e2e/journeys/visual-smoke.spec.ts` (Selektor `[role="list"] [role="listitem"]`).

---

### E2E-05: Shop-Seite & Karte

**Akzeptanzkriterien:**

| # | Prüfung | Kriterium |
|---|---------|-----------|
| 1 | Route erreichbar | `/{lang}/shops/[slug]` gibt 200 |
| 2 | Shop-Daten angezeigt | Name, Adresse sichtbar |
| 3 | Karte lädt | Leaflet-Container sichtbar (kein Rendering-Fehler) |
| 4 | Kein JS-Fehler | Console ohne Errors |

---

### E2E-06: Responsive Layout (Mobile)

```typescript
// e2e/responsive.spec.ts
test.use({ viewport: { width: 390, height: 844 } }) // iPhone 14
```

**Akzeptanzkriterien:**

| # | Prüfung | Kriterium |
|---|---------|-----------|
| 1 | Startseite mobile | Kein horizontaler Scroll |
| 2 | Suchleiste mobile | Touch-freundliche Größe (min 44px Höhe) |
| 3 | ProductCard mobile | Ganze Breite oder responsive Grid |
| 4 | Navigation mobile | Bedienbar, kein Overflow |

---

### E2E-07: Fehler-Handling & Edge Cases

**Akzeptanzkriterien:**

| # | Prüfung | Kriterium |
|---|---------|-----------|
| 1 | Backend nicht erreichbar | App zeigt sinnvollen Fehler (kein White Screen) |
| 2 | Ungültige Produkt-Slug | `/{lang}/products/nicht-vorhanden` → 404-Seite statt Crash |
| 3 | Ungültiger Shop-Slug | `/{lang}/shops/nicht-vorhanden` → 404-Seite statt Crash |
| 4 | Leere Suchergebnisse | `/{lang}/search?q=xyzxyz` → leerer Zustand, kein Crash |

---

### E2E-08: Reaktive Sprachnavigation (Client-Side Language Switch)

**Priorität: Hoch** — Betrifft alle Layout-Komponenten, die `lang` als Server-Prop erhalten.

**Trigger:** Dieser Test läuft verpflichtend, sobald der Diff eine der folgenden Dateien berührt:
- `src/app/(customer)/layout.tsx`
- `src/lib/useLang.ts`
- `src/components/layout/Header.tsx`, `Footer.tsx`, `NavLinks.tsx`, `FooterLinks.tsx`
- `src/components/layout/BottomTabBar.tsx`
- `src/components/spotted/SpottedGlobalButton.tsx`
- `src/components/search/SearchSimilarButton.tsx`
- Jede neue Client Component, die `lang` als Prop aus dem Root-Layout erhält

**Hintergrund:** Das `(customer)/layout.tsx` rendert bei Client-Navigation zwischen Sprach-Segmenten (`/de` → `/en`) nicht neu — Next.js App Router preserves shared layouts. Alle Komponenten, die `lang` als Server-Prop erhalten und UI-Text damit rendern, müssen stattdessen `useLang()` nutzen, um via `usePathname()` reaktiv zu bleiben.

**Akzeptanzkriterien:**

| # | Prüfung | Kriterium |
|---|---------|-----------|
| 1 | Header-Nav nach Sprachswitch | Nach Klick auf EN-Button: Header-Nav-Links zeigen EN-Labels (kein Reload) |
| 2 | Footer nach Sprachswitch | Footer-Links zeigen EN-Labels (kein Reload) |
| 3 | Rücknavigation | Nach Klick auf DE: alle Labels zurück auf DE |
| 4 | RTL-Sprache (AR) | Nach Klick auf AR: Labels in Arabisch, `html[dir=rtl]` gesetzt |

```typescript
// Echte Spec: e2e/journeys/reactive-language-switch.spec.ts
test('E2E-08: Header/Footer Labels aktualisieren via LanguageSwitcher ohne Reload', async ({ page }) => {
  await page.goto('http://localhost:3500/de')

  // Ausgangszustand DE prüfen
  await expect(page.locator('header nav a').first()).toHaveText('Anbieter')
  await expect(page.locator('footer nav a').filter({ hasText: 'Für Anbieter' })).toBeVisible()

  // Auf EN wechseln via LanguageSwitcher-Button (kein page.goto!)
  await page.click('button[title="EN"]')
  await page.waitForURL('**/en**')

  // EN-Labels müssen sofort sichtbar sein (kein Reload)
  await expect(page.locator('header nav a').first()).toHaveText('Businesses')
  await expect(page.locator('footer nav a').filter({ hasText: 'For Businesses' })).toBeVisible()

  // Rücknavigation auf DE
  await page.click('button[title="DE"]')
  await page.waitForURL('**/de**')
  await expect(page.locator('header nav a').first()).toHaveText('Anbieter')
})
```

**Anti-Pattern das dieser Test erkennt:** Wenn ein Component `lang` nur aus dem Server-Prop liest (ohne `useLang()`), schlägt AC1 fehl — der Header zeigt nach dem Klick noch DE-Labels obwohl die URL bereits `/en` zeigt.
