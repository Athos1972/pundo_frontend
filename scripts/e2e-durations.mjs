#!/usr/bin/env node
/**
 * Laufzeit-Auswertung des Playwright-JSON-Reports (T3, F8950).
 *   node scripts/e2e-durations.mjs [pfad/zum/report.json] [--top N]
 * Default: test-results/e2e-report.json. Druckt Gesamtzeit, Testanzahl, Skips, Flakes, Fehler
 * und die Top-N Dateien nach summierter Testdauer (Summe ueber alle Worker, nicht Wanduhr).
 */
import fs from 'node:fs'

const args = process.argv.slice(2)
const topIdx = args.indexOf('--top')
const top = topIdx >= 0 ? Number(args.splice(topIdx, 2)[1]) : 25
const file = args[0] ?? 'test-results/e2e-report.json'

if (!fs.existsSync(file)) {
  console.error(`Report nicht gefunden: ${file} (erst "npx playwright test" ohne --reporter laufen lassen)`)
  process.exit(1)
}
const report = JSON.parse(fs.readFileSync(file, 'utf8'))

const perFile = new Map()
const counts = { total: 0, expected: 0, unexpected: 0, flaky: 0, skipped: 0 }

function walk(suite) {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const key = spec.file ?? suite.file ?? '?'
      const dur = (t.results ?? []).reduce((a, r) => a + (r.duration ?? 0), 0)
      const e = perFile.get(key) ?? { ms: 0, tests: 0, skipped: 0, flaky: 0, failed: 0 }
      e.ms += dur; e.tests += 1
      counts.total += 1
      counts[t.status] = (counts[t.status] ?? 0) + 1
      if (t.status === 'skipped') e.skipped += 1
      if (t.status === 'flaky') e.flaky += 1
      if (t.status === 'unexpected') e.failed += 1
      perFile.set(key, e)
    }
  }
  for (const s of suite.suites ?? []) walk(s)
}
for (const s of report.suites ?? []) walk(s)

const sec = (ms) => (ms / 1000).toFixed(1).padStart(7)
const stats = report.stats ?? {}
console.log(`Wanduhr (stats.duration): ${((stats.duration ?? 0) / 1000).toFixed(1)} s (${((stats.duration ?? 0) / 60000).toFixed(2)} min)`)
console.log(`Tests: ${counts.total} | ok ${counts.expected} | failed ${counts.unexpected} | flaky ${counts.flaky} | skipped ${counts.skipped}`)
console.log(`Dateien: ${perFile.size}\n`)
console.log(`Top ${top} Dateien nach Summe der Testdauer:`)
console.log('   Sek.  Tests  Skip  Flaky  Fail  Datei')
const rows = [...perFile.entries()].sort((a, b) => b[1].ms - a[1].ms).slice(0, top)
for (const [f, e] of rows) {
  console.log(`${sec(e.ms)}  ${String(e.tests).padStart(5)}  ${String(e.skipped).padStart(4)}  ${String(e.flaky).padStart(5)}  ${String(e.failed).padStart(4)}  ${f}`)
}
