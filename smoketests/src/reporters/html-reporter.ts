/**
 * HTML Reporter — generates a self-contained HTML report.
 *
 * FAIL checks appear first. Screenshots are base64-embedded.
 * Footer shows manifest version, commit SHA, and run duration.
 */

import type { ReportData, RunResult } from '../types.js'

function statusBadge(status: RunResult['status']): string {
  const colors: Record<RunResult['status'], string> = {
    PASS: '#22c55e',
    FAIL: '#ef4444',
    SKIPPED: '#f59e0b',
  }
  const color = colors[status]
  return `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${status}</span>`
}

function screenshotEmbed(screenshot: Buffer | undefined): string {
  if (!screenshot) return ''
  const b64 = screenshot.toString('base64')
  return `
    <details style="margin-top:8px;">
      <summary style="cursor:pointer;color:#3b82f6;">Screenshot</summary>
      <img src="data:image/png;base64,${b64}"
           style="max-width:100%;border:1px solid #e5e7eb;border-radius:4px;margin-top:4px;"
           alt="Screenshot at failure" />
    </details>`
}

function resultRow(r: RunResult): string {
  const durationStr = r.duration > 0 ? `${(r.duration / 1000).toFixed(2)}s` : '—'
  return `
    <tr style="${r.status === 'FAIL' ? 'background:#fef2f2;' : ''}">
      <td style="padding:8px 12px;font-family:monospace;font-size:13px;">${escHtml(r.id)}</td>
      <td style="padding:8px 12px;">${escHtml(r.brand)}</td>
      <td style="padding:8px 12px;">${escHtml(r.lang)}</td>
      <td style="padding:8px 12px;">${escHtml(r.phase)}</td>
      <td style="padding:8px 12px;">${statusBadge(r.status)}</td>
      <td style="padding:8px 12px;color:#6b7280;font-size:12px;">${durationStr}</td>
      <td style="padding:8px 12px;font-size:13px;color:${r.status === 'FAIL' ? '#dc2626' : '#374151'};">
        ${escHtml(r.message ?? '')}
        ${screenshotEmbed(r.screenshot)}
      </td>
    </tr>`
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function generateHtmlReport(data: ReportData): string {
  const { results, manifestVersion, commitSha, runDurationMs, brands, loginFailed } = data

  const pass = results.filter((r) => r.status === 'PASS').length
  const fail = results.filter((r) => r.status === 'FAIL').length
  const skip = results.filter((r) => r.status === 'SKIPPED').length
  const total = results.length

  const overallStatus = fail > 0 ? 'FAIL' : skip === total ? 'BLOCKED' : 'OK'
  const statusColor = overallStatus === 'OK' ? '#22c55e' : overallStatus === 'FAIL' ? '#ef4444' : '#f59e0b'

  const runDate = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
  const durationStr = `${(runDurationMs / 1000).toFixed(1)}s`
  const overBudget = runDurationMs > 5 * 60 * 1000

  // FAILs first, then PASSes, then SKIPPEDs
  const sortedResults = [
    ...results.filter((r) => r.status === 'FAIL'),
    ...results.filter((r) => r.status === 'PASS'),
    ...results.filter((r) => r.status === 'SKIPPED'),
  ]

  const rows = sortedResults.map(resultRow).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pundo Smoketest Report — ${runDate}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; background: #f9fafb; color: #111827; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
    .summary { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 20px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #f3f4f6; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #6b7280; }
    td { border-top: 1px solid #f3f4f6; vertical-align: top; }
    .footer { margin-top: 24px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    .warning { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 16px; margin-bottom: 16px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>
    <span style="color:${statusColor};">&#9679;</span>
    Pundo Smoketest — ${overallStatus}
  </h1>
  <div class="subtitle">${runDate} &bull; Brands: ${escHtml(brands.join(', '))}</div>

  ${overBudget ? `<div class="warning">&#9888; Run exceeded 5-minute budget (${durationStr})</div>` : ''}
  ${loginFailed ? `<div class="warning">&#9888; Login failed — authenticated checks were skipped. Check SMOKETEST_USER / SMOKETEST_PASSWORD.</div>` : ''}

  <div class="summary">
    <div class="stat"><div class="stat-value" style="color:#22c55e;">${pass}</div><div class="stat-label">PASS</div></div>
    <div class="stat"><div class="stat-value" style="color:#ef4444;">${fail}</div><div class="stat-label">FAIL</div></div>
    <div class="stat"><div class="stat-value" style="color:#f59e0b;">${skip}</div><div class="stat-label">SKIPPED</div></div>
    <div class="stat"><div class="stat-value">${total}</div><div class="stat-label">TOTAL</div></div>
    <div class="stat"><div class="stat-value">${durationStr}</div><div class="stat-label">DURATION</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Check</th>
        <th>Brand</th>
        <th>Lang</th>
        <th>Phase</th>
        <th>Status</th>
        <th>Duration</th>
        <th>Message</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    Manifest version: ${escHtml(manifestVersion)} &bull;
    Commit: <code>${escHtml(commitSha.slice(0, 12))}</code> &bull;
    Run duration: ${durationStr} &bull;
    pundo-smoketester/1.0
  </div>
</body>
</html>`
}
