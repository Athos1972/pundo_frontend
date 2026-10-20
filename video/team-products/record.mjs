// Recorder for team video 4 "Maintaining categories, brands and products" (F8960 T20).  Usage: node record.mjs en
// Same rules as ../team-shops/record.mjs: STRICT mode (only test instance frontend :3500 / backend :8500, no parallel E2E run,
// privacy check per scene: e-mail outside @pundo-e2e.io or visible password field = abort), admin login via API, demo data from
// ../team-common/prepare_team.py (marker "Team Demo").
// Privacy: EVERY table row without "Team Demo" (products incl. their barcodes, and brands of the prod copy) is blurred by a MutationObserver
// installed as an init script (before the first paint of every page load, also across client navigations). The category tree is the taxonomy
// (no personal or shop data) and stays readable. Native <select> lists (brand, parent category) are never opened.
// What is DECIDED here (test DB only): the product "Team Demo Rye Bread" is created through the form (prepare_team.py deletes it on the next
// run), the English name of "Team Demo Sourdough Loaf" is edited and ONE language (ru) of "Team Demo Category" is renamed (prepare_team.py puts
// both back). Deleting is never done (no click on any "Delete" button); "Add new" (brands) is only hovered.
// Every scene shows ONE page (address bar of scenes.yml): page switches happen at scene borders (click, frozen picture, next scene resumes).
// Narration anchors: when(sceneId, "first words of a sentence") reads the word times of .cache/en/audio/<id>.json (tts.py).
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
const NEW_EAN = '2099900000023'      // fictional barcode of the created product
const RU_NAME = 'Team Demo Категория'

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
const CAT_PATH = `/admin/categories/${demo.category_id}/edit`
const DEMO_EAN = demo.item_ean
// the address bars of the scenes catname/edit show these ids (window_path in scenes.yml): fail early when they differ
const scenesYml = fs.readFileSync(path.join(here, 'scenes.yml'), 'utf8')
for (const p of [EDIT_PATH, CAT_PATH]) if (!scenesYml.includes(`localhost:3500${p}"`)) throw new Error(`scenes.yml window_path does not contain ${p} - update it`)

const account = JSON.parse(fs.readFileSync(path.join(here, '../team-common/.recording-accounts.json'), 'utf8')).admin
if (!account) throw new Error('no admin account in ../team-common/.recording-accounts.json (run prepare_team.py)')

