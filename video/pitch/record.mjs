// Recorder for the pitch video "Why pundo?".  Usage: node record.mjs <lang>
// Needs the TEST frontend on :3500 (+ test backend :8500) and .cache/<lang>/timeline.json (from tts.py).
// Customer side only (no login): Russian search "хлеб" -> result + map, demo shop page in EN/EL/RU, promo card,
// opening hours, WhatsApp, then the first sign-up step. The shop of the video language is shown.
// Before recording: prepare_pitch.py (pundo_test only: fresh bread 2.50, sourdough promo 3.90, hours, languages).
// Env: SKIP_PREPARE=1, BACKEND_DIR (default ~/dev/github/pundo_main_backend).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { BASE, sleep, startSession, runScene, tap, typeText } from '../_branding/lib/record-lib.mjs'

const lang = process.argv[2] || 'en'
const here = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(here, '.cache', lang)
const tl = JSON.parse(fs.readFileSync(path.join(cacheDir, 'timeline.json'), 'utf8'))
const T = tl.brand.timing
const demo = tl.meta.demo

// customer-side labels (src/lib/i18n/shop.ts)
const C = { en: { hours: 'Opening hours' }, el: { hours: 'Ώρες λειτουργίας' }, ru: { hours: 'Часы работы' } }[lang]
if (!C) throw new Error(`no labels for lang ${lang}`)

// ---- demo shop of this language + test-DB preparation ----
const accounts = JSON.parse(fs.readFileSync(path.join(here, '../shop-signup/.recording-accounts.json'), 'utf8'))
// RU has no demo shop of its own: the (approved) English demo shop is shown with the Russian UI
const account = accounts[lang === 'ru' ? 'en' : lang]
if (!account) throw new Error(`no demo account for ${lang}`)
let shopSlug = lang === 'el' ? 'o-phournos-tes-annas' : 'anna-s-bakery'
if (process.env.SKIP_PREPARE !== '1') {
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const out = execFileSync(path.join(backend, '.venv/bin/python'),
    [path.join(here, 'prepare_pitch.py'), account.email], { cwd: backend }).toString().trim().split('\n')
  console.log('  prepare:', out.at(-2))
  shopSlug = JSON.parse(out.at(-1)).shops[account.email]
}

const dur = (id) => T.lead_in_s + tl.scenes.find((x) => x.id === id).audio_s + T.tail_s
const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const lead = T.lead_in_s
const url = (p) => `${BASE}${p}`
const shop = (l) => `/${l}/shops/${shopSlug}`

/** Smoothly scroll the nearest scrollable ancestor (or window) so `locator` sits at `align` of the viewport. */
async function glide(locator, ms = 700, align = 0.4) {
  await locator.evaluate((el, [ms, align]) => new Promise((res) => {
    let box = null
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) { box = p; break }
    }
    const r = el.getBoundingClientRect()
    const top = box ? box.getBoundingClientRect().top : 0
    const h = box ? box.clientHeight : window.innerHeight
    const max = box ? box.scrollHeight - box.clientHeight : document.documentElement.scrollHeight - window.innerHeight
    const from = box ? box.scrollTop : window.scrollY
    const to = Math.max(0, Math.min(max, from + (r.top - top) + r.height / 2 - h * align))
    const set = (v) => (box ? (box.scrollTop = v) : window.scrollTo(0, v))
    const t0 = performance.now()
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      set(from + (to - from) * e)
      k < 1 ? requestAnimationFrame(step) : res()
    }
    requestAnimationFrame(step)
  }), [ms, align])
}
const highlight = (loc, on = true) => loc.evaluate((el, on) => el.classList.toggle('vid-highlight', on), on).catch(() => {})

const sess = await startSession({ lang, outDir: path.join(cacheDir, 'rec') })
const { page } = sess
const warn = []
page.on('pageerror', (e) => warn.push(e.message))

/** Load a page while the screencast is frozen (no loading skeleton in the video), optionally scroll to `target`. */
async function frozenGoto(p, target, align = 0.4) {
  await sess.pause()
  await page.goto(url(p), { waitUntil: 'domcontentloaded' })
  if (target) { const t = target(); await t.waitFor({ timeout: 15000 }).catch(() => console.log('  !! not found on', p)); await glide(t, 1, align).catch(() => {}) }
  await sleep(300)
  await sess.resume()
}

// --- warm-up: compile routes in the dev server so no scene waits on first-compile ---
for (const p of ['/ru', `/ru/search?q=${encodeURIComponent(demo.search)}`, shop('en'), shop('el'), shop('ru'), '/shop-admin/onboarding']) {
  await page.goto(url(p), { waitUntil: 'networkidle' }).catch(() => {})
}

const resultCard = () => page.locator('a[href*="/products/"], a[href*="/shops/"]').filter({ hasText: /хлеб/i }).first()
  .locator('xpath=ancestor-or-self::*[contains(@class,"rounded")][1]')
