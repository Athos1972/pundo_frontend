// Branded layer renderer (Playwright/Chromium -> PNG).  Reusable for every video under video/<slug>/.
//   node render.mjs layers <slug> <lang>   scene base layers, phone bezel, subtitle PNGs
//   node render.mjs intro  <slug> <lang>   intro frame sequence (logo animation + title card)
//   node render.mjs outro  <slug> <lang>   outro frame sequence (logo, URL, next video, end-screen area)
//   node render.mjs thumb  <slug> <lang> <phoneFrame.jpg>   YouTube thumbnail 1280x720
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '../../node_modules/playwright/index.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const videoRoot = path.resolve(here, '..')
const [cmd, slug, lang, extra] = process.argv.slice(2)
const cache = path.join(videoRoot, slug, '.cache', lang)
const tl = JSON.parse(fs.readFileSync(path.join(cache, 'timeline.json'), 'utf8'))
const B = tl.brand, C = B.colors, F = B.fonts, LY = B.layout, VW = B.video.width, VH = B.video.height
const rtl = ['ar', 'he'].includes(lang)

const b64 = (f) => fs.readFileSync(path.join(here, 'fonts', f)).toString('base64')
const fontCss = F.files.map((f) =>
  `@font-face{font-family:'${f.family}';src:url(data:font/woff2;base64,${b64(f.file)}) format('woff2');font-weight:${f.weight};font-display:block}`).join('\n')
const BASE_CSS = `
${fontCss}
:root{${Object.entries(C).map(([k, v]) => `--${k.replace(/_/g, '-')}:${v}`).join(';')}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${VW}px;height:${VH}px;overflow:hidden;background:transparent}
body{font-family:'${F.body}',${F.fallback};color:var(--text);-webkit-font-smoothing:antialiased}
.h{font-family:'${F.heading}',${F.fallback};font-weight:700;letter-spacing:-0.02em}
`
const asset = (f) => fs.readFileSync(path.join(here, 'assets', f), 'utf8')
const logoSvg = (w) => asset('logo.svg').replace(/width="\d+" height="\d+"/, `width="${w}" height="${Math.round(w * 324 / 804)}"`)
const bgCss = `background:radial-gradient(1200px 800px at 85% 10%, ${C.accent_light} 0%, transparent 60%), radial-gradient(900px 700px at 0% 100%, #EFE9E1 0%, transparent 65%), ${C.bg};`

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const html = (body, css = '', w = VW, h = VH) => `<!doctype html><html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>${BASE_CSS}
html,body{width:${w}px;height:${h}px}${css}</style></head><body>${body}</body></html>`
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// phone geometry (shared with compose.py through layers.json)
const sh = LY.phone_screen_h, sw = Math.round(sh * 390 / 844 / 2) * 2, bz = LY.phone_bezel
const sx = Math.round(LY.phone_center_x - sw / 2), sy = Math.round(LY.phone_center_y - sh / 2)
const geom = { sx, sy, sw, sh }

