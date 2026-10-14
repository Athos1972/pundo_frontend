// Recorder for the YouTube Short S3 (9:16) "Already on pundo? Take it over in one tap".  Usage: node record.mjs <lang>
// Derived from ../product-from-catalog/record.mjs (same demo data and selectors); the offer picker is opened untimed.
// Needs the TEST frontend on :3500 (+ test backend :8500) and .cache/<lang>/timeline.json (from tts.py).
// Logs in as the demo shop of the shop-signup video (shop-signup/.recording-accounts.json, gitignored).
// Before recording: prepare_catalog.py (pundo_test only: fictional catalog item + photo, re-activate the demo shops'
// offered items such as Anna's bread), then API cleanup of the demo shop's offer/listing for the syrup ONLY
// (the sourdough bread from part 2 must stay). Env: SKIP_PREPARE=1, BACKEND_DIR (default ~/dev/github/pundo_main_backend).
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
  en: { navOffers: 'Offers', addOffer: 'Add offer', pickTitle: 'Select product or service', searchLabel: 'Search by name',
        eanLabel: 'EAN / Barcode', bread: 'Sourdough', syrup: 'Carob Syrup', standardPrice: 'Standard price', addUnit: 'Add pricing unit' },
  el: { navOffers: 'Προσφορές', addOffer: 'Προσθήκη προσφοράς', pickTitle: 'Επιλογή προϊόντος ή υπηρεσίας', searchLabel: 'Αναζήτηση με όνομα',
        eanLabel: 'EAN / Barcode', bread: 'Ψωμί προζυμιού', syrup: 'Χαρουπόμελο', standardPrice: 'Τιμή βάσης', addUnit: 'Προσθήκη μονάδας τιμής' },
}[lang]
if (!L) throw new Error(`no labels for lang ${lang}`)

// ---- demo account + test-DB preparation ----
const accFile = path.join(here, '../shop-signup/.recording-accounts.json')
const accounts = JSON.parse(fs.readFileSync(accFile, 'utf8'))
const account = accounts[lang]
if (!account) throw new Error(`no demo account for ${lang} in ${accFile}`)
let shopSlug = null, itemId = null
if (process.env.SKIP_PREPARE !== '1') {
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const out = execFileSync(path.join(backend, '.venv/bin/python'),
    [path.join(here, '../product-from-catalog/prepare_catalog.py'), ...Object.values(accounts).map((a) => a.email)], { cwd: backend })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-2))
  const prep = JSON.parse(out.at(-1))
  shopSlug = prep.shops[account.email]; itemId = prep.item_id
}

const dur = (id) => T.lead_in_s + tl.scenes.find((x) => x.id === id).audio_s + T.tail_s
const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const lead = T.lead_in_s
const url = (p) => `${BASE}${p}`
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Smoothly scroll the nearest scrollable ancestor (modal body or window) so `locator` sits at `align` of the viewport. */
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

/** Native <select> pickers are not part of the screencast -> ripple on the field, then set the value. */
async function tapSelect(locator, value) {
  await locator.scrollIntoViewIfNeeded()
  const b = await locator.boundingBox()
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [b.x + b.width / 2, b.y + b.height / 2])
  await sleep(250)
  await locator.selectOption(value)
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

// --- idempotency: remove ONLY the syrup's offer + listing from earlier runs (bread from part 2 stays) ---
const offers = (await (await api('GET', 'offers?limit=500')).json().catch(() => ({}))).items ?? []
const listings = (await (await api('GET', 'shop-listings?limit=200')).json().catch(() => ({}))).items ?? []
const syrupListings = listings.filter((l) => l.item_id === itemId)
for (const o of offers.filter((o) => syrupListings.some((l) => l.id === o.shop_listing_id))) {
  if (!o.archived) await api('PATCH', `offers/${o.id}`, { archived: true })
  await api('DELETE', `offers/${o.id}`)
}
for (const l of syrupListings) {
  const r = await api('DELETE', `shop-listings/${l.id}`)
  if (!r.ok()) console.log(`  !! syrup listing ${l.id} not removed: HTTP ${r.status()}`)
}
const breadLeft = offers.some((o) => !o.archived && JSON.stringify(o.item?.names ?? {}).includes(L.bread))
console.log(`  cleanup: ${syrupListings.length} syrup listing(s) removed; bread offer present: ${breadLeft}`)
if (!breadLeft) console.log('  !! no bread offer in the demo shop -> run video/build.sh product-create-new first')

// --- warm-up: compile routes in the dev server so no scene waits on first-compile ---
const shopPath = shopSlug ? `/${lang}/shops/${shopSlug}` : null
for (const p of ['/shop-admin/dashboard', '/shop-admin/offers', '/shop-admin/offers/new', shopPath].filter(Boolean)) {
  await page.goto(url(p), { waitUntil: 'networkidle' }).catch(() => {})
}
await page.request.get(url(`/api/shop-admin/items?ean=${demo.ean}&limit=1`)).catch(() => {})

