#!/usr/bin/env node
/**
 * E2E-Coverage: Abdeckung von src/** durch die Playwright-E2E-Tests, getrennt nach Browser und Server, plus die
 * kombinierte Abdeckung mit Vitest. Doku: docs/e2e-testing.md, Abschnitt "Coverage".
 *
 *   node scripts/e2e-coverage.mjs [run] [playwright-args...]   Playwright mit E2E_COVERAGE=1 starten, danach Report
 *   node scripts/e2e-coverage.mjs report                       nur den Report aus den Rohdaten neu bauen
 *
 * Umgebung:
 *   E2E_COVERAGE_DIR        Ausgabeordner (Default coverage-e2e/, gitignored). Darin: client-raw/, server-raw/ (Rohdaten),
 *                           client/ + server/ (HTML je Seite), vitest/ (Vitest-JSON), summary.md, summary.json.
 *   E2E_COVERAGE_VITEST     run (Default: Vitest mit Coverage laufen lassen) | reuse (vorhandenes vitest/coverage-final.json) | skip
 *   E2E_COVERAGE_KEEP_RAW   0 = Rohdaten nach dem Report loeschen (Default 1; die Nightly setzt 0)
 *
 * Die Rohdaten entstehen NUR im Coverage-Modus (E2E_COVERAGE=1 npx playwright test):
 *   Browser  e2e/coverage/client-collector.ts  -> client-raw/*.json.gz (V8-Coverage je Seite, Chunks aus /_next/static)
 *   Server   NODE_V8_COVERAGE am Standalone-Server (.next-cov, scripts/e2e-frontend.cjs) -> server-raw/coverage-*.json
 * Beide werden ueber die Source-Maps des Coverage-Builds auf src/ zurueckgefuehrt (monocart-coverage-reports).
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import zlib from 'node:zlib'
import { CoverageReport } from 'monocart-coverage-reports'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const COV_DIR = path.resolve(REPO, process.env.E2E_COVERAGE_DIR ?? 'coverage-e2e')
const STATIC_DIR = path.join(REPO, '.next-cov/standalone/.next-cov/static')
const SERVER_MARK = '/.next-cov/standalone/.next-cov/server/'
const log = (...a) => console.log('[e2e-coverage]', ...a)

// ── Quellpfade ──────────────────────────────────────────────────────────────────────────────────────────────────

/** Beliebiger Pfad aus Source-Map/Report -> `src/...` oder null (node_modules, Next-Runtime u.a. zaehlen nicht). */
export function toSrcPath(p) {
  if (!p || p.includes('node_modules')) return null
  const m = /(?:^|\/)(src\/[^?]+)$/.exec(p.replace(/\\/g, '/'))
  return m ? m[1] : null
}

