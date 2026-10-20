// Recorder for team video 4 "Maintaining products" (F8960 T20).  Usage: node record.mjs en
// Same rules as ../team-shops/record.mjs: STRICT mode (only test instance frontend :3500 / backend :8500, no parallel E2E run,
// privacy check per scene: e-mail outside @pundo-e2e.io or visible password field = abort), admin login via API, demo data from
// ../team-common/prepare_team.py (marker "Team Demo").
// Privacy: EVERY table row without "Team Demo" (products and brands of the prod copy) is blurred by a MutationObserver installed as
// an init script (before the first paint of every page load, also across client navigations). The category tree is the taxonomy
// (no personal or shop data) and stays readable.
// What is DECIDED here (test DB only): the product "Team Demo Rye Bread" is created through the form (prepare_team.py deletes it on the
// next run), the name of "Team Demo Sourdough Loaf" is edited (prepare_team.py puts it back). Deleting is never done (no click on any
// "Delete" button); the brand / category pages are only looked at (the "Add new" links are hovered, not clicked).
// Every scene shows ONE page (address bar of scenes.yml): page switches happen at scene borders (click, frozen picture, next scene resumes).
// Needs .cache/en/timeline.json (tts.py).  Env: SKIP_PREPARE=1 (prepare_team.py --dry-run), BACKEND_DIR (default ~/dev/github/pundo_main_backend).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { BASE, sleep, startSession, runScene, click, moveTo, typeText, adminLogin } from '../_branding/lib/record-lib.mjs'
import { assertTestInstance, assertBackendHealthy } from '../_branding/lib/guard.mjs'

const lang = process.argv[2] || 'en'
const here = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(here, '.cache', lang)
const tl = JSON.parse(fs.readFileSync(path.join(cacheDir, 'timeline.json'), 'utf8'))
const T = tl.brand.timing
const MARK = 'Team Demo'
const NEW_NAME = 'Team Demo Rye Bread'

// guard FIRST (before the DB is touched by prepare_team.py): frontend :3500, backend :8500 answering /health
const BACKEND = process.env.VIDEO_BACKEND_URL || 'http://localhost:8500'
assertTestInstance({ frontend: BASE, backend: BACKEND })
await assertBackendHealthy(BACKEND)

// ---- test-DB preparation (pundo_test only; the script refuses everything else): removes the product of the last run ----
let demo
{
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const args = [path.join(here, '../team-common/prepare_team.py')]
  if (process.env.SKIP_PREPARE === '1') args.push('--dry-run')
  const out = execFileSync(path.join(backend, '.venv/bin/python'), args, { cwd: backend, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-1).slice(0, 200))
  demo = JSON.parse(out.at(-1))
}
const EDIT_PATH = `/admin/products/${demo.item_id}/edit`
// the address bar of the scenes edit/delete shows this id (window_path in scenes.yml): fail early when they differ
const scenesYml = fs.readFileSync(path.join(here, 'scenes.yml'), 'utf8')
if (!scenesYml.includes(`admin/products/${demo.item_id}/edit"`)) throw new Error(`scenes.yml window_path does not contain admin/products/${demo.item_id}/edit - update it`)

const account = JSON.parse(fs.readFileSync(path.join(here, '../team-common/.recording-accounts.json'), 'utf8')).admin
if (!account) throw new Error('no admin account in ../team-common/.recording-accounts.json (run prepare_team.py)')

const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const dur = (id) => T.lead_in_s + A(id) + T.tail_s
const lead = T.lead_in_s

const sess = await startSession({ lang, outDir: path.join(cacheDir, 'rec'), device: 'desktop', strict: true })
const { page } = sess
const warn = []
page.on('pageerror', (e) => warn.push(e.message))
page.on('dialog', (d) => d.dismiss().catch(() => {}))   // a native confirm() would be dismissed = "no"

