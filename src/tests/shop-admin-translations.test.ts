import { describe, it, expect } from 'vitest'

// F8950 T33: aus coverage-gaps.test.tsx. Platzhalter {n} in allen 6 Sprachen, 7 Wochentage, Login-Button-Texte.
describe('shop-admin-translations — all languages', () => {
  const langs = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

  for (const lang of langs) {
    it(`${lang}: upload_success/upload_errors interpolate n`, async () => {
      const { tAdmin } = await import('@/lib/shop-admin-translations')
      const tr = tAdmin(lang)
      expect(tr.upload_success.replace('{n}', '7')).toContain('7')
      expect(tr.upload_errors.replace('{n}', '3')).toContain('3')
    })

    it(`${lang}: days array has 7 entries`, async () => {
      const { tAdmin } = await import('@/lib/shop-admin-translations')
      expect(tAdmin(lang).days).toHaveLength(7)
    })

    it(`${lang}: login_btn is non-empty string`, async () => {
      const { tAdmin } = await import('@/lib/shop-admin-translations')
      expect(tAdmin(lang).login_btn.length).toBeGreaterThan(0)
    })
  }

  it('AR: login_btn is in Arabic script', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('ar').login_btn).toBe('تسجيل الدخول')
  })

  it('HE: login_btn is in Hebrew script', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('he').login_btn).toBe('כניסה')
  })

  it('EL: days[0] is Monday in Greek', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('el').days[0]).toBe('Δευτέρα')
  })

  it('RU: days[0] is Monday in Russian', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('ru').days[0]).toBe('Понедельник')
  })
})
