import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { saveDraft, loadDraft, clearDraft, draftAgeMs } from '@/lib/onboarding/draftStorage'
import type { OnboardingDraft } from '@/types/shop-admin'

const BASE_DRAFT: Omit<OnboardingDraft, 'version' | 'expiresAt'> = {
  providerType: 'handwerker',
  domainSlugs: ['elektriker'],
  specialtySlugs: ['solar'],
  location: { lat: 34.9, lng: 33.6, address: 'Test 1, Nicosia', isB2cStorefront: true },
  contact: { whatsapp: '+357999' },
}

describe('draftStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('saves and loads a draft correctly', () => {
    saveDraft(BASE_DRAFT)
    const loaded = loadDraft()
    expect(loaded).not.toBeNull()
    expect(loaded!.providerType).toBe('handwerker')
    expect(loaded!.domainSlugs).toEqual(['elektriker'])
    expect(loaded!.version).toBe(1)
  })

  it('returns null when no draft exists', () => {
    expect(loadDraft()).toBeNull()
  })

  it('clears the draft', () => {
    saveDraft(BASE_DRAFT)
    clearDraft()
    expect(loadDraft()).toBeNull()
  })

  it('returns null for expired draft', () => {
    saveDraft(BASE_DRAFT)
    // Manually set expiresAt to the past
    const raw = JSON.parse(localStorage.getItem('pundo.onboarding.draft.v1')!) as OnboardingDraft
    raw.expiresAt = Date.now() - 1000
    localStorage.setItem('pundo.onboarding.draft.v1', JSON.stringify(raw))
    expect(loadDraft()).toBeNull()
    // Expired draft should be cleared
    expect(localStorage.getItem('pundo.onboarding.draft.v1')).toBeNull()
  })

  it('returns null and clears for wrong version', () => {
    saveDraft(BASE_DRAFT)
    const raw = JSON.parse(localStorage.getItem('pundo.onboarding.draft.v1')!) as Record<string, unknown>
    raw.version = 99
    localStorage.setItem('pundo.onboarding.draft.v1', JSON.stringify(raw))
    expect(loadDraft()).toBeNull()
    expect(localStorage.getItem('pundo.onboarding.draft.v1')).toBeNull()
  })

  it('handles corrupted JSON gracefully', () => {
    localStorage.setItem('pundo.onboarding.draft.v1', '{invalid json}}}')
    expect(loadDraft()).toBeNull()
  })

  it('draftAgeMs returns null when no draft', () => {
    expect(draftAgeMs()).toBeNull()
  })

  it('draftAgeMs returns a positive number for a fresh draft', () => {
    saveDraft(BASE_DRAFT)
    const age = draftAgeMs()
    expect(age).not.toBeNull()
    expect(age!).toBeGreaterThanOrEqual(0)
    // Age should be much less than the TTL (7 days in ms)
    expect(age!).toBeLessThan(7 * 24 * 60 * 60 * 1000)
  })

  it('overwrites existing draft on save', () => {
    saveDraft(BASE_DRAFT)
    saveDraft({ ...BASE_DRAFT, providerType: 'gastro', domainSlugs: ['grill'] })
    const loaded = loadDraft()
    expect(loaded!.providerType).toBe('gastro')
    expect(loaded!.domainSlugs).toEqual(['grill'])
  })
})