/** Bereich einer Datei (wie Vitest-Auswertung nach Verzeichnis): app/(customer), components/map, lib, ... */
export function areaOf(srcPath) {
  const seg = srcPath.replace(/^src\//, '').split('/')
  if (seg[0] === 'app') {
    // Routengruppen (app/(customer) ...), api, crm; Metadaten-Routen (sitemap-*.xml, llms.txt ...) und Wurzeldateien zusammen.
    if (seg.length > 2 && (seg[1].startsWith('(') || ['api', 'crm'].includes(seg[1]))) return `app/${seg[1]}`
    return 'app (Wurzel, Metadaten-Routen)'
  }
  if (seg[0] === 'components') return seg.length > 2 ? `components/${seg[1]}` : 'components (Wurzel)'
  if (seg.length === 1) return `src/${seg[0]}`
  return seg[0]
}

// ── Zeilen/Funktionen je Datei aus den beiden Werkzeugen ────────────────────────────────────────────────────────

/**
 * Vitest (Istanbul, coverage-final.json) -> { 'src/x.ts': { lines: Map<Zeile, abgedeckt>, fns: Map<Startzeile, abgedeckt>, fnAlt } }.
 * Eine Zeile zaehlt, wenn dort ein Statement beginnt; sie ist abgedeckt, wenn eines davon Treffer hat. Diese Menge
 * ist der Nenner fuer alle Spalten (Vitest rechnet exakt wie nativ, E2E wird an denselben Zeilen gemessen).
 * `fnAlt`: Startzeile des Funktionskoerpers, falls sie von der Zeile des Namens abweicht.
 */
export function istanbulToLines(data) {
  const out = {}
  for (const [file, cov] of Object.entries(data)) {
    const src = toSrcPath(cov.path ?? file) ?? toSrcPath(file)
    if (!src) continue
    const rec = (out[src] ??= { lines: new Map(), fns: new Map(), fnAlt: new Map() })
    for (const [id, loc] of Object.entries(cov.statementMap ?? {})) {
      const hit = (cov.s?.[id] ?? 0) > 0
      rec.lines.set(loc.start.line, (rec.lines.get(loc.start.line) ?? false) || hit)
    }
    for (const [id, fn] of Object.entries(cov.fnMap ?? {})) {
      const line = (fn.decl ?? fn.loc).start.line
      const hit = (cov.f?.[id] ?? 0) > 0
      rec.fns.set(line, (rec.fns.get(line) ?? false) || hit)
      if (fn.loc?.start.line !== line) rec.fnAlt.set(line, fn.loc.start.line)
    }
  }
  return out
}

/**
 * monocart (`coverage-report.json`, Report v8-json) -> { 'src/x.ts': { lines, fns } } in derselben Form.
 * `data.lines` kennt nur Codezeilen (ohne leere/Kommentarzeilen): Zahl > 0 oder "a/b" (Zeile teilweise ausgefuehrt, a > 0).
 * `data.functions` hat Offsets im Original-Quelltext; Schluessel ist die Startzeile.
 */
export function monocartToLines(report) {
  const out = {}
  for (const file of report.files ?? []) {
    const src = toSrcPath(file.sourcePath)
    if (!src || !file.data) continue
    const rec = (out[src] ??= { lines: new Map(), fns: new Map(), fnAlt: new Map() })
    for (const [line, count] of Object.entries(file.data.lines ?? {})) {
      const n = typeof count === 'string' ? Number.parseInt(count, 10) : count
      rec.lines.set(Number(line), n > 0 || rec.lines.get(Number(line)) === true)
    }
    const source = file.source ?? ''
    const lineStarts = [0]
    for (let i = source.indexOf('\n'); i !== -1; i = source.indexOf('\n', i + 1)) lineStarts.push(i + 1)
    const lineOf = (offset) => {
      let lo = 0, hi = lineStarts.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (lineStarts[mid] <= offset) lo = mid; else hi = mid - 1
      }
      return lo + 1
    }
    for (const fn of file.data.functions ?? []) {
      const line = lineOf(fn.start)
      rec.fns.set(line, (rec.fns.get(line) ?? false) || fn.count > 0)
    }
  }
  return out
}

/** Native Vitest-Summen (wie die Vitest-Konsole): Statements/Branches/Funktionen/Zeilen je Bereich. */
function vitestNative(data) {
  const areas = {}
  const bump = (area, key, total, covered) => {
    const a = (areas[area] ??= { s: [0, 0], b: [0, 0], f: [0, 0] })
    a[key][0] += total
    a[key][1] += covered
  }
  for (const [file, cov] of Object.entries(data)) {
    const src = toSrcPath(cov.path ?? file)
    if (!src) continue
    for (const area of [areaOf(src), 'src gesamt']) {
      const sv = Object.values(cov.s ?? {})
      bump(area, 's', sv.length, sv.filter(n => n > 0).length)
      const fv = Object.values(cov.f ?? {})
      bump(area, 'f', fv.length, fv.filter(n => n > 0).length)
      const bv = Object.values(cov.b ?? {}).flat()
      bump(area, 'b', bv.length, bv.filter(n => n > 0).length)
    }
  }
  return areas
}

// ── Rohdaten laden ──────────────────────────────────────────────────────────────────────────────────────────────

function readFileOrNull(file) {
  try { return fs.readFileSync(file, 'utf8') } catch { return null }
}

/** Browser: Eintraege {url, source, functions} mit Quelltext aus dem Coverage-Build; die Source-Maps loest monocart. */
function* clientBatches(dir, batchFiles = 25) {
  const rawDir = path.join(dir, 'client-raw')
  if (!fs.existsSync(rawDir)) return
  const sources = new Map()
  const sourceOf = (url) => {
    if (!sources.has(url)) {
      const rel = decodeURIComponent(new URL(url).pathname).replace(/^\/_next\/static\//, '')
      sources.set(url, readFileOrNull(path.join(STATIC_DIR, rel)))
    }
    return sources.get(url)
  }
  const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.json.gz')).sort()
  for (let i = 0; i < files.length; i += batchFiles) {
    const list = []
    for (const f of files.slice(i, i + batchFiles)) {
      const entries = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(rawDir, f))).toString('utf8'))
      for (const e of entries) {
        const source = sourceOf(e.url)
        if (source !== null) list.push({ url: e.url, source, functions: e.functions })
      }
    }
    if (list.length) yield list
  }
}

