import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Regression guard: setLangCookie must include the Secure flag.
 * Without it, Mozilla Observatory reports a missing Secure attribute
 * on the app_lang cookie (detected 2026-06-05).
 */
describe('setLangCookie — Secure flag regression', () => {
  let cookieWritten: string

  beforeEach(() => {
    cookieWritten = ''
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      set(val: string) {
        cookieWritten = val
      },
      get() {
        return ''
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes the Secure attribute when setting app_lang', async () => {
    const { setLangCookie } = await import('@/lib/lang')
    setLangCookie('de')
    expect(cookieWritten.toLowerCase()).toContain('secure')
  })

  it('writes SameSite=Lax together with Secure', async () => {
    const { setLangCookie } = await import('@/lib/lang')
    setLangCookie('ar')
    const lower = cookieWritten.toLowerCase()
    expect(lower).toContain('samesite=lax')
    expect(lower).toContain('secure')
  })
})
