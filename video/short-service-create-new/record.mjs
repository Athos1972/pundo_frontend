// Recorder for the YouTube Short S4 (9:16) "Services belong on pundo too".  Usage: node record.mjs <lang>
// Derived from ../service-create-new/record.mjs (same demo data, prepare and photo); picker, search and "+ Create new" happen untimed in the prep.
// Needs the TEST frontend on :3500 (dev server of this repo) + test backend :8500 and .cache/<lang>/timeline.json.
// Logs in as the demo shop of the shop-signup video (shop-signup/.recording-accounts.json, gitignored).
// Before recording: prepare_service.py (pundo_test only: remove the workshop from earlier runs, re-activate the
// demo shops' other offers, check the px-cooking category). Env: SKIP_PREPARE=1, BACKEND_DIR, SERVICE_PHOTO.
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
const photoPath = path.resolve(here, process.env.SERVICE_PHOTO || '../service-create-new/assets/workshop-photo.jpg')
if (!fs.existsSync(photoPath)) throw new Error(`photo missing: ${photoPath}`)

// ---- per-language UI labels (src/lib/i18n/shop-admin-*.ts) ----
const L = {
  en: { navOffers: 'Offers', addOffer: 'Add offer', pickTitle: 'Select product or service', searchLabel: 'Search by name',
        noResults: 'No results found', addNew: 'Create new product or service', service: 'Service',
        standardPrice: 'Standard price', addUnit: 'Add pricing unit', short: 'workshop' },
  el: { navOffers: 'Προσφορές', addOffer: 'Προσθήκη προσφοράς', pickTitle: 'Επιλογή προϊόντος ή υπηρεσίας', searchLabel: 'Αναζήτηση με όνομα',
        noResults: 'Δεν βρέθηκαν αποτελέσματα', addNew: 'Δημιουργία νέου προϊόντος ή υπηρεσίας', service: 'Υπηρεσία',
        standardPrice: 'Τιμή βάσης', addUnit: 'Προσθήκη μονάδας τιμής', short: 'Εργαστήρι ψωμιού' },
}[lang]
if (!L) throw new Error(`no labels for lang ${lang}`)

// ---- demo account + test-DB preparation ----
const accounts = JSON.parse(fs.readFileSync(path.join(here, '../shop-signup/.recording-accounts.json'), 'utf8'))
const account = accounts[lang]
if (!account) throw new Error(`no demo account for ${lang}`)
let shopSlug = null
if (process.env.SKIP_PREPARE !== '1') {
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const out = execFileSync(path.join(backend, '.venv/bin/python'),
    // only this language's shop: no cross-language cleanup (the other language's workshop stays)
    [path.join(here, '../service-create-new/prepare_service.py'), account.email], { cwd: backend })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-2))
  shopSlug = JSON.parse(out.at(-1)).shops[account.email]
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

// --- login ---
const api = (method, p, data) => page.request.fetch(url(`/api/shop-admin/${p}`), { method, data, headers: { 'Accept-Language': lang } })
const login = await api('POST', 'login', { email: account.email, password: account.password })
if (!login.ok()) throw new Error(`login ${account.email} -> HTTP ${login.status()} ${await login.text()}`)

// --- warm-up ---
const shopPath = shopSlug ? `/${lang}/shops/${shopSlug}` : null
for (const p of ['/shop-admin/dashboard', '/shop-admin/offers', '/shop-admin/offers/new', shopPath].filter(Boolean)) {
  await page.goto(url(p), { waitUntil: 'networkidle' }).catch(() => {})
}
await page.request.get(url(`/api/shop-admin/categories/suggest?name=${encodeURIComponent(demo.name[lang])}&item_type=service`)).catch(() => {})

const btn = (name) => page.getByRole('button', { name })
const fieldInput = (label) => page.locator('label', { hasText: label }).locator('xpath=following-sibling::div[1]//input')