/** Server: NODE_V8_COVERAGE-Dumps; nur Chunks des Coverage-Builds, Quelltext von Platte, Source-Map per sourceMappingURL. */
function* serverBatches(dir) {
  const rawDir = path.join(dir, 'server-raw')
  if (!fs.existsSync(rawDir)) return
  for (const f of fs.readdirSync(rawDir).filter(n => n.startsWith('coverage-') && n.endsWith('.json'))) {
    const json = JSON.parse(fs.readFileSync(path.join(rawDir, f), 'utf8'))
    const list = []
    for (const e of json.result ?? []) {
      if (!e.url?.startsWith('file:') || !e.url.includes(SERVER_MARK) || !e.url.endsWith('.js')) continue
      const source = readFileOrNull(decodeURIComponent(new URL(e.url).pathname))
      if (source !== null) list.push({ url: e.url, source, functions: e.functions })
    }
    if (list.length) yield list
  }
}

// ── monocart je Seite (Browser / Server) ────────────────────────────────────────────────────────────────────────

async function buildSide(name, outDir, batches) {
  const mcr = new CoverageReport({
    name,
    outputDir: outDir,
    reports: ['v8', 'v8-json'],        // v8 = HTML zum Durchklicken, json = Istanbul (coverage-final.json) fuer die Zeilenrechnung
    logging: 'warn',
    cleanCache: true,
    // Turbopack-Source-Maps der Browser-Chunks liegen auf Platte (der Server laeuft beim Report nicht mehr).
    sourceMapResolver: async (url, defaultResolver) => {
      const u = new URL(url, 'http://x')
      if (u.protocol === 'http:' && u.pathname.startsWith('/_next/static/')) {
        const file = path.join(STATIC_DIR, decodeURIComponent(u.pathname).replace(/^\/_next\/static\//, ''))
        const text = readFileOrNull(file)
        if (text !== null) return text
      }
      return defaultResolver(url)
    },
    sourcePath: (p) => {
      const m = /^\[project\]\/(.*)$/.exec(p)
      return m ? m[1] : p
    },
    sourceFilter: (p) => toSrcPath(p) !== null,
  })
  let n = 0
  for (const list of batches) {
    await mcr.add(list)
    n += list.length
  }
  if (n === 0) return null
  await mcr.generate()
  const reportFile = path.join(outDir, 'coverage-report.json')
  const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {}
  return { entries: n, lines: monocartToLines(report) }
}

// ── Vitest ──────────────────────────────────────────────────────────────────────────────────────────────────────

function runVitest(dir) {
  const out = path.join(dir, 'vitest')
  log('Vitest mit Coverage (v8) ...')
  const args = [
    'vitest', 'run', '--coverage.enabled=true', '--coverage.provider=v8', '--coverage.reporter=json',
    `--coverage.reportsDirectory=${out}`, '--coverage.reportOnFailure=true',
    '--coverage.include=src/**/*.{ts,tsx}',
    '--coverage.exclude=src/tests/**', '--coverage.exclude=**/*.d.ts', '--coverage.exclude=**/*.test.*',
  ]
  const r = spawnSync('npx', args, { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'vitest.log'), `${r.stdout ?? ''}\n${r.stderr ?? ''}`)
  const tail = (r.stdout ?? '').split('\n').filter(l => /Tests |Test Files /.test(l)).join(' | ')
  log(`Vitest rc=${r.status}${tail ? ` (${tail.replace(/\s+/g, ' ')})` : ''}`)
  return { rc: r.status, summary: tail }
}

function loadVitest(dir) {
  const mode = process.env.E2E_COVERAGE_VITEST ?? 'run'
  if (mode === 'skip') return null
  let info = { rc: null, summary: 'vorhandener Report' }
  if (mode === 'run') info = runVitest(dir)
  const file = path.join(dir, 'vitest', 'coverage-final.json')
  if (!fs.existsSync(file)) {
    log(`Kein Vitest-Report (${path.relative(REPO, file)}); kombinierte Zahlen entfallen.`)
    return null
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  return { info, data, lines: istanbulToLines(data), native: vitestNative(data) }
}

// ── Aggregation ─────────────────────────────────────────────────────────────────────────────────────────────────

const pct = (c, t) => (t === 0 ? '-' : `${((100 * c) / t).toFixed(1)}%`)

/**
 * Je Bereich: Zeilen/Funktionen und wie viele davon Browser, Server, beide zusammen (E2E), Vitest und alle zusammen
 * abdecken. Nenner mit Vitest = dessen Statement-Zeilen bzw. Funktionen (auch nicht geladene Dateien, dank coverage.include,
 * mit 0 %); ohne Vitest = die Codezeilen/Funktionen, die der Coverage-Build kennt (dann ohne Vitest-/Kombiniert-Spalten).
 */
export function aggregate({ client, server, vitest }) {
  const e2eSides = [client?.lines, server?.lines]
  const files = new Set(vitest ? Object.keys(vitest.lines) : e2eSides.flatMap(s => Object.keys(s ?? {})))
  const empty = () => ({ total: 0, client: 0, server: 0, e2e: 0, vitest: 0, combined: 0 })
  const areas = {}
  const perFile = {}
  for (const file of [...files].sort()) {
    const area = areaOf(file)
    const row = { area }
    for (const metric of ['lines', 'fns']) {
      const v = vitest?.lines[file]
      const keys = new Set(v ? v[metric].keys() : e2eSides.flatMap(s => [...(s?.[file]?.[metric]?.keys() ?? [])]))
      const hit = (rec, k) => rec != null && (rec[metric].get(k) === true
        || (metric === 'fns' && v?.fnAlt.has(k) && rec.fns.get(v.fnAlt.get(k)) === true))
      const r = empty()
      for (const k of keys) {
        const c = hit(client?.lines[file], k), s = hit(server?.lines[file], k), t = v ? v[metric].get(k) === true : false
        r.total += 1
        r.client += c ? 1 : 0
        r.server += s ? 1 : 0
        r.e2e += c || s ? 1 : 0
        r.vitest += t ? 1 : 0
        r.combined += c || s || t ? 1 : 0
      }
      row[metric] = r
    }
    perFile[file] = row
    for (const key of [area, 'src gesamt']) {
      const a = (areas[key] ??= { files: 0, lines: empty(), fns: empty() })
      a.files += 1
      for (const metric of ['lines', 'fns']) for (const k of Object.keys(a[metric])) a[metric][k] += row[metric][k]
    }
  }
  return { areas, perFile }
}

function areaOrder(names) {
  const rank = (n) => (n === 'src gesamt' ? 9 : n.startsWith('app/') || n.startsWith('app (') ? 0 : n.startsWith('components') ? 1 : n === 'lib' ? 2 : 3)
  return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

function table(areas, metric, haveVitest) {
  const head = ['Bereich', 'Dateien', metric === 'lines' ? 'Zeilen' : 'Funktionen', 'Browser', 'Server', 'E2E gesamt', ...(haveVitest ? ['Vitest', 'Kombiniert'] : [])]
  const rows = [head, head.map(() => '---')]
  for (const name of areaOrder(Object.keys(areas))) {
    const a = areas[name]
    const m = a[metric]
    rows.push([name === 'src gesamt' ? '**src gesamt**' : name, String(a.files), String(m.total),
      pct(m.client, m.total), pct(m.server, m.total), pct(m.e2e, m.total), ...(haveVitest ? [pct(m.vitest, m.total), pct(m.combined, m.total)] : [])])
  }
  return rows.map(r => `| ${r.join(' | ')} |`).join('\n')
}

function nativeTable(native) {
  const rows = [['Bereich', 'Statements', 'Branches', 'Funktionen'], ['---', '---', '---', '---']]
  for (const name of areaOrder(Object.keys(native))) {
    const a = native[name]
    rows.push([name === 'src gesamt' ? '**src gesamt**' : name, pct(a.s[1], a.s[0]), pct(a.b[1], a.b[0]), pct(a.f[1], a.f[0])])
  }
  return rows.map(r => `| ${r.join(' | ')} |`).join('\n')
}

function gitInfo() {
  const sh = (args) => spawnSync('git', args, { cwd: REPO, encoding: 'utf8' }).stdout?.trim() ?? ''
  return { commit: sh(['rev-parse', '--short', 'HEAD']), dirty: sh(['status', '--porcelain', '--untracked-files=no']).split('\n').filter(Boolean).length }
}

// ── Report ──────────────────────────────────────────────────────────────────────────────────────────────────────

export async function buildReport(dir = COV_DIR, meta = {}) {
  fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(path.join(dir, 'client-raw')) && !fs.existsSync(path.join(dir, 'server-raw'))) {
    throw new Error(`Keine Rohdaten in ${dir}. Erst: node scripts/e2e-coverage.mjs run (oder E2E_COVERAGE=1 npx playwright test).`)
  }
  const t0 = Date.now()
  log('Browser-Coverage auswerten ...')
  const client = await buildSide('E2E Browser', path.join(dir, 'client'), clientBatches(dir))
  log('Server-Coverage auswerten ...')
  const server = await buildSide('E2E Server', path.join(dir, 'server'), serverBatches(dir))
  const vitest = loadVitest(dir)
  const { areas, perFile } = aggregate({ client, server, vitest })
  const git = gitInfo()
  const haveVitest = !!vitest

  const total = areas['src gesamt']
  const md = [
    `# E2E-Coverage (src/**)`,
    '',
    `Stand ${new Date().toISOString()}, Commit ${git.commit} (${git.dirty} getrackte Dateien veraendert).`,
    meta.playwright ? `Playwright: ${meta.playwright}` : '',
    haveVitest ? `Vitest: ${vitest.info.summary || 'ohne Zusammenfassung'}` : 'Vitest: nicht einbezogen.',
    `Rohdaten: Browser ${client?.entries ?? 0} Chunk-Eintraege, Server ${server?.entries ?? 0}.`,
    '',
    '## Zeilen je Bereich',
    '',
    haveVitest
      ? 'Nenner: Zeilen, in denen Vitest ein Statement kennt (wie die Vitest-Zeilenzahl). Browser/Server: Die Zeile lief laut V8-Messung (Source-Map-Zuordnung, Zeile ganz oder teilweise ausgefuehrt). "E2E gesamt" = Browser oder Server; "Kombiniert" = E2E oder Vitest.'
      : 'Nenner: Codezeilen (ohne leere und Kommentarzeilen), die der Coverage-Build kennt. Ohne Vitest-Lauf keine Spalten "E2E gesamt" je Zeile ueber beide Seiten hinaus und keine Kombination.',
    '',
    table(areas, 'lines', haveVitest),
    '',
    '## Funktionen je Bereich',
    '',
    'Funktion = Funktion, gefuehrt unter ihrer Startzeile (Datei + Zeile; mehrere Funktionen in einer Zeile zaehlen zusammen). Abgedeckt = wurde mindestens einmal aufgerufen.',
    '',
    table(areas, 'fns', haveVitest),
    '',
    haveVitest ? '## Vitest nativ (zum Abgleich)\n\nSo rechnet Vitest selbst (Istanbul-Statements/-Branches, nur src/**).\n\n' + nativeTable(vitest.native) + '\n' : '',
    '## Berichte',
    '',
    '- `client/index.html` und `server/index.html`: V8-Bericht je Seite, Datei fuer Datei bis in den Quelltext',
    '- `summary.json`: alle Zahlen, auch je Datei',
    '',
    '## Einordnung',
    '',
    '- Browser misst nur Code, der im Browser laeuft (Client Components, Hooks, Bundle-Teile). Server misst Server Components, Route-Handler, `proxy.ts`, Server-Libs. Ein Client-Wert von 40 % in `lib` heisst nicht, dass 60 % ungetestet sind: ein Teil laeuft nur auf dem Server.',
    '- E2E ist block-genau (V8), die Zuordnung zu Zeilen laeuft ueber Source-Maps und ist auf Zeilenebene gerundet; eine Zeile mit mehreren Ausdruecken zaehlt als abgedeckt, sobald ein Teil lief. Vitest zaehlt Statements. Die Kombination ist deshalb eine Zeilen-Naeherung, keine Statement-genaue Summe.',
    '- Build (`.next-cov`) und Vitest-Lauf sollten denselben Arbeitsbaum sehen, sonst verschieben sich Zeilennummern in gerade geaenderten Dateien.',
  ].filter(l => l !== '').join('\n').replace(/\n{3,}/g, '\n\n')
  fs.writeFileSync(path.join(dir, 'summary.md'), md + '\n')
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify({
    generated: new Date().toISOString(), git, meta, areas, files: perFile,
    vitestNative: vitest?.native ?? null,
  }, null, 2))
  log(`Report fertig in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${path.join(dir, 'summary.md')}`)
  if (total) {
    const l = total.lines
    log(`Zeilen src gesamt: Browser ${pct(l.client, l.total)}, Server ${pct(l.server, l.total)}, E2E ${pct(l.e2e, l.total)}${haveVitest ? `, Vitest ${pct(l.vitest, l.total)}, kombiniert ${pct(l.combined, l.total)}` : ''}`)
  }
  if (process.env.E2E_COVERAGE_KEEP_RAW === '0') {
    fs.rmSync(path.join(dir, 'client-raw'), { recursive: true, force: true })
    fs.rmSync(path.join(dir, 'server-raw'), { recursive: true, force: true })
    log('Rohdaten geloescht (E2E_COVERAGE_KEEP_RAW=0).')
  }
  return md
}

// ── Lauf ────────────────────────────────────────────────────────────────────────────────────────────────────────

function busyReason() {
  const pg = spawnSync('pgrep', ['-f', '[n]ode .*playwright test'], { encoding: 'utf8' }).stdout.trim()
  if (pg) return `Ein Playwright-Lauf ist aktiv (PID ${pg.split('\n').join(',')}).`
  const py = spawnSync('pgrep', ['-f', '[p]ython.* -m pytest'], { encoding: 'utf8' }).stdout.trim()
  if (py) return `Ein pytest-Lauf ist aktiv (PID ${py.split('\n').join(',')}); beide teilen pundo_test.`
  const port = spawnSync('lsof', ['-ti', 'TCP:3500', '-sTCP:LISTEN'], { encoding: 'utf8' }).stdout.trim()
  if (port) return `Auf Port 3500 laeuft bereits ein Frontend (PID ${port.split('\n').join(',')}); der Coverage-Lauf braucht einen eigenen Server. Beenden und erneut starten.`
  return ''
}

async function run(pwArgs) {
  const busy = busyReason()
  if (busy) {
    console.error(`[e2e-coverage] ABBRUCH: ${busy}`)
    process.exit(3)
  }
  fs.rmSync(path.join(COV_DIR, 'client-raw'), { recursive: true, force: true })
  fs.rmSync(path.join(COV_DIR, 'server-raw'), { recursive: true, force: true })
  fs.mkdirSync(COV_DIR, { recursive: true })
  log(`Playwright mit E2E_COVERAGE=1 -> ${path.relative(REPO, COV_DIR) || '.'} (erster Lauf baut .next-cov, ca. 20 s bis 3 min)`)
  const t0 = Date.now()
  const rc = await new Promise((resolve) => {
    const child = spawn('npx', ['playwright', 'test', ...pwArgs], {
      cwd: REPO, stdio: 'inherit', env: { ...process.env, E2E_COVERAGE: '1', E2E_COVERAGE_DIR: COV_DIR },
    })
    for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
  })
  const secs = Math.round((Date.now() - t0) / 1000)
  log(`Playwright rc=${rc} nach ${secs} s`)
  let pw = `rc=${rc}, ${secs} s`
  try {
    const rep = JSON.parse(fs.readFileSync(path.join(REPO, 'test-results/e2e-report.json'), 'utf8'))
    const s = rep.stats ?? {}
    pw = `${s.expected ?? '?'} bestanden, ${s.unexpected ?? '?'} fehlgeschlagen, ${s.flaky ?? 0} flaky, ${s.skipped ?? 0} uebersprungen, ${secs} s`
  } catch { /* kein JSON-Report (z.B. anderer Reporter) */ }
  const hasRaw = ['client-raw', 'server-raw'].some(d => fs.existsSync(path.join(COV_DIR, d)) && fs.readdirSync(path.join(COV_DIR, d)).length > 0)
  if (!hasRaw) {
    console.error('[e2e-coverage] ABBRUCH: keine Rohdaten entstanden (Playwright vor den Tests gescheitert?). Kein Report.')
    process.exit(rc || 1)
  }
  await buildReport(COV_DIR, { playwright: pw })
  // Coverage-Daten sind auch bei roten Tests aussagekraeftig; der Exit-Code bleibt der von Playwright.
  process.exit(rc)
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (isMain) {
  const [cmd, ...rest] = process.argv.slice(2)
  try {
    if (cmd === 'report') await buildReport(COV_DIR)
    else if (cmd === 'run') await run(rest)
    else await run(cmd ? [cmd, ...rest] : [])
  } catch (err) {
    console.error('[e2e-coverage] FEHLER:', err instanceof Error ? err.stack ?? err.message : err)
    process.exit(1)
  }
}
