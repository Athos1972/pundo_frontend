// Recorder for tutorial #13 "Reply to your reviews" (series part 10).  Usage: node record.mjs <lang>
// Needs the TEST frontend on :3500 (standalone build: node scripts/e2e-frontend.cjs start), the test backend :8500
// and .cache/<lang>/timeline.json.
// Before recording: prepare_reviews.py (pundo_test only: four demo reviews, "last seen" reset -> "3 new").
// Demo owner accounts: ../catalog-import/.recording-accounts.json (gitignored, written by prepare_catalog_import.py).
// UI labels come straight from src/lib/i18n/shop-admin-{reviews,common}.ts (Node strips the TS types).
// Never open /shop-admin/reviews before scene "find": opening the list marks the reviews as seen.
// Env: SKIP_PREPARE=1, BACKEND_DIR (default ~/dev/github/pundo_main_backend).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { BASE, sleep, startSession, runScene, tap, typeText } from '../_branding/lib/record-lib.mjs'
import { tShopAdminReviews } from '../../src/lib/i18n/shop-admin-reviews.ts'

const lang = process.argv[2] || 'en'
const here = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(here, '.cache', lang)
const tl = JSON.parse(fs.readFileSync(path.join(cacheDir, 'timeline.json'), 'utf8'))
const T = tl.brand.timing
const demo = tl.meta.demo
const R = tShopAdminReviews(lang)

// ---- test-DB preparation ----
let prep
{
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const args = [path.join(here, 'prepare_reviews.py'), lang]
  if (process.env.SKIP_PREPARE === '1') args.splice(1, 0, '--dry-run')
  const out = execFileSync(path.join(backend, '.venv/bin/python'), args, { cwd: backend, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-2))
  prep = JSON.parse(out.at(-1))
}
const account = JSON.parse(fs.readFileSync(path.join(here, '../catalog-import/.recording-accounts.json'), 'utf8'))[lang]
if (!account) throw new Error(`no demo account for ${lang}`)

const dur = (id) => T.lead_in_s + tl.scenes.find((x) => x.id === id).audio_s + T.tail_s
const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const lead = T.lead_in_s
const url = (p) => `${BASE}${p}`
const shopPath = `/${lang}/shops/${prep.shop.slug}`

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
const unhighlightAll = () => page.evaluate(() => document.querySelectorAll('.vid-highlight').forEach((e) => e.classList.remove('vid-highlight'))).catch(() => {})

const sess = await startSession({ lang, outDir: path.join(cacheDir, 'rec') })
const { page } = sess
const warn = []
page.on('pageerror', (e) => warn.push(e.message))
page.on('dialog', (d) => d.dismiss().catch(() => {}))

async function imagesLoaded(sel = 'img') {
  await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].filter((i) => i.getBoundingClientRect().top < innerHeight && i.getBoundingClientRect().bottom > 0)
    .every((i) => i.complete && i.naturalWidth > 0), sel, { timeout: 20000 }).catch(() => console.log('  !! images not loaded'))
}
/** Load a page while the screencast is frozen (no loading skeleton in the video), optionally scroll to `target`. */
async function frozenGoto(p, target, align = 0.4) {
  await sess.pause()
  await page.goto(url(p), { waitUntil: 'domcontentloaded' })
  if (target) { const t = target(); await t.waitFor({ timeout: 20000 }).catch(() => console.log('  !! not found on', p)); await glide(t, 1, align).catch(() => {}) }
  await imagesLoaded()
  await sleep(400)
  await sess.resume()
}
async function errorsVisible(where) {
  // ignore Next's empty route announcer (role=alert)
  const texts = (await page.locator('[role=alert]').allInnerTexts()).map((t) => t.trim()).filter(Boolean)
  if (texts.length) console.log(`  !! alert(s) visible in ${where}:`, texts.map((t) => t.slice(0, 120)))
}

// --- login (API through the same-origin proxy -> cookie lands in the browser context) ---
const login = await page.request.fetch(url('/api/shop-admin/login'), { method: 'POST', data: { email: account.email, password: account.password } })
if (!login.ok()) throw new Error(`login -> HTTP ${login.status()}`)
const summary = await (await page.request.fetch(url('/api/shop-admin/reviews/summary'))).json()
console.log('  summary:', JSON.stringify(summary))
if (summary.new_count !== 3 || summary.shop_total !== 3) console.log('  !! expected 3 new / 3 shop reviews')

