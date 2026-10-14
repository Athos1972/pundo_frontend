// Recorder for the YouTube Short S2 (9:16) "Your first product online in 2 minutes".  Usage: node record.mjs <lang>
// Derived from ../product-create-new/record.mjs (same demo data, prepare.sh and photo); picker + search happen untimed in the prep.
// Needs the TEST frontend on :3500 (+ test backend :8500) and .cache/<lang>/timeline.json (from tts.py).
// Logs in as the demo shop of the shop-signup video (shop-signup/.recording-accounts.json, gitignored).
// Before recording: prepare.sh <lang> (pundo_test only: approve demo account, deactivate stale demo/E2E
// items that would show up in the item search), then API cleanup of the demo shop's offers + listings.
// Env: SKIP_PREPARE=1 (skip prepare.sh), PRODUCT_PHOTO=<path> (default assets/product-photo.jpg).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { BASE, sleep, startSession, runScene, tap, typeText } from '../_branding/lib/record-lib.mjs'

const lang = process.argv[2] || 'en'
const here = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(here, '.cache', lang)
const tl = JSON.parse(fs.readFileSync(path.join(cacheDir, 'timeline.json'), 'utf8'))
const brand = execFileSync(
  path.join(here, '../.venv/bin/python'), ['-c', 'import yaml,json,sys;print(json.dumps(yaml.safe_load(open(sys.argv[1]))))', path.join(here, '../_branding/brand.yml')]).toString()
const T = JSON.parse(brand).timing
const photoPath = path.resolve(here, process.env.PRODUCT_PHOTO || '../product-create-new/assets/product-photo.jpg')
if (!fs.existsSync(photoPath)) throw new Error(`product photo missing: ${photoPath}`)

// ---- per-language demo data & UI labels (match the live UI strings, src/lib/i18n/shop-admin-*.ts) ----
const L = {
  en: {
    navOffers: 'Offers', addOffer: 'Add offer', pickTitle: 'Select product or service', searchLabel: 'Search by name',
    search: 'Sourdough', noResults: 'No results found', addNew: 'Create new product or service',
    name: 'Sourdough bread 750 g', product: 'Product', category: 'Breads & Buns', categoryQuery: 'bread',
    standardPrice: 'Standard price', addUnit: 'Add pricing unit', price: '4.50',
  },
  el: {
    navOffers: 'Προσφορές', addOffer: 'Προσθήκη προσφοράς', pickTitle: 'Επιλογή προϊόντος ή υπηρεσίας', searchLabel: 'Αναζήτηση με όνομα',
    search: 'Ψωμί προζυμιού', noResults: 'Δεν βρέθηκαν αποτελέσματα', addNew: 'Δημιουργία νέου προϊόντος ή υπηρεσίας',
    name: 'Ψωμί προζυμιού 750 γρ.', product: 'Προϊόν', category: 'Άρτοι και ψωμάκια', categoryQuery: 'ψωμί',
    standardPrice: 'Τιμή βάσης', addUnit: 'Προσθήκη μονάδας τιμής', price: '4,50',
  },
}[lang]
if (!L) throw new Error(`no labels for lang ${lang}`)

// ---- demo account (from the shop-signup recording) + test-DB preparation ----
const accFile = path.join(here, '../shop-signup/.recording-accounts.json')
const account = JSON.parse(fs.readFileSync(accFile, 'utf8'))[lang]
if (!account) throw new Error(`no demo account for ${lang} in ${accFile}`)
let prep = null
if (process.env.SKIP_PREPARE !== '1') {
  const out = execFileSync(path.join(here, '../product-create-new/prepare.sh'), [lang]).toString().trim().split('\n').at(-1)
  prep = JSON.parse(out)
  console.log('  prepare:', out)
}

const dur = (id) => {
  const s = tl.scenes.find((x) => x.id === id)
  return T.lead_in_s + s.audio_s + T.tail_s
}
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
if (!login.ok()) {
  throw new Error(`login ${account.email} -> HTTP ${login.status()} ${await login.text()}` +
    (login.status() === 403 ? ' (account pending: run prepare.sh / do not set SKIP_PREPARE)' : ''))
}

