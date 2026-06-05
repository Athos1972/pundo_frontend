import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OTHER_DOMAIN_SLUG } from '@/lib/onboarding/domains'
import { StepDomains } from '@/components/shop-admin/onboarding/StepDomains'
import { tAdmin } from '@/lib/shop-admin-translations'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/onboarding/domains', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/onboarding/domains')>()
  return {
    ...actual,
    getDomains: vi.fn().mockResolvedValue([
      { slug: 'elektriker', label: 'Elektriker', specialties: [{ slug: 'solar', label: 'Solar' }] },
      { slug: 'maler', label: 'Maler', specialties: [] },
    ]),
  }
})

const tr = tAdmin('de')
const defaultProps = {
  tr,
  lang: 'de',
  providerType: 'handwerker' as const,
  selectedDomainSlugs: [],
  selectedSpecialtySlugs: [],
  onNext: vi.fn(),
  onBack: vi.fn(),
}

// ─── OTHER_DOMAIN_SLUG constant ───────────────────────────────────────────────

describe('OTHER_DOMAIN_SLUG', () => {
  it('equals "other"', () => {
    expect(OTHER_DOMAIN_SLUG).toBe('other')
  })
})

// ─── onboardingApi — sentinel stripping ───────────────────────────────────────

describe('onboardingApi sentinel stripping', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user_id: 1, shop_id: 1, status: 'pending' }),
    }))
  })

  it('strips OTHER_DOMAIN_SLUG from domain_slugs before sending to backend', async () => {
    const { submitOnboarding } = await import('@/lib/onboarding/onboardingApi')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user_id: 1, shop_id: 1, status: 'pending' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await submitOnboarding({
      providerType: 'dienstleister',
      domainSlugs: [OTHER_DOMAIN_SLUG],
      specialtySlugs: [],
      location: { lat: 35.1, lng: 33.3, address: 'Test', isB2cStorefront: true },
      contact: { phone: '+357123' },
      shopName: 'Test Shop',
      credentials: { email: 'test@example.com', password: 'pass123!' },
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.domain_slugs).toEqual([])
    expect(body.specialty_slugs).toEqual([])
  })

  it('keeps real domain_slugs unchanged', async () => {
    const { submitOnboarding } = await import('@/lib/onboarding/onboardingApi')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user_id: 1, shop_id: 1, status: 'pending' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await submitOnboarding({
      providerType: 'handwerker',
      domainSlugs: ['elektriker', 'maler'],
      specialtySlugs: ['solar'],
      location: { lat: 35.1, lng: 33.3, address: 'Test', isB2cStorefront: true },
      contact: { phone: '+357123' },
      shopName: 'Test Shop',
      credentials: { email: 'test@example.com', password: 'pass123!' },
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.domain_slugs).toEqual(['elektriker', 'maler'])
    expect(body.specialty_slugs).toEqual(['solar'])
  })

  it('strips other but preserves real domains if somehow mixed', async () => {
    const { submitOnboarding } = await import('@/lib/onboarding/onboardingApi')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user_id: 1, shop_id: 1, status: 'pending' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await submitOnboarding({
      providerType: 'handwerker',
      domainSlugs: ['elektriker', OTHER_DOMAIN_SLUG],
      specialtySlugs: ['solar'],
      location: { lat: 35.1, lng: 33.3, address: 'Test', isB2cStorefront: true },
      contact: { phone: '+357123' },
      shopName: 'Test Shop',
      credentials: { email: 'test@example.com', password: 'pass123!' },
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.domain_slugs).toEqual(['elektriker'])
    expect(body.specialty_slugs).toEqual(['solar'])
  })
})

// ─── StepDomains — Other chip rendering & toggle logic ───────────────────────

describe('StepDomains — Other chip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    defaultProps.onNext.mockReset?.()
    defaultProps.onBack.mockReset?.()
  })

  async function renderAndWait(props = {}) {
    const result = render(<StepDomains {...defaultProps} {...props} />)
    // Wait for domains to load
    await waitFor(() => expect(screen.queryByRole('button', { name: /Sonstiges/i })).toBeInTheDocument())
    return result
  }

  it('renders "Sonstiges" chip after domain chips', async () => {
    await renderAndWait()
    expect(screen.getByRole('button', { name: 'Sonstiges' })).toBeInTheDocument()
  })

  it('Other chip starts unselected', async () => {
    await renderAndWait()
    expect(screen.getByRole('button', { name: 'Sonstiges' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('selecting Other makes it aria-pressed=true', async () => {
    await renderAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    expect(screen.getByRole('button', { name: 'Sonstiges' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('selecting Other deselects real domains', async () => {
    await renderAndWait({ selectedDomainSlugs: ['elektriker'] })
    expect(screen.getByRole('button', { name: 'Elektriker' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    expect(screen.getByRole('button', { name: 'Elektriker' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('selecting a real domain after Other deselects Other', async () => {
    await renderAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    expect(screen.getByRole('button', { name: 'Sonstiges' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Elektriker' }))
    expect(screen.getByRole('button', { name: 'Sonstiges' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Elektriker' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows hint text when Other is selected', async () => {
    await renderAndWait()
    expect(screen.queryByText(/keine Angebote vorbefüllt/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    expect(screen.getByText(/keine Angebote vorbefüllt/i)).toBeInTheDocument()
  })

  it('hint text disappears when Other is deselected again', async () => {
    await renderAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    expect(screen.queryByText(/keine Angebote vorbefüllt/i)).not.toBeInTheDocument()
  })

  it('Weiter button is enabled when Other is selected', async () => {
    await renderAndWait()
    const nextBtn = screen.getByRole('button', { name: /Weiter/i })
    expect(nextBtn).toBeDisabled() // nothing selected yet
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    expect(nextBtn).not.toBeDisabled()
  })

  it('min-one error disappears once Other is selected', async () => {
    await renderAndWait()
    // Initially nothing selected → error visible
    expect(screen.getByText(/mindestens einen Bereich/i)).toBeInTheDocument()
    // Selecting Other satisfies the requirement → error gone
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    expect(screen.queryByText(/mindestens einen Bereich/i)).not.toBeInTheDocument()
  })
})

// ─── StepDomains — specialty sub-step skipped for Other ──────────────────────

describe('StepDomains — specialties skipped with Other', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function renderAndWait(props = {}) {
    const result = render(<StepDomains {...defaultProps} {...props} />)
    await waitFor(() => expect(screen.queryByRole('button', { name: /Sonstiges/i })).toBeInTheDocument())
    return result
  }

  it('clicking Weiter with Other selected calls onNext directly (skips 2.5)', async () => {
    const onNext = vi.fn()
    await renderAndWait({ onNext })
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    fireEvent.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(onNext).toHaveBeenCalledWith([OTHER_DOMAIN_SLUG], [])
    // Specialties panel should NOT appear
    expect(screen.queryByText(/Spezialitäten/i)).not.toBeInTheDocument()
  })

  it('clicking Weiter with specialty domain shows sub-step 2.5', async () => {
    const onNext = vi.fn()
    await renderAndWait({ onNext })
    // Elektriker has a specialty (Solar)
    fireEvent.click(screen.getByRole('button', { name: 'Elektriker' }))
    fireEvent.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(onNext).not.toHaveBeenCalled()
    expect(screen.getByText('Solar')).toBeInTheDocument()
  })

  it('restores from draft with Other pre-selected', async () => {
    await renderAndWait({ selectedDomainSlugs: [OTHER_DOMAIN_SLUG] })
    expect(screen.getByRole('button', { name: 'Sonstiges' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/keine Angebote vorbefüllt/i)).toBeInTheDocument()
  })
})

// ─── DomainChip variant prop ──────────────────────────────────────────────────

describe('DomainChip variant prop', () => {
  it('default variant renders without errors', async () => {
    const { DomainChip } = await import('@/components/shop-admin/onboarding/DomainChip')
    render(<DomainChip label="Test" selected={false} onToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Test' })).toBeInTheDocument()
  })

  it('other variant renders without errors', async () => {
    const { DomainChip } = await import('@/components/shop-admin/onboarding/DomainChip')
    render(<DomainChip label="Other" selected={false} onToggle={vi.fn()} variant="other" />)
    expect(screen.getByRole('button', { name: 'Other' })).toBeInTheDocument()
  })

  it('selected state renders identically for both variants', async () => {
    const { DomainChip } = await import('@/components/shop-admin/onboarding/DomainChip')
    const { container: c1 } = render(
      <DomainChip label="X" selected={true} onToggle={vi.fn()} variant="default" />
    )
    const { container: c2 } = render(
      <DomainChip label="X" selected={true} onToggle={vi.fn()} variant="other" />
    )
    // Both selected buttons should have aria-pressed=true
    expect(c1.querySelector('button')).toHaveAttribute('aria-pressed', 'true')
    expect(c2.querySelector('button')).toHaveAttribute('aria-pressed', 'true')
  })
})