// --- warm-up (NOT the review list: it would mark everything as seen) ---
for (const p of ['/shop-admin/dashboard', shopPath]) {
  await page.goto(url(p), { waitUntil: 'domcontentloaded' }).catch(() => {})
  await sleep(1500)
}

const card = (key) => page.locator(`article[aria-label="${prep.names[key]}"]`)
const tile = () => page.locator('main a[href="/shop-admin/reviews"]')

// 0 hook: dashboard, tile "3 new · Ø 3.0 · 3 reviews" -------------------------------------------------------
await runScene(sess, 'hook', dur('hook'),
  async () => {
    await page.goto(url('/shop-admin/dashboard'), { waitUntil: 'domcontentloaded' })
    if (!/\/shop-admin\/dashboard/.test(page.url())) throw new Error(`not logged in (url: ${page.url()})`)
    await tile().waitFor({ timeout: 20000 })
    await glide(tile(), 1, 0.55)
    console.log('  tile:', (await tile().innerText()).replace(/\s+/g, ' '))
    await sleep(500)
  },
  async (at) => {
    const a = A('hook')
    await at(lead + 0.08 * a); await highlight(tile())
  })

// 1 find: menu with badge 3 -> Reviews -> list "My shop" with badges "New" --------------------------------------
await runScene(sess, 'find', dur('find'),
  async () => { await unhighlightAll() },
  async (at) => {
    const a = A('find')
    const burger = page.locator('button[aria-controls=mobile-nav]')
    await at(lead + 0.12 * a); await tap(page, burger)
    const nav = page.locator('#mobile-nav a[href="/shop-admin/reviews"]')
    await nav.waitFor({ timeout: 5000 })
    await sleep(250); await highlight(nav)
    await at(lead + 0.36 * a)
    await tap(page, nav)
    await sess.pause()
    await page.waitForURL(/\/shop-admin\/reviews/, { timeout: 20000 })
    await card('a').waitFor({ timeout: 20000 })
    await imagesLoaded()
    await sleep(300)
    await sess.resume()
    const badges = page.locator('article span', { hasText: new RegExp(`^${R.shop_reviews_badge_new}$`) })
    console.log('  new badges:', await badges.count())
    await at(lead + 0.55 * a)
    for (let i = 0; i < Math.min(3, await badges.count()); i++) await highlight(badges.nth(i))
    await at(lead + 0.80 * a)
    await unhighlightAll()
    await highlight(card('a').locator('img').first())
  })

/** Reply flow on one card: tap Reply, type, save, show the saved reply. */
async function reply(at, a, key, text, perChar, t) {
  const c = card(key)
  await at(lead + t.open * a)
  await tap(page, c.getByRole('button', { name: R.shop_reviews_reply_btn, exact: true }))
  const ta = c.locator('textarea')
  await ta.waitFor({ timeout: 5000 })
  await glide(ta, 400, 0.5)
  await tap(page, ta)
  await typeText(page, text, perChar)
  await at(lead + t.note * a)
  const note = c.getByText(R.shop_reviews_reply_public_note, { exact: true })
  await highlight(note)
  await at(lead + t.save * a)
  await highlight(note, false)
  await tap(page, c.getByRole('button', { name: R.shop_reviews_reply_save, exact: true }))
  const saved = c.getByText(text, { exact: true })
  await saved.waitFor({ timeout: 10000 }).catch(() => console.log('  !! reply not saved', key))
  await errorsVisible(`reply ${key}`)
  const block = saved.locator('xpath=..')
  await glide(block, 400, 0.45)
  await highlight(block)
}

// 2 thanks: review A -> Reply -> thank-you -> save ----------------------------------------------------------
await runScene(sess, 'thanks', dur('thanks'), null,
  async (at) => {
    const a = A('thanks')
    await at(lead + 0.02 * a); await unhighlightAll()
    await glide(card('a'), 600, 0.32)
    await highlight(card('a'))
    await at(lead + 0.14 * a); await highlight(card('a'), false)
    await reply(at, a, 'a', demo.reply_a[lang], 45, { open: 0.16, note: 0.62, save: 0.82 })
  })

