// Recorder for "Keep your shop profile up to date".  Usage: node record.mjs <lang>
// Needs the TEST frontend on :3500 (+ test backend :8500, with bug fix B5950-001 for the second opening slot)
// and .cache/<lang>/timeline.json (from tts.py).
// Logs in as the demo shop of the shop-signup video (shop-signup/.recording-accounts.json, gitignored).
// Before recording: prepare_profile.py (pundo_test only: empty description, languages, payment methods, radius,
// opening hours and social links of this language's demo shop).
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

// ---- per-language UI labels (src/lib/i18n/shop-admin-common.ts; customer: src/lib/i18n/shop.ts, common.ts) ----
const L = {
  en: { navHours: 'Opening Hours', hoursSave: 'Save hours', navProfile: 'Shop Profile', secondSlot: 'Second time slot', closed: 'Closed',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        languages: 'Languages spoken', payments: 'Accepted payment methods', social: 'Social media',
        pay: { cash: 'Cash', card: 'Visa / Mastercard', revolut: 'Revolut' },
        cHours: 'Opening hours', cPayments: 'Payment methods', cLanguages: 'Languages spoken' },
  el: { navHours: 'Ώρες λειτουργίας', hoursSave: 'Αποθήκευση ωραρίου', navProfile: 'Προφίλ καταστήματος', secondSlot: 'Δεύτερο χρονικό διάστημα', closed: 'Κλειστό',
        days: ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'],
        languages: 'Γλώσσες', payments: 'Αποδεκτοί τρόποι πληρωμής', social: 'Κοινωνικά δίκτυα',
        pay: { cash: 'Μετρητά', card: 'Visa / Mastercard', revolut: 'Revolut' },
        cHours: 'Ώρες λειτουργίας', cPayments: 'Τρόποι πληρωμής', cLanguages: 'Γλώσσες' },
}[lang]
if (!L) throw new Error(`no labels for lang ${lang}`)

// ---- demo account + test-DB preparation (only this language's shop) ----
const accounts = JSON.parse(fs.readFileSync(path.join(here, '../shop-signup/.recording-accounts.json'), 'utf8'))
const account = accounts[lang]
if (!account) throw new Error(`no demo account for ${lang}`)
let shopSlug = null
if (process.env.SKIP_PREPARE !== '1') {
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const out = execFileSync(path.join(backend, '.venv/bin/python'),
    [path.join(here, 'prepare_profile.py'), account.email], { cwd: backend })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-2))
  shopSlug = JSON.parse(out.at(-1)).shops[account.email]
}

const dur = (id) => T.lead_in_s + tl.scenes.find((x) => x.id === id).audio_s + T.tail_s
const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const lead = T.lead_in_s
const url = (p) => `${BASE}${p}`

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

/** Ripple on a field, then set it (native time pickers are not part of the screencast). */
async function setField(locator, value, pause = 250) {
  await locator.scrollIntoViewIfNeeded()
  const b = await locator.boundingBox()
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [b.x + b.width / 2, b.y + b.height / 2])
  await sleep(pause)
  await locator.fill(value)
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
for (const p of ['/shop-admin/dashboard', '/shop-admin/hours', '/shop-admin/profile', shopPath].filter(Boolean)) {
  await page.goto(url(p), { waitUntil: 'networkidle' }).catch(() => {})
}

const nav = async (name, re) => {
  await tap(page, page.getByRole('button', { name: 'Toggle navigation' }))   // aria-label is not translated
  await sleep(500)
  await tap(page, page.locator('#mobile-nav').getByRole('link', { name }))
  await page.waitForURL(re, { timeout: 20000 })
}
// HoursEditor rows (src/components/shop-admin/HoursEditor.tsx): one row per weekday, inputs carry aria-labels.
const dayRow = (i) => page.locator('div', { has: page.getByText(L.days[i], { exact: true }) }).filter({ has: page.locator('input[type=checkbox]') }).last()
const openIn = (i) => page.getByLabel(`${L.days[i]} open from`)
const closeIn = (i) => page.getByLabel(`${L.days[i]} close at`)
const open2In = (i) => page.getByLabel(`${L.days[i]} second open from`)
const close2In = (i) => page.getByLabel(`${L.days[i]} second close at`)
const H = demo.hours

/** Fill one weekday: first slot, optional second slot. `fast` = short pauses (Tue-Fri). */
async function fillDay(i, { second = true, close = H.close, fast = false } = {}) {
  const p = fast ? 60 : 250
  // After prepare_profile.py all days come back as "Closed" (no time inputs): untick first.
  const closedBox = page.getByLabel(`${L.days[i]} ${L.closed}`)
  if (await closedBox.isChecked()) { await tap(page, closedBox); await openIn(i).waitFor({ timeout: 5000 }); await sleep(fast ? 80 : 300) }
  await setField(openIn(i), H.open, p); await setField(closeIn(i), close, p)
  if (second) {
    if (!await open2In(i).count()) { await tap(page, dayRow(i).getByRole('button', { name: `+ ${L.secondSlot}` })); await sleep(fast ? 80 : 300) }
    await setField(open2In(i), H.second_open, p); await setField(close2In(i), H.second_close, p)
  }
}

// 1 welcome ------------------------------------------------------------
await runScene(sess, 'welcome', dur('welcome'),
  async () => {
    await page.goto(url('/shop-admin/dashboard'), { waitUntil: 'networkidle' })
    if (!/\/shop-admin\/dashboard/.test(page.url())) throw new Error(`not logged in (url: ${page.url()})`)
    await sleep(800)
  }, null)

