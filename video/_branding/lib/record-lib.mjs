// Generic screencast recorder (Playwright + CDP). Used by video/<slug>/record.mjs.
// Records the page as timestamped JPEG frames (sharp, deviceScaleFactor 3) instead of Playwright's
// low-bitrate video; compose.py turns the frames into a constant-fps clip per scene.
import { chromium } from '../../../node_modules/playwright/index.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { assertTestInstance, assertBackendHealthy, isLockHeld, LOCK_FILE, findForeignEmails, loginForAdminToken } from './guard.mjs'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const BASE = process.env.VIDEO_BASE_URL || 'http://localhost:3500'
if (/:(3000|8000)\b/.test(BASE)) throw new Error('Port 3000/8000 is production - tests/recordings only on 3500/8500')

// Injected into every page: hides Next dev UI, shows a tap ripple, provides highlight helper.
const INIT = `
(() => {
  const css = document.createElement('style');
  css.textContent = \`
    [role=tooltip], nextjs-portal, #__next-build-watcher, [data-nextjs-toast], [data-nextjs-dev-tools-button] { display:none !important }
    .vid-ripple { position:fixed; z-index:2147483647; width:64px; height:64px; margin:-32px 0 0 -32px; border-radius:50%;
      background:rgba(212,98,42,.35); border:3px solid rgba(212,98,42,.9); pointer-events:none;
      animation:vidRipple .75s ease-out forwards }
    @keyframes vidRipple { 0%{transform:scale(.35);opacity:1} 100%{transform:scale(1.5);opacity:0} }
    .vid-highlight { outline:5px solid #D4622A !important; outline-offset:5px; border-radius:14px;
      animation:vidPulse 1.3s ease-in-out infinite }
    @keyframes vidPulse { 0%,100%{box-shadow:0 0 0 0 rgba(212,98,42,.55)} 50%{box-shadow:0 0 0 18px rgba(212,98,42,0)} }
    html { scroll-behavior:auto !important }
  \`;
  const add = () => document.head && document.head.appendChild(css);
  if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
  window.__vidRipple = (x, y) => { const d = document.createElement('div'); d.className = 'vid-ripple';
    d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 900) };
})();
`

// Desktop format only (window.__vidDesktop): fake mouse pointer (screencasts do not show the OS cursor).
// Position survives navigations via sessionStorage.
const INIT_DESKTOP = `
(() => {
  window.__vidDesktop = true;
  const css = document.createElement('style');
  css.textContent = \`.vid-cursor { position:fixed; z-index:2147483647; left:0; top:0; width:28px; height:28px; pointer-events:none;
    filter:drop-shadow(0 2px 3px rgba(0,0,0,.45)); transform:translate(var(--cx,40px),var(--cy,40px)) }\`;
  const cur = document.createElement('div'); cur.className = 'vid-cursor';
  cur.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M4 2 L4 22 L9.5 17.2 L13.2 25.5 L16.6 24 L12.9 15.9 L20.5 15.9 Z" fill="#1A1714" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const put = (x, y) => { cur.style.setProperty('--cx', x + 'px'); cur.style.setProperty('--cy', y + 'px'); window.__vidPos = [x, y];
    try { sessionStorage.setItem('__vidPos', JSON.stringify([x, y])) } catch (e) {} };
  const add = () => { document.head.appendChild(css); document.body.appendChild(cur);
    let p = [40, 40]; try { p = JSON.parse(sessionStorage.getItem('__vidPos')) || p } catch (e) {} put(p[0], p[1]) };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  window.__vidGlide = (x, y, ms) => new Promise((res) => {
    const [x0, y0] = window.__vidPos || [40, 40], t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      put(x0 + (x - x0) * e, y0 + (y - y0) * e); k < 1 ? requestAnimationFrame(step) : res() };
    requestAnimationFrame(step);
  });
})();
`

/**
 * device 'phone' (default, unchanged): 390x844 @3x, mobile + touch.  device 'desktop' (F8960): 1440x810 @2x, mouse + pointer.
 * strict: recording ONLY against the test instance 3500/8500 (checked BEFORE anything is deleted or started), no parallel
 * E2E run, per-scene privacy check (see runScene).
 */
