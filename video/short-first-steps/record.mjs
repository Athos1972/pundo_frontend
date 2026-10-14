// Recorder for the YouTube Short (9:16) of tutorial #10 "Your first 10 minutes on pundo".  Usage: node record.mjs <lang>
// Derived from ../first-steps/record.mjs (same demo data and selectors): scenes suggestions, keep, price, customer;
// the offers list opens untimed in the prep of the first scene.
// Needs the TEST frontend on :3500 (+ test backend :8500, with B5910-007 and B5900-016) and .cache/<lang>/timeline.json.
// Logs in as the demo shop of the shop-signup video (shop-signup/.recording-accounts.json, gitignored).
// Before recording: ../first-steps/prepare_first_steps.py (pundo_test only: three bakery suggestions back to "just approved").
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
  en: { offers: 'Offers', profile: 'Shop Profile', hours: 'Opening Hours', keep: 'Keep', edit: 'Edit', archive: 'Archive',
        standardPrice: 'Standard price', addPriceTier: 'Add pricing unit', addOffer: 'Add offer' },
  el: { offers: 'Προσφορές', profile: 'Προφίλ καταστήματος', hours: 'Ώρες λειτουργίας', keep: 'Διατήρηση', edit: 'Επεξεργασία',
        archive: 'Αρχειοθέτηση', standardPrice: 'Τιμή βάσης', addPriceTier: 'Προσθήκη μονάδας τιμής', addOffer: 'Προσθήκη προσφοράς' },
}[lang]
if (!L) throw new Error(`no labels for lang ${lang}`)

// ---- demo account + test-DB preparation (only this language's shop) ----
const accounts = JSON.parse(fs.readFileSync(path.join(here, '../shop-signup/.recording-accounts.json'), 'utf8'))
const account = accounts[lang]
if (!account) throw new Error(`no demo account for ${lang}`)
let shopSlug = lang === 'el' ? 'o-phournos-tes-annas' : 'anna-s-bakery'
if (process.env.SKIP_PREPARE !== '1') {
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const out = execFileSync(path.join(backend, '.venv/bin/python'),
    [path.join(here, '../first-steps/prepare_first_steps.py'), account.email], { cwd: backend }).toString().trim().split('\n')
  console.log('  prepare:', out.at(-2))
  shopSlug = JSON.parse(out.at(-1)).shops[account.email]
}

const dur = (id) => T.lead_in_s + tl.scenes.find((x) => x.id === id).audio_s + T.tail_s
const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const lead = T.lead_in_s
const url = (p) => `${BASE}${p}`
const shopPath = `/${lang}/shops/${shopSlug}`

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

/** Ripple on a field without typing (native pickers are not part of the screencast). */
async function ripple(locator) {
  await locator.scrollIntoViewIfNeeded()
  const b = await locator.boundingBox()
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [b.x + b.width / 2, b.y + b.height / 2])
  await sleep(250)
}
async function tapSelect(locator, value) { await ripple(locator); await locator.selectOption(value) }

/** Load a page while the screencast is frozen (no loading skeleton in the video), optionally scroll to `target`. */
async function frozenGoto(p, target, align = 0.4) {
  await sess.pause()
  await page.goto(url(p), { waitUntil: 'domcontentloaded' })
  if (target) { const t = target(); await t.waitFor({ timeout: 20000 }).catch(() => console.log('  !! not found on', p)); await glide(t, 1, align).catch(() => {}) }
  await sleep(400)
  await sess.resume()
}

// --- login (API through the same-origin proxy -> cookie lands in the browser context) ---
const api = (method, p, data) => page.request.fetch(url(`/api/shop-admin/${p}`), { method, data, headers: { 'Accept-Language': lang } })
const login = await api('POST', 'login', { email: account.email, password: account.password })
if (!login.ok()) throw new Error(`login ${account.email} -> HTTP ${login.status()} ${await login.text()}`)

// --- warm-up: compile routes so no scene waits on first-compile ---
for (const p of ['/shop-admin/dashboard', '/shop-admin/offers', '/shop-admin/profile', shopPath]) {
  await page.goto(url(p), { waitUntil: 'domcontentloaded' }).catch(() => {})
  await sleep(1500)
}

