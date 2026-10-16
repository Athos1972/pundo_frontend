// Recorder for tutorial #12 "Import your whole catalogue at once" (series part 9).  Usage: node record.mjs <lang>
// Needs the TEST frontend on :3500 (standalone build: node scripts/e2e-frontend.cjs start), the test backend :8500
// and .cache/<lang>/timeline.json. For the result line "… being translated into all languages" the test LLM gateway
// must run on :8600 (no workers needed; the translate.item jobs just wait in its queue), see PROD-NOTES.md.
// Before recording: prepare_catalog_import.py (pundo_test only: resets both Niko demo shops + the duplicate article).
// Demo accounts: .recording-accounts.json (gitignored, written by the prepare script).
// UI labels come straight from src/lib/i18n/shop-admin-{import,catalog,common}.ts (Node strips the TS types).
// Env: SKIP_PREPARE=1, BACKEND_DIR (default ~/dev/github/pundo_main_backend).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { BASE, sleep, startSession, runScene, tap, typeText } from '../_branding/lib/record-lib.mjs'
import { tShopAdminImport } from '../../src/lib/i18n/shop-admin-import.ts'
import { tShopAdminCatalog } from '../../src/lib/i18n/shop-admin-catalog.ts'

const lang = process.argv[2] || 'en'
const here = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(here, '.cache', lang)
const tl = JSON.parse(fs.readFileSync(path.join(cacheDir, 'timeline.json'), 'utf8'))
const T = tl.brand.timing
const demo = tl.meta.demo
const data = JSON.parse(fs.readFileSync(path.join(here, 'catalog-data.json'), 'utf8'))
const I = tShopAdminImport(lang)
const C = tShopAdminCatalog(lang)
const file = (k) => path.join(here, demo.files[k])

// ---- demo account + test-DB preparation ----
let shopSlug = lang === 'el' ? 'to-katastema-epiviosis-tou-nikou' : 'niko-s-survival-shop'
if (process.env.SKIP_PREPARE !== '1') {
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const out = execFileSync(path.join(backend, '.venv/bin/python'),
    [path.join(here, 'prepare_catalog_import.py'), lang], { cwd: backend, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-2))
  shopSlug = JSON.parse(out.at(-1)).shops[lang]
}
const account = JSON.parse(fs.readFileSync(path.join(here, '.recording-accounts.json'), 'utf8'))[lang]
if (!account) throw new Error(`no demo account for ${lang}`)

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
page.on('download', (d) => d.cancel().catch(() => {}))

/** Load a page while the screencast is frozen (no loading skeleton in the video), optionally scroll to `target`. */
async function frozenGoto(p, target, align = 0.4) {
  await sess.pause()
  await page.goto(url(p), { waitUntil: 'domcontentloaded' })
  if (target) { const t = target(); await t.waitFor({ timeout: 20000 }).catch(() => console.log('  !! not found on', p)); await glide(t, 1, align).catch(() => {}) }
  await imagesLoaded()
  await sleep(400)
  await sess.resume()
}

/** Untimed wait inside a scene: the picture freezes, the wait is cut out of the recording afterwards
 *  (frames.json timestamps after it are shifted back, see the end of this file). */
const gaps = []
async function untimed(fn) {
  await sess.pause()
  const t = Date.now() / 1000
  await fn()
  gaps.push({ at: t, len: Date.now() / 1000 - t })
}
/** Wait until the visible product images have loaded (no grey placeholders in the shot). */
async function imagesLoaded(sel = 'img') {
  await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].filter((i) => i.getBoundingClientRect().top < innerHeight && i.getBoundingClientRect().bottom > 0)
    .every((i) => i.complete && i.naturalWidth > 0), sel, { timeout: 20000 }).catch(() => console.log('  !! images not loaded'))
}
/** Background photo downloads of an import are done when import/status.last_image_download_at changes. */
const importStatus = async () => (await (await page.request.fetch(url('/api/shop-admin/import/status'))).json())
async function waitPhotos(baseline, maxMs = 180000) {
  const t0 = Date.now()
  for (;;) {
    const s = await importStatus()
    if ((s.last_image_download_at ?? null) !== (baseline ?? null)) {
      if (s.image_download_errors?.length) console.log('  !! image download errors', JSON.stringify(s.image_download_errors).slice(0, 300))
      console.log(`  photos downloaded after ${((Date.now() - t0) / 1000).toFixed(0)} s of waiting`)
      return
    }
    if (Date.now() - t0 > maxMs) { console.log('  !! photo download timeout'); return }
    await sleep(1500)
  }
}

