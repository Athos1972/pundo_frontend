/**
 * Smoketester Runner — Entry Point
 *
 * Loads manifest.yaml, validates it, iterates brands × checks × languages,
 * runs each check through the assert engine, then generates reports and sends mail.
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more checks failed
 *   2 = domain unreachable after retries (BLOCKED)
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import { chromium } from '@playwright/test'
import { ManifestSchema } from '../manifest.schema.js'
import type { Manifest, Check, Brand } from '../manifest.schema.js'
import { loadTranslations } from './translations-loader.js'
import { applyLanguage } from './lang-setup.js'
import { runAssert, resolveFirstItem } from './assert-engine.js'
import { withRetry, isDomainUnreachableError } from './retry.js'
import { generateHtmlReport } from './reporters/html-reporter.js'
import { generateTextReport } from './reporters/text-reporter.js'
import { sendMail } from './mailer/smtp.js'
import type { RunResult } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MANIFEST_PATH = join(__dirname, '..', 'manifest.yaml')

const SMOKETEST_EXTRA_HEADERS = {
  'X-Smoketest': '1',
  'User-Agent': 'pundo-smoketester/1.0 (+https://github.com/pundo-cy/pundo_frontend/tree/main/smoketests)',
}

// ---------------------------------------------------------------------------
// Config from environment
// ---------------------------------------------------------------------------

function getEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback
  if (val === undefined) {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  return val
}

function getBrandFilter(): string {
  return process.env['BRAND_FILTER'] ?? 'both'
}

function getBrandBaseUrl(brandId: string): string | null {
  const key = `SMOKETEST_BASE_URL_${brandId.toUpperCase()}`
  return process.env[key] ?? null
}

// ---------------------------------------------------------------------------
// Load + validate manifest
// ---------------------------------------------------------------------------

function loadManifest(): Manifest {
  const raw = readFileSync(MANIFEST_PATH, 'utf-8')
  const parsed = yaml.load(raw)
  return ManifestSchema.parse(parsed)
}

// ---------------------------------------------------------------------------
// Determine which languages to use for a check
// ---------------------------------------------------------------------------

function getCheckLanguages(check: Check, allLanguages: string[]): string[] {
  if (check.languages && check.languages.length > 0) {
    return check.languages
  }
  if (check.per_language) {
    return allLanguages
  }
  return [allLanguages[0] ?? 'en']
}

// ---------------------------------------------------------------------------
// Single check execution
// ---------------------------------------------------------------------------

async function runCheck(
  check: Check,
  brand: Brand,
  lang: string,
  loginCookie: string | null,
  startMs: number,
): Promise<RunResult> {
  const id = `${check.id}/${brand.id}/${lang}`

  if (check.skip) {
    return {
      id,
      checkId: check.id,
      brand: brand.id,
      lang,
      phase: check.phase,
      status: 'SKIPPED',
      duration: 0,
      message: 'Skipped via manifest skip flag',
    }
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    extraHTTPHeaders: SMOKETEST_EXTRA_HEADERS,
    ignoreHTTPSErrors: false,
  })

  // Fresh session resets all cookies
  if (!check.fresh_session) {
    await applyLanguage(context, lang, brand.base_url)

    // Inject auth cookie for authenticated checks
    if (check.phase === 'authenticated' && loginCookie) {
      const url = new URL(brand.base_url)
      await context.addCookies([
        {
          name: 'session',
          value: loginCookie,
          domain: url.hostname,
          path: '/',
          httpOnly: true,
          secure: url.protocol === 'https:',
          sameSite: 'Lax',
        },
      ])
    }
  }

  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  const checkStart = Date.now()
  let screenshot: Buffer | undefined

  try {
    // Determine navigation URL
    let targetUrl: string | null = null

    if (check.resolve_first_item && check.path) {
      const resolvedUrl = await resolveFirstItem(
        page,
        check.path,
        brand.base_url,
        check.resolve_first_item_selector ?? "a[href]",
      )
      if (!resolvedUrl) {
        return {
          id,
          checkId: check.id,
          brand: brand.id,
          lang,
          phase: check.phase,
          status: 'FAIL',
          duration: Date.now() - checkStart,
          message: `resolve_first_item: no item link found at ${brand.base_url}${check.path}`,
        }
      }
      targetUrl = resolvedUrl
    } else if (check.path) {
      targetUrl = `${brand.base_url}${check.path}`
    }

    // Run each assert
    const assertResults = []
    let response = null

    if (targetUrl) {
      response = await withRetry(
        () => page.goto(targetUrl!, {
          waitUntil: 'domcontentloaded',
          timeout: check.timeout_ms,
        }),
        {
          maxRetries: check.retries,
          onRetry: (attempt, err) => {
            console.warn(`  [retry ${attempt}] ${id}: ${err}`)
          },
        },
      )

      // Wait a moment for client-side hydration
      await page.waitForTimeout(500)
    }

    // login-success assert is handled specially
    const loginAssert = check.asserts.find((a) => a.type === 'login-success')
    if (loginAssert && loginAssert.type === 'login-success') {
      // Login is handled by the runner's phase logic before checks run
      // If we're here and phase is authenticated, login already succeeded
      assertResults.push({
        ok: loginCookie !== null,
        expected: 'logged in',
        actual: loginCookie ? 'logged in' : 'not logged in',
        message: loginCookie ? 'Login successful' : 'Login failed',
      })
    }

    // Run all non-login asserts
    for (const assert of check.asserts.filter((a) => a.type !== 'login-success')) {
      const result = await runAssert({
        page,
        assert,
        lang,
        response,
        consoleErrors,
      })
      assertResults.push(result)
    }

    const allPassed = assertResults.every((r) => r.ok)

    if (!allPassed) {
      screenshot = await page.screenshot({ type: 'png', fullPage: false }).catch(() => undefined)
    }

    const failedAsserts = assertResults.filter((r) => !r.ok)
    const message = allPassed
      ? `All ${assertResults.length} assert(s) passed`
      : failedAsserts.map((r) => r.message).join('; ')

    return {
      id,
      checkId: check.id,
      brand: brand.id,
      lang,
      phase: check.phase,
      status: allPassed ? 'PASS' : 'FAIL',
      duration: Date.now() - checkStart,
      message,
      screenshot,
      assertResults,
    }
  } catch (err) {
    screenshot = await page.screenshot({ type: 'png', fullPage: false }).catch(() => undefined)
    return {
      id,
      checkId: check.id,
      brand: brand.id,
      lang,
      phase: check.phase,
      status: 'FAIL',
      duration: Date.now() - checkStart,
      message: `Unhandled error: ${err}`,
      screenshot,
    }
  } finally {
    await browser.close()
  }
}

// ---------------------------------------------------------------------------
// Login helper
// ---------------------------------------------------------------------------

async function performLogin(
  brand: Brand,
  user: string,
  password: string,
): Promise<{ cookie: string | null; error?: string }> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    extraHTTPHeaders: SMOKETEST_EXTRA_HEADERS,
  })
  const page = await context.newPage()

  try {
    // Navigate to login page
    const loginUrl = `${brand.base_url}/auth/login`
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 })

    // Fill login form
    await page.fill('input[type="email"], input[name="email"]', user)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"]')

    // Wait for navigation after login
    await page.waitForURL((url) => !url.toString().includes('/auth/login'), {
      timeout: 10_000,
    }).catch(() => null)

    // Extract session cookie
    const cookies = await context.cookies()
    const sessionCookie = cookies.find((c) =>
      c.name === 'session' || c.name === 'access_token' ||
      c.name === 'customer_token' || c.name.includes('auth'),
    )

    if (sessionCookie) {
      return { cookie: sessionCookie.value }
    }

    // Check if still on login page (login failed)
    const currentUrl = page.url()
    if (currentUrl.includes('/auth/login')) {
      return { cookie: null, error: 'Still on login page after submit — credentials may be wrong' }
    }

    return { cookie: null, error: 'Login appeared to succeed but no session cookie found' }
  } catch (err) {
    return { cookie: null, error: String(err) }
  } finally {
    await browser.close()
  }
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const runStart = Date.now()
  console.log('[smoketester] Starting run...')

  // Load translations at startup (enables tSync() calls in assert-engine)
  await loadTranslations()

  // Load + validate manifest
  let manifest: Manifest
  try {
    manifest = loadManifest()
    console.log(`[smoketester] Manifest loaded: ${manifest.checks.length} checks, ${manifest.brands.length} brands`)
  } catch (err) {
    console.error('[smoketester] FATAL: manifest validation failed:', err)
    process.exit(1)
  }

  const brandFilter = getBrandFilter()
  const activeBrands = manifest.brands.filter((b) => {
    if (brandFilter === 'both') return true
    return b.id === brandFilter
  })

  // Override base URLs from environment if set
  for (const brand of activeBrands) {
    const envUrl = getBrandBaseUrl(brand.id)
    if (envUrl) {
      console.log(`[smoketester] Brand ${brand.id}: using env URL ${envUrl}`)
      brand.base_url = envUrl
    } else {
      console.log(`[smoketester] Brand ${brand.id}: using manifest URL ${brand.base_url}`)
    }
  }

  const results: RunResult[] = []
  let exitCode = 0
  let domainBlocked = false

  // ---------------------------------------------------------------------------
  // Phase ordering: anonymous → negative-auth → authenticated
  // ---------------------------------------------------------------------------
  const phases = ['anonymous', 'negative-auth', 'authenticated'] as const

  for (const brand of activeBrands) {
    console.log(`\n[smoketester] Brand: ${brand.id} (${brand.base_url})`)

    // Check domain reachability before running checks
    try {
      await withRetry(
        async () => {
          const browser = await chromium.launch({ headless: true })
          const page = await browser.newPage()
          try {
            const resp = await page.goto(brand.base_url, { timeout: 15_000, waitUntil: 'domcontentloaded' })
            if (!resp) throw new Error('No response')
          } finally {
            await browser.close()
          }
        },
        {
          maxRetries: 3,
          baseDelayMs: 1000,
          onRetry: (attempt, err) => {
            console.warn(`  [domain-retry ${attempt}/3] ${brand.id}: ${err}`)
          },
        },
      )
    } catch (err) {
      if (isDomainUnreachableError(err)) {
        console.error(`[smoketester] Domain ${brand.base_url} unreachable after 3 retries: ${err}`)
        domainBlocked = true
        // Mark all checks for this brand as BLOCKED
        for (const check of manifest.checks) {
          const langs = getCheckLanguages(check, manifest.languages)
          for (const lang of langs) {
            results.push({
              id: `${check.id}/${brand.id}/${lang}`,
              checkId: check.id,
              brand: brand.id,
              lang,
              phase: check.phase,
              status: 'SKIPPED',
              duration: 0,
              message: `Domain ${brand.base_url} unreachable (BLOCKED)`,
            })
          }
        }
        continue
      }
      throw err
    }

    // ---------------------------------------------------------------------------
    // Login (for authenticated phase)
    // ---------------------------------------------------------------------------
    let loginCookie: string | null = null
    let loginError: string | undefined

    const hasAuthChecks = manifest.checks.some((c) => c.phase === 'authenticated')
    if (hasAuthChecks) {
      const user = process.env['SMOKETEST_USER'] ?? ''
      const password = process.env['SMOKETEST_PASSWORD'] ?? ''
      if (user && password) {
        console.log(`  [auth] Logging in as ${user}...`)
        const loginResult = await performLogin(brand, user, password)
        loginCookie = loginResult.cookie
        loginError = loginResult.error
        if (!loginCookie) {
          console.warn(`  [auth] Login failed: ${loginError}`)
        } else {
          console.log('  [auth] Login successful')
        }
      } else {
        loginError = 'SMOKETEST_USER or SMOKETEST_PASSWORD not set — skipping authenticated phase'
        console.warn(`  [auth] ${loginError}`)
      }
    }

    // ---------------------------------------------------------------------------
    // Run checks by phase
    // ---------------------------------------------------------------------------
    for (const phase of phases) {
      const phaseChecks = manifest.checks.filter((c) => c.phase === phase)
      if (phaseChecks.length === 0) continue

      console.log(`\n  [phase: ${phase}]`)

      for (const check of phaseChecks) {
        const langs = getCheckLanguages(check, manifest.languages)

        // Skip authenticated checks if login failed
        if (phase === 'authenticated' && !loginCookie) {
          for (const lang of langs) {
            const result: RunResult = {
              id: `${check.id}/${brand.id}/${lang}`,
              checkId: check.id,
              brand: brand.id,
              lang,
              phase: check.phase,
              status: 'SKIPPED',
              duration: 0,
              message: loginError ?? 'Login failed — authenticated checks skipped',
            }
            results.push(result)
            console.log(`    SKIPPED ${check.id} [${lang}] — login failed`)
          }
          continue
        }

        for (const lang of langs) {
          process.stdout.write(`    ${check.id} [${lang}]... `)
          const result = await runCheck(check, brand, lang, loginCookie, runStart)
          results.push(result)
          console.log(result.status + (result.status !== 'PASS' ? ` — ${result.message}` : ''))

          if (result.status === 'FAIL') exitCode = Math.max(exitCode, 1)
        }
      }
    }
  }

  if (domainBlocked && exitCode === 0) {
    exitCode = 2
  }

  // ---------------------------------------------------------------------------
  // Report + mail
  // ---------------------------------------------------------------------------
  const runDurationMs = Date.now() - runStart
  const commitSha = process.env['DEPLOY_SHA'] ?? process.env['GITHUB_SHA'] ?? 'unknown'

  const passCount = results.filter((r) => r.status === 'PASS').length
  const failCount = results.filter((r) => r.status === 'FAIL').length
  const skipCount = results.filter((r) => r.status === 'SKIPPED').length

  console.log(`\n[smoketester] Run complete in ${(runDurationMs / 1000).toFixed(1)}s`)
  console.log(`[smoketester] Results: ${passCount} PASS / ${failCount} FAIL / ${skipCount} SKIPPED`)

  // Performance warning if over budget
  if (runDurationMs > 5 * 60 * 1000) {
    console.warn(`[smoketester] WARNING: Run exceeded 5-minute budget (${(runDurationMs / 1000).toFixed(0)}s)`)
  }

  // Generate reports
  const authChecksExist = manifest.checks.some((c) => c.phase === 'authenticated')
  const reportData = {
    results,
    manifestVersion: manifest.last_updated,
    commitSha,
    runDurationMs,
    brands: activeBrands.map((b) => b.id),
    loginFailed: authChecksExist ? !results.some((r) => r.checkId === 'login-flow' && r.status === 'PASS') : false,
  }

  // Determine subject prefix
  let subjectPrefix: '[SMOKE OK]' | '[SMOKE FAIL]' | '[SMOKE BLOCKED]'
  if (domainBlocked) {
    subjectPrefix = '[SMOKE BLOCKED]'
  } else if (exitCode === 0) {
    subjectPrefix = '[SMOKE OK]'
  } else {
    subjectPrefix = '[SMOKE FAIL]'
  }

  const htmlReport = generateHtmlReport(reportData)
  const textReport = generateTextReport({ ...reportData, subjectPrefix })

  // Write HTML report to disk (for GitHub Actions artifact upload)
  const { mkdirSync, writeFileSync } = await import('fs')
  const reportDir = join(__dirname, '..', 'report')
  mkdirSync(reportDir, { recursive: true })
  writeFileSync(join(reportDir, 'index.html'), htmlReport)
  console.log(`[smoketester] HTML report written to report/index.html`)

  // Send mail (unless dry run)
  const mailTo = process.env['SMOKETEST_MAIL_TO']
  if (mailTo) {
    await sendMail({
      subject: textReport.subject,
      html: htmlReport,
      text: textReport.body,
      results,
    })
  } else {
    console.log('[smoketester] SMOKETEST_MAIL_TO not set — skipping mail')
    console.log('[smoketester] Subject would be:', textReport.subject)
  }

  console.log(`[smoketester] Exit code: ${exitCode}`)
  process.exit(exitCode)
}

// Run
main().catch((err) => {
  console.error('[smoketester] Fatal error:', err)
  process.exit(1)
})