// init script 1: blur every <tbody tr> without the marker before it is ever painted
await sess.ctx.addInitScript((keep) => {
  const run = () => {
    document.querySelectorAll('tbody tr').forEach((el) => {
      if (!el.textContent.includes(keep) && !el.hasAttribute('data-vid-masked')) { el.style.filter = 'blur(14px)'; el.setAttribute('data-vid-masked', '1') }
    })
  }
  // documentElement does not exist yet when the init script runs on some navigations: retry until it does (+ a 25 ms safety sweep)
  const arm = () => {
    if (!document.documentElement) return setTimeout(arm, 1)
    new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true, characterData: true })
  }
  arm()
  setInterval(run, 25)
  document.addEventListener('DOMContentLoaded', run)
}, MARK)

const side = (href) => page.locator(`aside nav a[href="${href}"]`).first()
const highlight = (loc, on = true) => loc.evaluate((el, on) => el.classList.toggle('vid-highlight', on), on).catch(() => {})
const unhighlightAll = () => page.evaluate(() => document.querySelectorAll('.vid-highlight').forEach((e) => e.classList.remove('vid-highlight'))).catch(() => {})
const settle = async () => { await page.waitForLoadState('networkidle').catch(() => {}); await sleep(300) }
const field = (name) => page.locator(`[name="${name}"]`).first()

/** Smooth scroll of the scrolling ancestor of <main> so that `loc` sits `offset` px below the top edge. */
const scrollToEl = (loc, offset = 160, ms = 800) => loc.evaluate((el, [offset, ms]) => new Promise((res) => {
  let sc = document.querySelector('main')
  while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
  sc = sc || document.scrollingElement
  const from = sc.scrollTop
  const to = Math.max(0, from + el.getBoundingClientRect().top - (sc === document.scrollingElement ? 0 : sc.getBoundingClientRect().top) - offset)
  const t0 = performance.now()
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    sc.scrollTop = from + (to - from) * e
    k < 1 ? requestAnimationFrame(step) : res()
  }
  requestAnimationFrame(step)
}), [offset, ms])
const scrollTop = (y, ms = 600) => page.evaluate(([y, ms]) => new Promise((res) => {
  let sc = document.querySelector('main')
  while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
  sc = sc || document.scrollingElement
  const from = sc.scrollTop, to = y < 0 ? sc.scrollHeight : y, t0 = performance.now()
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    sc.scrollTop = from + (to - from) * e
    k < 1 ? requestAnimationFrame(step) : res()
  }
  requestAnimationFrame(step)
}), [y, ms])

/** Click, freeze the picture and wait for the target page; the NEXT scene resumes (arrive) - so this scene never shows the new page. */
async function leave(loc, urlTest) {
  // freeze BEFORE the real click (a fast navigation would otherwise leak 1-2 frames of the next page into this scene, found in the frame review)
  const { x, y } = await moveTo(page, loc, 600)
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [x, y])
  await sleep(260)                       // ripple is visible in the frozen frame
  await sess.pause()
  await page.mouse.click(x, y)
  await page.waitForURL(urlTest, { timeout: 30000 })
}
/** First action of a scene that follows a leave(): wait until the page is ready, then resume the picture. */
async function arrive(ready) {
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await settle()
  if (ready) await ready()
  await sleep(300)
  await sess.resume()
  await sleep(400)
}
/** Hidden navigation before a scene (frames before the scene start are not used). */
async function visit(p, ready) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await settle()
  if (ready) await ready()
  await sleep(300)
}
/** Type into the list search field and submit (GET form -> full page load, hidden by the freeze). */
async function search(term, ready) {
  const input = page.locator('input[name="q"]').first()
  await click(page, input)
  await typeText(page, term, 70)
  await sleep(250)
  await sess.pause()
  await page.keyboard.press('Enter')
  await page.waitForURL((u) => u.searchParams.has('q'), { timeout: 30000 })
  await settle()
  if (ready) await ready()
  await sess.resume()
  await sleep(300)
}
const demoRows = async (what, min) => {
  const n = await page.locator('tbody tr', { hasText: MARK }).count()
  const all = await page.locator('tbody tr').count()
  console.log(`  ${what}: ${n} demo row(s) of ${all}`)
  if (n < min) throw new Error(`${what}: expected >= ${min} demo row(s), found ${n} - run prepare_team.py`)
}
const typeInto = async (name, text, ms = 55) => { await click(page, field(name)); await typeText(page, text, ms) }
// ---- login (API, no login form on screen) + warm-up (Next dev compiles pages on first visit; read-only GETs, not part of any scene) ----
await adminLogin(sess, account)
for (const p of ['/admin/products', '/admin/products?q=Team+Demo', '/admin/products/new', EDIT_PATH, '/admin/brands', '/admin/brands?q=Team+Demo', '/admin/categories', '/admin/categories?q=Team+Demo']) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await settle()
}

