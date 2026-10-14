import { describe, it, expect } from 'vitest'
import { tSysAdmin } from '@/lib/system-admin-translations'

describe('tSysAdmin', () => {
  it('returns EN translations by default', () => {
    const tr = tSysAdmin('en')
    expect(tr.login_title).toBe('System Admin')
    expect(tr.sign_in).toBe('Sign in')
    expect(tr.nav_shops).toBe('Shops')
  })

  it('returns EL translations for el', () => {
    const tr = tSysAdmin('el')
    expect(tr.sign_in).toBe('Σύνδεση')
    expect(tr.nav_shops).toBe('Καταστήματα')
    expect(tr.save).toBe('Αποθήκευση')
  })

  it('falls back to EN for de (admin UI is EN + EL only)', () => {
    expect(tSysAdmin('de').sign_in).toBe('Sign in')
  })

  it('falls back to EN for unknown language', () => {
    const tr = tSysAdmin('fr')
    expect(tr.sign_in).toBe('Sign in')
  })

  it('has 7 day labels in EN', () => {
    const tr = tSysAdmin('en')
    expect(tr.days).toHaveLength(7)
    expect(tr.days[0]).toBe('Monday')
    expect(tr.days[6]).toBe('Sunday')
  })

  it('has 7 day labels in EL', () => {
    const tr = tSysAdmin('el')
    expect(tr.days).toHaveLength(7)
    expect(tr.days[0]).toBe('Δευτέρα')
    expect(tr.days[6]).toBe('Κυριακή')
  })

  it('has all required nav keys', () => {
    const tr = tSysAdmin('en')
    const navKeys = [
      'nav_dashboard', 'nav_shops', 'nav_shop_types', 'nav_shop_owners',
      'nav_products', 'nav_categories', 'nav_cat_attr_defs', 'nav_brands',
      'nav_offers', 'nav_so_offers', 'nav_api_keys',
    ] as const
    for (const key of navKeys) {
      expect(tr[key]).toBeTruthy()
    }
  })

  it('has required common action keys', () => {
    const tr = tSysAdmin('en')
    expect(tr.save).toBeTruthy()
    expect(tr.cancel).toBeTruthy()
    expect(tr.delete).toBeTruthy()
    expect(tr.confirm_delete).toBeTruthy()
    expect(tr.error_generic).toBeTruthy()
    expect(tr.saved).toBeTruthy()
    expect(tr.deleted).toBeTruthy()
  })
})

describe('system-admin types', () => {
  it('DayHours has day field', () => {
    const day: import('@/types/system-admin').DayHours = { day: 0, open: '09:00', close: '18:00', closed: false }
    expect(day.day).toBe(0)
    expect(day.closed).toBe(false)
  })
})