// ---- spreadsheet view (static HTML, same data as the .xlsx files; no Office/Google UI) ----
const COLS = data.columns
const LETTERS = 'ABCDEFGHI'.split('')
const WIDTH = { sku: 78, name: 196, language: 64, ean: 104, category: 178, available: 66, price: 56, currency: 62, image_url: 330 }
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
function sheetRows(kind) {
  const err = data.error
  return data.rows.map((r) => ({ ...r, language: 'en', available: 'true', currency: 'EUR',
    price: r.sku === err.sku ? (kind === 'error' ? err.bad : err.fixed) : r.price }))
}
function sheetHtml(kind, fileName) {
  const rows = sheetRows(kind)
  const total = 34 + COLS.reduce((n, c) => n + WIDTH[c], 0)
  const colgroup = `<colgroup><col style="width:34px">${COLS.map((c) => `<col style="width:${WIDTH[c]}px">`).join('')}</colgroup>`
  const head = `<tr><th class="rn"></th>${COLS.map((c, i) => `<th class="cl ${c === 'name' ? 'stick' : ''}" style="min-width:${WIDTH[c]}px;max-width:${WIDTH[c]}px">${LETTERS[i]}</th>`).join('')}</tr>`
  const hdr = `<tr data-r="1"><td class="rn">1</td>${COLS.map((c, i) => `<td class="h ${c === 'name' ? 'stick' : ''}" data-c="${LETTERS[i]}">${c}</td>`).join('')}</tr>`
  const body = rows.map((r, n) => `<tr data-r="${n + 2}" data-sku="${r.sku}"><td class="rn">${n + 2}</td>${COLS.map((c, i) =>
    `<td class="${c === 'name' ? 'stick' : ''} ${c === 'price' ? 'num' : ''}" data-c="${LETTERS[i]}">${esc(r[c])}</td>`).join('')}</tr>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box } html, body { margin: 0; height: 100%; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; background: #fff }
  .bar { height: 56px; background: #1E7145; color: #fff; display: flex; align-items: center; gap: 12px; padding: 0 16px }
  .bar .ic { width: 30px; height: 30px; border-radius: 6px; background: #fff; color: #1E7145; font-weight: 800; display: grid; place-items: center; font-size: 15px }
  .bar .t { font-weight: 600; font-size: 16px } .bar .s { font-size: 11px; opacity: .8 }
  .fx { height: 38px; border-bottom: 1px solid #d0d7de; display: flex; align-items: center; font-size: 13px; color: #1f2328 }
  .fx .ref { width: 56px; text-align: center; color: #57606a; border-right: 1px solid #d0d7de; height: 100%; display: grid; place-items: center; font-size: 12px }
  .fx .f { padding: 0 8px; color: #8c959f; font-style: italic } .fx .v { white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
  .grid { position: absolute; top: 94px; left: 0; right: 0; bottom: 0; overflow: auto }
  table { border-collapse: separate; border-spacing: 0; font-size: 12px; color: #1f2328 }
  td, th { border-right: 1px solid #e1e4e8; border-bottom: 1px solid #e1e4e8; height: 30px; padding: 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: #fff }
  th { position: sticky; top: 0; z-index: 2; background: #f3f4f6; color: #57606a; font-weight: 500; height: 24px; font-size: 11px }
  .rn { position: sticky; left: 0; z-index: 3; width: 34px; min-width: 34px; text-align: center; background: #f3f4f6; color: #57606a; font-size: 11px }
  th.rn { z-index: 4 }
  .stick { position: sticky; left: 34px; z-index: 1; box-shadow: 2px 0 0 #d0d7de }
  th.stick { z-index: 3 }
  .h { font-weight: 700; background: #f6fbf8 } .num { text-align: right; font-variant-numeric: tabular-nums }
  td.sel { outline: 2px solid #1E7145; outline-offset: -2px; background: #e8f3ec }
  td.sel.edit::after { content: ""; display: inline-block; width: 1px; height: 14px; background: #1f2328; vertical-align: middle; margin-inline-start: 1px; animation: blink 1s steps(1) infinite }
  @keyframes blink { 50% { opacity: 0 } }
  tr.del td { background: #fde2e1 !important; transition: background .2s }
  tr.gone td { height: 0 !important; padding-top: 0; padding-bottom: 0; border-bottom-width: 0; font-size: 0; transition: all .45s ease }
  .bad { color: #b42318; font-weight: 600 }
  .vid-ripple { position:fixed; z-index:2147483647; width:64px; height:64px; margin:-32px 0 0 -32px; border-radius:50%;
    background:rgba(212,98,42,.35); border:3px solid rgba(212,98,42,.9); pointer-events:none; animation:vidRipple .75s ease-out forwards }
  @keyframes vidRipple { 0%{transform:scale(.35);opacity:1} 100%{transform:scale(1.5);opacity:0} }
  .vid-highlight { outline:4px solid #D4622A !important; outline-offset:-4px; animation:vidPulse 1.3s ease-in-out infinite }
  @keyframes vidPulse { 0%,100%{box-shadow:inset 0 0 0 0 rgba(212,98,42,.35)} 50%{box-shadow:inset 0 0 0 40px rgba(212,98,42,.12)} }
</style></head><body>
<div class="bar"><div class="ic">X</div><div><div class="t">${esc(fileName)}</div><div class="s">Products</div></div></div>
<div class="fx"><div class="ref" id="ref">A1</div><div class="f">fx</div><div class="v" id="fv">sku</div></div>
<div class="grid" id="grid"><table style="table-layout:fixed;width:${total}px">${colgroup}<thead>${head}</thead><tbody>${hdr}${body}</tbody></table></div>
<script>
  window.__vidRipple = (x, y) => { const d = document.createElement('div'); d.className = 'vid-ripple';
    d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 900) };
  const grid = document.getElementById('grid')
  const cell = (r, c) => document.querySelector('tr[data-r="' + r + '"] td[data-c="' + c + '"]')
  function glideTo(x, y, ms) { const fx = grid.scrollLeft, fy = grid.scrollTop, t0 = performance.now();
    return new Promise((res) => { const st = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k+2, 2)/2;
      grid.scrollLeft = fx + (x - fx) * e; grid.scrollTop = fy + (y - fy) * e; k < 1 ? requestAnimationFrame(st) : res() }; requestAnimationFrame(st) }) }
  window.sel = async (r, c, ms = 500) => {
    document.querySelectorAll('td.sel').forEach((e) => e.classList.remove('sel', 'edit'))
    const td = cell(r, c); td.classList.add('sel')
    document.getElementById('ref').textContent = c + td.parentElement.querySelector('.rn').textContent
    document.getElementById('fv').textContent = td.textContent
    const nameTd = td.parentElement.querySelector('td.stick'), sticky = 34 + nameTd.offsetWidth, x = td.offsetLeft - sticky - 24
    const y = td.parentElement.offsetTop - grid.clientHeight * 0.4
    await glideTo(c === 'A' || c === 'B' ? 0 : Math.max(0, x), Math.max(0, y), ms)
  }
  window.edit = (v) => { const td = document.querySelector('td.sel'); td.classList.add('edit'); td.textContent = v; td.classList.remove('bad'); document.getElementById('fv').textContent = v }
  window.commit = () => document.querySelectorAll('td.sel').forEach((e) => e.classList.remove('edit'))
  window.markBad = (r, c) => cell(r, c).classList.add('bad')
  window.delRow = async (r) => {
    const tr = document.querySelector('tr[data-r="' + r + '"]'); tr.classList.add('del')
    await new Promise((s) => setTimeout(s, 500)); tr.classList.add('gone')
    await new Promise((s) => setTimeout(s, 500)); tr.remove()
    document.querySelectorAll('tbody tr').forEach((t, i) => { t.querySelector('.rn').textContent = i + 1 })
  }
</script></body></html>`
}
const rowOf = (sku) => data.rows.findIndex((r) => r.sku === sku) + 2
/** Cut to the spreadsheet view (frozen while it renders). */
async function showSheet(kind, select) {
  await sess.pause()
  await page.goto('about:blank')
  await page.setContent(sheetHtml(kind, demo.files.error))
  if (select) await page.evaluate(([r, c]) => window.sel(r, c, 1), select)
  await sleep(300)
  await sess.resume()
}
const sheetCell = (r, c) => page.locator(`tr[data-r="${r}"] td[data-c="${c}"]`)
async function typeCell(text, perChar = 130) {
  for (let i = 1; i <= text.length; i++) { await page.evaluate((v) => window.edit(v), text.slice(0, i)); await sleep(perChar) }
  await sleep(250)
  await page.evaluate(() => window.commit())
}

// --- login (API through the same-origin proxy -> cookie lands in the browser context) ---
const api = (method, p, body) => page.request.fetch(url(`/api/shop-admin/${p}`), { method, data: body, headers: { 'Accept-Language': lang } })
const login = await api('POST', 'login', { email: account.email, password: account.password })
if (!login.ok()) throw new Error(`login -> HTTP ${login.status()}`)

// --- warm-up ---
for (const p of ['/shop-admin/dashboard', '/shop-admin/import', '/shop-admin/offers', shopPath]) {
  await page.goto(url(p), { waitUntil: 'domcontentloaded' }).catch(() => {})
  await sleep(1500)
}

// ---- import page helpers (ImportPanel / ImportPreview / ImportPreviewRow / ImportResult) ----
const dropzone = () => page.locator('label:has(input[type=file])')
const previewBox = () => page.locator('[data-testid=import-preview]')
const tiles = () => page.locator('[data-testid=import-count-tiles]')
const tileOf = (k) => page.locator(`[data-testid=import-count-tiles] [data-tile=${k}]`)
const prow = (n) => page.locator(`[data-testid=import-preview-row][data-row="${n}"]`)
const applyBtn = () => page.locator('[data-testid=import-apply]')
const cancelBtn = () => page.locator('[data-testid=import-cancel]')
async function chooseFile(p) {
  const chooser = page.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null)
  await tap(page, dropzone())
  const fc = await chooser
  if (fc) await fc.setFiles(p)
  else { console.log('  !! no file chooser, setting the input directly'); await page.locator('input[type=file]').setInputFiles(p) }
}
async function waitPreview() {
  await previewBox().waitFor({ timeout: 40000 })
  await tiles().waitFor({ timeout: 10000 })
}
async function cancelPreview() {
  if (await cancelBtn().count()) { await cancelBtn().click(); await dropzone().waitFor({ timeout: 15000 }) }
}

