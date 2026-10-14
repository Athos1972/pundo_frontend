// Recorder for the YouTube Short S5 (9:16) "Price on request? Customers contact you directly".  Usage: node record.mjs <lang>
// Derived from ../service-from-catalog/record.mjs (same demo data and selectors); the offer picker is opened untimed.
// Needs the TEST frontend on :3500 (+ test backend :8500) and .cache/<lang>/timeline.json (from tts.py).
// Logs in as the demo shop of the shop-signup video (shop-signup/.recording-accounts.json, gitignored).
// Before recording: prepare_catalog_service.py (pundo_test only: remove this language's demo-shop offer/listing for the
// catalog service "Catering / events"; the platform item stays; re-activate the shop's other offers).
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
  en: { navOffers: 'Offers', addOffer: 'Add offer', pickTitle: 'Select product or service', searchLabel: 'Search by name',
        standardPrice: 'Standard price' },
  el: { navOffers: 'Προσφορές', addOffer: 'Προσθήκη προσφοράς', pickTitle: 'Επιλογή προϊόντος ή υπηρεσίας', searchLabel: 'Αναζήτηση με όνομα',
        standardPrice: 'Τιμή βάσης' },
}[lang]
if (!L) throw new Error(`no labels for lang ${lang}`)

// ---- demo account + test-DB preparation (only this language's shop) ----
const accounts = JSON.parse(fs.readFileSync(path.join(here, '../shop-signup/.recording-accounts.json'), 'utf8'))
const account = accounts[lang]
if (!account) throw new Error(`no demo account for ${lang}`)
let shopSlug = null, itemSlug = null
if (process.env.SKIP_PREPARE !== '1') {
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const out = execFileSync(path.join(backend, '.venv/bin/python'),
    [path.join(here, '../service-from-catalog/prepare_catalog_service.py'), account.email], { cwd: backend })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-2))
  const prep = JSON.parse(out.at(-1))
  shopSlug = prep.shops[account.email]; itemSlug = prep.item_slug
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

// --- warm-up: compile routes in the dev server so no scene waits on first-compile ---
const shopPath = shopSlug ? `/${lang}/shops/${shopSlug}` : null
const detailPath = itemSlug ? `/${lang}/products/${itemSlug}` : null
for (const p of ['/shop-admin/dashboard', '/shop-admin/offers', '/shop-admin/offers/new', shopPath, detailPath].filter(Boolean)) {
  await page.goto(url(p), { waitUntil: 'networkidle' }).catch(() => {})
}

const btn = (name) => page.getByRole('button', { name })
const fieldInput = (label) => page.locator('label', { hasText: label }).locator('xpath=following-sibling::div[1]//input')

// 3 pick: type the full name -> result with photo -> tap (creates the listing, step 2 opens) ----
await runScene(sess, 'pick', dur('pick'),
  async () => {
    await page.goto(url('/shop-admin/offers/new'), { waitUntil: 'networkidle' })
    if (!/\/shop-admin\/offers\/new/.test(page.url())) throw new Error(`not logged in (url: ${page.url()})`)
    const open = btn(new RegExp(`^\\+ ${esc(L.pickTitle)}`))
    await open.waitFor({ timeout: 20000 }); await open.click()
    await fieldInput(L.searchLabel).waitFor({ timeout: 10000 })
    await sleep(600)
  },
  async (at) => {
    const a = A('pick')
    await at(lead + 0.04 * a)
    const q = fieldInput(L.searchLabel)
    await tap(page, q); await typeText(page, demo.search[lang], 80)
    const hit = page.locator('ul li button').filter({ hasText: new RegExp(`^\\s*${demo.name[lang].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`) }).first()
    const ok = await hit.waitFor({ timeout: 8000 }).then(() => true).catch(() => false)
    if (!ok) throw new Error(`name search found nothing for ${JSON.stringify(demo.search[lang])}`)
    if (await page.getByText(/Similar products|παρόμοια/i).count()) console.log('  !! "similar products" box visible')
    await at(lead + 0.42 * a); await highlight(hit)
    await at(lead + 0.80 * a); await highlight(hit, false)
    await tap(page, hit)
  })

// 6 price: "On request", Save -------------------------------------------
await runScene(sess, 'price', dur('price'),
  async () => {
    const up = page.getByTestId('item-photo-upload')
    const ok = await up.waitFor({ timeout: 20000 }).then(() => true).catch(() => false)
    if (!ok) throw new Error('step 2 did not open after selecting the item')
    await sleep(500)
  },
  async (at) => {
    const a = A('price')
    const typeSel = page.locator('select:has(option[value="on_request"])').first()
    await at(lead + 0.03 * a)
    await glide(page.getByText(L.standardPrice, { exact: true }), 900, 0.25)
    await at(lead + 0.40 * a)
    await tapSelect(typeSel, 'on_request')
    await highlight(typeSel)
    await at(lead + 0.75 * a); await highlight(typeSel, false)
    const save = page.locator('form button[type=submit]')
    await glide(save, 800, 0.6)
    await at(lead + a + 0.1)
    await tap(page, save)
  })

// 7 done: list -> shop page: catering card "Price on request" -> contact links (freeze while the page loads) ----
await runScene(sess, 'done', dur('done'),
  async () => {
    const ok = await page.waitForURL(/\/shop-admin\/offers$/, { timeout: 25000 }).then(() => true).catch(() => false)
    if (!ok) {
      const err = await page.locator('[role=alert], [role=status]').allInnerTexts().catch(() => [])
      console.log('  !! save did not reach /shop-admin/offers (url:', page.url(), ') alerts:', err.join(' | '))
      await page.goto(url('/shop-admin/offers'), { waitUntil: 'networkidle' })
    }
    const row = page.getByText(demo.name[lang], { exact: true }).first()
    await row.waitFor({ timeout: 15000 }).catch(() => console.log('  !! new offer not in list'))
    await highlight(row)
    await sleep(700)
  },
  async (at) => {
    const a = A('done')
    if (!shopPath) { await at(lead + 0.30 * a); return }
    await at(lead)
    await sess.pause()
    await page.goto(url(shopPath), { waitUntil: 'networkidle' })
    const card = page.locator('a[href*="/products/"]', { hasText: demo.name[lang] }).first()
    await card.waitFor({ timeout: 15000 }).catch(() => console.log('  !! catering not on the shop page'))
    await card.scrollIntoViewIfNeeded().catch(() => {})
    await sleep(300)
    await sess.resume()
    await sleep(300)
    if (!await card.count()) return
    await highlight(card)                                       // card shows "Price on request"
    await at(lead + 0.42 * a); await highlight(card, false)
    // contact on the shop page (WhatsApp / phone at the top). The product detail page has no contact
    // button for on_request offers yet: the API returns shop_phone = null (separate bug task).
    const contact = page.locator('a[href*="wa.me"], a[href^="https://api.whatsapp"], a[href^="tel:"]').first()
    if (await contact.count()) { await glide(contact, 1200, 0.35); await at(lead + 0.62 * a); await highlight(contact.locator('xpath=..')) }
    else console.log('  !! no contact links on the shop page')
  })

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
