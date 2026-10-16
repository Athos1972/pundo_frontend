// Recorder for the YouTube Short (9:16) of tutorial #12 "Import your whole catalogue at once".  Usage: node record.mjs <lang>
// Derived from ../catalog-import/record.mjs (same demo data, accounts and selectors): scenes hook, upload, apply, customer.
// Needs the TEST frontend on :3500 (standalone build), backend :8500, for the translation line the test LLM gateway :8600,
// and .cache/<lang>/timeline.json. Before recording: ../catalog-import/prepare_catalog_import.py (pundo_test only).
// Env: SKIP_PREPARE=1, BACKEND_DIR (default ~/dev/github/pundo_main_backend).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { BASE, sleep, startSession, runScene, tap } from '../_branding/lib/record-lib.mjs'
import { tShopAdminImport } from '../../src/lib/i18n/shop-admin-import.ts'

const lang = process.argv[2] || 'en'
const here = path.dirname(fileURLToPath(import.meta.url))
const main = path.join(here, '../catalog-import')
const cacheDir = path.join(here, '.cache', lang)
const tl = JSON.parse(fs.readFileSync(path.join(cacheDir, 'timeline.json'), 'utf8'))
const T = tl.brand.timing
const data = JSON.parse(fs.readFileSync(path.join(main, 'catalog-data.json'), 'utf8'))
const I = tShopAdminImport(lang)
const fixedFile = path.join(main, 'niko-catalog-fixed.xlsx')

let shopSlug = lang === 'el' ? 'to-katastema-epiviosis-tou-nikou' : 'niko-s-survival-shop'
if (process.env.SKIP_PREPARE !== '1') {
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const out = execFileSync(path.join(backend, '.venv/bin/python'),
    [path.join(main, 'prepare_catalog_import.py'), lang], { cwd: backend, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-2))
  shopSlug = JSON.parse(out.at(-1)).shops[lang]
}
const account = JSON.parse(fs.readFileSync(path.join(main, '.recording-accounts.json'), 'utf8'))[lang]

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
const unhighlightAll = () => page.evaluate(() => document.querySelectorAll('.vid-highlight').forEach((e) => e.classList.remove('vid-highlight'))).catch(() => {})

const sess = await startSession({ lang, outDir: path.join(cacheDir, 'rec') })
const { page } = sess
const warn = []
page.on('pageerror', (e) => warn.push(e.message))

async function imagesLoaded(sel = 'img') {
  await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].filter((i) => i.getBoundingClientRect().top < innerHeight && i.getBoundingClientRect().bottom > 0)
    .every((i) => i.complete && i.naturalWidth > 0), sel, { timeout: 20000 }).catch(() => console.log('  !! images not loaded'))
}
const importStatus = async () => (await (await page.request.fetch(url('/api/shop-admin/import/status'))).json())
async function waitPhotos(baseline, maxMs = 180000) {
  const t0 = Date.now()
  for (;;) {
    const s = await importStatus()
    if ((s.last_image_download_at ?? null) !== (baseline ?? null)) { console.log(`  photos downloaded after ${((Date.now() - t0) / 1000).toFixed(0)} s`); return }
    if (Date.now() - t0 > maxMs) { console.log('  !! photo download timeout'); return }
    await sleep(1500)
  }
}
let photoBase = null

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
for (const p of ['/shop-admin/import', shopPath]) {
  await page.goto(url(p), { waitUntil: 'domcontentloaded' }).catch(() => {})
  await sleep(1500)
}

const dropzone = () => page.locator('label:has(input[type=file])')
const previewBox = () => page.locator('[data-testid=import-preview]')
const tiles = () => page.locator('[data-testid=import-count-tiles]')
const applyBtn = () => page.locator('[data-testid=import-apply]')
const cancelBtn = () => page.locator('[data-testid=import-cancel]')
async function waitPreview() { await previewBox().waitFor({ timeout: 40000 }); await tiles().waitFor({ timeout: 10000 }) }

// 1 hook: preview tiles, Apply highlighted ----------------------------------------------------------------
await runScene(sess, 'hook', dur('hook'),
  async () => {
    await page.goto(url('/shop-admin/import'), { waitUntil: 'domcontentloaded' })
    if (!/\/shop-admin\/import/.test(page.url())) throw new Error(`not logged in (url: ${page.url()})`)
    await page.locator('input[type=file]').setInputFiles(fixedFile)
    await waitPreview()
    await glide(tiles(), 1, 0.3)
    await sleep(600)
  },
  async (at) => {
    const a = A('hook')
    await at(lead + 0.05 * a); await highlight(tiles())
    await at(lead + 0.55 * a); await highlight(tiles(), false); await highlight(applyBtn())
  })

// 2 upload (shortened): choose the file -> progress -> preview ----------------------------------------------
await runScene(sess, 'upload', dur('upload'),
  async () => {
    await unhighlightAll()
    await cancelBtn().click(); await dropzone().waitFor({ timeout: 15000 })
    await glide(dropzone(), 1, 0.45)
    await sleep(500)
  },
  async (at) => {
    const a = A('upload')
    await at(lead + 0.03 * a)
    const chooser = page.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null)
    await tap(page, dropzone())
    const fc = await chooser
    if (fc) await fc.setFiles(fixedFile); else await page.locator('input[type=file]').setInputFiles(fixedFile)
    await waitPreview()
    await glide(tiles(), 500, 0.35)
    await at(lead + 0.45 * a); await highlight(previewBox().locator('header'))
  })

// 3 apply: Apply -> result with the translation line ------------------------------------------------------
await runScene(sess, 'apply', dur('apply'), null,
  async (at) => {
    const a = A('apply')
    await at(lead + 0.02 * a); await unhighlightAll(); await highlight(applyBtn())
    await at(lead + 0.12 * a)
    photoBase = (await importStatus()).last_image_download_at
    await tap(page, applyBtn())
    const res = page.locator('[data-testid=import-result]')
    await res.waitFor({ timeout: 40000 })
    await glide(res, 400, 0.35)
    await highlight(res.locator('div').first())
    await at(lead + 0.50 * a)
    await highlight(res.locator('div').first(), false)
    const tr = res.locator('p', { hasText: I.result_translation.split('{n}').at(-1).trim().slice(0, 12) })
    if (await tr.count()) await highlight(tr.first()); else console.log('  !! translation line missing (LLM gateway :8600 not running?)')
  })

// 4 customer: shop page with the imported products ---------------------------------------------------------
await runScene(sess, 'customer', dur('customer'), async () => { await waitPhotos(photoBase) },
  async (at) => {
    const a = A('customer')
    await at(lead + 0.02 * a)
    await frozenGoto(shopPath, () => page.locator('a[href*="/products/"]').first(), 0.3)
    await at(lead + 0.25 * a)
    await page.evaluate(() => new Promise((res) => {
      const from = window.scrollY, to = from + 450, t0 = performance.now(), ms = 2500
      const st = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k+2, 2)/2
        window.scrollTo(0, from + (to - from) * e); k < 1 ? requestAnimationFrame(st) : res() }
      requestAnimationFrame(st)
    }))
  })

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