const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const dur = (id) => T.lead_in_s + A(id) + T.tail_s
const lead = T.lead_in_s
/** Scene time (s) at which the narration says `phrase` (first word of the phrase; words from tts.py's cache). */
const words = (id) => JSON.parse(fs.readFileSync(path.join(cacheDir, 'audio', `${id}.json`), 'utf8')).words
const when = (id, phrase) => {
  const w = words(id), p = phrase.split(' ')
  for (let i = 0; i + p.length <= w.length; i++) if (p.every((x, k) => w[i + k][2].replace(/[.,:;"]/g, '').toLowerCase() === x.toLowerCase())) return lead + w[i][0]
  throw new Error(`phrase "${phrase}" not found in narration of ${id}`)
}

const sess = await startSession({ lang, outDir: path.join(cacheDir, 'rec'), device: 'desktop', strict: true })
const { page } = sess
const warn = []
page.on('pageerror', (e) => warn.push(e.message))
page.on('dialog', (d) => d.dismiss().catch(() => {}))   // a native confirm() would be dismissed = "no"

// init script 1: blur every <tbody tr> without the marker before it is ever painted
await sess.ctx.addInitScript((keep) => {
  const run = () => {
    // only the LIST pages hold real rows; the translation table of a category edit page is demo data and must stay readable
    if (!/^\/admin\/(products|brands)\/?$/.test(location.pathname)) return
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

// warm-up of the category edit page (Next dev compiles on first visit)
await page.goto(`${BASE}${CAT_PATH}`, { waitUntil: 'domcontentloaded' })
await settle()

// 1 tree: categories as a tree (taxonomy), search, open the demo category -------------------------------------------------
await runScene(sess, 'tree', dur('tree'), () => visit('/admin/categories', () => page.locator('ul li').first().waitFor({ timeout: 30000 })), async (at) => {
  const tree = page.locator('div.rounded-xl.border').first()
  await at(when('tree', 'Start with'))
  await moveTo(page, tree, 900)
  await highlight(tree)
  await at(when('tree', 'Open the'))
  await highlight(tree, false)
  await search(MARK, async () => { if (!(await page.locator('li', { hasText: 'Team Demo Category' }).count())) throw new Error('demo category not found in the tree') })
  const entry = page.locator('li', { hasText: 'Team Demo Category' }).last()
  await at(when('tree', 'Here is'))
  await moveTo(page, entry, 800)
  await highlight(entry)
  await at(when('tree', 'Click'))
  await highlight(entry, false)
  const edit = page.locator(`a[href="${CAT_PATH}"]`).first()
  await moveTo(page, edit, 600)
  await highlight(edit)
  await at(dur('tree') - 0.9)
  await highlight(edit, false)
  await leave(edit, (u) => u.pathname === CAT_PATH)
})

// 2 catname: translation table of the demo category, type a Russian name, Save ---------------------------------------------
await runScene(sess, 'catname', dur('catname'), () => arrive(async () => {
  if (!(await page.locator('h1', { hasText: 'Team Demo Category' }).count())) throw new Error('category edit page does not show the demo category')
}), async (at) => {
  const table = page.locator('table').first()
  const inputs = table.locator('tbody tr input')
  if ((await inputs.count()) !== 6) throw new Error('translation table does not have 6 rows')
  const ru = inputs.nth(3)                            // order: en, de, el, ru, ar, he (LANGUAGES in CategoryForm)
  if ((await table.locator('tbody tr').nth(3).locator('td').first().innerText()).trim().toLowerCase() !== 'ru') throw new Error('row 4 is not RU')
  await at(lead + 0.3)
  await moveTo(page, table, 900)
  await highlight(table)
  await at(when('catname', 'To rename'))
  await highlight(table, false)
  await at(when('catname', 'Here we'))
  await click(page, ru, 700)
  await typeText(page, RU_NAME, 70)
  await at(when('catname', 'The name is'))
  const save = saveBtn()
  await moveTo(page, save, 700)
  await highlight(save)
  await at(dur('catname') - 1.2)
  await highlight(save, false)
  await leave(save, (u) => u.pathname === '/admin/categories')   // PUT /admin/categories/{id}/translations
})

// 3 brands: list + search, "Add new" only hovered --------------------------------------------------------------------------
await runScene(sess, 'brands', dur('brands'), async () => {
  await visit('/admin/brands')
  await sleep(500)
  await sess.resume()                                    // the previous scene ended frozen (leave): picture on again, showing this page
  await sleep(500)
}, async (at) => {
  await at(when('brands', 'Open'))
  await search(MARK, () => demoRows('brands', 1))
  await at(when('brands', 'Every product'))
  const row = page.locator('tbody tr', { hasText: MARK }).first()
  await moveTo(page, row, 800)
  await highlight(row)
  await at(when('brands', 'Only if'))
  await highlight(row, false)
  await moveTo(page, addNew(), 800)                      // hover only
  await highlight(addNew())
  await at(dur('brands') - 1.2)
  await highlight(addNew(), false)
  await leave(side('/admin/products'), (u) => u.pathname === '/admin/products')
})

// 4 find: products list (barcode column), search by barcode ------------------------------------------------------------------
await runScene(sess, 'find', dur('find'), () => arrive(() => page.locator('tbody tr').first().waitFor({ timeout: 30000 })), async (at) => {
  await at(when('find', 'Search by'))
  await search(DEMO_EAN, () => demoRows('products by barcode', 1))
  const row = page.locator('tbody tr', { hasText: MARK }).first()
  const eanCell = row.locator('td', { hasText: DEMO_EAN }).first()
  if (!(await eanCell.count())) throw new Error('barcode cell of the demo row not found')
  await at(when('find', 'The list'))
  await moveTo(page, eanCell, 800)
  await highlight(eanCell)
  await at(when('find', 'Here the'))
  await highlight(eanCell, false)
  await highlight(row)
  await at(when('find', 'If you'))
  await highlight(row, false)
  await moveTo(page, field('id'), 700)
  await highlight(field('id'))
  await at(when('find', 'If the'))
  await highlight(field('id'), false)
  await moveTo(page, addNew(), 800)
  await highlight(addNew())
  await at(dur('find') - 1.2)
  await highlight(addNew(), false)
  await leave(addNew(), (u) => u.pathname === '/admin/products/new')
})

// 5 create: names per language, slug, barcode, brand, category, Save ---------------------------------------------------------
await runScene(sess, 'create', dur('create'), () => arrive(async () => { await field('name_en').waitFor() }), async (at) => {
  const fieldset = page.locator('form fieldset').first()
  await at(lead + 0.5)
  await moveTo(page, field('name_en'), 700)
  await highlight(fieldset)
  await at(when('create', 'Fill in'))
  await highlight(fieldset, false)
  await at(when('create', 'Write it'))
  await typeInto('name_en', NEW_NAME)
  await at(when('create', 'Here we'))
  await typeInto('name_de', 'Team Demo Roggenbrot')
  await scrollToEl(field('name_ar'), 330, 700)
  await typeInto('name_ar', 'Team Demo خبز الجاودار', 45)
  await at(when('create', 'Then the'))
  await scrollToEl(field('slug'), 330, 700)
  await typeInto('slug', 'team-demo-rye-bread')
  await at(when('create', 'Enter the'))
  await typeInto('ean', NEW_EAN)
  await at(when('create', 'Choose the'))
  const brand = field('brand_id')
  await scrollToEl(brand, 330, 700)
  await moveTo(page, brand, 700)
  await highlight(brand)
  await brand.selectOption({ label: 'Team Demo Brand' })   // native list is never opened (it would list real brands)
  await highlight(brand, false)
  const trigger = page.locator('form label', { hasText: 'Category' }).locator('xpath=following-sibling::div//button').first()
  await click(page, trigger, 700)
  await typeText(page, 'Team Demo', 80)
  const opt = page.getByRole('option', { name: /Team Demo Category/ }).first()
  await opt.waitFor({ timeout: 10000 })
  await click(page, opt, 700)
  if (!(await page.locator('form').getByText('Team Demo Category').first().isVisible())) throw new Error('category not selected')
  await at(when('create', 'Then click'))
  const save = saveBtn()
  await scrollToEl(save, 330, 600)
  await moveTo(page, save, 700)
  await highlight(save)
  await at(dur('create') - 1.2)
  await highlight(save, false)
  await leave(save, (u) => u.pathname === '/admin/products')
})

// 6 saved: back in the list, new product there (barcode, brand, category), open the edit page of the demo loaf ------------------
await runScene(sess, 'saved', dur('saved'), () => arrive(() => page.locator('tbody tr').first().waitFor({ timeout: 30000 })), async (at) => {
  await at(when('saved', 'Search for'))
  await search(MARK, () => demoRows('products after save', 2))
  const row = page.locator('tbody tr', { hasText: NEW_NAME }).first()
  if (!(await row.count())) throw new Error(`new product "${NEW_NAME}" not in the list after Save`)
  const txt = await row.innerText()
  if (!txt.includes('Team Demo Brand') || !txt.includes('Team Demo Category') || !txt.includes(NEW_EAN)) throw new Error(`new product row lacks barcode/brand/category: ${txt}`)
  await moveTo(page, row, 800)
  await highlight(row)
  await at(when('saved', 'Saving does'))
  await highlight(row, false)
  await at(when('saved', 'If two'))
  const edit = page.locator(`a[href="${EDIT_PATH}"]`).first()
  await at(when('saved', 'To change'))
  await moveTo(page, edit, 800)
  await highlight(edit)
  await at(dur('saved') - 1.2)
  await highlight(edit, false)
  await leave(edit, (u) => u.pathname === EDIT_PATH)
})

// 7 edit: add a size to the English name, see the other languages stay, attributes, Save -------------------------------------
await runScene(sess, 'edit', dur('edit'), () => arrive(async () => {
  if (!(await field('name_en').inputValue()).startsWith('Team Demo Sourdough Loaf')) throw new Error('edit page does not show the demo loaf')
  for (const l of ['de', 'ru', 'el', 'ar', 'he']) if (!(await field(`name_${l}`).inputValue())) throw new Error(`demo loaf has no ${l} name - run prepare_team.py`)
}), async (at) => {
  const fieldset = page.locator('form fieldset').first()
  await at(lead + 0.4)
  await moveTo(page, field('name_en'), 700)
  await highlight(fieldset)
  await at(when('edit', 'Change only'))
  await highlight(fieldset, false)
  await click(page, field('name_en'))
  await page.keyboard.press('End')
  await typeText(page, ' 500 g', 70)
  await at(when('edit', 'Scroll down'))
  await scrollToEl(field('name_de'), 170, 800)
  await moveTo(page, field('name_de'), 600)
  await highlight(field('name_de'))
  await sleep(500)
  await highlight(field('name_de'), false)
  await scrollToEl(field('name_ar'), 200, 1100)
  await moveTo(page, field('name_ar'), 600)
  await highlight(field('name_ar'))
  await at(when('edit', 'If you'))
  await highlight(field('name_ar'), false)
  await moveTo(page, field('name_he'), 600)
  await highlight(field('name_he'))
  await at(when('edit', 'Below the'))
  await highlight(field('name_he'), false)
  const attrs = page.locator('form div.border-t').first()
  await scrollToEl(attrs, 200, 1000)
  await moveTo(page, attrs, 700)
  await highlight(attrs)
  await at(when('edit', 'Then click'))
  await highlight(attrs, false)
  const save = saveBtn()
  await scrollToEl(save, 330, 800)
  await moveTo(page, save, 700)
  await highlight(save)
  await at(dur('edit') - 1.2)
  await highlight(save, false)
  await leave(save, (u) => u.pathname === '/admin/products')
})

// 8 wrap: result in the list, closing words ----------------------------------------------------------------------------------
await runScene(sess, 'wrap', dur('wrap'), () => arrive(() => page.locator('tbody tr').first().waitFor({ timeout: 30000 })), async (at) => {
  // proof (not shown): the PATCH kept the other languages and changed only the English name
  const r = await page.request.get(`${BACKEND}/api/v1/admin/products/${demo.item_id}`).catch(() => null)
  if (r && r.ok()) {
    const names = (await r.json()).names
    console.log('  loaf names after Save:', Object.keys(names).sort().join(','), '| en =', names.en)
    if (!String(names.en).endsWith('500 g') || !names.de || !names.ru || !names.el || !names.ar || !names.he) throw new Error('PATCH did not keep the other languages')
  } else console.log('  (API proof skipped: admin API not reachable with the page cookie)')
  await at(when('wrap', 'Important'))
  await search(MARK, () => demoRows('products at the end', 2))
  const row = page.locator('tbody tr', { hasText: 'Team Demo Sourdough Loaf' }).first()
  await moveTo(page, row, 800)
  await highlight(row)
  await at(when('wrap', 'That is'))
  await highlight(row, false)
})

await unhighlightAll()
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
