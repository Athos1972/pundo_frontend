/**
 * Assert engine — one implementation per AssertType from manifest.schema.ts.
 *
 * Each assert function receives the current Playwright Page plus the assert
 * config from the manifest and returns an AssertResult.
 *
 * resolve_first_item logic: if a check has resolve_first_item: true, the runner
 * calls resolveFirstItem() before running asserts. This navigates to the list
 * path, extracts the first item link, and returns the resolved URL so asserts
 * run against the detail page.
 */

import type { Page, Response } from '@playwright/test'
import type { Assert } from '../manifest.schema.js'
import { tSync } from './translations-loader.js'

export interface AssertResult {
  ok: boolean
  expected: unknown
  actual: unknown
  message: string
  screenshot?: Buffer
}

// ---------------------------------------------------------------------------
// Per-type implementations
// ---------------------------------------------------------------------------

async function assertStatus(
  page: Page,
  response: Response | null,
  assert: Extract<Assert, { type: 'status' }>,
): Promise<AssertResult> {
  const actual = response?.status() ?? null
  const ok = actual === assert.expected
  return {
    ok,
    expected: assert.expected,
    actual,
    message: ok
      ? `HTTP ${actual} as expected`
      : `Expected HTTP ${assert.expected}, got ${actual ?? '(no response)'}`,
  }
}

async function assertSelectorVisible(
  page: Page,
  assert: Extract<Assert, { type: 'selector-visible' }>,
): Promise<AssertResult> {
  try {
    const locator = page.locator(assert.selector)
    const count = await locator.count()
    if (count === 0) {
      return {
        ok: false,
        expected: `selector "${assert.selector}" visible`,
        actual: 'element not found',
        message: `Selector "${assert.selector}" not found in DOM`,
      }
    }
    const visible = await locator.first().isVisible()
    return {
      ok: visible,
      expected: `selector "${assert.selector}" visible`,
      actual: visible ? 'visible' : 'hidden',
      message: visible
        ? `Selector "${assert.selector}" is visible`
        : `Selector "${assert.selector}" is present but not visible`,
    }
  } catch (err) {
    return {
      ok: false,
      expected: `selector "${assert.selector}" visible`,
      actual: String(err),
      message: `Error checking selector "${assert.selector}": ${err}`,
    }
  }
}

async function assertTextFromTranslations(
  page: Page,
  lang: string,
  assert: Extract<Assert, { type: 'text-from-translations' }>,
): Promise<AssertResult> {
  const expected = tSync(assert.key, lang)
  if (expected === null) {
    return {
      ok: false,
      expected: `translation key "${assert.key}" for lang "${lang}"`,
      actual: null,
      message: `Translation key "${assert.key}" not found for lang "${lang}" — check translations.ts`,
    }
  }

  try {
    const body = await page.locator('body')
    const text = await body.textContent()
    const found = text?.includes(expected) ?? false
    return {
      ok: found,
      expected: `text contains "${expected}"`,
      actual: found ? 'found' : 'not found',
      message: found
        ? `Found expected translation text "${expected}"`
        : `Expected translation text "${expected}" (key: ${assert.key}, lang: ${lang}) not found on page`,
    }
  } catch (err) {
    return {
      ok: false,
      expected: `text contains "${expected}"`,
      actual: String(err),
      message: `Error checking translation text: ${err}`,
    }
  }
}

async function assertHtmlAttribute(
  page: Page,
  assert: Extract<Assert, { type: 'html-attribute' }>,
): Promise<AssertResult> {
  try {
    const element = page.locator(assert.selector).first()
    const actual = await element.getAttribute(assert.attribute)
    const ok = actual === assert.expected
    return {
      ok,
      expected: `${assert.selector}[${assert.attribute}="${assert.expected}"]`,
      actual: actual ?? '(null)',
      message: ok
        ? `Attribute "${assert.attribute}" on "${assert.selector}" is "${actual}"`
        : `Expected "${assert.selector}"[${assert.attribute}]="${assert.expected}", got "${actual ?? '(null)'}"`,
    }
  } catch (err) {
    return {
      ok: false,
      expected: `${assert.selector}[${assert.attribute}="${assert.expected}"]`,
      actual: String(err),
      message: `Error checking html-attribute: ${err}`,
    }
  }
}

async function assertRedirectTo(
  page: Page,
  response: Response | null,
  assert: Extract<Assert, { type: 'redirect-to' }>,
): Promise<AssertResult> {
  // Check final URL after navigation (Playwright follows redirects)
  const finalUrl = page.url()
  const locationContains = assert['location-contains']
  const ok = finalUrl.includes(locationContains)
  return {
    ok,
    expected: `URL contains "${locationContains}"`,
    actual: finalUrl,
    message: ok
      ? `Page redirected to URL containing "${locationContains}": ${finalUrl}`
      : `Expected redirect to URL containing "${locationContains}", got: ${finalUrl}`,
  }
}

async function assertNoConsoleErrors(
  consoleErrors: string[],
): Promise<AssertResult> {
  const ok = consoleErrors.length === 0
  return {
    ok,
    expected: 'no console errors',
    actual: consoleErrors.length === 0 ? 'no errors' : consoleErrors,
    message: ok
      ? 'No console errors detected'
      : `${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 3).join('; ')}`,
  }
}

