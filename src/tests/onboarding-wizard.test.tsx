import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingWizard } from '@/components/shop-admin/onboarding/OnboardingWizard'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock onboardingApi
vi.mock('@/lib/onboarding/onboardingApi', () => ({
  submitOnboarding: vi.fn(),
  uploadOnboardingPhoto: vi.fn(),
  startGoogleOAuth: vi.fn(),
}))

// Mock draftStorage
vi.mock('@/lib/onboarding/draftStorage', () => ({
  loadDraft: vi.fn(() => null),
  saveDraft: vi.fn(),
  clearDraft: vi.fn(),
  draftAgeMs: vi.fn(() => null),
}))

// Mock domains fetch
vi.mock('@/lib/onboarding/domains', () => ({
  getDomains: vi.fn().mockResolvedValue([
    { slug: 'elektriker', label: 'Elektriker', specialties: [{ slug: 'solar', label: 'Solar' }] },
    { slug: 'maler', label: 'Maler', specialties: [] },
  ]),
}))

// Mock dynamic import of map
vi.mock('@/components/shop-admin/onboarding/OnboardingMapInner', () => ({
  OnboardingMapInner: () => <div data-testid="onboarding-map">Map</div>,
}))

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders step 1 on mount', () => {
    render(<OnboardingWizard lang="de" />)
    expect(screen.getByText(/Womit bringst Du Wert/i)).toBeInTheDocument()
  })

  it('shows 4 provider type tiles', () => {
    render(<OnboardingWizard lang="de" />)
    expect(screen.getByText('Handwerker')).toBeInTheDocument()
    expect(screen.getByText('Dienstleister')).toBeInTheDocument()
    expect(screen.getByText('Händler')).toBeInTheDocument()
    expect(screen.getByText('Restaurant / Bar')).toBeInTheDocument()
  })

  it('next button disabled until a type is selected', () => {
    render(<OnboardingWizard lang="de" />)
    const nextBtn = screen.getByText('Weiter')
    expect(nextBtn).toBeDisabled()
    fireEvent.click(screen.getByText('Handwerker'))
    expect(nextBtn).not.toBeDisabled()
  })

  it('advances to step 2 after selecting a type and clicking next', async () => {
    render(<OnboardingWizard lang="de" />)
    fireEvent.click(screen.getByText('Handwerker'))
    fireEvent.click(screen.getByText('Weiter'))
    await waitFor(() => {
      expect(screen.getByText(/Was bietest Du an/i)).toBeInTheDocument()
    })
  })

  it('shows progress bar', () => {
    render(<OnboardingWizard lang="en" />)
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument()
  })

  it('renders in English with correct translations', () => {
    render(<OnboardingWizard lang="en" />)
    expect(screen.getByText(/What value do you bring/i)).toBeInTheDocument()
    expect(screen.getByText('Tradesperson')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('shows draft banner when a saved draft exists', async () => {
    const draftMod = await import('@/lib/onboarding/draftStorage')
    vi.mocked(draftMod.loadDraft).mockReturnValue({
      version: 1,
      expiresAt: Date.now() + 1000 * 60 * 60,
      providerType: 'handwerker',
      domainSlugs: ['elektriker'],
      specialtySlugs: [],
      location: { lat: 34.9, lng: 33.6, address: 'Test', isB2cStorefront: true },
      contact: { whatsapp: '+357' },
    })
    vi.mocked(draftMod.draftAgeMs).mockReturnValue(3600000)

    render(<OnboardingWizard lang="de" />)
    expect(screen.getByText(/Weitermachen/i)).toBeInTheDocument()
    expect(screen.getByText('Fortsetzen')).toBeInTheDocument()
    expect(screen.getByText('Neu beginnen')).toBeInTheDocument()
  })
})
