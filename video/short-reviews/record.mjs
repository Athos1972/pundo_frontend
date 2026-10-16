// Recorder for the YouTube Short (9:16) of tutorial #13 "Reply to your reviews".  Usage: node record.mjs <lang>
// Derived from ../reviews/record.mjs (same demo data, accounts and selectors): scenes hook, critique, customer.
// Needs the TEST frontend on :3500 (standalone build), backend :8500 and .cache/<lang>/timeline.json.
// Before recording: ../reviews/prepare_reviews.py (pundo_test only).
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
const main = path.join(here, '../reviews')
const cacheDir = path.join(here, '.cache', lang)
const tl = JSON.parse(fs.readFileSync(path.join(cacheDir, 'timeline.json'), 'utf8'))
const T = tl.brand.timing
const demo = tl.meta.demo
const R = tShopAdminReviews(lang)

let prep
{
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const args = [path.join(main, 'prepare_reviews.py'), lang]
  if (process.env.SKIP_PREPARE === '1') args.splice(1, 0, '--dry-run')
  const out = execFileSync(path.join(backend, '.venv/bin/python'), args, { cwd: backend, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-2))
  prep = JSON.parse(out.at(-1))
}
const account = JSON.parse(fs.readFileSync(path.join(here, '../catalog-import/.recording-accounts.json'), 'utf8'))[lang]

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

async function imagesLoaded(sel = 'img') {
  await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].filter((i) => i.getBoundingClientRect().top < innerHeight && i.getBoundingClientRect().bottom > 0)
    .every((i) => i.complete && i.naturalWidth > 0), sel, { timeout: 20000 }).catch(() => console.log('  !! images not loaded'))
}
async function frozenGoto(p, target, align = 0.4) {
  await sess.pause()
  await page.goto(url(p), { waitUntil: 'domcontentloaded' })
  if (target) { const t = target(); await t.waitFor({ timeout: 20000 }).catch(() => console.log('  !! not found on', p)); await glide(t, 1, align).catch(() => {}) }
  await imagesLoaded()
  await sleep(400)
  await sess.resume()
}

const login = await page.request.fetch(url('/api/shop-admin/login'), { method: 'POST', data: { email: account.email, password: account.password } })
if (!login.ok()) throw new Error(`login -> HTTP ${login.status()}`)
for (const p of ['/shop-admin/dashboard', shopPath]) {   // not the review list: it marks the reviews as seen
  await page.goto(url(p), { waitUntil: 'domcontentloaded' }).catch(() => {})
  await sleep(1500)
}

const card = (key) => page.locator(`article[aria-label="${prep.names[key]}"]`)
const tile = () => page.locator('main a[href="/shop-admin/reviews"]')

// 1 hook: dashboard tile "3 new" ----------------------------------------------------------------------------
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
    await at(lead + 0.08 * A('hook')); await highlight(tile())
  })

// 2 critique (shortened): review B -> Reply -> answer -> save -------------------------------------------------
await runScene(sess, 'critique', dur('critique'),
  async () => {
    await unhighlightAll()
    await page.goto(url('/shop-admin/reviews'), { waitUntil: 'domcontentloaded' })
    await card('b').waitFor({ timeout: 20000 })
    await glide(card('b'), 1, 0.3)
    await imagesLoaded()
    await sleep(500)
  },
  async (at) => {
    const a = A('critique')
    const c = card('b')
    await at(lead + 0.02 * a); await highlight(c)
    await at(lead + 0.10 * a); await highlight(c, false)
    await tap(page, c.getByRole('button', { name: R.shop_reviews_reply_btn, exact: true }))
    const ta = c.locator('textarea')
    await ta.waitFor({ timeout: 5000 })
    await glide(ta, 300, 0.5)
    await tap(page, ta)
    await typeText(page, demo.reply_b[lang], 14)
    await at(lead + 0.78 * a)
    await tap(page, c.getByRole('button', { name: R.shop_reviews_reply_save, exact: true }))
    const saved = c.getByText(demo.reply_b[lang], { exact: true })
    await saved.waitFor({ timeout: 10000 }).catch(() => console.log('  !! reply not saved'))
    const block = saved.locator('xpath=..')
    await glide(block, 400, 0.45)
    await highlight(block)
  })

// 3 customer: shop page, owner reply under B -----------------------------------------------------------------
await runScene(sess, 'customer', dur('customer'), null,
  async (at) => {
    const a = A('customer')
    const reply = page.locator('[data-testid=owner-reply]').first()
    await at(lead + 0.02 * a)
    await frozenGoto(shopPath, () => reply.locator('xpath=ancestor::article[1]'), 0.4)
    await highlight(reply)
  })

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