const btn = (name) => page.getByRole('button', { name })
const fieldInput = (label) => page.locator('label', { hasText: label }).locator('xpath=following-sibling::div[1]//input')

// 3 barcode: type EAN -> match card with photo (not tapped) ---------------
await runScene(sess, 'barcode', dur('barcode'),
  async () => {
    await page.goto(url('/shop-admin/offers/new'), { waitUntil: 'networkidle' })
    if (!/\/shop-admin\/offers\/new/.test(page.url())) throw new Error(`not logged in (url: ${page.url()})`)
    const open = btn(new RegExp(`^\\+ ${esc(L.pickTitle)}`))
    await open.waitFor({ timeout: 20000 }); await open.click()
    await fieldInput(L.eanLabel).waitFor({ timeout: 10000 })
    await sleep(600)
  },
  async (at) => {
    const a = A('barcode')
    await at(lead + 0.04 * a)
    await tap(page, fieldInput(L.eanLabel)); await typeText(page, demo.ean, 140)
    const match = page.locator('div.bg-green-50').filter({ hasText: L.syrup }).first()
    const ok = await match.waitFor({ timeout: 8000 }).then(() => true).catch(() => false)
    if (!ok) console.log('  !! no EAN match -> check prepare_catalog.py')
    await at(lead + 0.45 * a); if (ok) await highlight(match)
    await at(lead + 0.80 * a); if (ok) await highlight(match, false)
    if (!ok) throw new Error('no EAN match')
    await tap(page, match.getByRole('button').first())          // select the catalog item (step 2 opens)
  })

// 5 catalog photo: step 2 opens with the catalog photo ("From Pundo") ----------
await runScene(sess, 'catalog-photo', dur('catalog-photo'),
  async () => {
    const up = page.getByTestId('item-photo-upload')
    const ok = await up.waitFor({ timeout: 20000 }).then(() => true).catch(() => false)
    if (!ok) {
      const err = await page.locator('[role=alert]').allInnerTexts().catch(() => [])
      throw new Error(`step 2 did not open after selecting the item (alerts: ${err.join(' | ')})`)
    }
    await page.evaluate(() => window.scrollTo(0, 0)); await sleep(700)
  },
  async (at) => {
    const a = A('catalog-photo')
    const up = page.getByTestId('item-photo-upload')
    await at(lead + 0.08 * a)
    await glide(up, 900, 0.38)
    await at(lead + 0.15 * a); await highlight(up)
    await at(lead + 0.90 * a); await highlight(up, false)
    await at(lead + 0.95 * a)
  })

// 6 price --------------------------------------------------------------
await runScene(sess, 'price', dur('price'), null,
  async (at) => {
    const a = A('price')
    await at(lead + 0.03 * a)
    await glide(page.getByText(L.standardPrice, { exact: true }), 900, 0.22)
    await at(lead + 0.10 * a)
    await tapSelect(page.locator('select:has(option[value="on_request"])').first(), 'fixed')
    await at(lead + 0.17 * a)
    await tap(page, btn(`+ ${L.addUnit}`).first())
    await at(lead + 0.24 * a)
    const unit = page.locator('select:has(option[value="per_piece"])').first()
    await unit.waitFor({ timeout: 5000 })
    await tapSelect(unit, 'per_piece')
    await at(lead + 0.32 * a)
    const price = page.locator('input[inputmode=decimal]').first()
    await tap(page, price); await typeText(page, demo.price[lang], 140)
    await at(lead + 0.62 * a)
    const save = page.locator('form button[type=submit]')
    await glide(save, 900, 0.6)
    await at(lead + a + 0.1)
    await tap(page, save)
  })

// 7 done: list -> customer shop page (freeze while it loads, see video/README "Bekannte Eigenheiten") ----
await runScene(sess, 'done', dur('done'),
  async () => {
    const ok = await page.waitForURL(/\/shop-admin\/offers$/, { timeout: 25000 }).then(() => true).catch(() => false)
    if (!ok) {
      const err = await page.locator('[role=alert], [role=status]').allInnerTexts().catch(() => [])
      console.log('  !! save did not reach /shop-admin/offers (url:', page.url(), ') alerts:', err.join(' | '))
      await page.goto(url('/shop-admin/offers'), { waitUntil: 'networkidle' })
    }
    await page.getByText(L.syrup).first().waitFor({ timeout: 15000 }).catch(() => console.log('  !! new offer not in list'))
    await highlight(page.getByText(L.syrup).first())
    await sleep(700)
  },
  async (at) => {
    const a = A('done')
    if (!shopPath) { await at(lead + 0.30 * a); return }
    await at(lead)
    await sess.pause()
    await page.goto(url(shopPath), { waitUntil: 'networkidle' })
    const card = page.locator('a[href*="/products/"]', { hasText: L.syrup }).first()
    await card.waitFor({ timeout: 15000 }).catch(() => console.log('  !! syrup not on the shop page'))
    if (await card.count()) await glide(card, 1, 0.45)          // card already in view when the frame unfreezes
    await sleep(300)
    await sess.resume()
    await sleep(300)
    if (await card.count()) await highlight(card)
  })

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
