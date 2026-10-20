#!/usr/bin/env node
// F8960: zeigt, welche Team-Videos (video/registry.json) nach Aenderungen an der Admin-Oberflaeche veraltet sein koennten.
// Aufruf: npm run videos:stale [-- --strict]   (Exit 1 bei "pruefen" nur mit --strict)
// Reine Logik (parseGitLog, evaluateEntry, formatTable) ist ohne Git testbar.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const STATUS_CURRENT = 'aktuell'
export const STATUS_CHECK = 'pruefen'

/** `git log --oneline` Ausgabe -> [{ hash, subject }] (leere Zeilen ignoriert). */
export function parseGitLog(output) {
  return String(output ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(' ')
      return i === -1 ? { hash: l, subject: '' } : { hash: l.slice(0, i), subject: l.slice(i + 1).trim() }
    })
}

/** Registry-Eintrag + Git-Ausgabe -> Befund. Ohne Commit seit Aufnahme: aktuell. */
export function evaluateEntry(entry, gitOutput, recentCount = 3) {
  const commits = parseGitLog(gitOutput)
  return {
    slug: entry.slug,
    topic: entry.topic,
    count: commits.length,
    recent: commits.slice(0, recentCount).map((c) => c.subject),
    status: commits.length > 0 ? STATUS_CHECK : STATUS_CURRENT,
  }
}

export function formatTable(results) {
  const head = ['Video', 'Thema', 'Commits', 'Status', 'Letzte Commits']
  const rows = results.map((r) => [r.slug, r.topic, String(r.count), r.status, r.recent.join(' | ') || '-'])
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cols) => cols.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd()
  return [line(head), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n')
}

export function hasStale(results) {
  return results.some((r) => r.status === STATUS_CHECK)
}

function gitLog(root, entry) {
  return execFileSync(
    'git',
    ['log', '--oneline', `${entry.recordedAtCommit}..HEAD`, '--', ...entry.touches],
    { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  )
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'video', 'registry.json'), 'utf8'))
  const results = registry.map((e) => evaluateEntry(e, gitLog(root, e)))
  console.log(formatTable(results))
  if (hasStale(results)) {
    console.log('\n"pruefen" = Quelldateien des Videos wurden seit der Aufnahme geaendert. Neu aufnehmen nur, wenn sich der ABLAUF aenderte (siehe video/README.md).')
    if (process.argv.includes('--strict')) process.exit(1)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
