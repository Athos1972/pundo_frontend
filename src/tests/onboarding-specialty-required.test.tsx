import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { normalizeDomain, OTHER_DOMAIN_SLUG } from '@/lib/onboarding/domains'
import { domainsMissingSpecialty } from '@/lib/onboarding/specialtyGate'
import { StepDomains } from '@/components/shop-admin/onboarding/StepDomains'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { OnboardingDomain } from '@/types/shop-admin'

// B5910-004: specialty_required gate

const DOMAINS = vi.hoisted((): OnboardingDomain[] => [
  {
    slug: 'tattoo-piercing', label: 'Tattoo & Piercing', specialtyRequired: true,
    specialties: [{ slug: 'tattoo', label: 'Tattoo' }, { slug: 'piercing', label: 'Piercing' }],
  },
  { slug: 'haarentfernung', label: 'Haarentfernung', specialties: [{ slug: 'laser', label: 'Laser' }] },
  { slug: 'leer', label: 'Leer', specialtyRequired: true, specialties: [] },
])

vi.mock('@/lib/onboarding/domains', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/onboarding/domains')>()
  return { ...actual, getDomains: vi.fn().mockResolvedValue(DOMAINS) }
})

describe('domainsMissingSpecialty', () => {
  it('returns a selected required domain without chosen specialty', () => {
    expect(domainsMissingSpecialty(DOMAINS, ['tattoo-piercing'], []).map(d => d.slug)).toEqual(['tattoo-piercing'])
  })

  it('is satisfied by any specialty of that domain', () => {
    expect(domainsMissingSpecialty(DOMAINS, ['tattoo-piercing'], ['piercing'])).toEqual([])
  })

  it('is not satisfied by a specialty of another domain', () => {
    expect(domainsMissingSpecialty(DOMAINS, ['tattoo-piercing', 'haarentfernung'], ['laser'])).toHaveLength(1)
  })

  it('ignores non-required domains, unselected domains, "other" and required domains without specialties', () => {
    expect(domainsMissingSpecialty(DOMAINS, ['haarentfernung'], [])).toEqual([])
    expect(domainsMissingSpecialty(DOMAINS, [], [])).toEqual([])
    expect(domainsMissingSpecialty(DOMAINS, [OTHER_DOMAIN_SLUG], [])).toEqual([])
    expect(domainsMissingSpecialty(DOMAINS, ['leer'], [])).toEqual([])
  })
})

describe('normalizeDomain', () => {
  it('maps snake_case specialty_required and defaults to false', () => {
    const base = { slug: 'x', label: 'X', specialties: [] }
    expect(normalizeDomain({ ...base, specialty_required: true }).specialtyRequired).toBe(true)
    expect(normalizeDomain(base).specialtyRequired ?? false).toBe(false)
    expect('specialty_required' in normalizeDomain({ ...base, specialty_required: true })).toBe(false)
  })
})

describe('StepDomains specialty gate', () => {
  const onNext = vi.fn()
  const props = {
    tr: tAdmin('de'), lang: 'de', providerType: 'dienstleister' as const,
    selectedDomainSlugs: [], selectedSpecialtySlugs: [], onNext, onBack: vi.fn(),
  }
  beforeEach(() => onNext.mockClear())

  async function toSpecialtyStep(domainLabel: string) {
    render(<StepDomains {...props} />)
    await waitFor(() => screen.getByText(domainLabel))
    fireEvent.click(screen.getByText(domainLabel))
    fireEvent.click(screen.getByRole('button', { name: props.tr.onboarding_next }))
  }

  it('blocks "Weiter" on the specialty step until a specialty of the required domain is chosen', async () => {
    await toSpecialtyStep('Tattoo & Piercing')
    const next = screen.getByRole('button', { name: props.tr.onboarding_next })
    expect(screen.getByTestId('specialty-required-hint').textContent).toContain('Tattoo & Piercing')
    expect(screen.getByText(props.tr.onboarding_step2_5_title_required)).toBeTruthy()
    expect((next as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(next)
    expect(onNext).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Piercing'))
    expect((next as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByTestId('specialty-required-hint')).toBeNull()
    fireEvent.click(next)
    expect(onNext).toHaveBeenCalledWith(['tattoo-piercing'], ['piercing'])
  })

  it('keeps specialties optional for non-required domains', async () => {
    await toSpecialtyStep('Haarentfernung')
    const next = screen.getByRole('button', { name: props.tr.onboarding_next }) as HTMLButtonElement
    expect(next.disabled).toBe(false)
    expect(screen.queryByTestId('specialty-required-hint')).toBeNull()
    fireEvent.click(next)
    expect(onNext).toHaveBeenCalledWith(['haarentfernung'], [])
  })
})

describe('translations', () => {
  it.each(['en', 'de', 'el', 'ru', 'ar', 'he'])('%s has both specialty-required keys', (lang) => {
    const tr = tAdmin(lang)
    expect(tr.onboarding_step2_5_title_required.length).toBeGreaterThan(3)
    expect(tr.onboarding_specialty_required_hint).toContain('{domains}')
  })
})