/** Offers list row of an item (OfferList.tsx: div.px-4.py-3). */
const row = (name) => page.getByText(name, { exact: true }).first()
  .locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " px-4 ") and contains(@class, "py-3")][1]')
const stdBlock = () => page.locator('form > div', { has: page.getByText(L.standardPrice, { exact: true }) })
const saveBtn = () => page.locator('form button[type=submit]')
const tile = (label) => page.locator('main a[href^="/shop-admin/"]', { hasText: label }).first()
async function waitSaved() {
  const ok = await page.waitForURL(/\/shop-admin\/offers$/, { timeout: 25000 }).then(() => true).catch(() => false)
  if (!ok) throw new Error(`save did not reach /shop-admin/offers (url: ${page.url()})`)
}

// 1 suggestions: Offers tile -> list, the three suggestions one by one ----------
await runScene(sess, 'suggestions', dur('suggestions'),
  async () => {
    await page.goto(url('/shop-admin/offers'), { waitUntil: 'domcontentloaded' })
    if (!/\/shop-admin\/offers/.test(page.url())) throw new Error(`not logged in (url: ${page.url()})`)
    await row(demo.keep[lang]).waitFor({ timeout: 20000 })
    await glide(row(demo.keep[lang]), 1, 0.3)
    await sleep(800)
  },
  async (at) => {
    const a = A('suggestions')
    const names = [demo.keep[lang], demo.price[lang], demo.archive[lang]]
    for (const [i, n] of names.entries()) {
      await at(lead + (0.10 + 0.25 * i) * a); await highlight(row(n))
      await at(lead + (0.30 + 0.25 * i) * a); await highlight(row(n), false)
    }
  })

// 2 keep: wedding cake -> Keep ------------------------------------------------
await runScene(sess, 'keep', dur('keep'), null,
  async (at) => {
    const a = A('keep')
    const r = row(demo.keep[lang])
    await at(lead + 0.05 * a); await glide(r, 600, 0.4); await highlight(r)
    await at(lead + 0.55 * a); await highlight(r, false)
    await tap(page, r.getByRole('button', { name: L.keep }))
  })

// 3 price: fresh bread -> Edit -> fixed price 2.50 per piece -> Save -------------
await runScene(sess, 'price', dur('price'), null,
  async (at) => {
    const a = A('price')
    const r = row(demo.price[lang])
    await at(lead + 0.03 * a); await glide(r, 600, 0.4)
    await tap(page, r.locator('a[href$="/edit"]'))
    await page.waitForURL(/\/edit$/, { timeout: 20000 })
    await stdBlock().waitFor({ timeout: 20000 })
    const blk = stdBlock()
    await at(lead + 0.22 * a); await glide(blk, 700, 0.3)
    await tapSelect(blk.locator('select').first(), 'fixed')
    await at(lead + 0.35 * a)
    await tap(page, blk.getByRole('button', { name: `+ ${L.addPriceTier}` }))
    await at(lead + 0.45 * a)
    await tapSelect(blk.locator('select').nth(1), 'per_piece')
    await at(lead + 0.55 * a)
    const price = blk.locator('input[inputmode=decimal]').first()
    await tap(page, price); await price.press('ControlOrMeta+a'); await typeText(page, demo.price_value[lang], 120)
    await at(lead + 0.80 * a)
    await glide(saveBtn(), 600, 0.6)
    await tap(page, saveBtn())
  })

// 4 customer: shop page, fresh bread 2.50 + wedding cake on request ----------
const productCard = (name) => page.locator('a[href*="/products/"]').filter({ hasText: name }).first()
  .locator('xpath=ancestor::*[.//img][1]')
await runScene(sess, 'customer', dur('customer'), async () => { await waitSaved(); await sleep(300) },
  async (at) => {
    const a = A('customer')
    await at(lead + 0.02 * a)
    await frozenGoto(shopPath, () => productCard(demo.price[lang]), 0.4)
    await at(lead + 0.10 * a); await highlight(productCard(demo.price[lang]))
    await at(lead + 0.55 * a); await highlight(productCard(demo.price[lang]), false)
    await highlight(productCard(demo.keep[lang]))
  })

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
