import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { StepContact } from '@/components/shop-admin/onboarding/StepContact'
import { CatalogConsentCard } from '@/components/shop-admin/catalog-consent/CatalogConsentCard'
import { submitOnboarding } from '@/lib/onboarding/onboardingApi'
import { CATALOG_CONSENT_TEXT_VERSION } from '@/lib/onboarding/catalogConsent'
import { LANGS } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { CatalogConsentStatus, OnboardingSubmitPayload } from '@/types/shop-admin'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

const en = tAdmin('en')

// ── Wizard checkbox (StepContact) ─────────────────────────────────────────────

describe('StepContact — catalogue consent checkbox (AC1)', () => {
  const checkboxLabel = en.catalog_consent_checkbox_label

  function setup(props: Partial<React.ComponentProps<typeof StepContact>> = {}) {
    const onNext = vi.fn()
    render(<StepContact tr={en} lang="en" initialContact={{ phone: '1' }} onNext={onNext} onBack={vi.fn()} {...props} />)
    return { onNext }
  }
  const typeWebsite = (value: string) =>
    fireEvent.change(screen.getByPlaceholderText(en.onboarding_contact_website), { target: { value } })

  it('is hidden while no website is entered', () => {
    setup()
    expect(screen.queryByLabelText(checkboxLabel)).toBeNull()
  })

  it('appears once a website is typed and is NOT pre-checked', () => {
    setup()
    typeWebsite('example.com')
    expect((screen.getByLabelText(checkboxLabel) as HTMLInputElement).checked).toBe(false)
  })

  it('is not pre-checked even with a website from the draft', () => {
    setup({ initialContact: { website: 'https://a.example' } })
    expect((screen.getByLabelText(checkboxLabel) as HTMLInputElement).checked).toBe(false)
  })

  it('restores a consent from the draft only together with a website', () => {
    setup({ initialContact: { website: 'https://a.example' }, initialCatalogConsent: true })
    expect((screen.getByLabelText(checkboxLabel) as HTMLInputElement).checked).toBe(true)
  })

  it('passes false by default and does not block "next"', () => {
    const { onNext } = setup({ initialContact: { website: 'https://a.example' } })
    fireEvent.click(screen.getByRole('button', { name: en.onboarding_next }))
    expect(onNext).toHaveBeenCalledWith({ website: 'https://a.example' }, false)
  })

  it('passes true after ticking', () => {
    const { onNext } = setup({ initialContact: { website: 'https://a.example' } })
    fireEvent.click(screen.getByLabelText(checkboxLabel))
    fireEvent.click(screen.getByRole('button', { name: en.onboarding_next }))
    expect(onNext).toHaveBeenCalledWith({ website: 'https://a.example' }, true)
  })

  it('clearing the website hides the checkbox and resets the consent', () => {
    const { onNext } = setup({ initialContact: { website: 'https://a.example' }, initialCatalogConsent: true })
    typeWebsite('')
    expect(screen.queryByLabelText(checkboxLabel)).toBeNull()
    typeWebsite('https://b.example')
    expect((screen.getByLabelText(checkboxLabel) as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: en.onboarding_next }))
    expect(onNext).toHaveBeenCalledWith({ website: 'https://b.example' }, false)
  })

  it('never sends consent without a website even if the draft says true', () => {
    const { onNext } = setup({ initialContact: { phone: '1' }, initialCatalogConsent: true })
    fireEvent.click(screen.getByRole('button', { name: en.onboarding_next }))
    expect(onNext).toHaveBeenCalledWith({ phone: '1' }, false)
  })

  it('shows the full text with privacy and terms links (language prefixed) behind the details toggle', () => {
    setup({ lang: 'de', tr: tAdmin('de'), initialContact: { website: 'https://a.example' } })
    const t = tAdmin('de')
    expect(screen.queryByText(t.catalog_consent_text)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: t.catalog_consent_show_details }))
    expect(screen.getByText(t.catalog_consent_text)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: t.catalog_consent_link_privacy }).getAttribute('href')).toBe('/de/legal/privacy')
    expect(screen.getByRole('link', { name: t.catalog_consent_link_terms }).getAttribute('href')).toBe('/de/legal/terms')
  })

  it('shows a server-side consent error next to the checkbox', () => {
    setup({ initialContact: { website: 'https://a.example' }, catalogConsentError: en.catalog_consent_version_error })
    expect(screen.getByRole('alert').textContent).toBe(en.catalog_consent_version_error)
  })
})

