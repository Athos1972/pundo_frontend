/**
 * Text Reporter — generates email subject and plain-text body.
 *
 * Subject format:
 *   [SMOKE OK] pundo.cy 2026-04-30 09:14 — alle Checks bestanden
 *   [SMOKE FAIL] pundo.cy 2026-04-30 09:14 — 3 von 178 Checks fehlgeschlagen
 *   [SMOKE BLOCKED] pundo.cy 2026-04-30 09:14 — Domain unerreichbar
 */

import type { TextReportData, RunResult } from '../types.js'

export interface TextReport {
  subject: string
  body: string
}

function formatDate(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ')
}

function formatResult(r: RunResult): string {
  const status = r.status.padEnd(7)
  const id = r.id.padEnd(50)
  const dur = r.duration > 0 ? `${(r.duration / 1000).toFixed(2)}s` : '—'
  return `  ${status}  ${id}  ${dur}${r.message ? `\n           ${r.message}` : ''}`
}

export function generateTextReport(data: TextReportData): TextReport {
  const { results, manifestVersion, commitSha, runDurationMs, brands, loginFailed, subjectPrefix } = data

  const pass = results.filter((r) => r.status === 'PASS').length
  const fail = results.filter((r) => r.status === 'FAIL').length
  const skip = results.filter((r) => r.status === 'SKIPPED').length
  const total = results.length

  const brandStr = brands.join(', ')
  const dateStr = formatDate()
  const durationStr = `${(runDurationMs / 1000).toFixed(1)}s`

  // Subject
  let subjectTail: string
  if (subjectPrefix === '[SMOKE BLOCKED]') {
    subjectTail = `${brandStr} ${dateStr} — Domain unerreichbar`
  } else if (fail === 0) {
    subjectTail = `${brandStr} ${dateStr} — alle Checks bestanden`
  } else {
    subjectTail = `${brandStr} ${dateStr} — ${fail} von ${total} Checks fehlgeschlagen`
  }

  const subject = `${subjectPrefix} ${subjectTail}`

  // Body
  const lines: string[] = [
    `Pundo Smoketest Report`,
    `======================`,
    ``,
    `Status:   ${subjectPrefix.replace(/[\[\]]/g, '')}`,
    `Brands:   ${brandStr}`,
    `Date:     ${dateStr} UTC`,
    `Duration: ${durationStr}`,
    ``,
    `Results:`,
    `  PASS:    ${pass}`,
    `  FAIL:    ${fail}`,
    `  SKIPPED: ${skip}`,
    `  TOTAL:   ${total}`,
    ``,
  ]

  if (loginFailed) {
    lines.push(
      `⚠️  Login failed — authenticated checks were skipped.`,
      `   Check secrets: SMOKETEST_USER / SMOKETEST_PASSWORD`,
      ``,
    )
  }

  if (runDurationMs > 5 * 60 * 1000) {
    lines.push(
      `⚠️  WARNING: Run exceeded 5-minute budget (${durationStr})`,
      ``,
    )
  }

  // FAILs first
  const failedResults = results.filter((r) => r.status === 'FAIL')
  if (failedResults.length > 0) {
    lines.push(`--- FAILED CHECKS (${failedResults.length}) ---`, '')
    for (const r of failedResults) {
      lines.push(formatResult(r))
    }
    lines.push('')
  }

  // Skipped
  const skippedResults = results.filter((r) => r.status === 'SKIPPED')
  if (skippedResults.length > 0) {
    lines.push(`--- SKIPPED CHECKS (${skippedResults.length}) ---`, '')
    for (const r of skippedResults) {
      lines.push(formatResult(r))
    }
    lines.push('')
  }

  // Passing (collapsed summary)
  if (pass > 0) {
    lines.push(`--- PASSED (${pass}) ---`, '')
    for (const r of results.filter((r) => r.status === 'PASS')) {
      lines.push(`  PASS     ${r.id}  ${r.duration > 0 ? (r.duration / 1000).toFixed(2) + 's' : '—'}`)
    }
    lines.push('')
  }

  lines.push(
    `---`,
    `Manifest version: ${manifestVersion}`,
    `Commit: ${commitSha.slice(0, 12)}`,
    `pundo-smoketester/1.0`,
  )

  return {
    subject,
    body: lines.join('\n'),
  }
}