async function layers() {
  const dir = path.join(cache, 'layers'); fs.mkdirSync(dir, { recursive: true })
  fs.mkdirSync(path.join(dir, 'sub'), { recursive: true })
  const out = { geom, scenes: {} }
  // phone bezel (transparent hole), shared
  const R = 44, Ro = R + bz
  const bezel = `<svg width="${VW}" height="${VH}" viewBox="0 0 ${VW} ${VH}" style="position:absolute;left:0;top:0">
    <defs><filter id="sh" x="-20%" y="-10%" width="140%" height="120%"><feDropShadow dx="0" dy="22" stdDeviation="26" flood-color="#1A1714" flood-opacity=".28"/></filter></defs>
    <path fill="#1A1714" fill-rule="evenodd" d="${rrect(sx - bz, sy - bz, sw + 2 * bz, sh + 2 * bz, Ro)} ${rrect(sx, sy, sw, sh, R)}"/>
    <rect x="${sx - bz + 1.5}" y="${sy - bz + 1.5}" width="${sw + 2 * bz - 3}" height="${sh + 2 * bz - 3}" rx="${Ro}" fill="none" stroke="#4a443d" stroke-width="3"/>
  </svg>`
  await page.setContent(html(bezel)); await page.screenshot({ path: path.join(dir, 'bezel.png'), omitBackground: true })
  const shadow = `<svg width="${VW}" height="${VH}" style="position:absolute;left:0;top:0"><defs><filter id="sh" x="-20%" y="-10%" width="140%" height="120%"><feDropShadow dx="0" dy="22" stdDeviation="26" flood-color="#1A1714" flood-opacity=".28"/></filter></defs>
    <rect x="${sx - bz}" y="${sy - bz}" width="${sw + 2 * bz}" height="${sh + 2 * bz}" rx="${Ro}" fill="#1A1714" filter="url(#sh)"/></svg>`
  for (const sc of tl.scenes) {
    if (sc.branding) continue
    const co = sc.callout || ''
    const [label, title] = co.includes(' · ') ? co.split(' · ') : [null, co]
    const isUrl = /^[\w.-]+\.\w+\//.test(co)
    // 16:9: long titles get a slightly smaller size; 9:16 (Shorts): long titles must stay on <= 2 short lines above the phone
    const fs_ = LY.vertical
      ? (title.length > 26 ? 52 : title.length > 18 ? 60 : LY.callout_font_px)
      : (title.length > 30 ? 72 : title.length > 20 ? 80 : LY.callout_font_px) * (isUrl ? 0.8 : 1)
    const body = `${shadow}
      <div style="position:absolute;left:${LY.right_x}px;top:${LY.callout_y || 230}px;width:${LY.right_w}px;${LY.vertical ? 'text-align:center;' : rtl ? 'text-align:right;' : ''}">
        ${label ? `<div class="h" style="display:inline-block;background:${C.accent};color:#fff;font-size:38px;padding:10px 28px;border-radius:999px;margin-bottom:34px">${esc(label)}</div>` : '<div style="width:96px;height:10px;border-radius:5px;background:' + C.accent + ';margin:' + (LY.vertical ? '0 auto 28px' : '0 0 40px') + '"></div>'}
        <div class="h" style="font-size:${fs_}px;line-height:1.08;color:${isUrl ? C.accent_dark : C.text}">${esc(title)}</div>
      </div>
      <div style="position:absolute;left:${LY.logo_corner.x}px;top:${LY.logo_corner.y}px">${logoSvg(LY.logo_corner.w)}</div>`
    await page.setContent(html(body, `body{${bgCss}}`))
    await page.screenshot({ path: path.join(dir, `base-${sc.id}.png`) })
    // subtitles
    const subs = []
    for (let i = 0; i < sc.cues.length; i++) {
      const c = sc.cues[i]
      await page.setContent(html(`<div id="s" style="position:absolute;left:0;top:0;display:inline-block;max-width:${LY.right_w}px;background:${C.subtitle_bg};color:${C.subtitle_text};
        font-size:${LY.subtitle_font_px}px;line-height:1.3;font-weight:500;padding:16px 28px;border-radius:20px;text-align:center;text-wrap:balance">${esc(c.text)}</div>`, ''))
      const el = page.locator('#s')
      const f = `sub/${sc.id}-${i}.png`
      await el.screenshot({ path: path.join(dir, f), omitBackground: true })
      subs.push({ file: f, start: c.start, end: c.end })
    }
    out.scenes[sc.id] = { base: `base-${sc.id}.png`, subs }
  }
  fs.writeFileSync(path.join(dir, 'layers.json'), JSON.stringify(out, null, 1))
  console.log('layers:', Object.keys(out.scenes).length, 'scenes')
}
function rrect(x, y, w, h, r) {
  return `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`
}

const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : 1 - Math.pow(1 - k, 3))
const seg = (t, a, b) => ease((t - a) / (b - a))