// 3 critique: review B -> Reply -> concrete answer -> save --------------------------------------------------
await runScene(sess, 'critique', dur('critique'), null,
  async (at) => {
    const a = A('critique')
    await at(lead + 0.01 * a); await unhighlightAll()
    await glide(card('b'), 700, 0.3)
    await highlight(card('b'))
    await at(lead + 0.12 * a); await highlight(card('b'), false)
    await reply(at, a, 'b', demo.reply_b[lang], 28, { open: 0.13, note: 0.68, save: 0.80 })
  })

// 4 report: review C -> Report to pundo -> Spam -> Send -> "Reported" -----------------------------------------
await runScene(sess, 'report', dur('report'), null,
  async (at) => {
    const a = A('report')
    const c = card('c')
    await at(lead + 0.01 * a); await unhighlightAll()
    await glide(c, 700, 0.4)
    await highlight(c)
    await at(lead + 0.12 * a); await highlight(c, false)
    await tap(page, c.getByRole('button', { name: R.shop_reviews_report_btn, exact: true }))
    const dlg = page.locator('form[role=dialog]')
    await dlg.waitFor({ timeout: 5000 })
    await at(lead + 0.20 * a)
    await tap(page, dlg.locator('label:has(input[value=spam])'))
    await at(lead + 0.30 * a)
    await tap(page, dlg.getByRole('button', { name: R.shop_reviews_report_send, exact: true }))
    await dlg.waitFor({ state: 'detached', timeout: 10000 }).catch(() => console.log('  !! report dialog still open'))
    await errorsVisible('report')
    const badge = c.locator('span', { hasText: new RegExp(`^${R.shop_reviews_badge_reported}$`) })
    await badge.waitFor({ timeout: 5000 }).catch(() => console.log('  !! no Reported badge'))
    await highlight(badge)
    await at(lead + 0.45 * a)
    await highlight(c.getByText(R.shop_reviews_reported, { exact: true }))
  })

// 5 products: tab "My products" -> review D on the Water Filter Straw, hint ------------------------------------
await runScene(sess, 'products', dur('products'), null,
  async (at) => {
    const a = A('products')
    await at(lead + 0.01 * a); await unhighlightAll()
    const tab = page.locator('a[href="/shop-admin/reviews?scope=products"]')
    await glide(tab, 700, 0.3)
    await highlight(tab)
    await at(lead + 0.10 * a)
    await tap(page, tab)
    await sess.pause()
    await page.waitForURL(/scope=products/, { timeout: 20000 })
    await card('d').waitFor({ timeout: 20000 })
    await sleep(300)
    await sess.resume()
    await highlight(card('d'))
    await at(lead + 0.45 * a)
    await highlight(card('d'), false)
    await highlight(page.getByText(R.shop_reviews_products_hint, { exact: true }))
    await at(lead + 0.80 * a)
    await unhighlightAll()
    await highlight(card('d').getByRole('button', { name: R.shop_reviews_report_btn, exact: true }))
  })

// 6 customer: shop page (header) -> reviews with the owner replies under A and B ----------------------------
await runScene(sess, 'customer', dur('customer'), null,
  async (at) => {
    const a = A('customer')
    const replies = page.locator('[data-testid=owner-reply]')
    const article = (i) => replies.nth(i).locator('xpath=ancestor::article[1]')
    await at(lead + 0.02 * a)
    await frozenGoto(shopPath, () => page.locator('h1').first(), 0.25)
    console.log('  owner replies on the shop page:', await replies.count())
    await highlight(page.locator('h1').first())
    await at(lead + 0.20 * a)
    await highlight(page.locator('h1').first(), false)
    await glide(article(0), 1600, 0.32)
    await highlight(replies.first())
    await at(lead + 0.50 * a)
    await highlight(replies.first(), false)
    await glide(article(1), 1200, 0.36)
    await highlight(replies.nth(1))
    await at(lead + 0.85 * a)
    await highlight(replies.nth(1), false)
  })

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
