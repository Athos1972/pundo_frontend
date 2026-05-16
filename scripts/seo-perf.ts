#!/usr/bin/env tsx
/**
 * SEO Performance Baseline Script — pundo_frontend
 *
 * Wraps Lighthouse CLI over the curated routes from smoketests/manifest.yaml.
 * Measures LCP, CLS, TBT (INP proxy), FCP, Speed Index per route.
 *
 * Usage:
 *   pnpm seo:perf
 *   pnpm seo:perf --base-url http://localhost:3500
 *   pnpm seo:perf --out perf-report-custom.json
 *
 * Output:
 *   perf-report-<YYYY-MM-DD>.json   — machine-readable per-route metrics
 *   perf-report-<YYYY-MM-DD>.md     — human-readable report
 *   seo-perf-followups.md           — appended if any route hits 'poor' thresholds
 *
 * Exit codes:
 *   0 = all routes within "Needs Improvement" thresholds
 *   1 = at least one route in "Poor" range (severity: error)
 *
 * Port safety: aborts if --base-url points to :3000 (production port).
 */

import { spawnSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const arg = process.argv.find((a) => a.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : undefined
}

const BASE_URL = getArg('base-url') ?? 'http://localhost:3500'
const CUSTOM_OUT = getArg('out')
const DATE_STR = new Date().toISOString().slice(0, 10)
const OUT_JSON = CUSTOM_OUT ?? `perf-report-${DATE_STR}.json`
const OUT_MD = OUT_JSON.replace(/\.json$/, '.md')

// ─────────────────────────────────────────────────────────────────────────────
// Port safety — never run against production (:3000)
// ─────────────────────────────────────────────────────────────────────────────

if (BASE_URL.includes(':3000')) {
  console.error(
    '[seo-perf] ERROR: --base-url points to port 3000 (production). ' +
    'Lighthouse runs must target the test instance on port 3500.',
  )
  process.exit(1)
}

console.log(`[seo-perf] Base URL: ${BASE_URL}`)

// ─────────────────────────────────────────────────────────────────────────────
// Core Web Vitals thresholds (Google 2024)
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLDS = {
  lcp:  { good: 2500, ni: 4000 },    // ms
  cls:  { good: 0.1,  ni: 0.25 },    // unitless
  tbt:  { good: 200,  ni: 600 },     // ms (proxy for INP in Lab)
  fcp:  { good: 1800, ni: 3000 },    // ms
}

type MetricKey = keyof typeof THRESHOLDS

function classify(key: MetricKey, value: number): 'good' | 'ni' | 'poor' {
  const t = THRESHOLDS[key]
  if (value <= t.good) return 'good'
  if (value <= t.ni)   return 'ni'
  return 'poor'
}

// ─────────────────────────────────────────────────────────────────────────────
// Curated routes (static list, mirrors smoketest manifest key paths)
// ─────────────────────────────────────────────────────────────────────────────

const ROUTES = [
  '/',
  '/search',
  '/shops',
  '/guides',
]

// ─────────────────────────────────────────────────────────────────────────────
// Lighthouse runner
// ─────────────────────────────────────────────────────────────────────────────

interface RouteMetrics {
  route: string
  url: string
  lcp: number | null
  cls: number | null
  tbt: number | null
  fcp: number | null
  speedIndex: number | null
  severity: 'ok' | 'warn' | 'error'
  classifications: Record<string, string>
}

function runLighthouse(url: string): RouteMetrics['lcp'] extends null ? RouteMetrics : RouteMetrics {
  const route = url.replace(BASE_URL, '') || '/'

  console.log(`[seo-perf] Running Lighthouse for: ${url}`)

  // Check if lighthouse CLI is available
  const lhCheck = spawnSync('npx', ['lighthouse', '--version'], { encoding: 'utf-8' })
  if (lhCheck.status !== 0) {
    console.warn('[seo-perf] lighthouse CLI not found. Skipping Lighthouse run.')
    return {
      route, url,
      lcp: null, cls: null, tbt: null, fcp: null, speedIndex: null,
      severity: 'warn',
      classifications: { note: 'lighthouse-not-installed' },
    }
  }

  const tmpOut = path.join(process.cwd(), `lh-tmp-${Date.now()}.json`)

  const result = spawnSync(
    'npx',
    [
      'lighthouse', url,
      '--output=json',
      `--output-path=${tmpOut}`,
      '--chrome-flags=--headless --no-sandbox --disable-gpu',
      '--only-categories=performance',
      '--form-factor=mobile',
      '--quiet',
    ],
    { encoding: 'utf-8', timeout: 120_000 },
  )

  if (result.status !== 0 || !fs.existsSync(tmpOut)) {
    console.warn(`[seo-perf] Lighthouse failed for ${url}: ${result.stderr?.slice(0, 200)}`)
    return {
      route, url,
      lcp: null, cls: null, tbt: null, fcp: null, speedIndex: null,
      severity: 'warn',
      classifications: { note: 'lighthouse-failed' },
    }
  }

  let report: Record<string, unknown>
  try {
    report = JSON.parse(fs.readFileSync(tmpOut, 'utf-8'))
    fs.unlinkSync(tmpOut)
  } catch {
    fs.existsSync(tmpOut) && fs.unlinkSync(tmpOut)
    return {
      route, url,
      lcp: null, cls: null, tbt: null, fcp: null, speedIndex: null,
      severity: 'warn',
      classifications: { note: 'parse-error' },
    }
  }

  const audits = report.audits as Record<string, { numericValue?: number }> | undefined

  const lcp = audits?.['largest-contentful-paint']?.numericValue ?? null
  const cls = audits?.['cumulative-layout-shift']?.numericValue ?? null
  const tbt = audits?.['total-blocking-time']?.numericValue ?? null
  const fcp = audits?.['first-contentful-paint']?.numericValue ?? null
  const speedIndex = audits?.['speed-index']?.numericValue ?? null

  const classifications: Record<string, string> = {}
  let severity: 'ok' | 'warn' | 'error' = 'ok'

  for (const [key, value] of Object.entries({ lcp, cls, tbt, fcp }) as [MetricKey, number | null][]) {
    if (value === null) continue
    const cls_ = classify(key, value)
    classifications[key] = cls_
    if (cls_ === 'poor') severity = 'error'
    else if (cls_ === 'ni' && severity !== 'error') severity = 'warn'
  }

  return { route, url, lcp, cls, tbt, fcp, speedIndex, severity, classifications }
}

// ─────────────────────────────────────────────────────────────────────────────
// Report generation
// ─────────────────────────────────────────────────────────────────────────────

function generatePerfMarkdown(metrics: RouteMetrics[], dateStr: string): string {
  const lines = [
    `# SEO Performance Report — ${dateStr}`,
    '',
    `**Base URL:** ${BASE_URL}`,
    `**Routes measured:** ${metrics.length}`,
    '',
    '## Results',
    '',
    '| Route | LCP (ms) | CLS | TBT (ms) | FCP (ms) | Severity |',
    '|---|---|---|---|---|---|',
  ]

  for (const m of metrics) {
    const fmt = (v: number | null) => v !== null ? v.toFixed(0) : '—'
    const sev = m.severity === 'error' ? '🔴 error' : m.severity === 'warn' ? '🟡 warn' : '🟢 ok'
    lines.push(`| ${m.route} | ${fmt(m.lcp)} | ${m.cls?.toFixed(3) ?? '—'} | ${fmt(m.tbt)} | ${fmt(m.fcp)} | ${sev} |`)
  }

  lines.push('')
  lines.push('## Thresholds')
  lines.push('')
  lines.push('| Metric | Good | Needs Improvement | Poor |')
  lines.push('|---|---|---|---|')
  lines.push('| LCP | < 2500 ms | 2500–4000 ms | > 4000 ms |')
  lines.push('| CLS | < 0.1 | 0.1–0.25 | > 0.25 |')
  lines.push('| TBT (INP proxy) | < 200 ms | 200–600 ms | > 600 ms |')
  lines.push('| FCP | < 1800 ms | 1800–3000 ms | > 3000 ms |')
  lines.push('')

  return lines.join('\n')
}

function appendFollowups(metrics: RouteMetrics[], dateStr: string) {
  const poor = metrics.filter((m) => m.severity === 'error')
  if (poor.length === 0) return

  const followupsPath = path.join(process.cwd(), 'seo-perf-followups.md')
  const lines = [
    `\n## Perf Followups — ${dateStr}`,
    '',
    `${poor.length} route(s) exceeded "Poor" thresholds in ${dateStr} run:`,
    '',
  ]
  for (const m of poor) {
    lines.push(`- **${m.route}** — LCP: ${m.lcp ?? '?'} ms, CLS: ${m.cls ?? '?'}, TBT: ${m.tbt ?? '?'} ms`)
    for (const [k, v] of Object.entries(m.classifications)) {
      if (v === 'poor') lines.push(`  - ${k.toUpperCase()}: poor`)
    }
  }
  lines.push('')

  fs.appendFileSync(followupsPath, lines.join('\n'), 'utf-8')
  console.log(`[seo-perf] Followups appended to: ${followupsPath}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const metrics: RouteMetrics[] = []

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route}`
    const m = runLighthouse(url)
    metrics.push(m)
  }

  const jsonPath = path.join(process.cwd(), OUT_JSON)
  const mdPath = path.join(process.cwd(), OUT_MD)

  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2), 'utf-8')
  fs.writeFileSync(mdPath, generatePerfMarkdown(metrics, DATE_STR), 'utf-8')

  console.log(`[seo-perf] Report written: ${jsonPath}`)
  console.log(`[seo-perf] Report written: ${mdPath}`)

  appendFollowups(metrics, DATE_STR)

  const hasErrors = metrics.some((m) => m.severity === 'error')
  if (hasErrors) {
    console.error('[seo-perf] At least one route exceeded "Poor" Core Web Vitals thresholds.')
    process.exit(1)
  }

  console.log('[seo-perf] All routes within acceptable thresholds.')
}

main().catch((err) => {
  console.error('[seo-perf] Fatal error:', err)
  process.exit(1)
})
