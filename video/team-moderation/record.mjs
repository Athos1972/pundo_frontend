// Recorder for team video 6 "Moderation: reviews and social links" (F8960, topic moderation).  Usage: node record.mjs en
// Same rules as ../team-catalog-basics/record.mjs: STRICT mode (only test instance frontend :3500 / backend :8500, no parallel E2E run,
// privacy check per scene: e-mail outside @pundo-e2e.io or visible password field = abort), admin login via API, demo data from
// ../team-common/prepare_team.py (marker "Team Demo").
// Privacy (BB 2026-10-20): real reviews, authors, reporters, shop names and real rule hosts are never readable.
//   - /admin/reviews (every tab): every <article> without "Team Demo" is blurred (author, text, reports, reply of a real review);
//   - /admin/social-link-rules: every <tbody tr> without "team-demo" (except the empty-state row) is blurred (real hosts: tens of thousands of rows);
//   - the audit log is demo-only (the IP column is checked: only loopback or empty, otherwise abort).
//   All of it is an init script (MutationObserver + 25 ms sweep, before the first paint of every page load, also across client navigations).
// What is DECIDED here (test DB only): the demo review of "Team Demo Reviewer" is hidden and restored again (prepare_team.py resets it, incl. the audit
// log); the social-link rule team-demo-blocked.com is created through the form (prepare_team.py deletes it on the next run). A rule is NEVER deleted by the
// video ("Delete" is only hovered). Hiding / restoring sends no e-mail (ingestor/api/admin/customer_reviews.py).
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
const RULE_HOST = 'team-demo-blocked.com'
const RULE_NOTE = 'Team Demo: example rule for the video'

// guard FIRST (before the DB is touched by prepare_team.py): frontend :3500, backend :8500 answering /health
const BACKEND = process.env.VIDEO_BACKEND_URL || 'http://localhost:8500'
assertTestInstance({ frontend: BASE, backend: BACKEND })
await assertBackendHealthy(BACKEND)

// ---- test-DB preparation (pundo_test only; the script refuses everything else) ----
let demo
{
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const args = [path.join(here, '../team-common/prepare_team.py')]
  if (process.env.SKIP_PREPARE === '1') args.push('--dry-run')
  const out = execFileSync(path.join(backend, '.venv/bin/python'), args, { cwd: backend, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-1).slice(0, 120))
  demo = JSON.parse(out.at(-1))
}
const REVIEW_ID = demo.review.id
const AUDIT_PATH = `/admin/reviews/${REVIEW_ID}/audit-log`
const scenesYml = fs.readFileSync(path.join(here, 'scenes.yml'), 'utf8')
if (!scenesYml.includes(`localhost:3500${AUDIT_PATH}"`)) throw new Error(`scenes.yml window_path does not contain ${AUDIT_PATH} - update it`)

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

// init script: blur real review cards / real rule rows before they are ever painted
await sess.ctx.addInitScript((keep) => {
  const run = () => {
    const p = location.pathname.replace(/\/$/, '')
    const blur = (el) => { if (!el.hasAttribute('data-vid-masked')) { el.style.filter = 'blur(14px)'; el.setAttribute('data-vid-masked', '1') } }
    if (p === '/admin/reviews') document.querySelectorAll('article').forEach((el) => { if (!el.textContent.includes(keep)) blur(el) })
    if (p === '/admin/social-link-rules') {
      document.querySelectorAll('tbody tr').forEach((el) => {
        if (el.querySelector('td[colspan]')) return                       // empty-state row ("No items")
        if (!el.textContent.toLowerCase().includes('team-demo')) blur(el)
      })
    }
  }
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
const demoCard = () => page.locator('article', { hasText: MARK }).first()
const ruleRow = () => page.locator('tbody tr', { hasText: RULE_HOST }).first()

/** Click, freeze the picture and wait for the target page; the NEXT scene resumes (arrive) - so this scene never shows the new page. */
async function leave(loc, urlTest) {
  // freeze BEFORE the real click (a fast navigation would otherwise leak 1-2 frames of the next page into this scene)
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
const requireDemoCard = async (what) => {
  const n = await page.locator('article', { hasText: MARK }).count()
  const all = await page.locator('article').count()
  console.log(`  ${what}: ${n} demo card(s) of ${all}`)
  if (n < 1) throw new Error(`${what}: demo review not found - run prepare_team.py`)
}
const confirmBtn = () => page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true })

// ---- login (API, no login form on screen) + warm-up (Next dev compiles pages on first visit; read-only GETs, not part of any scene) ----
await adminLogin(sess, account)
for (const p of ['/admin/reviews', '/admin/reviews?filter=owner_reported', '/admin/reviews?filter=hidden', AUDIT_PATH,
  '/admin/social-link-rules', '/admin/social-link-rules?q=team-demo', '/admin/social-link-rules/new']) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await settle()
}
// the demo review must be in its initial state (prepare_team.py: visible, reported); same for the rule (must not exist yet)
await visit('/admin/reviews', () => requireDemoCard('reported queue'))
if (await demoCard().getByText('Hidden', { exact: true }).count()) throw new Error('demo review is already hidden - run prepare_team.py')
await visit('/admin/social-link-rules?q=team-demo')
if (await ruleRow().count()) throw new Error('demo rule already exists - run prepare_team.py')

