// Recorder for team video 4 "Maintaining products" (F8960 T20; products only since the re-cut of 2026-10-20, categories/brands = video 3b).  Usage: node record.mjs en
// Same rules as ../team-shops/record.mjs: STRICT mode (only test instance frontend :3500 / backend :8500, no parallel E2E run,
// privacy check per scene: e-mail outside @pundo-e2e.io or visible password field = abort), admin login via API, demo data from
// ../team-common/prepare_team.py (marker "Team Demo").
// Privacy: EVERY product table row without "Team Demo" (incl. the barcode column) AND every dropdown entry (role=option) of the brand/category
// comboboxes without "Team Demo" (they show real brands/categories of the prod copy until the typed query narrows the server search) is blurred by a
// MutationObserver installed as an init script (before the first paint of every page load, also across client navigations).
// What is DECIDED here (test DB only): the product "Team Demo Rye Bread" is created through the form (prepare_team.py deletes it on the next
// run) and the English name of "Team Demo Sourdough Loaf" is edited (prepare_team.py puts it back). Deleting is never done (no click on any
// "Delete" button); "Add new" (products) is the only creating click, on the list page.
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
const DEMO_EAN = demo.item_ean
// the address bar of the scene edit shows this id (window_path in scenes.yml): fail early when they differ
const scenesYml = fs.readFileSync(path.join(here, 'scenes.yml'), 'utf8')
for (const p of [EDIT_PATH]) if (!scenesYml.includes(`localhost:3500${p}"`)) throw new Error(`scenes.yml window_path does not contain ${p} - update it`)

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

