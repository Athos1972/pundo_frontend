// Recorder for team video 2 "Claims and shop owners" (F8960 T18).  Usage: node record.mjs en
// Same rules as ../team-admin-tour/record.mjs: STRICT mode (only test instance frontend :3500 / backend :8500, no parallel
// E2E run, privacy check per scene: e-mail outside @pundo-e2e.io or visible password field = abort), admin login via API,
// demo data from ../team-common/prepare_team.py (marker "Team Demo"), every list that can hold real rows is blurred while
// unfiltered and then filtered to the demo rows.
// What is DECIDED here (test DB only): demo claim 1 (Pet Corner) is marked verified + accepted, demo claim 2 (Flower Corner)
// is rejected. prepare_team.py resets both to "open" (and their applicants to pending without shop) on the next run.
// Impersonation ("Manage shop operations") is only hovered, never clicked. Needs .cache/en/timeline.json (tts.py).
// Env: SKIP_PREPARE=1 (prepare_team.py --dry-run: nothing is reset, the recording then aborts if the claims are not open),
//      BACKEND_DIR (default ~/dev/github/pundo_main_backend).
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

// ---- test-DB preparation (pundo_test only; the script refuses everything else); resets the two demo claims ----
let demo
{
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const args = [path.join(here, '../team-common/prepare_team.py')]
  if (process.env.SKIP_PREPARE === '1') args.push('--dry-run')
  const out = execFileSync(path.join(backend, '.venv/bin/python'), args, { cwd: backend, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-1).slice(0, 160))
  demo = JSON.parse(out.at(-1))
}
const CLAIM_ACCEPT = demo.claim_id      // Pet Corner, domain matches
const CLAIM_REJECT = demo.claim2_id     // Flower Corner, domain does not match
// the address bar of the scenes check/verify/accept shows this id (window_path in scenes.yml): fail early when they differ
const scenesYml = fs.readFileSync(path.join(here, 'scenes.yml'), 'utf8')
if (!scenesYml.includes(`admin/claims/${CLAIM_ACCEPT}"`)) throw new Error(`scenes.yml window_path does not contain admin/claims/${CLAIM_ACCEPT} - update it`)
const SHOP_EDIT = `/admin/shops/${demo.shops.bakery.id}/edit`

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

const side = (href) => page.locator(`aside nav a[href="${href}"]`).first()
const tid = (id) => page.locator(`[data-testid=${id}]`).first()
const highlight = (loc, on = true) => loc.evaluate((el, on) => el.classList.toggle('vid-highlight', on), on).catch(() => {})
const unhighlightAll = () => page.evaluate(() => document.querySelectorAll('.vid-highlight').forEach((e) => e.classList.remove('vid-highlight'))).catch(() => {})
/** Blur every list row that does not show the demo marker (re-applied after each navigation). */
const blurRows = () => sess.mask('tbody tr', MARK)
/** Persistent guard: a MutationObserver blurs every table row without the demo marker the moment React (re)renders it
 *  (a one-off sess.mask after navigation was overwritten by the client render: 2 unblurred frames, found in the frame review). */
const armMask = () => page.evaluate((keep) => {
  if (window.__vidMaskObs) return
  const run = () => document.querySelectorAll('tbody tr').forEach((el) => {
    if (!el.textContent.includes(keep) && !el.hasAttribute('data-vid-masked')) { el.style.filter = 'blur(14px)'; el.setAttribute('data-vid-masked', '1') }
  })
  window.__vidMaskObs = new MutationObserver(run)
  window.__vidMaskObs.observe(document.body, { childList: true, subtree: true, characterData: true })
  run()
}, MARK)
const settle = async () => { await page.waitForLoadState('networkidle').catch(() => {}); await sleep(300) }

/** Scroll the page (or the scrolling ancestor of <main>) smoothly to y. */
const scrollTo = (y, ms = 700) => page.evaluate(([y, ms]) => new Promise((res) => {
  let el = document.querySelector('main')
  while (el && !(el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement
  const sc = el || document.scrollingElement
  const from = sc.scrollTop, t0 = performance.now()
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    sc.scrollTop = from + (y - from) * e
    k < 1 ? requestAnimationFrame(step) : res()
  }
  requestAnimationFrame(step)
}), [y, ms])

/** Click a link; the page switch happens while the picture is frozen, `ready` runs before the picture resumes. */
async function goClick(loc, urlTest, ready) {
  await armMask()                        // client-side navigation keeps the observer alive
  await click(page, loc)
  await sleep(220)                       // ripple is visible in the last frozen frame
  await sess.pause()
  await page.waitForURL(urlTest, { timeout: 30000 })
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  if (ready) await ready()
  await armMask()
  await sleep(300)
  await sess.resume()
}
const goSide = (href, ready) => goClick(side(href), (u) => u.pathname === href, ready)
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
/** The decision dialog: type the reason (visible), then confirm; waits for the new state badge. */
async function typeReason(text) {
  await click(page, tid('decision-reason'))
  await typeText(page, text, 45)
}
async function confirmAndWait(stateText) {
  await click(page, tid('decision-confirm'))
  await page.locator('[data-testid=claim-status]', { hasText: stateText }).waitFor({ timeout: 30000 })
  await page.waitForLoadState('networkidle').catch(() => {})
}
async function requireOpenClaim(id) {
  const status = await tid('claim-status').innerText()
  if (status.trim() !== 'Open') throw new Error(`claim #${id} is "${status.trim()}", expected "Open" - run prepare_team.py (no SKIP_PREPARE)`)
}

// ---- login (API, no login form on screen) + warm-up (Next dev compiles pages on first visit; read-only GETs, not part of any scene) ----
await adminLogin(sess, account)
for (const p of ['/admin/claims', `/admin/claims/${CLAIM_ACCEPT}`, `/admin/claims/${CLAIM_REJECT}`, '/admin/claims?tab=matching',
  '/admin/shop-owners?q=Team+Demo', `/admin/shop-owners/${demo.claimant2_id}/edit`, SHOP_EDIT, '/admin/dashboard']) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
}