// 0 hook: preview of the corrected file, Apply highlighted ------------------------------------------
await runScene(sess, 'hook', dur('hook'),
  async () => {
    await page.goto(url('/shop-admin/import'), { waitUntil: 'domcontentloaded' })
    if (!/\/shop-admin\/import/.test(page.url())) throw new Error(`not logged in (url: ${page.url()})`)
    await page.locator('input[type=file]').setInputFiles(file('fixed'))
    await waitPreview()
    const sug = await prow(rowOf(data.suggest_sku)).innerText()
    console.log('  suggestion row:', sug.replace(/\s+/g, ' ').slice(0, 200))
    const dupStatus = await prow(rowOf(data.duplicate_sku)).getAttribute('data-status')
    if (dupStatus !== 'possible_duplicate') throw new Error(`duplicate row status ${dupStatus}`)
    await glide(tiles(), 1, 0.3)
    await sleep(600)
  },
  async (at) => {
    const a = A('hook')
    await at(lead + 0.05 * a); await highlight(tiles())
    await at(lead + 0.55 * a); await highlight(tiles(), false); await highlight(applyBtn())
  })

// 1 template: dashboard -> Import -> Download template -> spreadsheet -> field reference --------------
await runScene(sess, 'template', dur('template'),
  async () => {
    await unhighlightAll(); await cancelPreview()
    await page.goto(url('/shop-admin/dashboard'), { waitUntil: 'domcontentloaded' })
    await page.locator('main a[href="/shop-admin/import"]').waitFor({ timeout: 20000 })
    await sleep(500)
  },
  async (at) => {
    const a = A('template')
    const tile = page.locator('main a[href="/shop-admin/import"]')
    await at(lead + 0.02 * a); await highlight(tile)
    await at(lead + 0.08 * a)
    await tap(page, tile)
    await sess.pause()
    await page.waitForURL(/\/shop-admin\/import/, { timeout: 20000 })
    await dropzone().waitFor({ timeout: 20000 })
    await sleep(300)
    await sess.resume()
    const tpl = page.locator('a[href="/api/shop-admin/import/template"]')
    await highlight(tpl)
    await at(lead + 0.15 * a); await tap(page, tpl)
    await at(lead + 0.20 * a); await showSheet('error', [1, 'B'])
    await highlight(sheetCell(1, 'B'))
    for (const [i, c] of [['A', 0.36], ['D', 0.46], ['G', 0.56]].map(([c, t]) => [t, c])) {
      await at(lead + i * a)
      await page.evaluate(() => document.querySelectorAll('.vid-highlight').forEach((e) => e.classList.remove('vid-highlight')))
      await page.evaluate(([r, c]) => window.sel(r, c, 450), [1, c]); await highlight(sheetCell(1, c))
    }
    await at(lead + 0.68 * a)
    const rec = () => page.getByText(I.fc_recognition_title, { exact: true }).locator('xpath=..')
    await frozenGoto('/shop-admin/import', rec, 0.4)
    await highlight(rec())
  })

