/**
 * Client-Coverage fuer die E2E-Tests (nur bei E2E_COVERAGE=1, siehe docs/e2e-testing.md "Coverage").
 *
 * Je Browser-Seite laeuft die V8-Precise-Coverage ueber ein eigenes CDP-Session (Profiler). Die Messwerte werden VOR
 * jeder Navigation abgeholt (`Page.frameStartedNavigating`), weil V8 die Skripte des alten Dokuments danach verwirft,
 * und beim Schliessen des Contexts. Es werden nur Chunks aus `/_next/static/` behalten. Binaere Block-Coverage
 * (`callCount: false`): ein Skript-Eintrag, der sich seit einer frueheren Abholung nicht geaendert hat, wird nicht erneut
 * geschrieben (Hash je Worker), das haelt die Rohdaten klein. Der Report vereinigt alle Eintraege je Chunk (monocart).
 * Quelltext und Source-Map der Chunks liest der Report spaeter aus `.next-cov/standalone` (scripts/e2e-coverage-report.mjs).
 * Rohdaten: `<E2E_COVERAGE_DIR>/client-raw/<pid>-<n>.json.gz`.
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import type { Browser, BrowserContext, CDPSession, Page } from '../../node_modules/@playwright/test'

interface V8Range { startOffset: number; endOffset: number; count: number }
interface V8Function { functionName: string; isBlockCoverage: boolean; ranges: V8Range[] }
interface ScriptCoverage { url: string; functions: V8Function[] }

export const COVERAGE_DIR = path.resolve(process.cwd(), process.env.E2E_COVERAGE_DIR ?? 'coverage-e2e')
export const CLIENT_RAW_DIR = path.join(COVERAGE_DIR, 'client-raw')
const STATIC_MARK = '/_next/static/'
const CDP_TIMEOUT_MS = 8_000

let fileSeq = 0
/** Hashes bereits gesicherter Skript-Eintraege dieses Workers (Deduplizierung). */
const seenEntries = new Set<string>()

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | undefined> =>
  Promise.race([p, new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), ms))])

/** Eine Seite mit laufender Profiler-Coverage. Alle Methoden schlucken Fehler (Seite weg, Crash, Timeout). */
class PageCoverage {
  private chain: Promise<void> = Promise.resolve()
  private stopped = false

  private constructor(private readonly cdp: CDPSession, private readonly sink: ScriptCoverage[]) {}

  static async start(context: BrowserContext, page: Page, sink: ScriptCoverage[]): Promise<PageCoverage | null> {
    try {
      const cdp = await context.newCDPSession(page)
      const cov = new PageCoverage(cdp, sink)
      await cdp.send('Profiler.enable')
      await cdp.send('Profiler.startPreciseCoverage', { callCount: false, detailed: true })
      await cdp.send('Page.enable')
      // Vor dem Wegnavigieren sichern (hart: page.goto / location.href).
      cdp.on('Page.frameStartedNavigating', () => { void cov.take() })
      cdp.on('Page.frameRequestedNavigation', () => { void cov.take() })
      return cov
    } catch {
      return null
    }
  }

  /** Holt die Deltas ab; serialisiert, damit sich zwei Abholungen nicht ueberholen. */
  take(): Promise<void> {
    this.chain = this.chain.then(async () => {
      if (this.stopped) return
      try {
        const res = await withTimeout(this.cdp.send('Profiler.takePreciseCoverage'), CDP_TIMEOUT_MS)
        if (!res) return
        for (const entry of res.result as ScriptCoverage[]) {
          if (!entry.url.includes(STATIC_MARK) || !/\.js(\?|$)/.test(entry.url)) continue
          // Nur Skripte mit mindestens einem Treffer: ganz unausgefuehrte Skripte tragen nichts zur Vereinigung bei.
          if (!entry.functions.some(fn => fn.ranges.some(r => r.count > 0))) continue
          const url = entry.url.split('?')[0]
          const body = JSON.stringify(entry.functions)
          const hash = crypto.createHash('sha1').update(url).update(body).digest('hex')
          if (seenEntries.has(hash)) continue
          seenEntries.add(hash)
          this.sink.push({ url, functions: entry.functions })
        }
      } catch { /* Seite geschlossen/abgestuerzt */ }
    })
    return this.chain
  }

  async stop(): Promise<void> {
    await this.take()
    this.stopped = true
    try { await withTimeout(this.cdp.send('Profiler.stopPreciseCoverage'), 2_000) } catch { /* egal */ }
  }
}

/** Schreibt gesammelte Eintraege als eine Rohdatei (leer = nichts). */
function writeRaw(entries: ScriptCoverage[]): void {
  if (entries.length === 0) return
  fs.mkdirSync(CLIENT_RAW_DIR, { recursive: true })
  fileSeq += 1
  fs.writeFileSync(path.join(CLIENT_RAW_DIR, `${process.pid}-${fileSeq}.json.gz`), zlib.gzipSync(JSON.stringify(entries)))
}

/** Haengt die Messung an einen Context: neue Seiten starten sie, `close()` sichert vorher die Werte. */
function trackContext(context: BrowserContext): void {
  const sink: ScriptCoverage[] = []
  const pages = new Set<PageCoverage>()
  const pending: Promise<void>[] = []

  context.on('page', page => {
    pending.push(PageCoverage.start(context, page, sink).then(cov => { if (cov) pages.add(cov) }))
  })

  // newPage() erst zurueckgeben, wenn die Messung laeuft: sonst verpasst der erste goto() den Start.
  const origNewPage = context.newPage.bind(context)
  context.newPage = async () => {
    const page = await origNewPage()
    await Promise.all(pending)
    return page
  }

  const origClose = context.close.bind(context)
  context.close = async (options) => {
    await Promise.all(pending)
    await Promise.all([...pages].map(p => p.stop()))
    pages.clear()
    writeRaw(sink.splice(0))
    return origClose(options)
  }
}

const PATCHED = Symbol.for('pundo.e2e.coveragePatched')

/** Jede ueber diesen Browser erzeugte Seite/Context wird gemessen (newPage() ruft intern newContext()). Nur Chromium. */
export function instrumentBrowser(browser: Browser): void {
  const b = browser as Browser & { [PATCHED]?: boolean }
  if (b[PATCHED] || browser.browserType().name() !== 'chromium') return
  b[PATCHED] = true
  const origNewContext = browser.newContext.bind(browser)
  browser.newContext = async (options) => {
    const context = await origNewContext(options)
    trackContext(context)
    return context
  }
}