async function assertMdxRendered(page: Page): Promise<AssertResult> {
  try {
    const article = page.locator('article').first()
    const count = await article.count()
    if (count === 0) {
      return {
        ok: false,
        expected: '<article> element with children',
        actual: '<article> not found',
        message: 'No <article> element found — MDX may not have rendered',
      }
    }

    // Check that the article has meaningful content (not an empty shell)
    const childCount = await article.locator('> *').count()
    const textContent = await article.textContent()
    const hasContent = childCount > 0 && (textContent?.trim().length ?? 0) > 20

    return {
      ok: hasContent,
      expected: '<article> with children and text content',
      actual: `${childCount} child elements, ${textContent?.trim().length ?? 0} chars`,
      message: hasContent
        ? `<article> has ${childCount} children and content`
        : `<article> appears empty (${childCount} children, ${textContent?.trim().length ?? 0} chars) — MDX may not have rendered`,
    }
  } catch (err) {
    return {
      ok: false,
      expected: '<article> with children',
      actual: String(err),
      message: `Error checking MDX render: ${err}`,
    }
  }
}

async function assertSelectorCountMin(
  page: Page,
  assert: Extract<Assert, { type: 'selector-count-min' }>,
): Promise<AssertResult> {
  try {
    const count = await page.locator(assert.selector).count()
    const ok = count >= assert.min
    return {
      ok,
      expected: `at least ${assert.min} element(s) matching "${assert.selector}"`,
      actual: count,
      message: ok
        ? `Found ${count} element(s) matching "${assert.selector}" (min: ${assert.min})`
        : `Expected at least ${assert.min} element(s) matching "${assert.selector}", found ${count}`,
    }
  } catch (err) {
    return {
      ok: false,
      expected: `at least ${assert.min} element(s) matching "${assert.selector}"`,
      actual: String(err),
      message: `Error checking selector count: ${err}`,
    }
  }
}

async function assertTextNotPresent(
  page: Page,
  assert: Extract<Assert, { type: 'text-not-present' }>,
): Promise<AssertResult> {
  try {
    const bodyText = await page.locator('body').textContent()
    const found = bodyText?.includes(assert.text) ?? false
    return {
      ok: !found,
      expected: `text "${assert.text}" not present`,
      actual: found ? 'present' : 'not present',
      message: !found
        ? `Confirmed text "${assert.text}" is not present`
        : `Forbidden text "${assert.text}" found on page`,
    }
  } catch (err) {
    return {
      ok: false,
      expected: `text "${assert.text}" not present`,
      actual: String(err),
      message: `Error checking text-not-present: ${err}`,
    }
  }
}

// ---------------------------------------------------------------------------
// resolve_first_item helper
// ---------------------------------------------------------------------------

/**
 * Navigate to listPath, find the first item link matching selector,
 * and return the href. Returns null if no item found.
 */
export async function resolveFirstItem(
  page: Page,
  listPath: string,
  baseUrl: string,
  selector: string,
): Promise<string | null> {
  const fullUrl = `${baseUrl}${listPath}`
  await page.goto(fullUrl, { waitUntil: 'domcontentloaded' })

  // Try each selector variant (comma-separated)
  const selectors = selector.split(',').map((s) => s.trim())
  for (const sel of selectors) {
    const locator = page.locator(sel).first()
    const count = await locator.count()
    if (count > 0) {
      const href = await locator.getAttribute('href')
      if (href) {
        // Resolve relative href to absolute URL
        if (href.startsWith('http')) return href
        return `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Main dispatch function
// ---------------------------------------------------------------------------

export interface RunAssertOptions {
  page: Page
  assert: Assert
  lang: string
  response: Response | null
  consoleErrors: string[]
}

export async function runAssert(opts: RunAssertOptions): Promise<AssertResult> {
  const { page, assert, lang, response, consoleErrors } = opts

  switch (assert.type) {
    case 'status':
      return assertStatus(page, response, assert)

    case 'selector-visible':
      return assertSelectorVisible(page, assert)

    case 'text-from-translations':
      return assertTextFromTranslations(page, lang, assert)

    case 'html-attribute':
      return assertHtmlAttribute(page, assert)

    case 'redirect-to':
      return assertRedirectTo(page, response, assert)

    case 'no-console-errors':
      return assertNoConsoleErrors(consoleErrors)

    case 'mdx-rendered':
      return assertMdxRendered(page)

    case 'selector-count-min':
      return assertSelectorCountMin(page, assert)

    case 'text-not-present':
      return assertTextNotPresent(page, assert)

    case 'login-success':
      // login-success is handled by the runner's phase logic, not by assert-engine
      return {
        ok: true,
        expected: 'login handled by runner phase logic',
        actual: 'delegated',
        message: 'login-success assert is processed by runner phase logic',
      }

    default: {
      const _exhaustive: never = assert
      return {
        ok: false,
        expected: 'known assert type',
        actual: (_exhaustive as Assert).type,
        message: `Unknown assert type: ${(_exhaustive as Assert).type}`,
      }
    }
  }
}