// 2 upload: choose the file, progress, preview, suggested category ------------------------------------
await runScene(sess, 'upload', dur('upload'),
  async () => {
    await unhighlightAll()
    await page.goto(url('/shop-admin/import'), { waitUntil: 'domcontentloaded' })
    await dropzone().waitFor({ timeout: 20000 })
    await glide(dropzone(), 1, 0.45)
    await sleep(500)
  },
  async (at) => {
    const a = A('upload')
    await at(lead + 0.03 * a)
    await chooseFile(file('error'))
    await page.locator('[data-testid=import-checking]').waitFor({ timeout: 5000 }).catch(() => {})
    await waitPreview()
    await glide(tiles(), 500, 0.35)
    const title = previewBox().locator('header')
    await at(lead + 0.30 * a); await highlight(title)
    await at(lead + 0.55 * a); await highlight(title, false)
    const r = prow(rowOf(data.suggest_sku))
    await glide(r, 900, 0.45); await highlight(r)
  })

// 3 errors: filter, row 14, blocked, cancel, fix in the spreadsheet, upload again -> 0 errors ----------
await runScene(sess, 'errors', dur('errors'), null,
  async (at) => {
    const a = A('errors')
    const errRow = rowOf(data.error.sku)
    await at(lead + 0.01 * a); await unhighlightAll()
    const filt = page.locator('[role=group] button', { hasText: I.count_error })
    await glide(filt, 500, 0.3)
    await tap(page, filt)
    await prow(errRow).waitFor({ timeout: 10000 })
    await sleep(300)
    await glide(prow(errRow), 500, 0.6); await highlight(prow(errRow))
    await at(lead + 0.30 * a)
    const blocked = page.locator('[data-testid=import-apply-blocked]')
    await highlight(prow(errRow), false); await glide(blocked, 500, 0.35); await highlight(blocked)
    await at(lead + 0.45 * a)
    await tap(page, cancelBtn())
    await dropzone().waitFor({ timeout: 15000 })
    await at(lead + 0.50 * a)
    await showSheet('error', [errRow, 'G'])
    await page.evaluate(([r]) => window.markBad(r, 'G'), [errRow])
    await sleep(500)
    await typeCell(data.error.fixed)
    await at(lead + 0.80 * a)
    await frozenGoto('/shop-admin/import', dropzone, 0.45)
    await chooseFile(file('fixed'))
    await waitPreview()
    await glide(tiles(), 500, 0.35)
    await highlight(tileOf('error'))
    await sleep(1600)
  })

