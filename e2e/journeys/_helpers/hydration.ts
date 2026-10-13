/**
 * Klick erst nach React-Hydration (B8950-012, Flake-Analyse b5900-010/011).
 *
 * Ursache der Flakes: `page.goto(..., { waitUntil: 'domcontentloaded' })` kehrt zurück, sobald das
 * SERVER-HTML da ist. Der Button ist dann sichtbar und "enabled", hat aber noch keinen React-Handler
 * (JS-Chunks laden noch, unter Last/`next dev` mehrere Sekunden). Ein Klick in diesem Fenster geht
 * verloren: das Modal öffnet sich nie, der nächste Schritt wartet bis zum Test-Timeout
 * (Trace: Klick bei +243 ms, Chunks laden danach noch).
 * React hängt beim Hydrieren `__reactProps$…` an die DOM-Knoten; darauf wird gepollt — kein fester Timeout.
 */
import { expect, type Locator } from '@playwright/test'

export async function waitForHydrated(locator: Locator, timeout = 30_000): Promise<void> {
  await locator.first().waitFor({ state: 'visible', timeout })
  await expect
    .poll(() => locator.first().evaluate((el) => Object.keys(el).some((k) => k.startsWith('__reactProps$'))), {
      message: 'React-Hydration des Elements',
      timeout,
    })
    .toBe(true)
}

/** Wartet auf Hydration des (ersten) Elements und klickt dann. */
export async function clickHydrated(locator: Locator, timeout = 30_000): Promise<void> {
  await waitForHydrated(locator, timeout)
  await locator.first().click()
}

/**
 * Öffnet den ItemPickerModal ("+ Artikel auswählen") robust (B8950-012).
 *
 * Zusätzlich zur Hydration: der Modal fokussiert sein EAN-Feld per `setTimeout(..., 50)` nach dem Öffnen
 * (ItemPickerModal "Focus first input on open"). Ein `fill()` auf das Namensfeld des Anlegeformulars, das
 * innerhalb dieser 50 ms läuft, verliert den Fokus-Kampf: Playwrights `fill` fokussiert das Ziel und fügt
 * den Text per `Input.insertText` in das *fokussierte* Element ein — der Name landete im EAN-Feld
 * (Trace: Request `/api/shop-admin/items?ean=<Artikelname>&limit=1`, nie ein `categories/suggest`-Request).
 * Deshalb erst weiterarbeiten, wenn der Fokus tatsächlich im EAN-Feld liegt.
 */
export async function openItemPickerModal(openButton: Locator, timeout = 30_000): Promise<void> {
  await clickHydrated(openButton, timeout)
  await expect(
    openButton.page().locator('[role="dialog"] input[inputmode="numeric"]').first(),
    'ItemPickerModal: Fokus im EAN-Feld (setTimeout 50 ms nach dem Öffnen)',
  ).toBeFocused({ timeout })
}
