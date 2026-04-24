# Shop-Admin Offer+Product — Gap-Analyse: Warum erkannten Tests die Production-422 nicht?

**Datum:** 2026-04-24  
**Autor:** E2E-Tester (automated)  
**Bezug:** `e2e/journeys/shop-admin-offer-product.spec.ts`

---

## 1. Kontext

Der User meldete: "Im UI bekomme ich noch immer 'something went wrong', im Backend-Log steht 422."  
Die E2E-Tests (20/21 PASS zum Zeitpunkt der Meldung) sagten: alles grün.  
Das ist ein klassischer **Test/Produktions-Divergenz-Gap**.

---

## 2. Was testeten wir?

| Bereich | Getestet | Wie |
|---------|---------|-----|
| Backend: valid product_id → 201 | JA | E1: curl-ähnlicher API-Call |
| Backend: non-existent product_id → 422 | JA | E2: product_id=999999 |
| Backend: cross-shop product_id → 422 | JA | E3/E4 |
| Backend: price="" → 422 | NEIN | Nicht explizit |
| Backend: price=null → 201 | NEIN | Nicht explizit |
| Backend: German decimal "9,99" → 422 | NEIN | Nicht |
| Frontend: OfferForm sendet price=null statt price="" | NEIN | Kein UI-Test für Fix |
| Frontend: 422-Error-Handling für Pydantic-Errors (Array detail) | NEIN | Kein Test |
| Frontend: 422-Error-Handling für product_id-Errors (String detail) | NUR INDIREKT | E3/F2 prüfen die API, nicht das UI-Feedback |

---

## 3. Was testeten wir NICHT?

### Gap A: Price-Field Validation (KRITISCH)

**Was wir nicht testeten:**  
Der Test sendet price als String wie `"49.99"` (valide) oder lässt price weg.  
Wir testeten NICHT:
- `price: ""` (leerer String → 422 Pydantic decimal_parsing)
- `price: "9,99"` (deutsches Format → 422 Pydantic decimal_parsing)
- `price: "€9.99"` (mit Währungssymbol → 422)

**Welche Annahme haben wir getroffen:**  
Alle Tests sendeten entweder gültige Preisstrings oder kein `price`-Feld.  
Wir haben nie geprüft, was passiert wenn ein Benutzer einen ungültigen Preis eingibt.

**Warum gilt das nicht in Produktion:**  
Reale Nutzer tippen Preise im gewohnten Format:
- Deutsche Nutzer: "9,99" (Komma als Dezimaltrenner)
- Manche kopieren Preise aus Tabellen: "€ 29,99"
- Das OfferForm hatte ursprünglich `price: priceRaw` (ohne null-Fallback)
  → leeres Feld sendete `price: ""` → Pydantic 422

### Gap B: 422-Error-Handler im Frontend (KRITISCH)

**Was wir nicht testeten:**  
Ob das OfferForm für ALLE 422-Fehler eine sinnvolle Fehlermeldung zeigt.

**Der Bug:**  
```javascript
// OfferForm.tsx lines 58-62:
} else if (res.status === 422) {
  const detail = await res.json().then((d: { detail?: string }) => d.detail).catch(() => null)
  if (detail && detail.includes('product_id')) {  // BUG: detail is an ARRAY for Pydantic errors!
    setErrors({ product_id: tr.product_not_found ?? detail })
  } else {
    showToast(tr.error_generic, 'error')  // All Pydantic 422s land here → "something went wrong"
  }
}
```

**Zwei 422-Typen mit unterschiedlichen `detail`-Strukturen:**

| 422-Typ | `detail` Wert | `.includes('product_id')` |
|---------|--------------|--------------------------|
| Pydantic Validation Error | `[{type:"decimal_parsing",loc:["body","price"]}]` (Array) | `false` → "something went wrong" |
| product_id Ownership Error | `"product_id does not exist..."` (String) | `true` → inline error |

**Warum erkannten Tests den Bug nicht:**  
Die Tests E2/E3/E4 prüfen nur den HTTP-Statuscode der Backend-Antwort (422).  
Sie prüfen NICHT das UI-Feedback ("something went wrong" Toast vs. Inline-Error).  
Ein echter Test hätte:
1. Im Browser auf "Save" klicken
2. Prüfen ob ein Toast mit "something went wrong" erscheint ODER ob ein Inline-Error auf dem Preisfeld erscheint

### Gap C: Produktionsdaten nicht gespiegelt

**Was wir annahmen:**  
Alle Testprodukte werden frisch im beforeAll erstellt → korrekte shop_id.

**Was in Produktion anders sein kann:**  
- Produkte via XLS-Import erstellt: der Import weist `shop_id` zu, aber ggf. war die Zuordnung fehlerhaft (H2-Hypothese)
- Wir haben H2 nicht ausschließen können (kein DB-Zugriff auf `pundo`-Produktionsdatenbank)
- Die Tests simulieren keine "legacy"-Produkte mit potenziell falscher shop_id

