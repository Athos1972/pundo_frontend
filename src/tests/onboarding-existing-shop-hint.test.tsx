// F5970 AC 34/35: the wizard asks whether the shop already exists (after the website and after the name)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { OnboardingWizard } from '@/components/shop-admin/onboarding/OnboardingWizard'
import { OnboardingExistingShopHint } from '@/components/shop-admin/onboarding/OnboardingExistingShopHint'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'
import type { ClaimCandidate } from '@/types/shop-admin'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('next/dynamic', () => ({ default: () => () => null }))
vi.mock('@/lib/onboarding/onboardingApi', () => ({
  submitOnboarding: vi.fn(), uploadOnboardingPhoto: vi.fn(), startGoogleOAuth: vi.fn(),
  matchExistingShops: vi.fn(),
}))
vi.mock('@/lib/onboarding/draftStorage', () => ({
  loadDraft: vi.fn(), saveDraft: vi.fn(), clearDraft: vi.fn(), draftAgeMs: vi.fn(() => 1000),
}))
vi.mock('@/lib/onboarding/domains', () => ({ OTHER_DOMAIN_SLUG: 'other', getDomains: vi.fn().mockResolvedValue([]), clearDomainsCache: vi.fn() }))
// The real steps are covered elsewhere: stubs expose just the hand-over to the wizard.
vi.mock('@/components/shop-admin/onboarding/StepContact', () => ({
  StepContact: ({ onNext }: { onNext: (c: object, consent: boolean) => void }) => (
    <div data-testid="step-contact">
      <button onClick={() => onNext({ website: 'https://www.beispiel.cy/' }, false)}>contact-with-website</button>
      <button onClick={() => onNext({ phone: '+357 99 123456' }, false)}>contact-without-website</button>
    </div>
  ),
}))
vi.mock('@/components/shop-admin/onboarding/StepPhoto', () => ({
  StepPhoto: ({ onNext }: { onNext: (f: File | null, name: string) => void }) => (
    <div data-testid="step-photo">
      <button onClick={() => onNext(null, 'Cafe Omega')}>photo-with-name</button>
      <button onClick={() => onNext(null, '   ')}>photo-without-name</button>
    </div>
  ),
}))
vi.mock('@/components/shop-admin/onboarding/StepCredentials', () => ({ StepCredentials: () => <div data-testid="step-credentials" /> }))

import * as api from '@/lib/onboarding/onboardingApi'
import * as draftMod from '@/lib/onboarding/draftStorage'

const tr = tShopAdminClaim('en')
const match = vi.mocked(api.matchExistingShops)
const cand = (slug: string, over: Partial<ClaimCandidate> = {}): ClaimCandidate => ({
  slug, name: `Shop ${slug}`, city: 'Limassol', website_host: 'beispiel.cy', is_claimed: false, ...over,
})

function resumeAtContactStep() {
  vi.mocked(draftMod.loadDraft).mockReturnValue({
    version: 2, expiresAt: Date.now() + 1e6, providerType: 'dienstleister', domainSlugs: ['x'], specialtySlugs: [],
    location: { lat: 34.68, lng: 33.04, address: 'A', isB2cStorefront: true }, contact: {}, shopName: '',
  } as never)
  render(<OnboardingWizard lang="en" />)
  fireEvent.click(screen.getByText('Continue'))
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  match.mockResolvedValue([])
})

describe('after the website step', () => {
  it('looks up by the website and shows the hint instead of the next step', async () => {
    match.mockResolvedValue([cand('cafe-omega')])
    resumeAtContactStep()
    fireEvent.click(screen.getByText('contact-with-website'))
    await waitFor(() => expect(screen.getByTestId('onboarding-existing-shop-hint')).toBeInTheDocument())
    expect(match).toHaveBeenCalledWith({ website: 'https://www.beispiel.cy/' }, 'en')
    expect(screen.getByText(tr.claim_hint_title_one)).toBeInTheDocument()
    expect(screen.queryByTestId('step-photo')).toBeNull()
  })

  it('"This is my shop" leaves for the claim page with the origin flag and keeps the draft', async () => {
    match.mockResolvedValue([cand('cafe omega')])
    resumeAtContactStep()
    fireEvent.click(screen.getByText('contact-with-website'))
    await waitFor(() => screen.getByTestId('onboarding-existing-shop-hint'))
    fireEvent.click(screen.getByRole('button', { name: tr.claim_hint_mine }))
    expect(push).toHaveBeenCalledWith('/shop-admin/claim?shop=cafe%20omega&from=onboarding')
    expect(draftMod.saveDraft).toHaveBeenCalled() // persisted before the lookup
    expect(draftMod.clearDraft).not.toHaveBeenCalled()
  })

  it('"No, a different shop" continues exactly as before (regression, AC 35)', async () => {
    match.mockResolvedValue([cand('a')])
    resumeAtContactStep()
    fireEvent.click(screen.getByText('contact-with-website'))
    await waitFor(() => screen.getByTestId('onboarding-existing-shop-hint'))
    fireEvent.click(screen.getByRole('button', { name: tr.claim_hint_other_one }))
    expect(screen.getByTestId('step-photo')).toBeInTheDocument()
    expect(screen.queryByTestId('onboarding-existing-shop-hint')).toBeNull()
    expect(push).not.toHaveBeenCalled()
  })

  it('no match: goes straight on, no hint', async () => {
    resumeAtContactStep()
    fireEvent.click(screen.getByText('contact-with-website'))
    await waitFor(() => expect(screen.getByTestId('step-photo')).toBeInTheDocument())
    expect(screen.queryByTestId('onboarding-existing-shop-hint')).toBeNull()
  })

  it('no website: no lookup at all', async () => {
    resumeAtContactStep()
    fireEvent.click(screen.getByText('contact-without-website'))
    await waitFor(() => expect(screen.getByTestId('step-photo')).toBeInTheDocument())
    expect(match).not.toHaveBeenCalled()
  })
})