const addNew = () => page.getByRole('link', { name: /Add new/ }).first()
const saveBtn = () => page.getByRole('button', { name: 'Save', exact: true })

// 1 find: search first, duplicates --------------------------------------------------------------------------------
await runScene(sess, 'find', dur('find'), () => visit('/admin/products'), async (at) => {
  const a = A('find')
  await at(lead + 0.30 * a)
  await search('Team Demo Sourdough', () => demoRows('products', 1))
  await at(lead + 0.58 * a)
  await moveTo(page, page.locator('tbody tr', { hasText: MARK }).first(), 800)
  await highlight(page.locator('tbody tr', { hasText: MARK }).first())
  await at(lead + 0.70 * a)
  await highlight(page.locator('tbody tr', { hasText: MARK }).first(), false)
  await moveTo(page, field('id'), 700)
  await highlight(field('id'))
  await at(lead + 0.80 * a)
  await highlight(field('id'), false)
  await moveTo(page, addNew(), 800)
  await highlight(addNew())
  await at(lead + 0.97 * a)
  await highlight(addNew(), false)
  await leave(addNew(), (u) => u.pathname === '/admin/products/new')
})

// 2 create: name, slug, brand, category, Save ----------------------------------------------------------------------
await runScene(sess, 'create', dur('create'), () => arrive(async () => { await field('name').waitFor() }), async (at) => {
  const a = A('create')
  await at(lead + 0.04 * a)
  await typeInto('name', NEW_NAME)
  await at(lead + 0.30 * a)
  await typeInto('slug', 'team-demo-rye-bread')
  await at(lead + 0.46 * a)
  const brand = field('brand_id')
  await moveTo(page, brand, 700)
  await highlight(brand)
  await brand.selectOption({ label: 'Team Demo Brand' })   // native list is never opened (it would list real brands)
  await at(lead + 0.64 * a)
  await highlight(brand, false)
  const trigger = page.locator('form label', { hasText: 'Category' }).locator('xpath=following-sibling::div//button').first()
  await click(page, trigger, 700)
  await typeText(page, 'Team Demo', 80)
  const opt = page.getByRole('option', { name: /Team Demo Category/ }).first()
  await opt.waitFor({ timeout: 10000 })
  await at(lead + 0.80 * a)
  await click(page, opt, 700)
  if (!(await page.locator('form').getByText('Team Demo Category').first().isVisible())) throw new Error('category not selected')
  await at(lead + 0.90 * a)
  const save = saveBtn()
  await moveTo(page, save, 700)
  await highlight(save)
  await at(lead + 0.97 * a)
  await highlight(save, false)
  await leave(save, (u) => u.pathname === '/admin/products')
})