// 4 duplicate: use the existing article -> Apply -> result -> Go to my offers --------------------------
await runScene(sess, 'duplicate', dur('duplicate'), null,
  async (at) => {
    const a = A('duplicate')
    const r = prow(rowOf(data.duplicate_sku))
    await at(lead + 0.02 * a); await unhighlightAll()
    await glide(r, 700, 0.42); await highlight(r)
    await at(lead + 0.30 * a)
    await tap(page, r.locator('label:has(input[value^="item:"])'))
    await at(lead + 0.45 * a); await highlight(r, false)
    await highlight(applyBtn())
    await at(lead + 0.52 * a)
    const photoBase = (await importStatus()).last_image_download_at
    await tap(page, applyBtn())
    const res = page.locator('[data-testid=import-result]')
    await res.waitFor({ timeout: 40000 })
    await glide(res, 400, 0.35)
    await highlight(res.locator('div').first())
    await at(lead + 0.80 * a)
    await highlight(res.locator('div').first(), false)
    const tr = res.locator('p', { hasText: I.result_translation.split('{n}').at(-1).trim().slice(0, 12) })
    if (await tr.count()) await highlight(tr.first()); else console.log('  !! translation line missing (LLM gateway :8600 not running?)')
    await at(lead + 0.92 * a)
    await tap(page, res.locator('a[href="/shop-admin/offers"]'))
    await untimed(async () => {   // photos are downloaded in the background (~50 s for 24 Drive images)
      await page.waitForURL(/\/shop-admin\/offers$/, { timeout: 20000 }).catch(() => {})
      await waitPhotos(photoBase)
      await page.goto(url('/shop-admin/offers'), { waitUntil: 'domcontentloaded' })
      await page.getByText(data.rows[1].name).first().waitFor({ timeout: 15000 }).catch(() => {})
      await imagesLoaded()
      await sleep(300)
    })
    await sess.resume()
    await sleep(2200)
  })

