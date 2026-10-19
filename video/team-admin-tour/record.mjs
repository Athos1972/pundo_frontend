// Recorder for team video 1 "Admin tour" (F8960 T17).  Usage: node record.mjs en
// STRICT mode: only the test instance (frontend :3500, backend :8500), no parallel E2E run, privacy check per scene
// (e-mail outside @pundo-e2e.io or visible password field = abort). Needs .cache/en/timeline.json (tts.py).
// Admin session via API login (no login scene); credentials come from ../team-common/.recording-accounts.json (gitignored).
// pundo_test is a copy of prod: every list that can hold real rows is (1) filtered with the search field to the demo
// records ("Team Demo", from ../team-common/prepare_team.py) and (2) blurred (sess.mask) while it is still unfiltered.
// The unfiltered state is only visible while the screencast is frozen (sess.pause) or blurred.
// Env: SKIP_PREPARE=1 (prepare_team.py --dry-run), BACKEND_DIR (default ~/dev/github/pundo_main_backend).
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

// guard FIRST (before the DB is touched by prepare_team.py): frontend :3500, backend :8500 answering /health
const BACKEND = process.env.VIDEO_BACKEND_URL || 'http://localhost:8500'
assertTestInstance({ frontend: BASE, backend: BACKEND })
await assertBackendHealthy(BACKEND)

// ---- test-DB preparation (pundo_test only; the script refuses everything else) ----
{
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const args = [path.join(here, '../team-common/prepare_team.py')]
  if (process.env.SKIP_PREPARE === '1') args.push('--dry-run')
  const out = execFileSync(path.join(backend, '.venv/bin/python'), args, { cwd: backend, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-1).slice(0, 160))
}
const account = JSON.parse(fs.readFileSync(path.join(here, '../team-common/.recording-accounts.json'), 'utf8')).admin
if (!account) throw new Error('no admin account in ../team-common/.recording-accounts.json (run prepare_team.py)')

const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const dur = (id) => T.lead_in_s + A(id) + T.tail_s
const lead = T.lead_in_s

// strict session: guard (3500/8500, /health, no E2E lock) runs BEFORE anything is deleted or started
const sess = await startSession({ lang, outDir: path.join(cacheDir, 'rec'), device: 'desktop', strict: true })
const { page } = sess
const warn = []
page.on('pageerror', (e) => warn.push(e.message))
page.on('dialog', (d) => d.dismiss().catch(() => {}))

const side = (href) => page.locator(`aside nav a[href="${href}"]`).first()
const highlight = (loc, on = true) => loc.evaluate((el, on) => el.classList.toggle('vid-highlight', on), on).catch(() => {})
const unhighlightAll = () => page.evaluate(() => document.querySelectorAll('.vid-highlight').forEach((e) => e.classList.remove('vid-highlight'))).catch(() => {})
/** Blur every list row that does not show the demo marker (re-applied after each navigation). */
const blurRows = () => sess.mask('tbody tr', MARK)

