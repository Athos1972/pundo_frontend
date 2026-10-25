/**
 * F8960 Teil A: Admin-Hilfe (/admin/help, /admin/help/[topic]).
 * AK 1, 2, 4, 5, 6, 7, 10 laufen immer; AK 3 (neuer Tab zu YouTube) erst, wenn eine echte videoId eingetragen ist.
 * Erwartungswerte kommen aus der Datenquelle bzw. tSysAdmin (keine kopierten Strings).
 */
import { test, expect } from './fixtures'
import { BASE_URL } from './env'
import { E2E_ADMIN_STATE_FILE as ADMIN_STATE } from './state'
import { HELP_TOPICS } from '../src/lib/system-admin-help'
import { HELP_CONTENT, allHelpSteps } from '../src/lib/system-admin-help-content'
import { tSysAdmin } from '../src/lib/system-admin-translations'

const en = tSysAdmin('en')
const el = tSysAdmin('el')
const ids = HELP_TOPICS.map((t) => t.id)

test.describe('F8960 admin help', () => {
  test('AK1: nav entry opens /admin/help and is the only active one', async ({ adminPage: page }) => {
    await page.goto('/admin/dashboard')
    const nav = page.getByRole('navigation', { name: en.nav_aria })
    await nav.getByRole('link', { name: en.nav_help, exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/help$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.help_title)
    await expect(nav.getByRole('link', { name: en.nav_help, exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1)
  })

  test('AK2 + AK4: one card per topic in order, titles and one-liners, badge matches the video state', async ({ adminPage: page }) => {
    await page.goto('/admin/help')
    const cards = page.getByTestId('help-topic-card')
    await expect(cards).toHaveCount(HELP_TOPICS.length)
    expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-topic')))).toEqual(ids)
    for (const t of HELP_TOPICS) {
      const card = page.locator(`[data-testid="help-topic-card"][data-topic="${t.id}"]`)
      await expect(card).toContainText(HELP_CONTENT[t.id].en.title)
      await expect(card).toContainText(HELP_CONTENT[t.id].en.summary)
      const badge = card.getByTestId('help-topic-badge')
      if (t.noVideo) await expect(badge).toHaveCount(0)
      else await expect(badge).toHaveText(t.videoId ? en.help_badge_video : en.help_video_coming_soon)
    }
    // the list only links to the topic pages, never directly to YouTube
    await expect(page.locator('main a[href*="youtube.com"]')).toHaveCount(0)
  })

  test('AK4 + AK6: every topic page has its steps, a video link only with a videoId, working admin links', async ({ adminPage: page }) => {
    for (const t of HELP_TOPICS) {
      await page.goto(`/admin/help/${t.id}`)
      const c = HELP_CONTENT[t.id].en
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.title)
      await expect(page.locator('main ol > li')).toHaveCount(allHelpSteps(c).length)
      if (c.rules?.length) await expect(page.getByTestId('help-rules').locator('li')).toHaveCount(c.rules.length)
      if (t.noVideo) {
        await expect(page.locator('main a[href*="youtube.com"]')).toHaveCount(0)
        await expect(page.getByText(en.help_video_coming_soon)).toHaveCount(0)
      } else if (t.videoId) {
        await expect(page.getByTestId('help-video-link')).toHaveAttribute('href', `https://www.youtube.com/watch?v=${t.videoId}`)
        await expect(page.getByText(en.help_video_coming_soon)).toHaveCount(0)
      } else {
        await expect(page.locator('main a[href*="youtube.com"]')).toHaveCount(0)
        await expect(page.getByText(en.help_video_coming_soon)).toBeVisible()
      }
      for (const link of t.adminLinks) {
        await page.goto(`/admin/help/${t.id}`)
        const a = page.getByRole('link', { name: `${en.help_open_in_admin}: ${en[link.navKey]}`, exact: true })
        const [resp] = await Promise.all([
          page.waitForResponse((r) => new URL(r.url()).pathname === link.href),
          a.click(),
        ])
        expect(resp.status(), `${t.id} -> ${link.href}`).toBeLessThan(400)
        await expect(page).toHaveURL(new RegExp(`${link.href}$`))
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      }
    }
  })

  test('AK5: Greek UI shows Greek titles and no English card text', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: ADMIN_STATE })
    await context.addCookies([{ name: 'app_lang', value: 'el', url: BASE_URL }])
    const page = await context.newPage()
    try {
      await page.goto('/admin/help')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(el.help_title)
      const main = await page.locator('main').innerText()
      for (const t of HELP_TOPICS) {
        expect(main).toContain(HELP_CONTENT[t.id].el.title)
        expect(main).not.toContain(HELP_CONTENT[t.id].en.summary)
      }
    } finally {
      await context.close()
    }
  })

  test('AK7: no session means no content', async ({ playwright, browser }) => {
    // (a) no cookie: proxy redirects
    const anon = await playwright.request.newContext({ baseURL: BASE_URL })
    const r = await anon.get('/admin/help', { maxRedirects: 0 })
    expect(r.status()).toBe(307)
    expect(r.headers()['location']).toMatch(/\/admin\/login$/)
    await anon.dispose()

    // (b) made-up cookie: page-level check sends to the login
    const context = await browser.newContext({ baseURL: BASE_URL })
    await context.addCookies([{ name: 'admin_token', value: 'invalid', url: BASE_URL }])
    const page = await context.newPage()
    await page.goto('/admin/help')
    await expect(page).toHaveURL(/\/admin\/login/)
    const body = await page.content()
    expect(body).not.toContain('youtube.com')
    for (const t of HELP_TOPICS) {
      expect(body).not.toContain(HELP_CONTENT[t.id].en.title)
      expect(body).not.toContain(HELP_CONTENT[t.id].el.title)
    }

    // (c) same for a topic page requested as an RSC payload
    const res = await context.request.get('/admin/help/translations', { headers: { RSC: '1' } })
    const text = await res.text()
    expect(text).not.toContain(HELP_CONTENT.translations.en.steps[0])
    expect(text).not.toContain(HELP_CONTENT.translations.en.title)
    expect(text).not.toContain('youtube.com')
    await context.close()
  })

  test('AK10: noindex, exactly one h1, every link and button has a name', async ({ adminPage: page }) => {
    for (const url of ['/admin/help', '/admin/help/crm']) {
      await page.goto(url)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
      await expect(page.locator('h1')).toHaveCount(1)
      const unnamed = await page.locator('main a, main button').evaluateAll((els) =>
        els
          .filter((e) => {
            const clone = e.cloneNode(true) as HTMLElement
            clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove())
            return !(e.getAttribute('aria-label') || clone.textContent?.trim())
          })
          .map((e) => e.outerHTML),
      )
      expect(unnamed, url).toEqual([])
    }
  })

  const withVideo = HELP_TOPICS.find((t) => t.videoId)
  test('AK3: "Watch video" opens YouTube in a new tab, admin tab unchanged', async ({ adminPage: page }) => {
    test.skip(!withVideo, 'noch keine veroeffentlichte videoId (F8960 T23)')
    await page.context().route('https://www.youtube.com/**', (route) => route.fulfill({ status: 200, body: 'ok' }))
    await page.goto(`/admin/help/${withVideo!.id}`)
    const before = page.url()
    const [popup] = await Promise.all([
      page.context().waitForEvent('page'),
      page.getByTestId('help-video-link').click(),
    ])
    await popup.waitForLoadState('domcontentloaded').catch(() => {})
    expect(popup.url()).toBe(`https://www.youtube.com/watch?v=${withVideo!.videoId}`)
    expect(page.url()).toBe(before)
  })
})
