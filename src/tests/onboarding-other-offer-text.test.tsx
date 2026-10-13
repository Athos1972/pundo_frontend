/**
 * F2970 T13 (E3): optional free text for the "Other" onboarding chip.
 *  - the input only exists while "Other" is selected, max 120 characters
 *  - onNext keeps its 2-argument shape when the text is empty (backwards compatible)
 *  - the API payload carries other_offer_text only for "Other" (trimmed, <= 120)
 *  - "only Other" still sends domain_slugs: [] (backend accepts it since F2970)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OTHER_DOMAIN_SLUG, OTHER_OFFER_MAX_LENGTH } from '@/lib/onboarding/domains'
import { StepDomains } from '@/components/shop-admin/onboarding/StepDomains'
import { tAdmin } from '@/lib/shop-admin-translations'

vi.mock('@/lib/onboarding/domains', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/onboarding/domains')>()
  return {
    ...actual,
    getDomains: vi.fn().mockResolvedValue([
      { slug: 'friseur', label: 'Friseur & Barbier', specialties: [{ slug: 'herren', label: 'Herren' }] },
      { slug: 'massage', label: 'Massage', specialties: [] },
    ]),
  }
})

const tr = tAdmin('de')
const baseProps = {
  tr,
  lang: 'de',
  providerType: 'dienstleister' as const,
  selectedDomainSlugs: [] as string[],
  selectedSpecialtySlugs: [] as string[],
  onNext: vi.fn(),
  onBack: vi.fn(),
}

async function renderStep(props: Partial<typeof baseProps> & { selectedOtherOfferText?: string } = {}) {
  render(<StepDomains {...baseProps} {...props} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sonstiges' })).toBeInTheDocument())
}

describe('StepDomains - Other free text', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows no input until Other is selected', async () => {
    await renderStep()
    expect(screen.queryByLabelText(tr.onboarding_other_offer_label)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    const input = screen.getByLabelText(tr.onboarding_other_offer_label) as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.maxLength).toBe(OTHER_OFFER_MAX_LENGTH)
    expect(OTHER_OFFER_MAX_LENGTH).toBe(120)
  })

  it('hides the input again when a real domain is chosen', async () => {
    await renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    fireEvent.click(screen.getByRole('button', { name: 'Massage' }))
    expect(screen.queryByLabelText(tr.onboarding_other_offer_label)).not.toBeInTheDocument()
  })

  it('passes the trimmed text as third argument to onNext', async () => {
    const onNext = vi.fn()
    await renderStep({ onNext })
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    fireEvent.change(screen.getByLabelText(tr.onboarding_other_offer_label), { target: { value: '  Hufschmied  ' } })
    fireEvent.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(onNext).toHaveBeenCalledWith([OTHER_DOMAIN_SLUG], [], 'Hufschmied')
  })

  it('stays optional: an empty text keeps the 2-argument call', async () => {
    const onNext = vi.fn()
    await renderStep({ onNext })
    fireEvent.click(screen.getByRole('button', { name: 'Sonstiges' }))
    fireEvent.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onNext.mock.calls[0]).toEqual([[OTHER_DOMAIN_SLUG], []])
  })

  it('pre-fills the text from the saved draft', async () => {
    await renderStep({ selectedDomainSlugs: [OTHER_DOMAIN_SLUG], selectedOtherOfferText: 'Nachhilfe Mathe' })
    expect((screen.getByLabelText(tr.onboarding_other_offer_label) as HTMLInputElement).value).toBe('Nachhilfe Mathe')
  })

  it('real domains never send the free text', async () => {
    const onNext = vi.fn()
    await renderStep({ onNext, selectedOtherOfferText: 'ignored' })
    fireEvent.click(screen.getByRole('button', { name: 'Massage' }))
    fireEvent.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(onNext.mock.calls[0]).toEqual([['massage'], []])
  })
})

describe('onboardingApi - other_offer_text', () => {
  const location = { lat: 35.1, lng: 33.3, address: 'Test', isB2cStorefront: true }

  async function submit(payload: Record<string, unknown>) {
    const { submitOnboarding } = await import('@/lib/onboarding/onboardingApi')
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user_id: 1, shop_id: 1, status: 'pending' }) })
    vi.stubGlobal('fetch', mockFetch)
    await submitOnboarding({
      providerType: 'dienstleister',
      specialtySlugs: [],
      location,
      contact: { phone: '+357123' },
      shopName: 'Test Shop',
      credentials: { email: 'x@example.com', password: 'pw123456!' },
      ...payload,
    } as never)
    return JSON.parse(mockFetch.mock.calls[0][1].body as string)
  }

  it('only Other + text: domain_slugs is [] and other_offer_text is sent', async () => {
    const body = await submit({ domainSlugs: [OTHER_DOMAIN_SLUG], otherOfferText: ' Hufschmied ' })
    expect(body.domain_slugs).toEqual([])
    expect(body.other_offer_text).toBe('Hufschmied')
  })

  it('only Other without text: no other_offer_text key', async () => {
    const body = await submit({ domainSlugs: [OTHER_DOMAIN_SLUG] })
    expect(body.domain_slugs).toEqual([])
    expect('other_offer_text' in body).toBe(false)
  })

  it('text is truncated to 120 characters', async () => {
    const body = await submit({ domainSlugs: [OTHER_DOMAIN_SLUG], otherOfferText: 'x'.repeat(300) })
    expect(body.other_offer_text).toHaveLength(120)
  })

  it('real domain + stale text: text is not sent', async () => {
    const body = await submit({ domainSlugs: ['friseur'], otherOfferText: 'stale' })
    expect(body.domain_slugs).toEqual(['friseur'])
    expect('other_offer_text' in body).toBe(false)
  })
})

describe('translations (6 languages)', () => {
  it.each(['en', 'de', 'el', 'ru', 'ar', 'he'])('%s has label and placeholder', (lang) => {
    const t = tAdmin(lang)
    expect(t.onboarding_other_offer_label.length).toBeGreaterThan(3)
    expect(t.onboarding_other_offer_placeholder.length).toBeGreaterThan(3)
  })
})