// 1 queue ------------------------------------------------------------------------------------------------------
await runScene(sess, 'queue', dur('queue'), async () => {
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.evaluate(() => window.__vidGlide && window.__vidGlide(1200, 700, 1))
  await page.mouse.move(1200, 700)
}, async (at) => {
  const a = A('queue')
  await at(lead + 0.30 * a)
  await goSide('/admin/claims', async () => {
    // only the two demo claims may be listed (anything else = other applicants' mail addresses): blur the rest
    const rows = await page.locator('tbody tr').count()
    const demoRows = await page.locator('tbody tr', { hasText: MARK }).count()
    console.log(`  claims: ${demoRows} demo row(s) of ${rows}`)
    if (demoRows < 2) throw new Error('claims: demo claims not found in the queue - run prepare_team.py')
    if (rows !== demoRows) await blurRows()
  })
  const table = page.locator('table').first()
  await at(lead + 0.52 * a)
  await moveTo(page, page.locator('select[name=status]').first(), 700)
  await highlight(page.locator('select[name=status]').first())
  await at(lead + 0.70 * a)
  await highlight(page.locator('select[name=status]').first(), false)
  await moveTo(page, tid('tab-matching'), 700)       // hover only: the matching checks list can hold real shops
  await highlight(tid('tab-matching'))
  await at(lead + 0.86 * a)
  await highlight(tid('tab-matching'), false)
  await moveTo(page, table, 800)
  await highlight(table)
  await at(lead + 0.98 * a)
  await highlight(table, false)
})

// 2 check the proof --------------------------------------------------------------------------------------------
await runScene(sess, 'check', dur('check'), null, async (at) => {
  const a = A('check')
  await at(lead + 0.02 * a)
  const link = page.locator(`a[href="/admin/claims/${CLAIM_ACCEPT}"]`).first()
  await goClick(link, (u) => u.pathname === `/admin/claims/${CLAIM_ACCEPT}`, async () => {
    await tid('claim-detail').waitFor()
    await requireOpenClaim(CLAIM_ACCEPT)
  })
  const panel = async (id, from, to) => {
    await at(lead + from * a)
    await moveTo(page, tid(id), 800)
    await highlight(tid(id))
    await at(lead + to * a)
    await highlight(tid(id), false)
  }
  await panel('panel-shop', 0.22, 0.34)
  await panel('panel-applicant', 0.36, 0.46)
  await panel('panel-proof', 0.50, 0.66)
  await scrollTo(400, 700)
  await panel('panel-documents', 0.70, 0.80)
  await scrollTo(2000, 900)
  await panel('panel-timeline', 0.84, 0.97)
})

// 3 mark as verified -------------------------------------------------------------------------------------------
await runScene(sess, 'verify', dur('verify'), async () => { await scrollTo(0, 400) }, async (at) => {
  const a = A('verify')
  await at(lead + 0.02 * a)
  await click(page, tid('action-verify'))
  await tid('claim-decision-dialog').waitFor()
  await at(lead + 0.30 * a)
  await typeReason('E-mail domain and shop data match.')
  await at(lead + 0.58 * a)
  await confirmAndWait('Checked')
  await at(lead + 0.80 * a)
  await moveTo(page, tid('claim-status'), 700)
  await highlight(tid('claim-status'))
  await at(lead + 0.95 * a)
  await highlight(tid('claim-status'), false)
})