// 1 queue: tab "Reported" = the queue, reports of shop owners have their own tab ----------------------------------------------
await runScene(sess, 'queue', dur('queue'), () => visit('/admin/reviews', () => requireDemoCard('queue')), async (at) => {
  const nav = page.locator('nav[aria-label]').first()
  const reported = page.getByRole('link', { name: 'Reported', exact: true })
  const ownerTab = page.getByRole('link', { name: 'Reported by shop owner', exact: true })
  await at(lead + 0.2)
  await moveTo(page, demoCard(), 900)
  await at(when('queue', 'Customers'))
  await moveTo(page, reported, 800)
  await highlight(reported)
  await at(when('queue', 'A report'))
  await highlight(reported, false)
  const reports = demoCard().locator('ul').first()
  await moveTo(page, reports, 800)
  await highlight(reports)
  await at(when('queue', 'Reports from'))
  await highlight(reports, false)
  await moveTo(page, ownerTab, 800)
  await highlight(ownerTab)
  await at(dur('queue') - 0.5)
  await highlight(ownerTab, false)
  void nav
})

// 2 hide: reason, "Hide review", confirm -> badge "Hidden" --------------------------------------------------------------------
await runScene(sess, 'hide', dur('hide'), async () => { await sleep(300) }, async (at) => {
  const card = demoCard()
  const select = card.locator('select').first()
  const hideBtn = card.getByRole('button', { name: 'Hide review', exact: true })
  await at(lead + 0.2)
  await moveTo(page, card, 800)
  await highlight(card)
  await at(when('hide', 'Then'))
  await highlight(card, false)
  await at(when('hide', 'If so'))
  await moveTo(page, select, 800)
  await highlight(select)
  await at(when('hide', 'click') - 0.2)
  await highlight(select, false)
  await moveTo(page, hideBtn, 700)
  await highlight(hideBtn)
  await at(when('hide', 'click') + 0.9)
  await highlight(hideBtn, false)
  await click(page, hideBtn)                       // opens the confirm dialog
  await page.getByRole('dialog').waitFor({ timeout: 10000 })
  await at(when('hide', 'Confirm') + 1.4)
  await click(page, confirmBtn())                  // POST /api/admin/reviews/{id}/invalidate (reason "spam")
  await card.getByText('Hidden', { exact: true }).first().waitFor({ timeout: 20000 })
  await at(when('hide', 'Hiding') + 0.6)
  const badge = card.getByText('Hidden', { exact: true }).first()
  await moveTo(page, badge, 700)
  await highlight(badge)
  await at(when('hide', 'If you'))
  await highlight(badge, false)
})

// 3 hidden: tab "Hidden", "Restore review", confirm; then hover "Audit log" and click (frozen) ---------------------------------
await runScene(sess, 'hidden', dur('hidden'), async () => {
  await visit('/admin/reviews?filter=hidden', () => requireDemoCard('hidden tab'))
  await sleep(300)
  await sess.resume()                                    // the previous scene ended without freeze; harmless, picture is on
  await sleep(300)
}, async (at) => {
  const card = demoCard()
  const hiddenTab = page.getByRole('link', { name: 'Hidden', exact: true })
  const restoreBtn = card.getByRole('button', { name: 'Restore review', exact: true })
  await at(lead + 0.2)
  await moveTo(page, hiddenTab, 700)
  await highlight(hiddenTab)
  await at(when('hidden', 'If'))
  await highlight(hiddenTab, false)
  await moveTo(page, restoreBtn, 700)
  await highlight(restoreBtn)
  await at(when('hidden', 'click') + 0.9)
  await highlight(restoreBtn, false)
  await click(page, restoreBtn)
  await page.getByRole('dialog').waitFor({ timeout: 10000 })
  await at(when('hidden', 'and') + 0.5)
  await click(page, confirmBtn())                  // POST /api/admin/reviews/{id}/restore
  await card.getByRole('button', { name: 'Hide review', exact: true }).waitFor({ timeout: 20000 })
  await at(dur('hidden') - 1.7)
  const audit = card.locator(`a[href="${AUDIT_PATH}"]`)
  await moveTo(page, audit, 600)
  await highlight(audit)
  await at(dur('hidden') - 0.6)
  await highlight(audit, false)
  await leave(audit, (u) => u.pathname === AUDIT_PATH)
})

