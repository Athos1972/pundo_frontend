/**
 * Bug "Login-Fehlermeldungen des Shop-Admin erscheinen unübersetzt auf Englisch":
 * bekannte Backend-detail-Texte werden je Sprache übersetzt, unbekannte werden generisch.
 */
import { describe, it, expect } from 'vitest'
import { tAdmin } from '@/lib/shop-admin-translations'
import { LANGS } from '@/lib/lang'
import { loginErrorMessage } from '@/lib/shop-admin-login-error'

describe('loginErrorMessage', () => {
  it.each(LANGS)('übersetzt die drei Backend-Texte in %s', (lang) => {
    const tr = tAdmin(lang)
    expect(loginErrorMessage('Account pending approval', tr)).toBe(tr.login_error_pending_approval)
    expect(loginErrorMessage('Account rejected', tr)).toBe(tr.login_error_rejected)
    expect(loginErrorMessage('Invalid credentials', tr)).toBe(tr.login_error_invalid_credentials)
    for (const text of [tr.login_error_pending_approval, tr.login_error_rejected, tr.login_error_invalid_credentials]) {
      expect(text.length).toBeGreaterThan(10)
      expect(text).not.toBe('Account pending approval')
    }
  })

  it('zeigt außerhalb von en nie den englischen Text', () => {
    const en = tAdmin('en')
    for (const lang of LANGS.filter((l) => l !== 'en')) {
      const tr = tAdmin(lang)
      expect(tr.login_error_pending_approval).not.toBe(en.login_error_pending_approval)
      expect(tr.login_error_rejected).not.toBe(en.login_error_rejected)
      expect(tr.login_error_invalid_credentials).not.toBe(en.login_error_invalid_credentials)
    }
  })

  it('fällt bei unbekanntem oder fehlendem detail auf die generische Meldung zurück', () => {
    const tr = tAdmin('de')
    expect(loginErrorMessage('Something else', tr)).toBe(tr.error_generic)
    expect(loginErrorMessage(undefined, tr)).toBe(tr.error_generic)
    expect(loginErrorMessage([{ field: 'email' }], tr)).toBe(tr.error_generic)
  })
})