export async function startSession({ lang, outDir, viewport = null, dsf = 0, device = 'phone', strict = false,
  backend = process.env.VIDEO_BACKEND_URL || 'http://localhost:8500' }) {
  const desktop = device === 'desktop'
  viewport = viewport || (desktop ? { width: 1440, height: 810 } : { width: 390, height: 844 })
  dsf = dsf || (desktop ? 2 : 3)
  if (strict) {
    assertTestInstance({ frontend: BASE, backend })
    if (isLockHeld(LOCK_FILE)) throw new Error(`An E2E run is active (${LOCK_FILE}); recording would be disturbed - wait for it`)
    await assertBackendHealthy(backend)
  }
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext(desktop
    ? { viewport, deviceScaleFactor: dsf, locale: lang, bypassCSP: true }
    : {
      viewport, deviceScaleFactor: dsf, isMobile: true, hasTouch: true, locale: lang, bypassCSP: true,
      geolocation: { latitude: 34.6841, longitude: 33.0379 }, permissions: ['geolocation'],
    })
  const consent = encodeURIComponent(JSON.stringify({ v: 1, necessary: true, statistics: false, marketing: false }))
  await ctx.addCookies([
    { name: 'app_lang', value: lang, url: BASE },
    { name: 'app_cookie_consent', value: consent, url: BASE },
    // F6310 language hint ("Language: English · Change") would sit at the bottom of every customer page
    { name: 'lang_hint_dismissed', value: '1', url: BASE },
  ])
  await ctx.addInitScript(INIT)
  if (desktop) await ctx.addInitScript(INIT_DESKTOP)
  // No ctx.route() here: request interception buffers every (streamed) HTML response -> ~7 s per navigation.
  // (The old Carto-tile workaround is obsolete: ShopMap loads OpenStreetMap tiles directly.)
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  const frames = []
  let n = 0
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = `frames/f${String(n++).padStart(6, '0')}.jpg`
    fs.writeFileSync(path.join(outDir, file), Buffer.from(data, 'base64'))
    frames.push({ ts: metadata.timestamp, file })
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  const castOpts = { format: 'jpeg', quality: 92, maxWidth: viewport.width * dsf, maxHeight: viewport.height * dsf, everyNthFrame: 1 }
  await cdp.send('Page.startScreencast', castOpts)
  const scenes = []
  return {
    page, ctx, browser, device, strict, backend,
    scenes,
    /** Blur list rows without the demo marker (re-apply after every navigation); masked text is skipped by the privacy check. */
    mask: (rowSelector, keepIfContains) => page.evaluate(([sel, keep]) => document.querySelectorAll(sel).forEach((el) => {
      if (!el.textContent.includes(keep)) { el.style.filter = 'blur(14px)'; el.setAttribute('data-vid-masked', '1') }
    }), [rowSelector, keepIfContains]),
    nowS: () => Date.now() / 1000,
    /** Freeze the picture (compose.py holds the last frame) e.g. while a page loads; resume() cuts to the new state. */
    pause: () => cdp.send('Page.stopScreencast').catch(() => {}),
    resume: () => cdp.send('Page.startScreencast', castOpts).catch(() => {}),
    async finish() {
      await sleep(500)
      await cdp.send('Page.stopScreencast').catch(() => {})
      fs.writeFileSync(path.join(outDir, 'frames.json'), JSON.stringify({ frames, scenes, viewport, dsf, device }, null, 1))
      await browser.close()
      return frames.length
    },
  }
}

/**
 * Strict mode: visible text/inputs (masked rows skipped) must not contain e-mails outside @pundo-e2e.io and no password
 * field may be visible. Throws (= recording aborts) instead of warning. Returns the counts for the log.
 */