// 4 audit: the log of the demo review; then the sidebar entry "Social-Link Rules" (frozen) -----------------------------------
await runScene(sess, 'audit', dur('audit'), () => arrive(async () => {
  const rows = await page.locator('tbody tr').count()
  if (rows < 5) throw new Error(`audit log has ${rows} rows, expected created + 2x reported + hidden + restored`)
  const ips = await page.locator('tbody td.font-mono').allInnerTexts()
  for (const ip of ips) if (!/^(—|127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(ip.trim())) throw new Error(`audit log shows a non-loopback IP: ${ip}`)
}), async (at) => {
  const table = page.locator('table').first()
  await at(lead + 0.2)
  await moveTo(page, table, 900)
  await highlight(table)
  await at(when('audit', 'Check'))
  await highlight(table, false)
  const reasonRow = page.locator('tbody tr', { hasText: 'Hidden' }).first()
  await moveTo(page, reasonRow, 700)
  await highlight(reasonRow)
  await at(when('audit', 'Next'))
  await highlight(reasonRow, false)
  const nav = side('/admin/social-link-rules')
  await moveTo(page, nav, 700)
  await highlight(nav)
  await at(dur('audit') - 0.9)
  await highlight(nav, false)
  await leave(nav, (u) => u.pathname === '/admin/social-link-rules')
})

// 5 rules: list (all real rows blurred), search the demo host (no hit), "Add rule" -------------------------------------------------
await runScene(sess, 'rules', dur('rules'), () => arrive(() => page.locator('tbody tr').first().waitFor({ timeout: 30000 })), async (at) => {
  const table = page.locator('table').first()
  await at(lead + 0.2)
  await moveTo(page, table, 900)
  await highlight(table)
  await at(when('rules', 'Most'))
  await highlight(table, false)
  const th = page.locator('thead th', { hasText: 'Source' }).first()
  await moveTo(page, th, 700)
  await highlight(th)
  await at(when('rules', 'Search'))
  await highlight(th, false)
  await search('team-demo', async () => { if (await ruleRow().count()) throw new Error('demo rule found before it was created') })
  const add = page.locator('a[href="/admin/social-link-rules/new"]').first()
  await at(when('rules', 'If'))
  await moveTo(page, add, 800)
  await highlight(add)
  await at(dur('rules') - 0.9)
  await highlight(add, false)
  await leave(add, (u) => u.pathname === '/admin/social-link-rules/new')
})

// 6 newrule: domain, category, note, "Add rule" ----------------------------------------------------------------------------------
await runScene(sess, 'newrule', dur('newrule'), () => arrive(async () => { await page.locator('#slr-host').waitFor() }), async (at) => {
  const host = page.locator('#slr-host'), cat = page.locator('#slr-category'), note = page.locator('#slr-note')
  const submit = page.locator('form button[type=submit]').first()
  await at(lead + 0.2)
  await moveTo(page, host, 700)
  await at(when('newrule', 'Type') + 0.2)
  await click(page, host)
  await typeText(page, RULE_HOST, 55)
  await at(when('newrule', 'The'))
  await highlight(host)
  await at(when('newrule', 'Choose'))
  await highlight(host, false)
  await moveTo(page, cat, 700)
  await highlight(cat)
  await sleep(500)
  await cat.selectOption('gambling')
  await at(when('newrule', 'Choose') + 2.2)
  await highlight(cat, false)
  await click(page, note)
  await typeText(page, RULE_NOTE, 35)
  await at(when('newrule', 'Then'))
  await moveTo(page, submit, 700)
  await highlight(submit)
  await at(dur('newrule') - 1.2)
  await highlight(submit, false)
  await leave(submit, (u) => u.pathname === '/admin/social-link-rules')       // POST /api/admin/social-link-rules
})

// 7 result: the new rule heads the list (source Admin), "Delete" only hovered --------------------------------------------------
await runScene(sess, 'result', dur('result'), () => arrive(async () => {
  await ruleRow().waitFor({ timeout: 30000 })
  const txt = await ruleRow().innerText()
  if (!/Admin/.test(txt)) throw new Error(`demo rule row does not show source Admin: ${txt}`)
}), async (at) => {
  await at(lead + 0.2)
  await moveTo(page, ruleRow(), 800)
  await highlight(ruleRow())
  await at(when('result', 'Be'))
  await highlight(ruleRow(), false)
  await at(when('result', 'Only'))
  const del = ruleRow().getByRole('button', { name: 'Delete', exact: true })
  await moveTo(page, del, 700)                          // hover only: NOTHING is deleted by the video
  await highlight(del)
  await at(when('result', 'Link'))
  await highlight(del, false)
})

await unhighlightAll()
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