// 4 new service: name, type Service, suggested category, Save ---------
const createForm = () => page.locator('form').filter({ has: page.getByTestId('category-picker') })
await runScene(sess, 'new-service', dur('new-service'),
  async () => {
    await page.goto(url('/shop-admin/offers/new'), { waitUntil: 'networkidle' })
    if (!/\/shop-admin\/offers\/new/.test(page.url())) throw new Error(`not logged in (url: ${page.url()})`)
    const open = btn(new RegExp(`^\\+ ${esc(L.pickTitle)}`))
    await open.waitFor({ timeout: 20000 }); await open.click()
    await fieldInput(L.searchLabel).waitFor({ timeout: 10000 })
    await fieldInput(L.searchLabel).fill(demo.search[lang])
    await page.getByText(L.noResults, { exact: true }).last().waitFor({ timeout: 8000 })
      .catch(() => console.log('  !! search shows hits for', JSON.stringify(demo.search[lang]), '-> check prepare_service.py'))
    await btn(`+ ${L.addNew}`).click()
    await createForm().locator('input[type=text]').first().waitFor({ timeout: 10000 })
    await sleep(600)
  },
  async (at) => {
    const a = A('new-service')
    const nameInput = createForm().locator('input[type=text]').first()
    await at(lead + 0.04 * a)
    await glide(nameInput, 500, 0.3); await tap(page, nameInput)
    await sleep(100); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
    await typeText(page, demo.name[lang], 80)
    await at(lead + 0.36 * a)
    const radio = createForm().getByRole('radio', { name: L.service })
    await glide(radio, 500, 0.3); await tap(page, radio)
    await at(lead + 0.42 * a); await highlight(radio.locator('xpath=..'))
    await at(lead + 0.52 * a); await highlight(radio.locator('xpath=..'), false)
    const sug = createForm().getByTestId('category-suggestion').filter({ hasText: demo.category[lang] }).first()
    if (!await sug.waitFor({ timeout: 8000 }).then(() => true).catch(() => false)) throw new Error(`no category suggestion ${demo.category[lang]}`)
    await glide(sug, 600, 0.45)
    await at(lead + 0.66 * a); await tap(page, sug)
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
    if (!await up.waitFor({ timeout: 20000 }).then(() => true).catch(() => false)) {
      const err = await page.locator('[role=alert]').allInnerTexts().catch(() => [])
      throw new Error(`step 2 did not open after saving the service (alerts: ${err.join(' | ')})`)
    }
    await page.evaluate(() => window.scrollTo(0, 0)); await sleep(600)
  },
  async (at) => {
    const a = A('photo')
    const up = page.getByTestId('item-photo-upload')
    await at(lead + 0.08 * a)
    await glide(up, 800, 0.35)
    await at(lead + 0.30 * a)
    const chooser = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null)
    await tap(page, page.getByTestId('item-photo-add'))
    const fc = await chooser
    if (fc) await fc.setFiles(photoPath)
    else await page.getByTestId('item-photo-input').setInputFiles(photoPath)
    await page.getByTestId('item-photo-cover-badge').waitFor({ timeout: 20000 })
    await at(lead + 0.62 * a)
    await glide(up, 700, 0.4)
  })

// 6 price: show price-type field, Fixed, Session, 35, Save ------------
await runScene(sess, 'price', dur('price'), null,
  async (at) => {
    const a = A('price')
    const typeSel = page.locator('select:has(option[value="on_request"])').first()
    await at(lead + 0.03 * a)
    await glide(page.getByText(L.standardPrice, { exact: true }), 900, 0.22)
    await at(lead + 0.10 * a); await highlight(typeSel)            // "On request" / "variable" are named here
    await at(lead + 0.40 * a); await highlight(typeSel, false)
    await tapSelect(typeSel, 'fixed')
    await at(lead + 0.52 * a)
    await tap(page, btn(`+ ${L.addUnit}`).first())
    await at(lead + 0.58 * a)
    const unit = page.locator('select:has(option[value="per_session"])').first()
    await unit.waitFor({ timeout: 5000 })
    await tapSelect(unit, 'per_session')
    await at(lead + 0.66 * a)
    const price = page.locator('input[inputmode=decimal]').first()
    await tap(page, price); await typeText(page, demo.price[lang], 160)
    await at(lead + 0.84 * a)
    const save = page.locator('form button[type=submit]')
    await glide(save, 800, 0.6)
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
    const row = page.getByText(demo.name[lang]).first()
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
    const card = page.getByText(demo.name[lang]).first()
    await card.waitFor({ timeout: 15000 }).catch(() => console.log('  !! workshop not on the shop page'))
    if (await card.count()) await glide(card, 1, 0.45)          // card already in view when the frame unfreezes
    await sleep(300)
    await sess.resume()
    await sleep(300)
    if (await card.count()) await highlight(card)
  })

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