// ── Consent text: 6 languages, version ────────────────────────────────────────

describe('consent text namespace', () => {
  it('has the version constant the backend allows', () => {
    expect(CATALOG_CONSENT_TEXT_VERSION).toBe('2026-10-16.v1')
  })

  it.each(LANGS)('has the complete versioned wording in %s', (lang) => {
    const t = tAdmin(lang)
    for (const text of [
      t.catalog_consent_checkbox_label, t.catalog_consent_text, t.catalog_consent_details_prefix,
      t.catalog_consent_link_privacy, t.catalog_consent_link_terms,
    ]) {
      expect(text.length).toBeGreaterThan(2)
    }
    // rights confirmation + withdrawal are part of the wording in every language (R6)
    expect(t.catalog_consent_text).toMatch(/6/)
  })

  it('wording differs per language (not copied English)', () => {
    const texts = new Set(LANGS.map(l => tAdmin(l).catalog_consent_text))
    expect(texts.size).toBe(6)
  })
})

// ── onboardingApi ─────────────────────────────────────────────────────────────

describe('submitOnboarding — consent payload and 422 mapping', () => {
  const base: OnboardingSubmitPayload = {
    providerType: 'handwerker',
    domainSlugs: [],
    specialtySlugs: [],
    location: { lat: 1, lng: 2, address: 'x', isB2cStorefront: true },
    contact: { website: 'https://a.example' },
    shopName: 'Shop',
    credentials: { email: 'a@b.cy', password: 'pw' },
  }
  let fetchMock: ReturnType<typeof vi.fn>

  function respond(status: number, body: unknown) {
    fetchMock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })
    vi.stubGlobal('fetch', fetchMock)
  }
  const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, unknown>

  afterEach(() => vi.unstubAllGlobals())

  it('sends catalog_consent with version and shown language when ticked and a website exists', async () => {
    respond(201, { user_id: 1, shop_id: 2, status: 'pending' })
    await submitOnboarding({ ...base, catalogConsent: true, catalogConsentLang: 'ar' })
    expect(sentBody().catalog_consent).toEqual({ accepted: true, text_version: CATALOG_CONSENT_TEXT_VERSION, lang: 'ar' })
  })

  it.each([
    ['not ticked', { catalogConsent: false }],
    ['undefined', {}],
    ['ticked but no website', { catalogConsent: true, contact: { phone: '1' } }],
  ])('does not send catalog_consent when %s', async (_name, extra) => {
    respond(201, { user_id: 1, shop_id: 2, status: 'pending' })
    await submitOnboarding({ ...base, ...extra } as OnboardingSubmitPayload)
    expect('catalog_consent' in sentBody()).toBe(false)
  })

  it('maps a consent 422 to CATALOG_CONSENT_INVALID even when the body echoes a website key', async () => {
    respond(422, { detail: [{ loc: ['body', 'catalog_consent', 'text_version'], msg: 'Value error, catalog_consent_invalid_version', input: { website: 'https://a.example' } }] })
    await expect(submitOnboarding({ ...base, catalogConsent: true })).rejects.toMatchObject({ code: 'CATALOG_CONSENT_INVALID' })
  })

  it('still maps a real website error to INVALID_URL', async () => {
    respond(422, { detail: [{ loc: ['body', 'contact', 'website'], msg: 'Value error, bad scheme', input: 'javascript:alert(1)' }] })
    await expect(submitOnboarding({ ...base, catalogConsent: true })).rejects.toMatchObject({ code: 'INVALID_URL' })
  })

  it('maps an unrelated 422 to a generic failure', async () => {
    respond(422, { detail: [{ loc: ['body', 'shop_name'], msg: 'x' }] })
    await expect(submitOnboarding(base)).rejects.toThrow('ONBOARDING_FAILED')
  })
})

// ── Portal card ───────────────────────────────────────────────────────────────