describe('after the name step', () => {
  async function toPhotoStep() {
    resumeAtContactStep()
    fireEvent.click(screen.getByText('contact-without-website'))
    await waitFor(() => screen.getByTestId('step-photo'))
  }

  it('looks up by name and coordinates', async () => {
    match.mockResolvedValue([cand('a'), cand('b', { is_claimed: true })])
    await toPhotoStep()
    fireEvent.click(screen.getByText('photo-with-name'))
    await waitFor(() => screen.getByTestId('onboarding-existing-shop-hint'))
    expect(match).toHaveBeenCalledWith({ name: 'Cafe Omega', lat: 34.68, lng: 33.04 }, 'en')
    expect(screen.getByText(tr.claim_hint_title_many)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: tr.claim_hint_mine })).toHaveLength(2)
    expect(screen.getByText(tr.claim_hint_claimed)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: tr.claim_hint_other_many })).toBeInTheDocument()
  })

  it('"None of these" goes on to the credentials step', async () => {
    match.mockResolvedValue([cand('a'), cand('b')])
    await toPhotoStep()
    fireEvent.click(screen.getByText('photo-with-name'))
    await waitFor(() => screen.getByTestId('onboarding-existing-shop-hint'))
    fireEvent.click(screen.getByRole('button', { name: tr.claim_hint_other_many }))
    expect(screen.getByTestId('step-credentials')).toBeInTheDocument()
  })

  it('a shop the user already declined is not offered a second time', async () => {
    match.mockResolvedValue([cand('a')])
    resumeAtContactStep()
    fireEvent.click(screen.getByText('contact-with-website'))
    await waitFor(() => screen.getByTestId('onboarding-existing-shop-hint'))
    fireEvent.click(screen.getByRole('button', { name: tr.claim_hint_other_one })) // declines "a"
    await waitFor(() => screen.getByTestId('step-photo'))
    fireEvent.click(screen.getByText('photo-with-name'))
    await waitFor(() => expect(screen.getByTestId('step-credentials')).toBeInTheDocument())
    expect(screen.queryByTestId('onboarding-existing-shop-hint')).toBeNull()
  })

  it('an empty name does not trigger a lookup', async () => {
    await toPhotoStep()
    fireEvent.click(screen.getByText('photo-without-name'))
    await waitFor(() => screen.getByTestId('step-credentials'))
    expect(match).not.toHaveBeenCalled()
  })
})

describe('OnboardingExistingShopHint', () => {
  it('lists name, city and website host', () => {
    render(<OnboardingExistingShopHint tr={tr} candidates={[cand('a', { name: 'Cafe Omega' })]} onClaim={vi.fn()} onOther={vi.fn()} />)
    expect(screen.getByText('Cafe Omega')).toBeInTheDocument()
    expect(screen.getByText('Limassol')).toBeInTheDocument()
    expect(screen.getByText('beispiel.cy')).toBeInTheDocument()
  })

  it.each(['de', 'el', 'ru', 'ar', 'he'] as const)('is translated in %s', (lang) => {
    const t = tShopAdminClaim(lang)
    render(<OnboardingExistingShopHint tr={t} candidates={[cand('a')]} onClaim={vi.fn()} onOther={vi.fn()} />)
    expect(screen.getByText(t.claim_hint_title_one)).toBeInTheDocument()
    expect(t.claim_hint_title_one).not.toBe(tr.claim_hint_title_one)
  })
})
