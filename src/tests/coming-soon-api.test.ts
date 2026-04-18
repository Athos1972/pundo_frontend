// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

// Mock fs — muss vor dem Route-Import stehen
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    promises: {
      ...actual.promises,
      mkdir: vi.fn().mockResolvedValue(undefined),
      appendFile: vi.fn().mockResolvedValue(undefined),
    },
  }
})

const { POST } = await import('@/app/api/coming-soon/route')

function makeReq(body: unknown) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  return new Request('http://localhost/api/coming-soon', {
    method: 'POST',
    body: raw,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as Parameters<typeof POST>[0]
}

describe('POST /api/coming-soon', () => {
  it('gibt 200 zurück bei gültiger E-Mail', async () => {
    const res = await POST(makeReq({ email: 'test@example.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('gibt 400 bei fehlender E-Mail zurück', async () => {
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('gibt 400 bei E-Mail ohne @ zurück', async () => {
    const res = await POST(makeReq({ email: 'kein-at-zeichen' }))
    expect(res.status).toBe(400)
  })

  it('gibt 400 bei zu langer E-Mail zurück', async () => {
    const res = await POST(makeReq({ email: 'a'.repeat(255) + '@example.com' }))
    expect(res.status).toBe(400)
  })

  it('schreibt E-Mail in Datei', async () => {
    const { promises: fs } = await import('fs')
    vi.mocked(fs.appendFile).mockClear()
    await POST(makeReq({ email: 'signup@naidivse.com' }))
    expect(fs.appendFile).toHaveBeenCalledWith(
      expect.stringContaining('naidivse-signups.txt'),
      'signup@naidivse.com\n',
      'utf8',
    )
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
    expect(t('ar').coming_soon_tagline).toMatch(/[\u0600-\u06FF]/)
  })
})