// init script: blur every product <tbody tr> and every combobox entry without the marker before it is ever painted
await sess.ctx.addInitScript((keep) => {
  const run = () => {
    // only the product LIST holds real rows (incl. barcodes)
    if (/^\/admin\/products\/?$/.test(location.pathname)) {
      document.querySelectorAll('tbody tr').forEach((el) => {
        if (!el.textContent.includes(keep) && !el.hasAttribute('data-vid-masked')) { el.style.filter = 'blur(14px)'; el.setAttribute('data-vid-masked', '1') }
      })
    }
    // dropdown entries of the brand/category comboboxes (server search: real entries until the query narrows it); "None" is harmless, kept readable
    document.querySelectorAll('[role="option"]').forEach((el) => {
      if (!el.textContent.includes(keep) && el.textContent.trim() !== 'None' && !el.hasAttribute('data-vid-masked')) { el.style.filter = 'blur(10px)'; el.setAttribute('data-vid-masked', '1') }
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
/** Open a combobox and type into its search field: wait until the field exists and has focus (else the first letters are lost). */
const comboType = async (btn, text) => {
  await click(page, btn, 700)
  const inp = page.locator('input[autocomplete="off"]').first()
  await inp.waitFor({ timeout: 10000 })
  await inp.focus()
  await sleep(350)
  await typeText(page, text, 80)
}
const typeInto = async (name, text, ms = 55) => { await click(page, field(name)); await typeText(page, text, ms) }
// ---- login (API, no login form on screen) + warm-up (Next dev compiles pages on first visit; read-only GETs, not part of any scene) ----
await adminLogin(sess, account)
for (const p of ['/admin/products', '/admin/products?q=Team+Demo', '/admin/products/new', EDIT_PATH]) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await settle()
}

const addNew = () => page.getByRole('link', { name: /Add new/ }).first()
const saveBtn = () => page.getByRole('button', { name: 'Save', exact: true })

// 1 find: products list (barcode column), search by barcode ------------------------------------------------------------------
await runScene(sess, 'find', dur('find'), () => visit('/admin/products', () => page.locator('tbody tr').first().waitFor({ timeout: 30000 })), async (at) => {
  await at(when('find', 'Search by'))
  await search(DEMO_EAN, () => demoRows('products by barcode', 1))
  const row = page.locator('tbody tr', { hasText: MARK }).first()
  const eanCell = row.locator('td', { hasText: DEMO_EAN }).first()
  if (!(await eanCell.count())) throw new Error('barcode cell of the demo row not found')
  await at(when('find', 'Here the'))
  await moveTo(page, eanCell, 800)
  await highlight(eanCell)
  await at(when('find', 'If the'))
  await highlight(eanCell, false)
  await highlight(row)
  await at(when('find', 'Only when'))
  await highlight(row, false)
  await moveTo(page, addNew(), 800)
  await highlight(addNew())
  await at(dur('find') - 1.2)
  await highlight(addNew(), false)
  await leave(addNew(), (u) => u.pathname === '/admin/products/new')
})

// 2 create: names, slug, barcode, brand + category through the server search, Save -------------------------------------------
await runScene(sess, 'create', dur('create'), () => arrive(async () => { await field('name_en').waitFor() }), async (at) => {
  const fieldset = page.locator('form fieldset').first()
  await at(lead + 0.5)
  await moveTo(page, field('name_en'), 700)
  await highlight(fieldset)
  await at(when('create', 'Fill in'))
  await highlight(fieldset, false)
  await typeInto('name_en', NEW_NAME)
  await at(when('create', 'Write it'))
  await typeInto('name_de', 'Team Demo Roggenbrot')
  await at(when('create', 'The slug'))
  await scrollToEl(field('slug'), 330, 700)
  await typeInto('slug', 'team-demo-rye-bread')
  await at(when('create', 'Enter the'))
  await typeInto('ean', NEW_EAN)
  await at(when('create', 'For brand'))
  // brand: open the combobox, type at once (the server search then narrows to the demo entry), pick it; the unfiltered start list is blurred by the init script
  const brandBtn = page.locator('#brand_id')
  await scrollToEl(brandBtn, 330, 700)
  await comboType(brandBtn, 'Team Demo')
  const bopt = page.getByRole('option', { name: 'Team Demo Brand', exact: true })
  await bopt.waitFor({ timeout: 10000 }).catch(async (e) => { console.log('  DEBUG listbox:', JSON.stringify(await page.locator('[role="listbox"]').allInnerTexts()), 'input:', await page.locator('input[autocomplete="off"]').first().inputValue().catch(() => '?')); throw e })
  await scrollTop(-1, 500)                                   // dropdown sticks out of the short window: show it completely
  await click(page, bopt, 600)
  if (!(await brandBtn.innerText()).includes('Team Demo Brand')) throw new Error('brand not selected')
  const catBtn = page.locator('form label', { hasText: 'Category' }).locator('xpath=following-sibling::div//button').first()
  await comboType(catBtn, 'Team Demo')
  const copt = page.getByRole('option', { name: /Team Demo Category/ }).first()
  await copt.waitFor({ timeout: 10000 })
  // every visible entry must be a demo entry now (the narrowed server search): a real name here would be readable in the picture
  const others = await page.getByRole('option').filter({ hasNotText: /Team Demo/ }).allInnerTexts()
  console.log('  category list after typing: non-demo entries =', others.length)
  await scrollTop(-1, 500)
  await click(page, copt, 600)
  if (!(await page.locator('form').getByText('Team Demo Category').first().isVisible())) throw new Error('category not selected')
  await at(when('create', 'The list'))
  await sleep(200)
  await at(when('create', 'Then click'))
  const save = saveBtn()
  await scrollToEl(save, 330, 600)
  await moveTo(page, save, 700)
  await highlight(save)
  await at(dur('create') - 1.2)
  await highlight(save, false)
  await leave(save, (u) => u.pathname === '/admin/products')
})

// 3 saved: back in the list, new product there (barcode, brand, category), open the edit page of the demo loaf ------------------
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

// 4 edit: add a size to the English name, see the other languages stay, attributes, Save -------------------------------------
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
  await at(when('edit', 'The other'))
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
  await at(when('edit', 'The category'))
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

// 5 wrap: result in the list, closing words ----------------------------------------------------------------------------------
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
  await at(when('wrap', 'How translations'))
  await highlight(row, false)
})

await unhighlightAll()
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