describe('CatalogConsentCard (states 1-4, RTL)', () => {
  const none: CatalogConsentStatus = {
    status: 'none', given_at: null, text_version: null,
    current_text_version: CATALOG_CONSENT_TEXT_VERSION, catalog_case_id: null, has_catalog_source: true,
  }
  beforeEach(() => refresh.mockClear())
  afterEach(() => vi.unstubAllGlobals())

  it('state 1: button is disabled until the checkbox is ticked, nothing pre-checked', () => {
    render(<CatalogConsentCard status={none} lang="en" tr={en} />)
    expect((screen.getByLabelText(en.catalog_consent_checkbox_label) as HTMLInputElement).checked).toBe(false)
    expect(screen.getByRole('button', { name: en.catalog_consent_submit })).toBeDisabled()
    fireEvent.click(screen.getByLabelText(en.catalog_consent_checkbox_label))
    expect(screen.getByRole('button', { name: en.catalog_consent_submit })).toBeEnabled()
  })

  it('state 1: posts version + Accept-Language and refreshes the page on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ created: true }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<CatalogConsentCard status={none} lang="el" tr={tAdmin('el')} />)
    fireEvent.click(screen.getByLabelText(tAdmin('el').catalog_consent_checkbox_label))
    fireEvent.click(screen.getByRole('button', { name: tAdmin('el').catalog_consent_submit }))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/shop-admin/catalog-consent')
    expect(init.method).toBe('POST')
    expect(init.headers['Accept-Language']).toBe('el')
    expect(JSON.parse(init.body)).toEqual({ accepted: true, text_version: CATALOG_CONSENT_TEXT_VERSION })
  })

  it('state 2: no website -> hint and link to the profile, no checkbox', () => {
    render(<CatalogConsentCard status={{ ...none, has_catalog_source: false }} lang="en" tr={en} />)
    expect(screen.getByText(en.catalog_consent_no_source)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: en.catalog_consent_no_source_link }).getAttribute('href')).toBe('/shop-admin/profile')
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('state 3: given -> compact line with date and version, no form', () => {
    render(<CatalogConsentCard status={{ ...none, status: 'given', given_at: '2026-10-16T10:00:00Z', text_version: '2026-10-16.v1', catalog_case_id: 5 }} lang="en" tr={en} />)
    expect(screen.getByTestId('catalog-consent-given').textContent).toContain('(version 2026-10-16.v1)')
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('state 4: generic error shows a message and offers retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }))
    render(<CatalogConsentCard status={none} lang="en" tr={en} />)
    fireEvent.click(screen.getByLabelText(en.catalog_consent_checkbox_label))
    fireEvent.click(screen.getByRole('button', { name: en.catalog_consent_submit }))
    expect((await screen.findByRole('alert')).textContent).toBe(en.catalog_consent_error)
    expect(screen.getByRole('button', { name: en.catalog_consent_retry })).toBeEnabled()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('state 4: outdated text version shows the reload hint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ detail: 'catalog_consent_invalid_version' }) }))
    render(<CatalogConsentCard status={none} lang="en" tr={en} />)
    fireEvent.click(screen.getByLabelText(en.catalog_consent_checkbox_label))
    fireEvent.click(screen.getByRole('button', { name: en.catalog_consent_submit }))
    expect((await screen.findByRole('alert')).textContent).toBe(en.catalog_consent_version_error)
  })

  it('network failure is handled like a generic error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<CatalogConsentCard status={none} lang="en" tr={en} />)
    fireEvent.click(screen.getByLabelText(en.catalog_consent_checkbox_label))
    fireEvent.click(screen.getByRole('button', { name: en.catalog_consent_submit }))
    expect((await screen.findByRole('alert')).textContent).toBe(en.catalog_consent_error)
  })

  it.each([['ar', 'rtl'], ['he', 'rtl'], ['en', 'ltr'], ['de', 'ltr'], ['el', 'ltr'], ['ru', 'ltr']] as const)(
    'renders dir=%s -> %s',
    (lang, dir) => {
      const { container } = render(<CatalogConsentCard status={none} lang={lang} tr={tAdmin(lang)} />)
      expect((container.firstElementChild as HTMLElement).getAttribute('dir')).toBe(dir)
    },
  )
})