/** Click a sidebar entry; the page switch happens while the picture is frozen, `ready` runs before the picture resumes. */
async function goSide(href, ready) {
  await click(page, side(href))
  await sleep(220)                       // ripple is visible in the last frozen frame
  await sess.pause()
  await page.waitForURL((u) => u.pathname === href, { timeout: 30000 })
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  if (ready) await ready()
  await sleep(300)
  await sess.resume()
}
/** Type into the list search field and submit (GET form -> full page load, hidden by the freeze). */
async function search(term, ready) {
  const input = page.locator('main input[name="q"], input[name="q"]').first()
  await click(page, input)
  await typeText(page, term, 70)
  await sleep(250)
  await sess.pause()
  await page.keyboard.press('Enter')
  await page.waitForURL((u) => u.searchParams.has('q'), { timeout: 30000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  if (ready) await ready()
  await sleep(300)
  await sess.resume()
}
const requireDemoRows = async (what) => {
  const n = await page.locator('tbody tr', { hasText: MARK }).count()
  const all = await page.locator('tbody tr').count()
  console.log(`  ${what}: ${n} demo row(s) of ${all}`)
  if (n === 0) throw new Error(`${what}: no demo row found - run prepare_team.py`)
  if (all !== n) await blurRows()
}

// ---- login (API, no login form on screen) + warm-up (Next dev compiles pages on first visit; not part of any scene) ----
await adminLogin(sess, account)
for (const p of ['/admin/shops?q=Team+Demo', '/admin/products?q=Team+Demo', '/admin/categories?q=Team+Demo', '/admin/claims',
  '/admin/reviews', '/admin/crm/contacts?q=Team+Demo', '/admin/help', '/admin/help/admin-tour', '/admin/dashboard']) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
}

// 1 dashboard -------------------------------------------------------------------------------------------------
await runScene(sess, 'dashboard', dur('dashboard'), async () => {
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.locator('[data-testid=dashboard-claims-tile]').waitFor()
  await page.evaluate(() => window.__vidGlide && window.__vidGlide(1200, 700, 1))   // start the pointer mid-screen
  await page.mouse.move(1200, 700)
}, async (at) => {
  const a = A('dashboard')
  const tile = page.locator('[data-testid=dashboard-claims-tile]')
  await at(lead + 0.52 * a)
  await moveTo(page, tile, 900)
  await highlight(tile)
  await at(lead + 0.78 * a)
  await highlight(tile, false)
  await moveTo(page, page.locator('main a[href="/admin/shops"]').first(), 800)
  await at(lead + 0.88 * a)
  await moveTo(page, page.locator('main a[href="/admin/products"]').first(), 700)
})

// 2 sidebar ---------------------------------------------------------------------------------------------------
await runScene(sess, 'sidebar', dur('sidebar'), null, async (at) => {
  const a = A('sidebar')
  await at(lead + 0.04 * a)
  await moveTo(page, side('/admin/dashboard'), 700)
  const walk = [['/admin/shops', 0.36], ['/admin/shop-owners', 0.46], ['/admin/claims', 0.55], ['/admin/products', 0.64],
    ['/admin/categories', 0.71], ['/admin/brands', 0.78], ['/admin/reviews', 0.86], ['/admin/api-keys', 0.92], ['/admin/crm/contacts', 0.97]]
  for (const [href, f] of walk) {
    await at(lead + f * a)
    await moveTo(page, side(href), 450)
  }
})

// 3 shops -----------------------------------------------------------------------------------------------------
await runScene(sess, 'shops', dur('shops'), null, async (at) => {
  const a = A('shops')
  await at(lead + 0.03 * a)
  await goSide('/admin/shops', blurRows)
  await at(lead + 0.30 * a)
  await search(MARK, () => requireDemoRows('shops'))
  await at(lead + 0.62 * a)
  const edit = page.locator('tbody tr', { hasText: MARK }).first().getByRole('link', { name: 'Edit' })
  await moveTo(page, edit, 900)
  await highlight(edit)
})

// 4 products + categories ---------------------------------------------------------------------------------------
await runScene(sess, 'catalog', dur('catalog'), null, async (at) => {
  const a = A('catalog')
  await at(lead + 0.02 * a)
  await goSide('/admin/products', blurRows)
  await at(lead + 0.14 * a)
  await search(MARK, () => requireDemoRows('products'))
  await at(lead + 0.36 * a)
  await moveTo(page, page.locator('tbody tr', { hasText: MARK }).first(), 800)
  await at(lead + 0.50 * a)
  await goSide('/admin/categories', () => sess.mask('ul.py-1', MARK))   // unfiltered taxonomy tree: blur it too
  await at(lead + 0.62 * a)
  await search(MARK, async () => {
    const hit = await page.getByText('Team Demo Category').count()
    console.log(`  categories: ${hit} demo match(es)`)
    if (!hit) throw new Error('categories: demo category not found - run prepare_team.py')
  })
  await at(lead + 0.80 * a)
  await moveTo(page, page.getByText('Team Demo Category').first(), 800)
})

// 5 claims + reviews ------------------------------------------------------------------------------------------
await runScene(sess, 'claims', dur('claims'), null, async (at) => {
  const a = A('claims')
  await at(lead + 0.02 * a)
  await goSide('/admin/claims', async () => {
    // only the demo claim may be listed (anything else = other applicants' mail addresses)
    const rows = await page.locator('tbody tr').count()
    const demo = await page.locator('tbody tr', { hasText: MARK }).count()
    console.log(`  claims: ${demo} demo row(s) of ${rows}`)
    if (!demo) throw new Error('claims: demo claim not found - run prepare_team.py')
    if (rows !== demo) await blurRows()
  })
  const row = page.locator('tbody tr', { hasText: MARK }).first()
  const table = page.locator('table').first()   // outline on <tr> does not render (border-collapse): frame the table
  await at(lead + 0.20 * a)
  await moveTo(page, row, 800)
  await highlight(table)
  await at(lead + 0.48 * a)
  await highlight(table, false)
  await goSide('/admin/reviews', async () => {
    // moderation queue "Reported" must be empty (cannot be blurred in a meaningful way): otherwise abort
    await page.getByText('No reviews found').waitFor({ timeout: 10000 })
  })
  await at(lead + 0.78 * a)
  await moveTo(page, page.getByText('Reported', { exact: true }).first(), 700)
})

// 6 CRM -------------------------------------------------------------------------------------------------------
await runScene(sess, 'crm', dur('crm'), null, async (at) => {
  const a = A('crm')
  await at(lead + 0.02 * a)
  await goSide('/admin/crm/contacts', blurRows)
  await at(lead + 0.20 * a)
  await search(MARK, () => requireDemoRows('crm contacts'))
  const badge = page.locator('tbody tr', { hasText: MARK }).first().getByText('Needs review', { exact: true })
  await at(lead + 0.50 * a)
  await moveTo(page, badge, 800)
  await highlight(badge)
  await at(lead + 0.80 * a)
  await highlight(badge, false)
})

// 7 test or live ----------------------------------------------------------------------------------------------
await runScene(sess, 'environment', dur('environment'), null, async (at) => {
  const a = A('environment')
  await at(lead + 0.02 * a)
  await goSide('/admin/dashboard')
  await at(lead + 0.20 * a)
  await moveTo(page, page.locator('[data-testid=dashboard-claims-tile]'), 700)
  await at(lead + 0.30 * a)
  await page.evaluate(() => window.__vidGlide && window.__vidGlide(720, 4, 900))   // pointer towards the address bar (above the window content)
})

// 8 help ------------------------------------------------------------------------------------------------------
await runScene(sess, 'help', dur('help'), null, async (at) => {
  const a = A('help')
  await at(lead + 0.02 * a)
  await goSide('/admin/help')
  const card = page.locator('[data-testid=help-topic-card]').first()
  await at(lead + 0.38 * a)
  await moveTo(page, card, 800)
  await highlight(card)
  await at(lead + 0.58 * a)
  await highlight(card, false)
  await click(page, card)
  await sleep(220)
  await sess.pause()
  await page.waitForURL(/\/admin\/help\/admin-tour/, { timeout: 30000 })
  await page.locator('h1').first().waitFor()
  await page.waitForLoadState('networkidle').catch(() => {})
  await sleep(300)
  await sess.resume()
})

await unhighlightAll()
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