// 3 saved: back in the list, new product there, open the edit page of the demo loaf ---------------------------------
await runScene(sess, 'saved', dur('saved'), () => arrive(() => page.locator('tbody tr').first().waitFor({ timeout: 30000 })), async (at) => {
  const a = A('saved')
  await at(lead + 0.12 * a)
  await search(MARK, () => demoRows('products after save', 2))
  const row = page.locator('tbody tr', { hasText: NEW_NAME }).first()
  if (!(await row.count())) throw new Error(`new product "${NEW_NAME}" not in the list after Save`)
  const txt = await row.innerText()
  if (!txt.includes('Team Demo Brand') || !txt.includes('Team Demo Category')) throw new Error(`new product row lacks brand/category: ${txt}`)
  await at(lead + 0.30 * a)
  await moveTo(page, row, 800)
  await highlight(row)
  await at(lead + 0.52 * a)
  await highlight(row, false)
  const edit = page.locator(`a[href="${EDIT_PATH}"]`).first()
  await moveTo(page, edit, 800)
  await highlight(edit)
  await at(lead + 0.97 * a)
  await highlight(edit, false)
  await leave(edit, (u) => u.pathname === EDIT_PATH)
})

// 4 edit: add a size to the name, look at the attributes, Save -----------------------------------------------------
await runScene(sess, 'edit', dur('edit'), () => arrive(async () => {
  if (!(await field('name').inputValue()).startsWith('Team Demo Sourdough Loaf')) throw new Error('edit page does not show the demo loaf')
}), async (at) => {
  const a = A('edit')
  await at(lead + 0.12 * a)
  await click(page, field('name'))
  await page.keyboard.press('End')
  await typeText(page, ' 500 g', 70)
  await at(lead + 0.28 * a)
  const attrs = page.locator('form div.border-t').first()
  await scrollToEl(attrs, 160, 900)
  await moveTo(page, attrs, 700)
  await highlight(attrs)
  await at(lead + 0.46 * a)
  await highlight(attrs, false)
  await scrollTop(0, 900)
  // warning sentences (Important ... tell the team lead): pointer on the name field the Save changes
  await moveTo(page, field('name'), 700)
  await highlight(field('name'))
  await at(lead + 0.88 * a)
  await highlight(field('name'), false)
  const save = saveBtn()
  await moveTo(page, save, 700)
  await highlight(save)
  await at(lead + 0.965 * a)
  await highlight(save, false)
  await leave(save, (u) => u.pathname === '/admin/products')
})

// 5 brands: list + search, "Add new" only hovered ------------------------------------------------------------------
await runScene(sess, 'brands', dur('brands'), async () => {
  await visit('/admin/brands')
  await sleep(500)
  await sess.resume()                                    // the previous scene ended frozen (leave): picture on again, showing this page
  await sleep(500)
}, async (at) => {
  const a = A('brands')
  await at(lead + 0.22 * a)
  await search(MARK, () => demoRows('brands', 1))
  await at(lead + 0.46 * a)
  const row = page.locator('tbody tr', { hasText: MARK }).first()
  await moveTo(page, row, 800)
  await highlight(row)
  await at(lead + 0.60 * a)
  await highlight(row, false)
  await moveTo(page, addNew(), 800)                      // hover only
  await highlight(addNew())
  await at(lead + 0.88 * a)
  await highlight(addNew(), false)
  await leave(side('/admin/categories'), (u) => u.pathname === '/admin/categories')
})

// 6 categories: tree (taxonomy, readable), search ----------------------------------------------------------------------
await runScene(sess, 'categories', dur('categories'), () => arrive(() => page.locator('ul li').first().waitFor({ timeout: 30000 })), async (at) => {
  const a = A('categories')
  const tree = page.locator('div.rounded-xl.border').first()
  await at(lead + 0.08 * a)
  await moveTo(page, tree, 900)
  await highlight(tree)
  await at(lead + 0.22 * a)
  await highlight(tree, false)
  await search(MARK, async () => { if (!(await page.locator('li', { hasText: 'Team Demo Category' }).count())) throw new Error('demo category not found in the tree') })
  const entry = page.locator('li', { hasText: 'Team Demo Category' }).last()
  await at(lead + 0.34 * a)
  await moveTo(page, entry, 800)
  await highlight(entry)
  await at(lead + 0.52 * a)
  await highlight(entry, false)
  await moveTo(page, field('q'), 700)
})

await unhighlightAll()
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