// 5 update: spreadsheet price + delete row -> complete list -> upload -> preview -> Apply ----------------
await runScene(sess, 'update', dur('update'), null,
  async (at) => {
    const a = A('update')
    const pr = rowOf(data.update.price.sku), del = rowOf(data.update.remove)
    await at(lead + 0.02 * a)
    await showSheet('fixed', [pr, 'G'])
    await highlight(sheetCell(pr, 'G'))
    await at(lead + 0.07 * a)
    await highlight(sheetCell(pr, 'G'), false)
    await typeCell(data.update.price.to)
    await at(lead + 0.18 * a)
    await page.evaluate(([r]) => window.sel(r, 'B', 600), [del])
    await at(lead + 0.22 * a)
    await page.evaluate(([r]) => window.delRow(r), [del])
    await at(lead + 0.30 * a)
    const full = () => page.locator('label:has([data-testid=import-full-list])')
    await frozenGoto('/shop-admin/import', full, 0.35)
    await highlight(full())
    await at(lead + 0.34 * a)
    await tap(page, page.locator('[data-testid=import-full-list]'))
    await at(lead + 0.42 * a)
    await highlight(full(), false)
    await chooseFile(file('update'))
    await waitPreview()
    await glide(tiles(), 500, 0.3)
    await highlight(tileOf('updated'))
    const upd = page.locator('[data-testid=import-preview-row][data-status=updated]').first()
    await at(lead + 0.55 * a)
    await highlight(tileOf('updated'), false)
    await glide(upd, 700, 0.5); await highlight(upd)
    await at(lead + 0.74 * a)
    await highlight(upd, false)
    const deact = page.locator('[data-testid=import-deactivations]')
    await glide(deact, 700, 0.4)
    await deact.locator('summary').click()
    await highlight(deact)
    await at(lead + 0.95 * a)
    await highlight(deact, false)
    await tap(page, applyBtn())
    await page.locator('[data-testid=import-result]').waitFor({ timeout: 40000 })
    await glide(page.locator('[data-testid=import-result]'), 400, 0.35)
    await sleep(900)
  })