// "Fresh bread (daily)" is translated into all languages (the sourdough bread of video #2 only has its own language)
const FRESH = { en: 'Fresh bread', el: 'Φρέσκο ψωμί', ru: 'Свежий хлеб' }
const productCard = (l) => () => page.locator('a[href*="/products/"]').filter({ hasText: FRESH[l] }).first()
  .locator('xpath=ancestor::*[.//img][1]')

// 1 hook: Russian search "хлеб" -------------------------------------------
await runScene(sess, 'hook', dur('hook'),
  async () => {
    await page.goto(url('/ru'), { waitUntil: 'networkidle' })
    // homepage stats strip still shows placeholder numbers (TODO BB in HomepageStatsStrip) -> not in the pitch
    await page.addStyleTag({ content: 'section.w-full.bg-text{display:none!important}' })
    await page.locator('input[type=search]').first().waitFor({ timeout: 15000 })
    await sleep(600)
  },
  async (at) => {
    const a = A('hook')
    const q = page.locator('input[type=search]').first()
    await at(lead + 0.05 * a)
    await tap(page, q); await typeText(page, demo.search, 160)
    await at(lead + 0.40 * a)
    await sess.pause()
    await page.keyboard.press('Enter')
    await page.waitForURL(/\/ru\/search/, { timeout: 15000 }).catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
    await resultCard().waitFor({ timeout: 15000 }).catch(() => console.log('  !! no result card for', demo.search))
    await sleep(1500)                                            // map tiles
    await sess.resume()
  })

// 2 problem: result card + shop name -------------------------------------
await runScene(sess, 'problem', dur('problem'), null,
  async (at) => {
    const a = A('problem')
    const card = resultCard()
    await at(lead + 0.10 * a); await highlight(card)
    await at(lead + 0.55 * a); await highlight(card, false)
    const shopLink = page.locator(`a[href*="/shops/${shopSlug}"]`).first()
    if (await shopLink.count()) { await highlight(shopLink); await at(lead + 0.95 * a); await highlight(shopLink, false) }
  })

// 3 languages: shop page EN -> EL -> RU (product list) ----------------------
await runScene(sess, 'languages', dur('languages'),
  async () => { await page.goto(url(shop('en')), { waitUntil: 'networkidle' }); await productCard('en')().waitFor({ timeout: 15000 }); await glide(productCard('en')(), 1, 0.45); await sleep(500) },
  async (at) => {
    const a = A('languages')
    await at(lead + 0.05 * a); await highlight(productCard('en')())
    await at(lead + 0.33 * a); await frozenGoto(shop('el'), productCard('el'), 0.45); await highlight(productCard('el')())
    await at(lead + 0.62 * a); await frozenGoto(shop('ru'), productCard('ru'), 0.45); await highlight(productCard('ru')())
  })

// 4 prices: promo card + opening hours (video language) ---------------------
const promoCard = () => page.locator('div.relative', { has: page.locator('s') }).first()
await runScene(sess, 'prices', dur('prices'),
  async () => { await page.goto(url(shop(lang)), { waitUntil: 'networkidle' }); await promoCard().waitFor({ timeout: 15000 }).catch(() => console.log('  !! no promo card')); await glide(promoCard(), 1, 0.4); await sleep(500) },
  async (at) => {
    const a = A('prices')
    await at(lead + 0.05 * a); await highlight(promoCard())
    await at(lead + 0.45 * a); await highlight(promoCard(), false)
    const hours = page.getByRole('heading', { name: C.hours }).first().locator('xpath=..')
    if (await hours.count()) { await glide(hours, 900, 0.45); await highlight(hours) } else console.log('  !! no opening hours block')
  })

// 5 contact: WhatsApp / phone ---------------------------------------------
await runScene(sess, 'contact', dur('contact'), null,
  async (at) => {
    const a = A('contact')
    const wa = page.locator('a[href*="wa.me"], a[href^="https://api.whatsapp"]').first()
    await at(lead + 0.03 * a)
    if (!await wa.count()) { console.log('  !! no WhatsApp link'); return }
    await glide(wa, 1100, 0.35)
    await at(lead + 0.25 * a); await highlight(wa.locator('xpath=..'))
  })

// 6 free: first sign-up step -------------------------------------------------
await runScene(sess, 'free', dur('free'),
  async () => {
    await page.goto(url('/shop-admin/onboarding'), { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('h2', { timeout: 20000 }); await sleep(600)
  },
  async (at) => {
    const a = A('free')
    const grid = page.locator('h2').first().locator('xpath=following-sibling::*[1]')
    await at(lead + 0.15 * a); await highlight(grid)
  })

// 7 wrap-up ------------------------------------------------------------
await runScene(sess, 'wrap-up', dur('wrap-up'), null, null)

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