// --- idempotency: remove offers + listings of the demo shop from earlier runs (items stay, see prepare.sh) ---
const offers = await (await api('GET', 'offers?limit=500')).json().catch(() => ({}))
for (const o of offers.items ?? []) {
  if (!o.archived) await api('PATCH', `offers/${o.id}`, { archived: true })
  await api('DELETE', `offers/${o.id}`)
}
const listings = await (await api('GET', 'shop-listings?limit=200')).json().catch(() => ({}))
let removed = 0
for (const l of listings.items ?? []) {
  if (l.source !== 'shop_manual') continue
  const r = await api('DELETE', `shop-listings/${l.id}`)
  if (r.ok()) removed++; else console.log(`  !! listing ${l.id} not removed: HTTP ${r.status()}`)
}
console.log(`  cleanup: ${(offers.items ?? []).length} offers, ${removed} listings removed`)

// --- warm-up: compile routes in the dev server so no scene waits on first-compile ---
const shopPath = prep?.shop_slug ? `/${lang}/shops/${prep.shop_slug}` : null
for (const p of ['/shop-admin/dashboard', '/shop-admin/offers', '/shop-admin/offers/new', shopPath].filter(Boolean)) {
  await page.goto(url(p), { waitUntil: 'networkidle' }).catch(() => {})
}
await page.request.get(url(`/api/shop-admin/categories/suggest?name=bread&item_type=product`)).catch(() => {})
if (!shopPath) console.log('  !! no shop slug (SKIP_PREPARE) -> scene "done" stays on the offers list')

const btn = (name) => page.getByRole('button', { name })

// 3 step 1: search first -----------------------------------------------
const searchInput = () => page.locator('label', { hasText: L.searchLabel }).locator('xpath=following-sibling::div[1]//input')
// 4 new product --------------------------------------------------------
const createForm = () => page.locator('form').filter({ has: page.getByTestId('category-picker') })
await runScene(sess, 'new-product', dur('new-product'),
  async () => {
    await page.goto(url('/shop-admin/offers/new'), { waitUntil: 'networkidle' })
    if (!/\/shop-admin\/offers\/new/.test(page.url())) throw new Error(`not logged in (url: ${page.url()})`)
    const open = btn(new RegExp(`^\\+ ${esc(L.pickTitle)}`))
    await open.waitFor({ timeout: 20000 }); await open.click()
    await searchInput().waitFor({ timeout: 10000 })
    await searchInput().fill(L.search)
    await page.getByText(L.noResults, { exact: true }).last().waitFor({ timeout: 8000 })
      .catch(() => console.log('  !! search shows hits for', JSON.stringify(L.search), '-> check prepare.sh (stale items?)'))
    await sleep(600)
  },
  async (at) => {
    const a = A('new-product')
    await at(lead + 0.03 * a)
    const add = btn(`+ ${L.addNew}`)
    await glide(add, 500); await tap(page, add)
    const nameInput = createForm().locator('input[type=text]').first()
    await nameInput.waitFor({ timeout: 10000 })
    await at(lead + 0.13 * a)
    await glide(nameInput, 600, 0.3); await tap(page, nameInput); await typeText(page, L.name, 85)
    await at(lead + 0.45 * a)
    const radio = createForm().getByRole('radio', { name: L.product })
    await glide(radio, 500, 0.3); await tap(page, radio)
    await at(lead + 0.58 * a)
    const sug = createForm().getByTestId('category-suggestion').filter({ hasText: L.category }).first()
    if (await sug.waitFor({ timeout: 8000 }).then(() => true).catch(() => false)) {
      await glide(sug, 600, 0.45); await at(lead + 0.66 * a); await tap(page, sug)
    } else {                                   // fallback: category search (should not happen, see PROD-NOTES)
      console.log('  !! no suggestion', JSON.stringify(L.category), '-> category search')
      const q = createForm().getByTestId('category-search')
      await glide(q, 500); await tap(page, q); await typeText(page, L.categoryQuery, 90)
      const opt = createForm().getByTestId('category-option').filter({ hasText: L.category }).first()
      await opt.waitFor({ timeout: 8000 }); await tap(page, opt)
    }
    await createForm().getByTestId('category-selected').waitFor({ timeout: 5000 })
    await at(lead + 0.80 * a)
    const save = createForm().locator('button[type=submit]')
    await glide(save, 700, 0.6)
    await at(lead + a + 0.1)
    await tap(page, save)
  })