### Gap D: Technische Schuld in `getShopSlug`

**Was wir nicht testeten:**  
Die G/H/I/J-Tests in der Extended Matrix Suite verwenden `getShopSlug()`, das `/api/v1/shop-owner/profile` aufruft.  
Dieser Endpoint existiert nicht (404). Die Funktion wurde mit Admin-Endpoint-Fallback behoben.  
Die G/H/I/J-Tests können NUR als Teil der vollständigen Test-Suite laufen (nach dem `beforeAll` der Hauptsuite der Shop A erstellt).

---

## 4. Konkrete Root-Cause-Analyse der Production-422

### RCA-Ergebnis (nach curl-Tests und Code-Analyse)

**Hypothese H1 (Pydantic-Validation für price-Feld): BESTÄTIGT als Haupt-Ursache**

```bash
# Beweis: price="" → 422 Pydantic decimal_parsing
curl -X POST http://localhost:8500/api/v1/shop-owner/offers \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test","valid_from":"2026-04-24","valid_until":"2026-06-30","price":""}'
# → HTTP 422: {"detail":[{"type":"decimal_parsing","loc":["body","price"],"msg":"Input should be a valid decimal","input":""}]}

# Beweis: price="9,99" → 422 (German decimal format)
curl -X POST ... -d '{"price":"9,99"}'
# → HTTP 422: {"detail":[{"type":"decimal_parsing","loc":["body","price"],...,"input":"9,99"}]}
```

**Der Frontend-Fix (price: priceRaw ? priceRaw : null) löst das leere-Preis-Problem:**
```bash
# Beweis: price=null → 201
curl -X POST ... -d '{"price":null}'
# → HTTP 201 (korrekt)
```

**Aber das "9,99"-Problem besteht weiterhin:**  
Das Frontend sanitisiert keine Dezimaltrennzeichen. Gibt ein Benutzer "9,99" ein,  
sendet das OfferForm "9,99" → Backend antwortet 422 → `detail.includes('product_id')` = false  
→ showToast(tr.error_generic) → "something went wrong".

**Hypothese H2 (product_id / shop_id Mismatch in Produktion): NICHT AUSSCHLIESSBAR**  
- Kein direkter DB-Zugriff auf `pundo` Produktionsdatenbank möglich  
- Wenn Produkte via Import mit falscher `shop_id` erstellt wurden, würde `_validate_product_ownership` 422 zurückgeben  
- Die Tests simulieren nie dieses Szenario (alle Testprodukte frisch erstellt)

**Hypothese H3 (Build out of date): WIDERLEGT**  
- `.next/BUILD_ID` = `unBBG0U0vMIFBBkDeZPV-` (Timestamp: 2026-04-24 09:58)  
- Produktionsserver (PID 69145, gestartet 2026-04-23 22:26) serviert denselben BUILD_ID  
- Next.js standalone liest Chunks bei Request-Zeit aus `.next/server/`, nicht nur beim Start  
- Das neue `OfferForm.tsx` (mit `price: null`-Fix) ist im aktuellen Build

---

## 5. Welcher Testfall hätte das Problem gefangen?

### Testfall der die "something went wrong" für price=""-Bug gefangen hätte:

```typescript
test('MISSING: OfferForm shows inline error for invalid price format, not "something went wrong"', 
  async ({ page }) => {
    // Setup: Authenticated shop-admin UI
    // Action: Fill title + dates, type "9,99" in price field, click Save
    // Expected: Inline error message on the price field OR specific error toast
    // NOT ACCEPTABLE: Generic "something went wrong" toast without field-level feedback

    await page.goto(`${FRONTEND_URL}/shop-admin/offers/new`)
    await page.locator('input[name="title"]').fill('Test Offer')
    await page.locator('input[name="valid_from"]').fill('2026-04-24')
    await page.locator('input[name="valid_until"]').fill('2026-06-30')
    await page.locator('input[name="price"]').fill('9,99')  // German decimal format!
    await page.getByRole('button', { name: /save|speichern/i }).click()
    
    // CURRENTLY: "something went wrong" toast appears (bad UX, no context)
    // SHOULD BE: Inline price field error OR toast with "Ungültiger Preis-Format (Punkt als Dezimaltrenner verwenden)"
    
    const errorToast = page.locator('[role="alert"]')
    await expect(errorToast).not.toContainText('something went wrong')
    // OR: expect price field to show inline error
    const priceError = page.locator('[id="price-error"]')
    await expect(priceError).toBeVisible()
})
```

### Testfall der H2 (shop_id Mismatch) gefangen hätte:

```typescript
test('MISSING: Product created via import with correct shop_id is linkable to offer', async () => {
  // This simulates a product that was NOT created via the fresh registerAndApprove flow
  // but via an import with the shop_id explicitly set
  // Test: PATCH shop_owner_products SET shop_id = correct_value WHERE shop_id might be wrong
  
  // The test would:
  // 1. Create a product and MANUALLY set its shop_id to the "wrong" shop_id (simulating bad import)
  // 2. Try to create an offer with that product_id → should fail 422
  // 3. Fix the shop_id → retry → should succeed 201
})
```

---

## 6. Offene Bugs nach dieser Analyse

| ID | Bug | Schwere | Fix-Aufwand |
|----|-----|---------|-------------|
| BUG-01 | OfferForm: 422 `detail` Array-Handling falsch — alle Pydantic-Fehler zeigen "something went wrong" statt feldspezifische Fehler | HOCH | Klein: Parse `detail` array, zeige feldspezifische Inline-Fehler |
| BUG-02 | OfferForm: kein Sanitizing für German decimal format ("9,99" → "9.99") | MITTEL | Klein: `price.replace(',', '.')` before send |
| BUG-03 | OfferForm: kein Sanitizing für Währungssymbol ("€9.99" → "9.99") | NIEDRIG | Klein: regex replace |
| GAP-01 | Keine E2E-Tests für OfferForm UI-Feedback bei 422-Fehlern | KRITISCH für Test-Abdeckung | Mittel: UI-Test mit Playwright |
| GAP-02 | H2 (shop_id Mismatch für importierte Produkte) nicht getestet | NIEDRIG | Mittel: SQL-Fixture für Mismatch-Szenario |
| GAP-03 | Extended Matrix G/H/I/J kann nur als Teil der vollständigen Suite laufen | NIEDRIG | Klein: eigenes beforeAll mit GLOBAL_STATE-User |

---

## 7. Empfohlene Ergänzungen

### Priorität 1 — Fix BUG-01 (OfferForm 422-Handler)

```typescript
// OfferForm.tsx — updated 422 handler
} else if (res.status === 422) {
  try {
    const errorBody = await res.json()
    // Pydantic returns: { detail: Array<{type, loc, msg, input}> }
    // product_id error returns: { detail: "string..." }
    if (typeof errorBody.detail === 'string' && errorBody.detail.includes('product_id')) {
      setErrors({ product_id: tr.product_not_found ?? errorBody.detail })
    } else if (Array.isArray(errorBody.detail)) {
      // Parse Pydantic field errors and show inline
      const fieldErrors: Record<string, string> = {}
      for (const e of errorBody.detail) {
        const field = e.loc?.at(-1)
        if (field && typeof field === 'string') {
          fieldErrors[field] = e.msg ?? tr.invalid_value
        }
      }
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
      } else {
        showToast(tr.error_generic, 'error')
      }
    } else {
      showToast(tr.error_generic, 'error')
    }
  } catch {
    showToast(tr.error_generic, 'error')
  }
}
```

### Priorität 2 — Fix BUG-02 (Decimal Sanitizing)

```typescript
// In OfferForm handleSubmit, before building body:
const sanitizePrice = (raw: FormDataEntryValue | null): string | null => {
  if (!raw) return null
  const cleaned = String(raw)
    .replace(/[€$£¥]/g, '')   // remove currency symbols
    .replace(',', '.')          // German format → dot decimal
    .trim()
  return cleaned || null
}
const body = {
  ...
  price: sanitizePrice(data.get('price')),
  ...
}
```

### Priorität 3 — Test für UI-Feedback

```typescript
// Neuer Test in shop-admin-offer-product.spec.ts oder eigener spec:
test('G5-UI — OfferForm zeigt Inline-Fehler für ungültiges Preisformat', async ({ page }) => {
  // Uses storageState for auth (from global-setup)
  // Fills price with "9,99", submits, checks for field-level error not generic toast
})
```

---

## 8. Warum musste der User das manuell herausfinden?

1. **Tests testeten nie das UI-Feedback-Verhalten** — nur HTTP-Statuscodes
2. **Tests nutzten immer valide Testdaten** — niemals "was gibt ein echter Nutzer ein?"
3. **Kein End-to-End-Test der 422-Error-Message-Kette** (Backend-Response → Frontend-Parser → UI-Anzeige)
4. **Test-Isolation vs. Produktionsrealität:** Tests erstellen frische Fixtures in isolierter DB. Die Frage "was passiert wenn ein Nutzer einen Preis im deutschen Format eingibt?" kam nie auf.

**Grundregel für zukünftige Tests:**  
Für jedes User-facing Formular: Einen Test für **jede Fehlerpfad-Kategorie** schreiben:
- Valide Eingabe → Erfolg
- Leerpflichtfeld → Frontend-Validation zeigt Fehler
- **Ungültiges Format (Nutzer tippt falsch) → Klare feldspezifische Fehlermeldung** ← FEHLTE
- Backend-Fehler (500/502) → Generischer Toast ist OK
- Backend-422 (Validation) → Feldspezifische Fehlermeldung ist PFLICHT