async function sequence(name, seconds, buildHtml, update) {
  const dir = path.join(cache, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
  await page.setContent(buildHtml())
  await page.waitForTimeout(300)
  const fps = B.video.fps, n = Math.round(seconds * fps)
  for (let i = 0; i < n; i++) {
    await page.evaluate(`(${update})(${i / fps})`)
    await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.png`) })
  }
  console.log(name, n, 'frames')
}

// Shared page-side helpers injected as a string
const HELPERS = `
const ease=(k)=>k<0?0:k>1?1:1-Math.pow(1-k,3);
const seg=(t,a,b)=>ease((t-a)/(b-a));
const svgAt=(id,t)=>{const s=document.querySelector('#'+id+' svg');if(!s)return;s.pauseAnimations();s.setCurrentTime(Math.max(0,t))};
`

// Shorts (9:16): short hook card - logo draws in on top, the hook (meta.title) pops in big in the middle.
async function introVertical() {
  const title = tl.meta.title[lang]
  const svg = asset('splash-intro.svg').replace(/width="1024" height="768"/, 'width="760" height="570" style="overflow:visible"')
  const body = `<div id="logo" style="position:absolute;left:${(VW - 760) / 2}px;top:150px;width:760px;height:570px">${svg}</div>
    <div id="tt" style="position:absolute;left:70px;right:70px;top:820px;text-align:center;opacity:0">
      <div class="h" style="font-size:${title.length > 34 ? 92 : 108}px;line-height:1.05;text-wrap:balance">${esc(title)}</div>
      <div id="bar" style="height:12px;border-radius:6px;background:${C.accent};margin:48px auto 0;width:0"></div></div>`
  await sequence('intro', B.timing.intro_s, () => html(body, `body{${bgCss}}`), `(t)=>{${HELPERS}
    svgAt('logo', 0.6 + t*1.6);
    const tt=document.getElementById('tt'); const k=seg(t,0.25,0.85); tt.style.opacity=k; tt.style.transform='scale('+(0.92+0.08*k)+')';
    document.getElementById('bar').style.width=(320*seg(t,0.8,1.4))+'px';
  }`)
}

// Shorts (9:16): logo, URL and "full tutorial" hint; no end-screen slots (Shorts have none).
async function outroVertical() {
  const url = tl.meta.url[lang], nxt = tl.meta.next_video[lang]
  const dur = B.timing.outro_s
  const body = `<div id="logo" style="position:absolute;left:${(VW - 800) / 2}px;top:330px;width:800px;height:600px">${asset('splash-intro.svg').replace(/width="1024" height="768"/, 'width="800" height="600" style="overflow:visible"')}</div>
    <div id="nx" class="h" style="position:absolute;left:80px;right:80px;top:1040px;text-align:center;font-size:84px;line-height:1.1;opacity:0;text-wrap:balance">${esc(nxt)}</div>
    <div id="url" class="h" style="position:absolute;left:80px;right:80px;top:1330px;text-align:center;font-size:60px;color:${C.accent_dark};opacity:0">${esc(url)}</div>
    <div id="fade" style="position:absolute;inset:0;background:${C.bg};opacity:0"></div>`
  await sequence('outro', dur, () => html(body, `body{${bgCss}}`), `(t)=>{${HELPERS}
    svgAt('logo', 1.2 + t*1.4);
    for(const [id,a] of [['nx',0.25],['url',0.7]]){const e=document.getElementById(id);const k=seg(t,a,a+0.6);e.style.opacity=k;e.style.transform='translateY('+(30*(1-k))+'px)'}
    document.getElementById('fade').style.opacity=seg(t,${dur}-0.4,${dur});
  }`)
}

async function intro() {
  if (LY.vertical) return introVertical()
  const title = tl.meta.title[lang]
  const svg = asset('splash-intro.svg').replace(/width="1024" height="768"/, 'width="1100" height="825" style="overflow:visible"')
  const body = `<div id="logo" style="position:absolute;left:${(VW - 1100) / 2}px;top:${(VH - 825) / 2}px;width:1100px;height:825px;transform-origin:50% 50%">${svg}</div>
    <div id="tt" style="position:absolute;left:160px;right:160px;top:560px;text-align:center;opacity:0">
      <div class="h" style="font-size:${title.length > 38 ? 78 : 92}px;line-height:1.08;text-wrap:balance">${esc(title)}</div>
      <div id="bar" style="height:10px;border-radius:5px;background:${C.accent};margin:44px auto 0;width:0"></div></div>`
  await sequence('intro', B.timing.intro_s, () => html(body, `body{${bgCss}}`), `(t)=>{${HELPERS}
    svgAt('logo', t-0.35);
    const k=seg(t,2.7,3.5);
    const lg=document.getElementById('logo');
    lg.style.transform='translateY('+(-210*k)+'px) scale('+(1-0.5*k+0.012*Math.sin(t*2))+')';
    const tt=document.getElementById('tt'); tt.style.opacity=seg(t,3.2,3.9); tt.style.transform='translateY('+(30*(1-seg(t,3.2,3.9)))+'px)';
    document.getElementById('bar').style.width=(360*seg(t,3.9,4.6))+'px';
  }`)
}

async function outro() {
  if (LY.vertical) return outroVertical()
  const url = tl.meta.url[lang], nxt = tl.meta.next_video[lang]
  const slot = (x, y, w, h, r, id) => `<div id="${id}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;background:${C.surface};box-shadow:0 14px 40px rgba(26,23,20,.12);border:2px solid ${C.border};display:flex;align-items:center;justify-content:center;opacity:0">
      <div style="width:0;height:0;border-style:solid;border-width:26px 0 26px 44px;border-color:transparent transparent transparent ${C.border}"></div></div>`
  const body = `<div id="logo" style="position:absolute;left:70px;top:90px;width:720px;height:540px;transform-origin:0 0;transform:scale(.0)">${asset('splash-intro.svg').replace(/width="1024" height="768"/, 'width="720" height="540" style="overflow:visible"')}</div>
    <div id="out" style="position:absolute;left:70px;top:90px;width:720px;height:540px;display:none">${asset('splash-outro.svg').replace(/width="1024" height="768"/, 'width="720" height="540" style="overflow:visible"')}</div>
    <div id="url" class="h" style="position:absolute;left:110px;right:${VW - 940}px;top:600px;font-size:68px;color:${C.accent_dark};opacity:0">${esc(url)}</div>
    <div id="nx" style="position:absolute;left:110px;right:${VW - 940}px;top:720px;font-size:44px;line-height:1.25;font-weight:500;opacity:0;text-wrap:balance">${esc(nxt)}<span style="color:${C.accent}"> ${rtl ? '←' : '→'}</span></div>
    ${slot(1010, 150, 800, 450, 28, 's1')}${slot(1010, 650, 360, 250, 24, 's2')}${slot(1450, 650, 360, 250, 24, 's3')}
    <div id="fade" style="position:absolute;inset:0;background:${C.bg};opacity:0"></div>`
  const dur = B.timing.outro_s
  await sequence('outro', dur, () => html(body, `body{${bgCss}}`), `(t)=>{${HELPERS}
    const lg=document.getElementById('logo'), o=document.getElementById('out');
    // logo animates in (intro splash), stays; slides out (outro splash) in the last 1.4 s
    const outStart=${dur}-1.5;
    if(t<outStart){lg.style.transform='scale(.95)';lg.style.display='block';o.style.display='none';svgAt('logo',t-0.2)}
    else{lg.style.display='none';o.style.display='block';o.style.transform='scale(.95)';o.style.transformOrigin='0 0';svgAt('out',t-outStart)}
    for(const [id,a] of [['url',0.9],['nx',1.4],['s1',1.8],['s2',2.1],['s3',2.3]]){const e=document.getElementById(id);const k=seg(t,a,a+0.7);e.style.opacity=k;e.style.transform='translateY('+(24*(1-k))+'px)'}
    document.getElementById('fade').style.opacity=seg(t,${dur}-0.5,${dur});
  }`)
}

async function thumb() {
  const phone = 'data:image/jpeg;base64,' + fs.readFileSync(path.resolve(extra)).toString('base64')
  const title = tl.meta.title[lang]
  const W = 1280, H = 720
  const body = `<div style="position:absolute;inset:0;${bgCss.replace('1200px 800px', '900px 600px')}"></div>
    <div style="position:absolute;left:70px;top:56px">${logoSvg(250)}</div>
    <div class="h" style="position:absolute;left:70px;top:190px;width:700px;font-size:${title.length > 40 ? 76 : 90}px;line-height:1.05;text-wrap:balance;color:${C.text}">${esc(title)}</div>
    <div class="h" style="position:absolute;left:70px;bottom:70px;background:${C.accent};color:#fff;font-size:44px;padding:14px 40px;border-radius:999px">${lang === 'el' ? 'Δωρεάν' : 'Free'} · ≤ 5 min</div>
    <div style="position:absolute;left:860px;top:70px;width:330px;height:716px;border-radius:52px;background:#1A1714;padding:14px;transform:rotate(5deg);box-shadow:0 30px 60px rgba(26,23,20,.35)">
      <img src="${phone}" style="width:100%;height:100%;object-fit:cover;object-position:top;border-radius:40px;display:block"></div>`
  await page.setContent(html(body, `body{overflow:hidden}`, W, H)); await page.setViewportSize({ width: W, height: H })
  await page.waitForTimeout(400)
  const outDir = path.join(videoRoot, slug, 'out'); fs.mkdirSync(outDir, { recursive: true })
  await page.screenshot({ path: path.join(outDir, `thumbnail.${lang}.png`) })
  console.log('thumbnail written')
}

try { await { layers, intro, outro, thumb }[cmd]() } finally { await browser.close() }
