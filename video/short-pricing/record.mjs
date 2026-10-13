// Recorder for the YouTube Short S6 (9:16) "Bulk discounts & sales in 30 seconds".  Usage: node record.mjs <lang>
// Derived from ../pricing/record.mjs (same demo data and selectors), without dashboard/menu/unit-price/wrap-up scenes:
// the offer edit form is opened untimed in the prep of the first scene.
// Needs the TEST frontend on :3500 (+ test backend :8500, with feature F5200 "staffelpreise-kundensicht")
// and .cache/<lang>/timeline.json (from tts.py).
// Logs in as the demo shop of the shop-signup video (shop-signup/.recording-accounts.json, gitignored).
// Before recording: ../pricing/prepare_pricing.py (pundo_test only: reset this language's bread offer to 1 step 4.50/piece, no promo).
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

// ---- per-language UI labels (src/lib/i18n/shop-admin-*.ts) ----
const L = {
  en: { navOffers: 'Offers', edit: 'Edit', standardPrice: 'Standard price', addStep: 'Add step',
        promoSection: 'Promotion (optional)', addPriceTier: 'Add pricing unit' },
  el: { navOffers: 'Προσφορές', edit: 'Επεξεργασία', standardPrice: 'Τιμή βάσης', addStep: 'Προσθήκη βαθμίδας',
        promoSection: 'Τιμή προσφοράς (προαιρετικό)', addPriceTier: 'Προσθήκη μονάδας τιμής' },
}[lang]
if (!L) throw new Error(`no labels for lang ${lang}`)

// ---- demo account + test-DB preparation (only this language's shop) ----
const accounts = JSON.parse(fs.readFileSync(path.join(here, '../shop-signup/.recording-accounts.json'), 'utf8'))
const account = accounts[lang]
if (!account) throw new Error(`no demo account for ${lang}`)
let shopSlug = null, offerId = null, itemSlug = null
if (process.env.SKIP_PREPARE !== '1') {
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const out = execFileSync(path.join(backend, '.venv/bin/python'),
    [path.join(here, '../pricing/prepare_pricing.py'), account.email], { cwd: backend })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-2))
  const prep = JSON.parse(out.at(-1))
  shopSlug = prep.shops[account.email]
  ;({ id: offerId, item_slug: itemSlug } = prep.offers[shopSlug])
}

const dur = (id) => T.lead_in_s + tl.scenes.find((x) => x.id === id).audio_s + T.tail_s
const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const lead = T.lead_in_s
const url = (p) => `${BASE}${p}`
const isoDay = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10)

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

/** Ripple on a field without typing (native pickers are not part of the screencast). */
async function ripple(locator) {
  await locator.scrollIntoViewIfNeeded()
  const b = await locator.boundingBox()
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [b.x + b.width / 2, b.y + b.height / 2])
  await sleep(250)
}
async function tapSelect(locator, value) { await ripple(locator); await locator.selectOption(value) }
/** Tap a number/text input, clear it, type the new value. */
// No fill(''): the step inputs fall back to 1 on empty (parseInt || 1), so select the old value and type over it.
async function retype(locator, text) {
  await tap(page, locator); await locator.press('ControlOrMeta+a'); await typeText(page, String(text), 110)
}

const highlight = (loc, on = true) => loc.evaluate((el, on) => el.classList.toggle('vid-highlight', on), on).catch(() => {})

const sess = await startSession({ lang, outDir: path.join(cacheDir, 'rec') })
const { page } = sess
const warn = []
page.on('pageerror', (e) => warn.push(e.message))

// --- login (API through the same-origin proxy -> cookie lands in the browser context) ---
const api = (method, p, data) => page.request.fetch(url(`/api/shop-admin/${p}`), { method, data, headers: { 'Accept-Language': lang } })
const login = await api('POST', 'login', { email: account.email, password: account.password })
if (!login.ok()) throw new Error(`login ${account.email} -> HTTP ${login.status()} ${await login.text()}`)

// --- warm-up: compile routes in the dev server so no scene waits on first-compile ---
const shopPath = shopSlug ? `/${lang}/shops/${shopSlug}` : null
const detailPath = itemSlug ? `/${lang}/products/${itemSlug}` : null
const editPath = offerId ? `/shop-admin/offers/${offerId}/edit` : null
for (const p of ['/shop-admin/dashboard', '/shop-admin/offers', editPath, shopPath, detailPath].filter(Boolean)) {
  await page.goto(url(p), { waitUntil: 'networkidle' }).catch(() => {})
}

// Offer form blocks (OfferForm.tsx): "Standard price" box and the promo accordion box.
const stdBlock = () => page.locator('form > div', { has: page.getByText(L.standardPrice, { exact: true }) })
const promoBlock = () => page.locator('form > div', { has: page.getByRole('button', { name: L.promoSection }) })
const saveBtn = () => page.locator('form button[type=submit]')
/** Offers list row of the bread -> its "Edit" link. Saving a price change archives the offer and creates a
 *  new one (new id), so the link is looked up by the row text, not by the prepared offer id. */
const editLink = () => page.getByText(demo.name[lang], { exact: true }).first()
  .locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " px-4 ") and contains(@class, "py-3")][1]')
  .locator('a[href^="/shop-admin/offers/"][href$="/edit"]')

async function waitSaved() {
  const ok = await page.waitForURL(/\/shop-admin\/offers$/, { timeout: 25000 }).then(() => true).catch(() => false)
  if (!ok) {
    const err = await page.locator('[role=alert], [role=status], p.text-red-600, p.text-red-500').allInnerTexts().catch(() => [])
    throw new Error(`save did not reach /shop-admin/offers (url: ${page.url()}) errors: ${err.join(' | ')}`)
  }
}

