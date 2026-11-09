import { describe, it, expect } from 'vitest'
import { validatePassword, isValidEmail } from '@/lib/onboarding/credentialsValidation'

describe('validatePassword', () => {
  it('rejects fewer than 8 characters', () => {
    expect(validatePassword('1234567')).toBe('short')
    expect(validatePassword('')).toBe('short')
  })
  it('accepts 8 characters and exactly 72 bytes', () => {
    expect(validatePassword('12345678')).toBeNull()
    expect(validatePassword('a'.repeat(72))).toBeNull()
  })
  it('rejects more than 72 bytes (UTF-8)', () => {
    expect(validatePassword('a'.repeat(73))).toBe('long')
    // 40 chars but 80 bytes
    expect(validatePassword('ä'.repeat(40))).toBe('long')
  })
})

describe('isValidEmail', () => {
  it('accepts normal addresses', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail(' owner+x@shop.example.com ')).toBe(true)
  })
  it('rejects invalid addresses', () => {
    for (const v of ['', 'abc', 'a@b', 'a@@b.co', 'a b@c.de', '@b.co', 'a@b..co']) {
      expect(isValidEmail(v)).toBe(false)
    }
  })
})