// 4 accept -----------------------------------------------------------------------------------------------------
await runScene(sess, 'accept', dur('accept'), null, async (at) => {
  const a = A('accept')
  await at(lead + 0.02 * a)
  await click(page, tid('action-accept'))
  await tid('claim-decision-dialog').waitFor()
  await at(lead + 0.14 * a)
  await moveTo(page, tid('accept-consequences'), 800)
  await highlight(tid('accept-consequences'))
  await at(lead + 0.36 * a)
  await highlight(tid('accept-consequences'), false)
  await typeReason('Proof checked, applicant confirmed by e-mail.')
  await at(lead + 0.52 * a)
  await confirmAndWait('Accepted')
  await at(lead + 0.70 * a)
  await scrollTo(380, 700)
  await moveTo(page, tid('panel-decision'), 800)
  await highlight(tid('panel-decision'))
  await at(lead + 0.90 * a)
  await highlight(tid('panel-decision'), false)
  await scrollTo(0, 500)
})

// 5 reject -----------------------------------------------------------------------------------------------------
await runScene(sess, 'reject', dur('reject'), null, async (at) => {
  const a = A('reject')
  await at(lead + 0.02 * a)
  await goClick(page.getByRole('link', { name: 'Back to the list' }).first(), (u) => u.pathname === '/admin/claims', async () => {
    const rows = await page.locator('tbody tr').count()
    const demoRows = await page.locator('tbody tr', { hasText: MARK }).count()
    console.log(`  claims (after accept): ${demoRows} demo row(s) of ${rows}`)
    if (!demoRows) throw new Error('claims: demo claim 2 missing in the queue')
    if (rows !== demoRows) await blurRows()
  })
  await at(lead + 0.12 * a)
  const link = page.locator(`a[href="/admin/claims/${CLAIM_REJECT}"]`).first()
  await goClick(link, (u) => u.pathname === `/admin/claims/${CLAIM_REJECT}`, async () => {
    await tid('claim-detail').waitFor()
    await requireOpenClaim(CLAIM_REJECT)
  })
  await at(lead + 0.20 * a)
  await moveTo(page, tid('panel-proof'), 800)
  await highlight(tid('panel-proof'))
  await at(lead + 0.34 * a)
  await highlight(tid('panel-proof'), false)
  await scrollTo(0, 300)
  await click(page, tid('action-reject'))
  await tid('claim-decision-dialog').waitFor()
  await at(lead + 0.46 * a)
  await moveTo(page, tid('reject-code'), 700)
  await highlight(tid('reject-code'))
  await at(lead + 0.56 * a)
  await highlight(tid('reject-code'), false)
  await typeReason('E-mail domain does not match the shop; no other proof.')
  await at(lead + 0.80 * a)
  await moveTo(page, tid('notify-applicant'), 700)
  await highlight(tid('notify-applicant'))
  await at(lead + 0.92 * a)
  await highlight(tid('notify-applicant'), false)
  await confirmAndWait('Rejected')
})

// 6 shop owners ------------------------------------------------------------------------------------------------
await runScene(sess, 'owners', dur('owners'), null, async (at) => {
  const a = A('owners')
  await at(lead + 0.02 * a)
  await goSide('/admin/shop-owners', blurRows)
  await at(lead + 0.20 * a)
  await search(MARK, () => requireDemoRows('shop owners'))
  await at(lead + 0.40 * a)
  await moveTo(page, page.locator('select[name=status]').first(), 700)
  await at(lead + 0.52 * a)
  const row = page.locator('tbody tr', { hasText: 'Team Demo Claimant' }).first()
  await moveTo(page, row, 800)
  const table = page.locator('table').first()
  await highlight(table)
  await at(lead + 0.64 * a)
  await highlight(table, false)
  const edit = page.locator('tbody tr', { hasText: 'Team Demo Applicant Two' }).first().getByRole('link', { name: 'Edit' })
  await goClick(edit, (u) => /\/admin\/shop-owners\/\d+\/edit$/.test(u.pathname))
  await at(lead + 0.78 * a)
  for (const [name, f] of [['Approve', 0.82], ['Reject', 0.88], ['Suspend', 0.94]]) {
    await at(lead + f * a)
    await moveTo(page, page.getByRole('button', { name, exact: true }).first(), 500)      // hover only, never clicked
  }
})

// 7 support only (impersonation: mentioned, NOT executed) --------------------------------------------------------
await runScene(sess, 'support', dur('support'), null, async (at) => {
  const a = A('support')
  await at(lead + 0.02 * a)
  await sess.pause()
  await page.goto(`${BASE}${SHOP_EDIT}`, { waitUntil: 'domcontentloaded' })   // demo shop of the owner; hidden by the freeze
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  // recording only: the Leaflet map of the shop form renders its tiles outside the frame in the screencast (broken layout) -> hidden
  await page.addStyleTag({ content: '.leaflet-container { visibility: hidden !important }' })
  await settle()
  await page.evaluate(() => window.__vidGlide && window.__vidGlide(900, 300, 1))
  await sess.resume()
  const btn = page.getByRole('button', { name: 'Manage shop operations' })
  await at(lead + 0.18 * a)
  await moveTo(page, btn, 1000)                                                 // hover only, NEVER clicked
  await highlight(btn)
  await at(lead + 0.80 * a)
  await highlight(btn, false)
})

await unhighlightAll()
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