// 1 bulk: open the edit form untimed (offers list -> edit link of the bread), then steps -----------
await runScene(sess, 'bulk', dur('bulk'),
  async () => {
    await page.goto(url('/shop-admin/offers'), { waitUntil: 'networkidle' })
    if (!/\/shop-admin\/offers/.test(page.url())) throw new Error(`not logged in (url: ${page.url()})`)
    await page.goto(url(await editLink().getAttribute('href')), { waitUntil: 'networkidle' })
    await stdBlock().waitFor({ timeout: 20000 })
    await glide(stdBlock().locator('input[placeholder="∞"]').first(), 1, 0.35)
    await sleep(700)
  },
  async (at) => {
    const a = A('bulk')
    const blk = stdBlock()
    await at(lead + 0.05 * a)
    await retype(blk.locator('input[placeholder="∞"]').first(), demo.bulk_from - 1)
    await at(lead + 0.22 * a)
    await tap(page, blk.getByRole('button', { name: `+ ${L.addStep}` }))
    await at(lead + 0.32 * a)
    await retype(blk.locator('input[type=number]').nth(2), demo.bulk_from)                  // step 2 "from qty"
    await at(lead + 0.45 * a)
    await retype(blk.locator('input[inputmode=decimal]').nth(1), demo.bulk_price[lang])      // step 2 price
    await at(lead + 0.62 * a)
    const until2 = blk.locator('input[placeholder="∞"]').nth(1)
    await glide(until2, 600, 0.45); await highlight(until2)                                  // empty = unlimited
    await at(lead + 0.85 * a); await highlight(until2, false)
    await glide(saveBtn(), 700, 0.6)
    await at(lead + a + 0.1)
    await tap(page, saveBtn())
  })

// 5 customer-tiers: product page, Anna's row with unit + "from 6" line (freeze while the page loads) ----
await runScene(sess, 'customer-tiers', dur('customer-tiers'),
  async () => { await waitSaved(); await sleep(400) },
  async (at) => {
    const a = A('customer-tiers')
    if (!detailPath) { await at(lead + 0.3 * a); return }
    await sess.pause()
    await page.goto(url(detailPath), { waitUntil: 'networkidle' })
    const shopLink = page.locator(`a[href$="/shops/${shopSlug}"]`).first()
    await shopLink.waitFor({ timeout: 15000 }).catch(() => console.log('  !! Anna not in the offer list'))
    await glide(shopLink, 1, 0.35).catch(() => {})
    await sleep(300)
    await sess.resume()
    // F5200 PriceTierSummary (src/components/product/PriceTierSummary.tsx) inside Anna's offer row: <ul aria-label=…>
    const row = shopLink.locator('xpath=ancestor::div[starts-with(@class,"py-3")][1]')
    const tiers = row.locator('ul[aria-label]').first()
    await at(lead + 0.15 * a); await highlight(row)
    await at(lead + 0.45 * a); await highlight(row, false)
    if (await tiers.count()) await highlight(tiers)
    else console.log('  !! no price-tier summary in Anna\'s row')
    await at(lead + 0.95 * a); await highlight(tiers, false)
  })

// 6 promo: back to the offer -> promotion 3.90 for 7 days -> Save ---------
await runScene(sess, 'promo', dur('promo'),
  async () => {
    await page.goto(url('/shop-admin/offers'), { waitUntil: 'networkidle' })
    const href = await editLink().getAttribute('href')          // new offer id after the first save
    await page.goto(url(href), { waitUntil: 'networkidle' })
    await stdBlock().waitFor({ timeout: 20000 })
    await sleep(600)
  },
  async (at) => {
    const a = A('promo')
    const pb = promoBlock()
    const toggle = page.getByRole('button', { name: L.promoSection })
    await at(lead + 0.03 * a)
    await glide(toggle, 1000, 0.3)
    await tap(page, toggle)
    await at(lead + 0.14 * a)
    await tap(page, pb.getByRole('button', { name: `+ ${L.addPriceTier}` }))
    await at(lead + 0.24 * a)
    await tapSelect(pb.locator('select').nth(1), 'per_piece')                                 // unit
    await at(lead + 0.32 * a)
    await retype(pb.locator('input[inputmode=decimal]').first(), demo.promo_price[lang])
    await at(lead + 0.45 * a)
    const from = pb.locator('input[name=promo_valid_from]'), until = pb.locator('input[name=promo_valid_until]')
    await glide(from, 600, 0.5)
    await ripple(from); await from.fill(isoDay(0))
    await at(lead + 0.53 * a)
    await ripple(until); await until.fill(isoDay(demo.promo_days))
    await highlight(until)
    await at(lead + 0.80 * a); await highlight(until, false)
    await glide(saveBtn(), 700, 0.6)
    await at(lead + a + 0.1)
    await tap(page, saveBtn())
  })

// 7 customer-promo: shop page, promo block with the bread card ------------
await runScene(sess, 'customer-promo', dur('customer-promo'),
  async () => { await waitSaved(); await sleep(400) },
  async (at) => {
    const a = A('customer-promo')
    if (!shopPath) { await at(lead + 0.3 * a); return }
    await sess.pause()
    await page.goto(url(shopPath), { waitUntil: 'networkidle' })
    const card = page.locator('div.relative', { has: page.locator('s') }).filter({ hasText: demo.name[lang] }).first()
    await card.waitFor({ timeout: 15000 }).catch(() => console.log('  !! no promo card for the bread on the shop page'))
    await card.scrollIntoViewIfNeeded().catch(() => {})
    await glide(card, 1, 0.4).catch(() => {})
    await sleep(300)
    await sess.resume()
    await sleep(300)
    if (!await card.count()) return
    await at(lead + 0.10 * a); await highlight(card)
    await at(lead + 0.95 * a); await highlight(card, false)
  })

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
