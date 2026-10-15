/**
 * F5920 — gemeinsame Helfer der Katalog-Import-Journeys (`import-page-ac-check`, `shop-admin-import-image-url`,
 * `shop-admin-import-all-or-nothing`): Upload -> Vorschau -> Uebernehmen ueber die echte Import-Seite.
 *
 * Nur 3500 / 8500 (+ Gateway-Test 8600). Kein Zugriff auf Produktiv-Ports.
 */
import { expect, type Page } from '@playwright/test'
import { BASE_URL, BACKEND_URL } from '../../env'
import { psql, rand4 } from './test-data'
import { waitForHydrated } from './hydration'

/** Gateway-Test (nie 8100). */
export const GATEWAY_URL: string = process.env.LLM_GATEWAY_URL_TEST ?? 'http://localhost:8600'
if (GATEWAY_URL.includes(':8100')) throw new Error('[import-flow] Safety: Gateway-Prod-Port 8100 ist verboten')
const GATEWAY_KEY = process.env.LLM_GATEWAY_API_KEY_TEST ?? 'test-key'

/** Eindeutiger Artikelname ohne Aehnlichkeit zu anderen Testdaten (Fuzzy-Duplikat-Suche) — Aufraeumen per Shop-Delete. */
export function uniqName(label: string): string {
  return `Zq${rand4()}${rand4()} ${label}`
}

/** CSV aus Kopfzeile + Zeilen (Werte unmaskiert; Testdaten enthalten keine Kommas/Anfuehrungszeichen). */
export function csv(header: string[], rows: Array<Array<string | number>>): string {
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n'
}

/** Import-Seite oeffnen (Sprache per Cookie), auf Hydration des Haekchens warten. */
export async function openImport(page: Page, lang: string): Promise<void> {
  await page.context().addCookies([{ name: 'app_lang', value: lang, domain: new URL(BASE_URL).hostname, path: '/' }])
  await page.goto(`${BASE_URL}/shop-admin/import`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('input[type="file"]')).toBeAttached()
  await waitForHydrated(page.getByTestId('import-full-list'))
}

export async function chooseFile(page: Page, name: string, content: string | Buffer, mime = 'text/csv'): Promise<void> {
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType: mime, buffer: Buffer.from(content) })
}

/** Datei waehlen und auf die Vorschau warten (Wiedererkennung/Kategorie laufen im Hintergrund). */
export async function uploadToPreview(page: Page, name: string, content: string | Buffer, opts: { fullList?: boolean } = {}): Promise<void> {
  if (opts.fullList) await page.getByTestId('import-full-list').check()
  await chooseFile(page, name, content)
  await expect(page.getByTestId('import-preview')).toBeVisible({ timeout: 90_000 })
}

/** Zaehler einer Kachel (`data-tile`): new | updated | unchanged | error | possible_duplicate | deactivate. */
export async function tile(page: Page, key: string): Promise<number | null> {
  const el = page.locator(`[data-testid="import-count-tiles"] [data-tile="${key}"] dd`)
  if ((await el.count()) === 0) return null
  return Number((await el.first().innerText()).trim())
}

export async function tiles(page: Page): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {}
  for (const k of ['new', 'updated', 'unchanged', 'error', 'possible_duplicate', 'deactivate']) out[k] = await tile(page, k)
  return out
}

/** Uebernehmen klicken und auf das Ergebnis warten. */
export async function applyToResult(page: Page): Promise<void> {
  await expect(page.getByTestId('import-apply')).toBeEnabled()
  await page.getByTestId('import-apply').click()
  await expect(page.getByTestId('import-result')).toBeVisible({ timeout: 90_000 })
}

/** Neuer Upload nach dem Ergebnis (Formular wieder leer). */
export async function resetAfterResult(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/shop-admin/import`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('input[type="file"]')).toBeAttached()
  await waitForHydrated(page.getByTestId('import-full-list'))
}

export function previewRow(page: Page, rowNo: number) {
  return page.locator(`[data-testid="import-preview-row"][data-row="${rowNo}"]`)
}

// ── Backend-/Gateway-Sicht (Owner-Token, pundo_test) ──────────────────────────

export interface ListingLite { id: number; item_id: number; sku: string | null; available: boolean; source: string }

export async function listListings(token: string): Promise<ListingLite[]> {
  const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop-listings?limit=500`, { headers: { Authorization: `Bearer ${token}` } })
  const j = (await r.json()) as { items: ListingLite[] }
  return j.items
}

/** Anzahl Offers (inkl. archivierter) der Listings eines Shops — Preis-Historie (AK 7). */
export function offerCount(shopId: number): { total: number; archived: number } {
  const [t, a] = psql(
    `select count(*), count(*) filter (where o.archived) from offers o join shop_listings sl on sl.id=o.shop_listing_id where sl.shop_id=${Number(shopId)}`,
  ).split('|')
  return { total: Number(t), archived: Number(a) }
}

/** Oeffentliche Produktliste des Shops (Kundensicht, Namen in `lang`). */
export async function publicProductNames(shopId: number, lang = 'en'): Promise<string[]> {
  const r = await fetch(`${BACKEND_URL}/api/v1/products?shop_id=${shopId}&lat=34.9177&lng=33.6273&limit=100`, {
    headers: { 'Accept-Language': lang },
  })
  const j = (await r.json()) as { items?: Array<{ name: string }> }
  return (j.items ?? []).map((i) => i.name)
}

export async function gatewayUp(): Promise<boolean> {
  try {
    const r = await fetch(`${GATEWAY_URL}/healthz`, { signal: AbortSignal.timeout(3000) })
    return r.ok
  } catch {
    return false
  }
}

/** Gateway-Task (translate.item) lesen. */
export async function gatewayTask(taskId: string): Promise<{ status: number; job_type?: string; state?: string }> {
  const r = await fetch(`${GATEWAY_URL}/v1/tasks/${taskId}`, { headers: { 'X-Internal-API-Key': GATEWAY_KEY } })
  const j = (await r.json().catch(() => ({}))) as { job_type?: string; status?: string }
  return { status: r.status, job_type: j.job_type, state: j.status }
}

/** Gateway-Task-IDs der `item_translation_status`-Zeilen aller Listings eines Shops. */
export function translationTaskIds(shopId: number): string[] {
  return psql(
    `select s.dispatcher_task_id from item_translation_status s join shop_listings sl on sl.item_id=s.item_id where sl.shop_id=${Number(shopId)} and s.dispatcher_task_id is not null`,
  ).split('\n').filter(Boolean)
}