// 2 hours: Mon 07-14 + 16:30-19, Tue-Fri same (quick), Sat 07-14, Sun closed, save -------------
await runScene(sess, 'hours', dur('hours'), null,
  async (at) => {
    const a = A('hours')
    await at(lead + 0.01 * a)
    await nav(L.navHours, /\/shop-admin\/hours/)
    await page.getByLabel(`${L.days[0]} ${L.closed}`).waitFor({ timeout: 15000 })
    await at(lead + 0.10 * a)
    await highlight(dayRow(0)); await fillDay(0, { second: false })
    await at(lead + 0.30 * a)
    await fillDay(0)                                            // "+ second time slot" 16:30-19:00
    await at(lead + 0.48 * a); await highlight(dayRow(0), false)
    for (const i of [1, 2, 3, 4]) { await glide(dayRow(i), 300, 0.4); await fillDay(i, { fast: true }) }
    await at(lead + 0.66 * a)
    await glide(dayRow(5), 500, 0.4)
    await fillDay(5, { second: false, close: H.sat_close })
    if (await open2In(5).count()) await tap(page, dayRow(5).getByRole('button', { name: 'Remove second slot' }))
    await at(lead + 0.80 * a)
    const sun = page.getByLabel(`${L.days[6]} ${L.closed}`)
    await glide(sun, 500, 0.45)
    if (!await sun.isChecked()) await tap(page, sun)
    await highlight(dayRow(6))
    await at(lead + 0.93 * a); await highlight(dayRow(6), false)
    const save = page.getByRole('button', { name: L.hoursSave })
    await glide(save, 500, 0.6)
    await at(lead + a + 0.1)
    await tap(page, save)
  })

// 3 description: Shop Profile -> type one sentence ----------------------
await runScene(sess, 'description', dur('description'),
  async () => { await sleep(1200) },                           // toast "saved"
  async (at) => {
    const a = A('description')
    await at(lead + 0.01 * a)
    await nav(L.navProfile, /\/shop-admin\/profile/)
    const d = page.locator('textarea[name=description]')
    await d.waitFor({ timeout: 15000 })
    await glide(d, 700, 0.4)
    await at(lead + 0.25 * a)
    await tap(page, d); await d.fill(''); await typeText(page, demo.description[lang], 32)
  })

// 4 languages + payment ------------------------------------------------
await runScene(sess, 'languages-payment', dur('languages-payment'), null,
  async (at) => {
    const a = A('languages-payment')
    const lg = page.getByRole('group', { name: L.languages })
    await at(lead + 0.05 * a)
    await glide(lg, 700, 0.4)
    await at(lead + 0.25 * a)
    for (const code of demo.languages) {
      const b = lg.getByRole('button', { name: code, exact: true })
      if (await b.getAttribute('aria-pressed') !== 'true') await tap(page, b)
      await sleep(350)
    }
    await at(lead + 0.55 * a)
    const pay = page.getByText(L.payments, { exact: true }).locator('xpath=..')
    await glide(pay, 700, 0.4)
    await at(lead + 0.68 * a)
    for (const m of demo.payments) { await tap(page, pay.getByRole('button', { name: L.pay[m] })); await sleep(400) }
  })

// 5 delivery radius, social links (highlight only), save -----------------------
await runScene(sess, 'delivery', dur('delivery'), null,
  async (at) => {
    const a = A('delivery')
    const r = page.locator('input[name=service_radius_km]')
    await at(lead + 0.03 * a)
    await glide(r, 700, 0.4)
    await at(lead + 0.25 * a)
    await tap(page, r); await r.fill(''); await typeText(page, String(demo.radius_km), 150)
    await at(lead + 0.50 * a)
    const soc = page.getByText(L.social, { exact: true }).locator('xpath=..')
    await glide(soc, 800, 0.4); await highlight(soc)
    await at(lead + 0.82 * a); await highlight(soc, false)
    const save = page.locator('form button[type=submit]')
    await glide(save, 500, 0.6)
    await at(lead + a + 0.1)
    await tap(page, save)
  })

// 6 customer view: shop page, highlight description, languages, delivery, payment, hours ----------
await runScene(sess, 'customer-view', dur('customer-view'),
  async () => { await sleep(1500) },                           // save + toast
  async (at) => {
    const a = A('customer-view')
    if (!shopPath) { await at(lead + 0.3 * a); return }
    await sess.pause()
    await page.goto(url(shopPath), { waitUntil: 'networkidle' })
    const desc = page.getByText(demo.description[lang]).first()
    await desc.waitFor({ timeout: 15000 }).catch(() => console.log('  !! description not on the shop page'))
    await glide(desc, 1, 0.3).catch(() => {})
    await sleep(300)
    await sess.resume()
    const steps = [
      [desc, 0.10],
      [page.getByText(L.cLanguages).first().locator('xpath=..'), 0.30],
      [page.getByText('📍').first(), 0.45],
      [page.getByText(L.cPayments, { exact: true }).first().locator('xpath=..'), 0.58],
      [page.getByRole('heading', { name: L.cHours }).first().locator('xpath=..'), 0.72],
    ]
    let prev = null
    for (const [loc, t] of steps) {
      await at(lead + t * a)
      if (prev) await highlight(prev, false)
      if (!await loc.count()) { console.log('  !! missing on shop page:', String(loc)); continue }
      await glide(loc, 700, 0.42); await highlight(loc); prev = loc
    }
    await at(lead + 0.97 * a); if (prev) await highlight(prev, false)
  })

// 7 wrap-up ------------------------------------------------------------
await runScene(sess, 'wrap-up', dur('wrap-up'), null, null)

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