export async function privacyCheck(page, allow = ['pundo-e2e.io']) {
  const { text, passwords } = await page.evaluate(() => {
    const parts = []
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const el = n.parentElement
      if (!el || el.closest('[data-vid-masked]')) continue
      const st = getComputedStyle(el)
      if (st.display === 'none' || st.visibility === 'hidden') continue
      parts.push(n.nodeValue)
    }
    const fields = [...document.querySelectorAll('input, textarea')].filter((i) => !i.closest('[data-vid-masked]'))
    for (const i of fields) if (i.type !== 'password') parts.push(i.value || '')
    const passwords = fields.filter((i) => i.type === 'password' && i.getClientRects().length > 0).length
    return { text: parts.join('\n'), passwords }
  })
  const foreign = findForeignEmails(text, allow)
  if (foreign.length) throw new Error(`Privacy abort: e-mail outside @${allow.join(', @')} visible: ${foreign.join(', ')}`)
  if (passwords) throw new Error(`Privacy abort: ${passwords} password field(s) visible`)
  return { foreign: 0, passwords: 0 }
}

/** Run one scene: `prep` untimed (navigation etc.), then `actions(at)` on a timeline of `dur` seconds. */
export async function runScene(sess, id, dur, prep, actions) {
  if (prep) await prep()
  if (sess.strict) await privacyCheck(sess.page)
  await sleep(250) // let frames settle so the scene starts on a clean frame
  const t0 = Date.now()
  const at = async (sec) => { const w = t0 + sec * 1000 - Date.now(); if (w > 0) await sleep(w) }
  const start = t0 / 1000
  if (actions) await actions(at)
  await at(dur)
  const actual = (Date.now() - t0) / 1000
  sess.scenes.push({ id, start, dur: actual, planned: dur })
  console.log(`  scene ${id}: planned ${dur.toFixed(1)}s actual ${actual.toFixed(1)}s`)
  if (sess.strict) {
    const p = await privacyCheck(sess.page)
    console.log(`  scene ${id}: privacy ok (${p.foreign} foreign emails, ${p.passwords} password fields)`)
  }
}

export async function smoothScroll(page, to, ms) {
  await page.evaluate(([to, ms]) => new Promise((res) => {
    const from = window.scrollY, t0 = performance.now()
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      window.scrollTo(0, from + (to - from) * e)
      k < 1 ? requestAnimationFrame(step) : res()
    }
    requestAnimationFrame(step)
  }), [to, ms])
}

/** Tap an element (touch) with visible ripple. */
export async function tap(page, locator) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator
  await el.scrollIntoViewIfNeeded()
  const b = await el.boundingBox()
  const x = b.x + b.width / 2, y = b.y + b.height / 2
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [x, y])
  await sleep(120)
  await page.touchscreen.tap(x, y)
}

export async function typeText(page, text, perChar = 85) {
  await page.keyboard.type(text, { delay: perChar })
}

/** Desktop: glide the fake pointer to the element, then move the real mouse there (hover states). */
export async function moveTo(page, locator, ms = 600) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator
  await el.scrollIntoViewIfNeeded()
  const b = await el.boundingBox()
  const x = b.x + b.width / 2, y = b.y + b.height / 2
  await page.evaluate(([x, y, ms]) => window.__vidGlide && window.__vidGlide(x, y, ms), [x, y, ms])
  await page.mouse.move(x, y)
  return { x, y }
}

/** Desktop: move the pointer to the element, show the click ripple, click with the mouse. */
export async function click(page, locator, ms = 600) {
  const { x, y } = await moveTo(page, locator, ms)
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [x, y])
  await sleep(120)
  await page.mouse.click(x, y)
}

/**
 * Admin session without filming a login form: POST {backend}/api/v1/admin/auth/login (test backend :8500), set the
 * admin_token cookie for the frontend and prove that :3500 really talks to :8500 (dashboard must not redirect to login).
 */
export async function adminLogin(sess, account) {
  const token = await loginForAdminToken(sess.backend, account)
  await sess.ctx.addCookies([{ name: 'admin_token', value: token, url: BASE, httpOnly: true, sameSite: 'Lax' }])
  await sess.page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'domcontentloaded' })
  await sess.page.waitForLoadState('networkidle').catch(() => {})
  if (new URL(sess.page.url()).pathname.startsWith('/admin/login')) {
    throw new Error('Admin login check failed: frontend :3500 is not using backend :8500 (dashboard redirected to /admin/login)')
  }
}
