// @vitest-environment node
// T14 — Tests for refactored /api/coming-soon route (Turnstile + backend proxy)
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock verifyTurnstile before importing the route
vi.mock('@/lib/turnstile-server', () => ({
  verifyTurnstile: vi.fn().mockResolvedValue(true),
}))

// Mock global fetch for backend proxy calls
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

const { POST } = await import('@/app/api/coming-soon/route')
const { verifyTurnstile } = await import('@/lib/turnstile-server')

function makeReq(body: unknown) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  return new Request('http://localhost/api/coming-soon', {
    method: 'POST',
    body: raw,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as Parameters<typeof POST>[0]
}

describe('POST /api/coming-soon', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('gibt 200 zurück bei gültiger E-Mail und bestandenem Turnstile', async () => {
    const res = await POST(makeReq({ email: 'test@example.com', turnstile_token: 'valid-token' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('gibt 400 bei fehlender E-Mail zurück', async () => {
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('gibt 400 bei E-Mail ohne @ zurück', async () => {
    const res = await POST(makeReq({ email: 'kein-at-zeichen', turnstile_token: 'token' }))
    expect(res.status).toBe(400)
  })

  it('gibt 400 bei zu langer E-Mail zurück', async () => {
    const res = await POST(makeReq({ email: 'a'.repeat(255) + '@example.com', turnstile_token: 'token' }))
    expect(res.status).toBe(400)
  })

  it('gibt 400 zurück wenn Turnstile fehlschlägt', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValueOnce(false)
    const res = await POST(makeReq({ email: 'test@example.com', turnstile_token: 'bad-token' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('captcha_failed')
  })

  it('leitet an Backend weiter mit email und turnstile_token', async () => {
    await POST(makeReq({ email: 'relay@example.com', turnstile_token: 'tok123' }))
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/coming-soon'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(callBody.email).toBe('relay@example.com')
    expect(callBody.turnstile_token).toBe('tok123')
  })

  it('gibt 502 zurück wenn Backend nicht erreichbar', async () => {
    mockFetch.mockRejectedValueOnce(new Error('connection refused'))
    const res = await POST(makeReq({ email: 'test@example.com', turnstile_token: 'tok' }))
    expect(res.status).toBe(502)
  })
})

describe('coming_soon Übersetzungen', () => {
  it('alle 6 Sprachen haben coming_soon_tagline', async () => {
    const { t } = await import('@/lib/translations')
    for (const lang of ['en', 'de', 'ru', 'el', 'ar', 'he']) {
      const tr = t(lang)
      expect(tr.coming_soon_tagline, `${lang}: missing tagline`).toBeTruthy()
      expect(tr.coming_soon_description, `${lang}: missing description`).toBeTruthy()
      expect(tr.coming_soon_label, `${lang}: missing label`).toBeTruthy()
      expect(tr.coming_soon_days, `${lang}: missing days`).toBeTruthy()
      expect(tr.coming_soon_email_submit, `${lang}: missing submit`).toBeTruthy()
    }
  })

  it('EN tagline ist "Find everything."', async () => {
    const { t } = await import('@/lib/translations')
    expect(t('en').coming_soon_tagline).toBe('Find everything.')
  })

  it('RU tagline enthält Kyrillisch', async () => {
    const { t } = await import('@/lib/translations')
    expect(t('ru').coming_soon_tagline).toMatch(/[а-яёА-ЯЁ]/)
  })

  it('AR tagline enthält Arabisch', async () => {
    const { t } = await import('@/lib/translations')
    expect(t('ar').coming_soon_tagline).toMatch(/[؀-ۿ]/)
  })
})