// 5 photo --------------------------------------------------------------
await runScene(sess, 'photo', dur('photo'),
  async () => {
    const up = page.getByTestId('item-photo-upload')
    const ok = await up.waitFor({ timeout: 20000 }).then(() => true).catch(() => false)
    if (!ok) {
      const err = await page.locator('[role=alert]').allInnerTexts().catch(() => [])
      throw new Error(`step 2 did not open after saving the item (alerts: ${err.join(' | ')})`)
    }
    await page.evaluate(() => window.scrollTo(0, 0)); await sleep(600)
  },
  async (at) => {
    const a = A('photo')
    const up = page.getByTestId('item-photo-upload')
    await at(lead + 0.10 * a)
    await glide(up, 800, 0.35)
    await at(lead + 0.38 * a)              // "up to eight photos ... cover photo"
    const addPhoto = page.getByTestId('item-photo-add')
    const chooser = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null)
    await tap(page, addPhoto)
    const fc = await chooser
    if (fc) await fc.setFiles(photoPath)
    else await page.getByTestId('item-photo-input').setInputFiles(photoPath)
    await page.getByTestId('item-photo-cover-badge').waitFor({ timeout: 20000 })
    await at(lead + 0.62 * a)
    await glide(up, 700, 0.4)
  })

// 6 price --------------------------------------------------------------
await runScene(sess, 'price', dur('price'), null,
  async (at) => {
    const a = A('price')
    await at(lead + 0.04 * a)
    await glide(page.getByText(L.standardPrice, { exact: true }), 900, 0.22)
    await at(lead + 0.13 * a)
    await tapSelect(page.locator('select:has(option[value="on_request"])').first(), 'fixed')
    await at(lead + 0.20 * a)
    await tap(page, btn(`+ ${L.addUnit}`).first())
    await at(lead + 0.27 * a)
    const unit = page.locator('select:has(option[value="per_piece"])').first()
    await unit.waitFor({ timeout: 5000 })
    await tapSelect(unit, 'per_piece')
    await at(lead + 0.48 * a)
    const price = page.locator('input[inputmode=decimal]').first()
    await tap(page, price); await typeText(page, L.price, 140)
    await at(lead + 0.70 * a)
    const save = page.locator('form button[type=submit]')
    await glide(save, 900, 0.6)
    await at(lead + a + 0.1)
    await tap(page, save)
  })

// 7 done: list -> customer shop page ----------------------------------
await runScene(sess, 'done', dur('done'),
  async () => {
    const ok = await page.waitForURL(/\/shop-admin\/offers$/, { timeout: 25000 }).then(() => true).catch(() => false)
    if (!ok) {
      const err = await page.locator('[role=alert], [role=status]').allInnerTexts().catch(() => [])
      console.log('  !! save did not reach /shop-admin/offers (url:', page.url(), ') alerts:', err.join(' | '))
      await page.goto(url('/shop-admin/offers'), { waitUntil: 'networkidle' })
    }
    await page.getByText(L.name).first().waitFor({ timeout: 15000 }).catch(() => console.log('  !! new offer not in list'))
    await highlight(page.getByText(L.name).first())       // scene opens on the highlighted new offer
    await sleep(700)
  },
  async (at) => {
    const a = A('done')
    if (!shopPath) { await at(lead + 0.30 * a); await highlight(page.getByText(L.name).first(), false); return }
    // in the recording browser the dev server renders the shop page in ~5.5 s (curl/plain Chromium: ~0.1 s),
    // showing the loading skeleton: freeze on the highlighted list while it loads, then cut to the finished page
    // (start right away so the cut lands near "...your shop page, with photo and price")
    await at(lead)
    await sess.pause()
    await page.goto(url(shopPath), { waitUntil: 'networkidle' })
    const c0 = page.locator('a[href*="/products/"]', { hasText: L.name }).first()
    await c0.waitFor({ timeout: 15000 }).catch(() => {})
    if (await c0.count()) await glide(c0, 1, 0.45)               // card already in view when the frame unfreezes
    await sleep(300)
    await sess.resume()
    await sleep(200)
    const card = page.locator('a[href*="/products/"]', { hasText: L.name }).first()
    if (await card.count()) await highlight(card); else console.log('  !! bread not on the shop page')
  })

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