// 6 sheets: share card -> paste link -> Connect -> toast; frozen before the sync result ------------------
const sheetsInput = () => page.locator('input[type=url]')
await runScene(sess, 'sheets', dur('sheets'),
  async () => {
    await unhighlightAll()
    await page.goto(url('/shop-admin/import'), { waitUntil: 'domcontentloaded' })
    await sheetsInput().waitFor({ timeout: 20000 })
    const fc = page.locator('details[open] > summary', { hasText: C.field_catalog_title })
    if (await fc.count()) await fc.first().click()
    await sleep(300)
    await glide(sheetsInput(), 1, 0.5)
    await sleep(500)
  },
  async (at) => {
    const a = A('sheets')
    const card = demo.share_card[lang]
    await at(lead + 0.04 * a)
    await page.evaluate(([title, line]) => {
      const d = document.createElement('div')
      d.id = 'vid-share-card'
      d.innerHTML = `<div style="font-size:13px;font-weight:600;color:#1E7145;letter-spacing:.02em;text-transform:uppercase">${title}</div>
        <div style="margin-top:10px;font-size:20px;line-height:1.3;font-weight:700;color:#1f2328">${line}</div>`
      Object.assign(d.style, { position: 'fixed', left: '20px', right: '20px', top: '22%', zIndex: 99999, background: '#fff',
        borderRadius: '18px', padding: '22px 20px', boxShadow: '0 18px 50px rgba(0,0,0,.25)', border: '3px solid #1E7145',
        opacity: '0', transform: 'translateY(12px)', transition: 'opacity .35s, transform .35s' })
      document.body.appendChild(d)
      requestAnimationFrame(() => { d.style.opacity = '1'; d.style.transform = 'none' })
    }, [card.title, card.line])
    await at(lead + 0.30 * a)
    await page.evaluate(() => { const d = document.getElementById('vid-share-card'); d.style.opacity = '0'; setTimeout(() => d.remove(), 400) })
    await sleep(350)
    await tap(page, sheetsInput())
    await typeText(page, demo.sheet_url, 22)
    await at(lead + 0.48 * a)
    const connect = sheetsInput().locator('xpath=following-sibling::button[1]')
    if ((await connect.innerText()).trim() !== C.sheets_connect) console.log('  !! connect button label', await connect.innerText())
    await tap(page, connect)
    await page.getByText(demo.sheet_url, { exact: true }).waitFor({ timeout: 10000 })
    const ok = page.getByText(C.sheets_status_ok, { exact: true })
    await ok.waitFor({ timeout: 15000 }).catch(() => console.log('  !! no sync OK'))
    if (await page.getByText(C.sheets_status_error, { exact: true }).count()) console.log('  !! sync error visible')
    const syncBox = ok.locator('xpath=ancestor::div[contains(@class,"text-xs")][1]')
    await glide(syncBox, 500, 0.45)
    await highlight(syncBox)
  })

// 7 customer: shop page with the imported products ------------------------------------------------------
const productsHead = () => page.locator('a[href*="/products/"]').first()
await runScene(sess, 'customer', dur('customer'), null,
  async (at) => {
    const a = A('customer')
    await at(lead + 0.02 * a)
    await frozenGoto(shopPath, () => page.locator('h1').first(), 0.2)
    await at(lead + 0.22 * a)
    await glide(productsHead(), 1200, 0.3)
    await page.evaluate(() => new Promise((res) => {
      const from = window.scrollY, to = from + 500, t0 = performance.now(), ms = 3000
      const st = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k+2, 2)/2
        window.scrollTo(0, from + (to - from) * e); k < 1 ? requestAnimationFrame(st) : res() }
      requestAnimationFrame(st)
    }))
  })

// cleanup outside the video: remove the demo Sheet link so no 4-hour sync keeps failing on it
const del = await page.request.fetch(url('/api/shop-admin/import/google-sheets'), { method: 'DELETE' }).catch(() => null)
const n = await sess.finish()
if (gaps.length) {   // cut the untimed waits out of the recording
  const fj = path.join(cacheDir, 'rec', 'frames.json')
  const rec = JSON.parse(fs.readFileSync(fj, 'utf8'))
  const shift = (ts) => ts - gaps.filter((g) => ts > g.at).reduce((s, g) => s + g.len, 0)
  for (const f of rec.frames) f.ts = shift(f.ts)
  for (const sc of rec.scenes) {
    const inside = gaps.filter((g) => g.at > sc.start && g.at < sc.start + sc.dur).reduce((s, g) => s + g.len, 0)
    sc.start = shift(sc.start); sc.dur -= inside
  }
  fs.writeFileSync(fj, JSON.stringify(rec, null, 1))
  console.log('  cut untimed waits:', gaps.map((g) => g.len.toFixed(1) + 's').join(', '), rec.scenes.map((x) => `${x.id} ${x.dur.toFixed(1)}`).join(' | '))
}
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3), `sheet link removed: ${del ? del.status() : 'n/a'}`)
