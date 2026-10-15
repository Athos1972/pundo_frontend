/**
 * Journey: F2970 Welle 4 - Seniorenbetreuung (px-eldercare) in der Kundensuche, 6 Sprachen
 *
 * Nur gegen Test-Instanz 3500 / 8500. Kein DB-Reset. Voraussetzung: W4-Seed (`consumer_services_w4_eldercare.json`)
 * wurde auf pundo_test angewendet. Keine Fixtures, keine Schreibzugriffe.
 *
 * W4-1 Karte px-eldercare als erste Service-Karte (UI + API, 6 Sprachen), 0 Anbieter -> Anbieter-Hinweis
 * W4-2 Abgrenzung: Krankenpflege/nurse/... liefern NICHT die Seniorenbetreuung-Karte als Top-1
 * W4-3 RTL (he/ar) bei 390 px: Karte sichtbar, dir=rtl, kein horizontaler Overflow
 */
import { test, expect } from '@playwright/test'
import { BASE_URL as FRONTEND_URL, BACKEND_URL } from '../env'

if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[consumer-service-eldercare-w4] Safety: NEVER use production ports!')
}

type Lang = 'de' | 'en' | 'el' | 'ru' | 'he' | 'ar'
interface Card { result_type: string; category_id: number; name: string; provider_count: number }

async function cards(q: string, lang: Lang): Promise<Card[]> {
  const r = await fetch(`${BACKEND_URL}/api/v1/search?q=${encodeURIComponent(q)}&limit=5`, {
    headers: { 'Accept-Language': lang, 'X-Smoketest': '1' },
  })
  expect(r.ok).toBe(true)
  const body = (await r.json()) as { items: Card[] }
  return body.items.filter((i) => i.result_type === 'service')
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const POS: Array<{ lang: Lang; term: string; card: string }> = [
  { lang: 'en', term: 'elderly care', card: 'Elderly Care & Home Help' },
  { lang: 'de', term: 'Seniorenbetreuung', card: 'Seniorenbetreuung & Alltagshilfe' },
  { lang: 'el', term: 'γηροκόμος', card: 'Φροντίδα Ηλικιωμένων & Βοήθεια στο Σπίτι' },
  { lang: 'ru', term: 'сиделка', card: 'Уход за пожилыми и помощь по дому' },
  { lang: 'he', term: 'טיפול בקשישים', card: 'טיפול בקשישים ועזרה בבית' },
  { lang: 'ar', term: 'رعاية المسنين', card: 'رعاية كبار السن والمساعدة المنزلية' },
]

for (const c of POS) {
  test(`W4-1 [${c.lang}] "${c.term}": Seniorenbetreuung ist erste Service-Karte, Anbieter-Hinweis`, async ({ page }) => {
    const top = (await cards(c.term, c.lang))[0]
    expect(top?.name).toBe(c.card)
    expect(top.provider_count).toBe(0)
    await page.context().addCookies([{ name: 'app_lang', value: c.lang, url: FRONTEND_URL }])
    await page.goto(`${FRONTEND_URL}/${c.lang}/search?q=${encodeURIComponent(c.term)}`, { waitUntil: 'domcontentloaded' })
    await expect
      .poll(async () => {
        const l = await page.getByRole('button').evaluateAll(
          (els) => els.map((e) => e.getAttribute('aria-label') ?? '').filter((x) => x.includes(' — ')),
        )
        return l[0] ?? ''
      }, { timeout: 15_000 })
      .toContain(c.card)
    await expect(page.locator('[data-testid="service-provider-hint"]:visible').first()).toBeVisible()
  })
}

const NEG: Array<[Lang, string]> = [
  ['de', 'Krankenpflege'], ['de', 'Pflegedienst'], ['en', 'nurse'], ['el', 'νοσοκόμα'],
  ['ru', 'медсестра'], ['he', 'אחות'], ['ar', 'ممرضة'],
]
test('W4-2 Abgrenzung: medizinische Pflege-Begriffe haben nicht px-eldercare als Top-1', async () => {
  const eld = (await cards('elderly care', 'en'))[0].category_id
  for (const [lang, term] of NEG) {
    const top = (await cards(term, lang))[0]
    expect(top?.category_id, `${term} (${lang})`).not.toBe(eld)
  }
})

for (const lang of ['he', 'ar'] as const) {
  test(`W4-3 [${lang}] RTL bei 390 px: Karte sichtbar, kein horizontaler Overflow`, async ({ page }) => {
    const c = POS.find((p) => p.lang === lang)!
    await page.setViewportSize({ width: 390, height: 844 })
    await page.context().addCookies([{ name: 'app_lang', value: lang, url: FRONTEND_URL }])
    await page.goto(`${FRONTEND_URL}/${lang}/search?q=${encodeURIComponent(c.term)}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: new RegExp(`^${esc(c.card)} —`) }).first()).toBeVisible({ timeout: 15_000 })
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
}
