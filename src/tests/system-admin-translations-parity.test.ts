// F5970 AC 43: the system admin speaks en + el only -- both blocks must stay in step (whole file, not just claims)
import { describe, it, expect } from 'vitest'
import { tSysAdmin } from '@/lib/system-admin-translations'

const en = tSysAdmin('en') as unknown as Record<string, string>
const el = tSysAdmin('el') as unknown as Record<string, string>
const placeholders = (s: string) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')

describe('system-admin translations', () => {
  it('el has exactly the keys of en', () => {
    expect(Object.keys(el).sort()).toEqual(Object.keys(en).sort())
  })

  it('uses the same {placeholders} in both languages', () => {
    const bad = Object.keys(en).filter((k) => typeof en[k] === 'string' && placeholders(en[k]) !== placeholders(el[k]))
    expect(bad).toEqual([])
  })

  it('has no empty value', () => {
    const empty = [...Object.keys(en).filter((k) => !String(en[k]).trim()), ...Object.keys(el).filter((k) => !String(el[k]).trim())]
    expect(empty).toEqual([])
  })

  it('every F5970 key is translated, not copied (Greek script present)', () => {
    const claimKeys = Object.keys(en).filter((k) => /^(claims_|assign_|matching_|owner_section_|owner_status_suspended|owner_suspend|owner_unsuspend|owner_confirm_suspend|owner_suspended_|owner_open_claim_|dashboard_claims_|nav_claims)/.test(k))
    expect(claimKeys.length).toBeGreaterThan(150)
    // loan words / abbreviations that are identical in Greek on purpose
    const SAME = new Set(['claims_source_onboarding', 'claims_col_id', 'claims_method_email_domain', 'claims_field_email', 'claims_proof_by_admin'])
    const untranslated = claimKeys.filter((k) => !SAME.has(k) && !/[\u0370-\u03FF]/.test(el[k]))
    expect(untranslated).toEqual([])
  })

  it('falls back to English for other languages', () => {
    expect(tSysAdmin('de')).toBe(tSysAdmin('en'))
  })
})
