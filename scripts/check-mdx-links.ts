#!/usr/bin/env tsx
/**
 * check-mdx-links.ts
 *
 * Regression guard for B6400-002 ("MDX-Guide-Content verlinkt auf
 * pundo.cy-Root statt lokalisiertem Pfad"). Mirrors check-i18n-parity.ts:
 * a standalone, CI-taggable static check with no runtime/server dependency
 * (unlike scripts/seo-audit.ts, which needs a running server on :3500).
 *
 * Scans content/**\/*.mdx for the same three link-classes that
 * scripts/fix-mdx-links.ts repairs, and fails (exit 1) if any is found:
 *
 *   A — bare root:            ](https://pundo.cy) / ](https://pundo.cy/)
 *   B — absolute deep-links:  ](https://pundo.cy/...)
 *   C — lang-less internal:   ](/guides/<slug>)  (missing /{lang}/ prefix)
 *
 * Fenced code blocks and inline code are masked out before scanning, same as
 * the fix script, so intentional code samples (e.g. `mcp.pundo.cy`) never
 * trigger a false positive.
 *
 * Usage:
 *   tsx scripts/check-mdx-links.ts     # exit 0 = clean, exit 1 = violations found
 *
 * Wired up as: npm run lint:mdx-links
 */

import fs from 'fs'
import path from 'path'

const REPO_ROOT = path.resolve(path.dirname(process.argv[1] ?? process.cwd()), '..')
const CONTENT_DIR = path.join(REPO_ROOT, 'content')

// ─── File discovery ──────────────────────────────────────────────────────────

function findMdxFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findMdxFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      results.push(full)
    }
  }
  return results
}

// ─── Code-block masking (same approach as fix-mdx-links.ts) ─────────────────

function maskCode(content: string): string {
  const spans: { start: number; end: number }[] = []
  const fencePattern = /```[\s\S]*?```/g
  let match: RegExpExecArray | null

  fencePattern.lastIndex = 0
  while ((match = fencePattern.exec(content)) !== null) {
    spans.push({ start: match.index, end: match.index + match[0].length })
  }

  const inlinePattern = /`[^`\n]+`/g
  inlinePattern.lastIndex = 0
  while ((match = inlinePattern.exec(content)) !== null) {
    const s = match.index
    const e = match.index + match[0].length
    const insideFence = spans.some((sp) => s >= sp.start && e <= sp.end)
    if (!insideFence) spans.push({ start: s, end: e })
  }

  spans.sort((a, b) => a.start - b.start)

  let result = ''
  let cursor = 0
  for (const span of spans) {
    if (span.start < cursor) continue
    result += content.slice(cursor, span.start)
    result += ' '.repeat(span.end - span.start)
    cursor = span.end
  }
  result += content.slice(cursor)
  return result
}

// ─── Line lookup helper ──────────────────────────────────────────────────────

function lineNumberAt(content: string, index: number): number {
  let line = 1
  for (let i = 0; i < index; i++) {
    if (content[i] === '\n') line++
  }
  return line
}

// ─── Violation detection ──────────────────────────────────────────────────────

interface Violation {
  file: string
  line: number
  className: 'A' | 'B' | 'C'
  snippet: string
}

function findViolations(file: string): Violation[] {
  const original = fs.readFileSync(file, 'utf-8')
  const masked = maskCode(original)
  const violations: Violation[] = []
  const relPath = path.relative(REPO_ROOT, file)

  const patterns: { className: 'A' | 'B' | 'C'; regex: RegExp }[] = [
    // Class A — bare root
    { className: 'A', regex: /\]\(https:\/\/pundo\.cy\/?\)/g },
    // Class B — any absolute pundo.cy deep-link
    { className: 'B', regex: /\]\(https:\/\/pundo\.cy\/[a-zA-Z0-9_\-/]+\)/g },
    // Class C — lang-less internal guide path
    { className: 'C', regex: /\]\(\/guides\/[a-zA-Z0-9_-]+\)/g },
  ]

  for (const { className, regex } of patterns) {
    regex.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = regex.exec(masked)) !== null) {
      violations.push({
        file: relPath,
        line: lineNumberAt(original, m.index),
        className,
        snippet: m[0],
      })
    }
  }

  return violations
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`Content directory not found: ${CONTENT_DIR}`)
    process.exit(1)
  }

  const files = findMdxFiles(CONTENT_DIR).sort()
  const allViolations: Violation[] = []

  for (const file of files) {
    allViolations.push(...findViolations(file))
  }

  if (allViolations.length === 0) {
    console.log(`mdx-links check passed — ${files.length} files scanned, 0 bare-root/deep-link/lang-less violations found.`)
    process.exit(0)
  }

  console.error(`mdx-links check FAILED — ${allViolations.length} violation(s) found:\n`)
  for (const v of allViolations) {
    console.error(`  [Class ${v.className}] ${v.file}:${v.line} — ${v.snippet}`)
  }
  console.error(
    '\nRule: link targets must be lang-prefixed (/{lang}/...), derived from the containing ' +
    "<lang>.mdx filename — never hardcode https://pundo.cy or a lang-less /guides/<slug> path.\n" +
    'Fix with: tsx scripts/fix-mdx-links.ts --write (review the dry-run diff first).'
  )
  process.exit(1)
}

main()
