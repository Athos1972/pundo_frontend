import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import React from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'

// ─── Mocks ──────────────────────────────────────────────────────────────────────

const { stub, cookieStore } = vi.hoisted(() => ({
  stub: (name: string) => (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': name, 'data-props': JSON.stringify(props, (k, v) => (k === 'tr' ? undefined : v)) }),
  cookieStore: { values: {} as Record<string, string> },
}))

class NotFoundError extends Error { constructor() { super('NEXT_NOT_FOUND') } }
// Like the real Next.js redirect(): throws, so surrounding try/catch blocks see it.
class RedirectError extends Error { constructor(public to: string) { super('NEXT_REDIRECT') } }
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/shop-admin/dashboard',
  notFound: () => { throw new NotFoundError() },
  redirect: (to: string) => { throw new RedirectError(to) },
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => React.createElement('a', { href }, children),
}))
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: (n: string) => (n in cookieStore.values ? { value: cookieStore.values[n] } : undefined) }),
}))
vi.mock('@/lib/lang', async (orig) => ({ ...(await orig<typeof import('@/lib/lang')>()), getLangServer: vi.fn(async () => 'en') }))
vi.mock('@/lib/shop-admin-api')
vi.mock('@/components/shop-admin/AdminShell', () => ({
  AdminShell: ({ ownerName, children }: { ownerName: string; children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'shell', 'data-owner': ownerName }, children),
}))
vi.mock('@/components/shop-admin/HoursEditor', () => ({ HoursEditor: stub('HoursEditor') }))
vi.mock('@/components/shop-admin/OfferList', () => ({ OfferList: stub('OfferList') }))
vi.mock('@/components/shop-admin/OfferForm', () => ({ OfferForm: stub('OfferForm') }))
vi.mock('@/components/shop-admin/OfferItemHeader', async (orig) => ({
  ...(await orig<typeof import('@/components/shop-admin/OfferItemHeader')>()),
  OfferItemHeader: stub('OfferItemHeader'),
}))
vi.mock('@/components/shop-admin/ApiKeyList', () => ({ ApiKeyList: stub('ApiKeyList') }))
vi.mock('@/components/shop-admin/ImportPanel', () => ({ ImportPanel: stub('ImportPanel') }))
vi.mock('@/components/shop-admin/ShopDangerZone', () => ({ ShopDangerZone: stub('ShopDangerZone') }))
vi.mock('@/components/shop-admin/WebsiteStatusBanner', () => ({ WebsiteStatusBanner: stub('WebsiteStatusBanner') }))
vi.mock('@/components/shop-admin/ReviewModerationTable', () => ({ ReviewModerationTable: stub('ReviewModerationTable') }))
vi.mock('@/components/shop-admin/onboarding/OnboardingWizard', () => ({ OnboardingWizard: stub('OnboardingWizard') }))
vi.mock('@/components/shop-admin/catalog-review/CatalogReviewOverview', () => ({ CatalogReviewOverview: stub('CatalogReviewOverview') }))
vi.mock('@/components/shop-admin/catalog-review/EnrichmentProgress', () => ({ EnrichmentProgress: stub('EnrichmentProgress') }))
vi.mock('@/components/shop-admin/catalog-review/SampleComparison', () => ({ SampleComparison: stub('SampleComparison') }))
vi.mock('@/components/shop-admin/catalog-review/ReviewActionBar', () => ({ ReviewActionBar: stub('ReviewActionBar') }))
vi.mock('@/app/(shop-admin)/shop-admin/(portal)/profile/ProfileForm', () => ({ ProfileForm: stub('ProfileForm') }))

import * as api from '@/lib/shop-admin-api'
import { getLangServer } from '@/lib/lang'

const tr = tAdmin('en')
const S = '@/app/(shop-admin)/shop-admin'
const P = `${S}/(portal)`

type Page = (props: never) => Promise<React.ReactElement> | React.ReactElement
async function show(Page: unknown, props: unknown = {}) {
  return render(await (Page as Page)(props as never))
}
const sp = (o: Record<string, string> = {}) => ({ searchParams: Promise.resolve(o) })
const par = (o: Record<string, string>) => ({ params: Promise.resolve(o) })
const stubProps = (name: string) => JSON.parse(screen.getByTestId(name).getAttribute('data-props')!)
const fetchMock = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getLangServer).mockResolvedValue('en')
  cookieStore.values = {}
  vi.stubGlobal('fetch', fetchMock)
})

// ─── Layouts ────────────────────────────────────────────────────────────────────

describe('portal layout', () => {
  const me = (status: string) => ({ id: 1, name: 'Olga', email: 'o@x.io', status, shop_id: 3 })

  it('approved owners get the shell with their name', async () => {
    vi.mocked(api.getMe).mockResolvedValue(me('approved') as never)
    const { default: Layout } = await import(`${P}/layout`)
    await show(Layout, { children: React.createElement('p', null, 'page') })
    expect(screen.getByTestId('shell').getAttribute('data-owner')).toBe('Olga')
    expect(screen.getByText('page')).toBeTruthy()
  })

  // Regression: redirect() throws; the surrounding catch swallowed it, so owners that
  // are not approved yet saw the full portal instead of being redirected.
  it.each([
    ['pre_signup', '/shop-admin/onboarding'],
    ['pending', '/shop-admin/pending-approval'],
    ['rejected', '/shop-admin/login'],
  ])('owner status %s is redirected to %s', async (status, target) => {
    vi.mocked(api.getMe).mockResolvedValue(me(status) as never)
    const { default: Layout } = await import(`${P}/layout`)
    await expect(show(Layout, { children: null })).rejects.toMatchObject({ to: target })
  })

  it.each(['UNAUTHORIZED', 'FORBIDDEN'])('%s redirects to the login', async (msg) => {
    vi.mocked(api.getMe).mockRejectedValue(new Error(msg))
    const { default: Layout } = await import(`${P}/layout`)
    await expect(show(Layout, { children: null })).rejects.toMatchObject({ to: '/shop-admin/login' })
  })

  it('backend outage still renders the shell (empty name) so pages show their own error state', async () => {
    vi.mocked(api.getMe).mockRejectedValue(new Error('fetch failed'))
    const { default: Layout } = await import(`${P}/layout`)
    await show(Layout, { children: React.createElement('p', null, 'page') })
    expect(screen.getByTestId('shell').getAttribute('data-owner')).toBe('')
  })
})

describe('root layout', () => {
  it.each([['en', 'ltr'], ['de', 'ltr'], ['ar', 'rtl'], ['he', 'rtl']])('lang %s -> dir %s', async (lang, dir) => {
    vi.mocked(getLangServer).mockResolvedValue(lang as never)
    vi.doMock('next/font/google', () => ({ DM_Sans: () => ({ variable: 'v' }) }))
    vi.doMock('@/app/globals.css', () => ({}))
    const mod = await import('@/app/(shop-admin)/layout')
    const tree = await mod.default({ children: null }) as React.ReactElement<{ lang: string; dir: string }>
    expect(tree.props.lang).toBe(lang)
    expect(tree.props.dir).toBe(dir)
    expect(mod.metadata.robots).toEqual({ index: false, follow: false })
  })
})

// ─── Simple pages ───────────────────────────────────────────────────────────────

describe('dashboard', () => {
  it('greets the owner by name and links to all areas', async () => {
    vi.mocked(api.getMe).mockResolvedValue({ name: 'Olga' } as never)
    const { default: Page } = await import(`${P}/dashboard/page`)
    await show(Page)
    expect(screen.getByText(`${tr.dashboard_welcome}, Olga`)).toBeTruthy()
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(['/shop-admin/profile', '/shop-admin/hours', '/shop-admin/offers', '/shop-admin/import', '/shop-admin/api-keys'])
  })

  it('omits the greeting when the profile cannot be loaded', async () => {
    vi.mocked(api.getMe).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${P}/dashboard/page`)
    await show(Page)
    expect(screen.queryByText(new RegExp(tr.dashboard_welcome))).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(tr.dashboard_title)
  })
})

describe('hours', () => {
  const week = Array.from({ length: 7 }, (_, i) => ({ day: i, open: '08:00', close: '20:00', closed: i === 6 }))

  it('uses the saved week when the backend returns seven days', async () => {
    vi.mocked(api.getOpeningHours).mockResolvedValue(week as never)
    const { default: Page } = await import(`${P}/hours/page`)
    await show(Page)
    expect(stubProps('HoursEditor').initialHours).toEqual(week)
  })

  it.each([[[]], [week.slice(0, 3)]])('falls back to 09:00-18:00 defaults for an incomplete week (%j)', async (fetched) => {
    vi.mocked(api.getOpeningHours).mockResolvedValue(fetched as never)
    const { default: Page } = await import(`${P}/hours/page`)
    await show(Page)
    const hours = stubProps('HoursEditor').initialHours
    expect(hours).toHaveLength(7)
    expect(hours[0]).toEqual({ day: 0, open: '09:00', close: '18:00', closed: false })
  })

  it('falls back to defaults (and logs) when the request fails', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(api.getOpeningHours).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${P}/hours/page`)
    await show(Page)
    expect(stubProps('HoursEditor').initialHours).toHaveLength(7)
    expect(err).toHaveBeenCalled()
    err.mockRestore()
  })
})

describe('offers', () => {
  it('loads active and archived offers separately', async () => {
    vi.mocked(api.getAdminOffers).mockImplementation((async (_l: string, o: { archived: boolean }) => ({ items: [{ id: o.archived ? 2 : 1 }], total: 1 })) as never)
    const { default: Page } = await import(`${P}/offers/page`)
    await show(Page)
    expect(stubProps('OfferList')).toMatchObject({ activeItems: [{ id: 1 }], expiredItems: [{ id: 2 }], lang: 'en' })
    expect(screen.getByRole('link', { name: `+ ${tr.add_offer}` }).getAttribute('href')).toBe('/shop-admin/offers/new')
  })

  it('renders empty lists when the backend fails', async () => {
    vi.mocked(api.getAdminOffers).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${P}/offers/page`)
    await show(Page)
    expect(stubProps('OfferList')).toMatchObject({ activeItems: [], expiredItems: [] })
  })

  it('new offer: passes price units and the own shop id; tolerates failures', async () => {
    vi.mocked(api.getAdminPriceUnits).mockResolvedValue([{ id: 1 }] as never)
    vi.mocked(api.getMe).mockResolvedValue({ shop_id: 9 } as never)
    const { default: Page } = await import(`${P}/offers/new/page`)
    const { unmount } = await show(Page)
    expect(stubProps('OfferForm')).toMatchObject({ priceUnits: [{ id: 1 }], ownShopId: 9 })
    unmount()
    vi.mocked(api.getAdminPriceUnits).mockRejectedValue(new Error('x'))
    vi.mocked(api.getMe).mockRejectedValue(new Error('x'))
    await show(Page)
    expect(stubProps('OfferForm')).toMatchObject({ priceUnits: [], ownShopId: null })
  })
})

describe('edit offer', () => {
  const offer = (over: Record<string, unknown> = {}) => ({
    id: 4, title: 'Weekend deal', item: null, ...over,
  })
  const item = {
    id: 12, slug: 'kibble', item_type: 'product', names: { de: 'Futter', en: 'Kibble' }, category_id: null, ean: null,
    photos: [{ url: 'https://cdn/full.jpg', thumbnail_url: 'https://cdn/thumb.jpg' }],
  }

  it('shows the title and passes the offer to the form', async () => {
    vi.mocked(api.getAdminOffer).mockResolvedValue(offer() as never)
    vi.mocked(api.getAdminPriceUnits).mockResolvedValue([])
    vi.mocked(api.getMe).mockResolvedValue({ shop_id: 3 } as never)
    const { default: Page } = await import(`${P}/offers/[id]/edit/page`)
    await show(Page, par({ id: '4' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Weekend deal')
    expect(stubProps('OfferForm')).toMatchObject({ offer: { id: 4 }, ownShopId: 3, preloadedItem: null })
    expect(screen.queryByTestId('OfferItemHeader')).toBeNull()
  })

  it('builds the preloaded item from the offer (localized name, thumbnail first, id fallbacks)', async () => {
    vi.mocked(api.getAdminOffer).mockResolvedValue(offer({ item }) as never)
    vi.mocked(api.getAdminPriceUnits).mockResolvedValue([])
    vi.mocked(api.getMe).mockResolvedValue({ shop_id: 3 } as never)
    vi.mocked(getLangServer).mockResolvedValue('de')
    const { default: Page } = await import(`${P}/offers/[id]/edit/page`)
    await show(Page, par({ id: '4' }))
    expect(stubProps('OfferForm').preloadedItem).toEqual({
      id: 12, slug: 'kibble', item_type: 'product', name: 'Futter', category_id: 0, ean: null, photo_url: 'https://cdn/thumb.jpg',
    })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Futter')
    expect(screen.getByTestId('OfferItemHeader')).toBeTruthy()
  })

  it('falls back to the full photo when there is no thumbnail', async () => {
    vi.mocked(api.getAdminOffer).mockResolvedValue(offer({ item: { ...item, photos: [{ url: 'https://cdn/full.jpg' }] } }) as never)
    vi.mocked(api.getAdminPriceUnits).mockResolvedValue([])
    vi.mocked(api.getMe).mockResolvedValue(null as never)
    const { default: Page } = await import(`${P}/offers/[id]/edit/page`)
    await show(Page, par({ id: '4' }))
    expect(stubProps('OfferForm').preloadedItem.photo_url).toBe('https://cdn/full.jpg')
  })

  it('unknown offer is a 404 in production, an empty form elsewhere', async () => {
    vi.mocked(api.getAdminOffer).mockRejectedValue(new Error('404'))
    vi.mocked(api.getAdminPriceUnits).mockResolvedValue([])
    vi.mocked(api.getMe).mockResolvedValue(null as never)
    const { default: Page } = await import(`${P}/offers/[id]/edit/page`)
    vi.stubEnv('NODE_ENV', 'production')
    await expect(show(Page, par({ id: '99' }))).rejects.toBeInstanceOf(NotFoundError)
    vi.stubEnv('NODE_ENV', 'test')
    await show(Page, par({ id: '99' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('#99')
    vi.unstubAllEnvs()
  })

  // Regression: a failing price-unit lookup rejected the shared Promise.all, the offer
  // was dropped and the (existing) offer 404'd in production.
  it('a failing price-unit lookup does not make an existing offer 404', async () => {
    vi.mocked(api.getAdminOffer).mockResolvedValue(offer() as never)
    vi.mocked(api.getAdminPriceUnits).mockRejectedValue(new Error('units down'))
    vi.mocked(api.getMe).mockResolvedValue({ shop_id: 3 } as never)
    vi.stubEnv('NODE_ENV', 'production')
    const { default: Page } = await import(`${P}/offers/[id]/edit/page`)
    await show(Page, par({ id: '4' }))
    expect(stubProps('OfferForm')).toMatchObject({ offer: { id: 4 }, priceUnits: [] })
    vi.unstubAllEnvs()
  })
})

describe('profile / api keys / import / settings', () => {
  it('profile passes shop and website status; shop failure -> null shop', async () => {
    vi.mocked(api.getAdminShop).mockResolvedValue({ id: 3 } as never)
    vi.mocked(api.getWebsiteStatus).mockResolvedValue({ url: 'https://x.io' } as never)
    const { default: Page } = await import(`${P}/profile/page`)
    const { unmount } = await show(Page)
    expect(stubProps('ProfileForm')).toMatchObject({ shop: { id: 3 }, lang: 'en' })
    expect(stubProps('WebsiteStatusBanner')).toMatchObject({ status: { url: 'https://x.io' } })
    unmount()
    vi.mocked(api.getAdminShop).mockRejectedValue(new Error('x'))
    await show(Page)
    expect(stubProps('ProfileForm').shop).toBeNull()
  })

  it('api keys: initial keys or empty on failure', async () => {
    vi.mocked(api.getApiKeys).mockResolvedValueOnce([{ id: 1 }] as never)
    const { default: Page } = await import(`${P}/api-keys/page`)
    const { unmount } = await show(Page)
    expect(stubProps('ApiKeyList').initialKeys).toEqual([{ id: 1 }])
    unmount()
    vi.mocked(api.getApiKeys).mockRejectedValueOnce(new Error('x'))
    await show(Page)
    expect(stubProps('ApiKeyList').initialKeys).toEqual([])
  })

  it('import: initial status or empty object on failure', async () => {
    vi.mocked(api.getImportStatus).mockResolvedValueOnce({ state: 'done' } as never)
    const { default: Page } = await import(`${P}/import/page`)
    const { unmount } = await show(Page)
    expect(stubProps('ImportPanel').initialStatus).toEqual({ state: 'done' })
    unmount()
    vi.mocked(api.getImportStatus).mockRejectedValueOnce(new Error('x'))
    await show(Page)
    expect(stubProps('ImportPanel').initialStatus).toEqual({})
  })

  it('settings renders the danger zone even if the shop cannot be loaded', async () => {
    vi.mocked(api.getAdminShop).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${P}/settings/page`)
    await show(Page)
    expect(screen.getByTestId('ShopDangerZone')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(tr.settings_title)
  })
})

describe('help page', () => {
  it('lists every FAQ entry for the language and falls back to English for unknown ones', async () => {
    const { default: Page } = await import(`${P}/help/page`)
    const { shopAdminHelpContent } = await import('@/lib/shop-admin-help-content')
    const { unmount } = await show(Page)
    const expected = shopAdminHelpContent.en.reduce((n, c) => n + c.items.length, 0)
    expect(document.querySelectorAll('details')).toHaveLength(expected)
    unmount()
    vi.mocked(getLangServer).mockResolvedValue('xx' as never)
    await show(Page)
    expect(document.querySelectorAll('details')).toHaveLength(expected)
  })

  it.each(['ar', 'he'])('renders %s content', async (lang) => {
    vi.mocked(getLangServer).mockResolvedValue(lang as never)
    const { shopAdminHelpContent } = await import('@/lib/shop-admin-help-content')
    const { default: Page } = await import(`${P}/help/page`)
    await show(Page)
    const first = shopAdminHelpContent[lang as 'ar' | 'he'][0]
    expect(screen.getByText(first.title)).toBeTruthy()
    expect(screen.getByText(first.items[0].q)).toBeTruthy()
  })
})

describe('static pages and redirects', () => {
  it('pending approval and check-email explain the next step', async () => {
    const { default: Pending } = await import(`${S}/pending-approval/page`)
    const { unmount } = await show(Pending)
    expect(screen.getByText(tr.pending_desc)).toBeTruthy()
    unmount()
    const { default: Check } = await import(`${S}/register/check-email/page`)
    await show(Check)
    expect(screen.getByRole('link', { name: tr.login_btn }).getAttribute('href')).toBe('/shop-admin/login')
  })

  it('register and products entry points redirect', async () => {
    const { default: Register } = await import(`${S}/register/page`)
    expect(() => (Register as () => unknown)()).toThrowError(expect.objectContaining({ to: '/shop-admin/onboarding' }))
    const { default: Products } = await import(`${P}/products/page`)
    expect(() => (Products as () => unknown)()).toThrowError(expect.objectContaining({ to: '/shop-admin/offers' }))
    const { default: NewProduct } = await import(`${P}/products/new/page`)
    expect(() => (NewProduct as () => unknown)()).toThrowError(expect.objectContaining({ to: '/shop-admin/offers/new' }))
  })

  it('onboarding page links home and to for-shops in the current language and sets the title', async () => {
    vi.mocked(getLangServer).mockResolvedValue('de')
    const mod = await import(`${S}/onboarding/page`)
    await show(mod.default)
    expect(screen.getByRole('link', { name: tAdmin('de').onboarding_logo_home_aria }).getAttribute('href')).toBe('/de')
    expect(screen.getByRole('link', { name: tAdmin('de').onboarding_back_link }).getAttribute('href')).toBe('/de/for-shops')
    expect(stubProps('OnboardingWizard')).toEqual({ lang: 'de' })
    expect((await mod.generateMetadata()).title).toBe(tAdmin('de').onboarding_page_title)
  })
})

describe('verify-email page', () => {
  it('without token shows the error and does not call the backend', async () => {
    const { default: Page } = await import(`${S}/verify-email/page`)
    await show(Page, sp())
    expect(screen.getByText(tr.verify_error)).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('valid token: posts it to the backend and shows success with a link on', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    const { default: Page } = await import(`${S}/verify-email/page`)
    await show(Page, sp({ token: 'abc' }))
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/shop-owner\/verify-email$/)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: 'abc' })
    expect(screen.getByText(tr.verify_success)).toBeTruthy()
    expect(screen.getByRole('link', { name: tr.pending_title }).getAttribute('href')).toBe('/shop-admin/pending-approval')
  })

  it('rejected token and network failure both show the error', async () => {
    const { default: Page } = await import(`${S}/verify-email/page`)
    fetchMock.mockResolvedValueOnce({ ok: false })
    const { unmount } = await show(Page, sp({ token: 'bad' }))
    expect(screen.getByText(tr.verify_error)).toBeTruthy()
    unmount()
    fetchMock.mockRejectedValueOnce(new Error('down'))
    await show(Page, sp({ token: 'bad' }))
    expect(screen.getByText(tr.verify_error)).toBeTruthy()
    expect(screen.queryByText(tr.verify_success)).toBeNull()
  })
})

// ─── Reviews ────────────────────────────────────────────────────────────────────

describe('reviews page', () => {
  it('requests reviews with the language and the admin token (preferred over the owner token)', async () => {
    cookieStore.values = { admin_token: 'adm', shop_owner_token: 'own' }
    fetchMock.mockResolvedValue({ ok: true, json: async () => [{ id: 1 }] })
    const { default: Page } = await import(`${P}/reviews/page`)
    await show(Page)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/admin\/reviews\?limit=100$/)
    expect(init.headers).toMatchObject({ 'Accept-Language': 'en', Authorization: 'Bearer adm' })
    expect(stubProps('ReviewModerationTable').reviews).toEqual([{ id: 1 }])
  })

  it('uses the owner token when there is no admin token; sends no auth header without any', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] })
    const { default: Page } = await import(`${P}/reviews/page`)
    cookieStore.values = { shop_owner_token: 'own' }
    const { unmount } = await show(Page)
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer own')
    unmount()
    cookieStore.values = {}
    await show(Page)
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined()
  })

  it('shows an empty table on HTTP errors and network failures', async () => {
    const { default: Page } = await import(`${P}/reviews/page`)
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'x' }) })
    const { unmount } = await show(Page)
    expect(stubProps('ReviewModerationTable').reviews).toEqual([])
    unmount()
    fetchMock.mockRejectedValueOnce(new Error('down'))
    await show(Page)
    expect(stubProps('ReviewModerationTable').reviews).toEqual([])
  })
})

describe('review audit log page', () => {
  const entry = (over: Record<string, unknown>) => ({
    id: 1, timestamp: '2026-03-04T10:00:00Z', action: 'created', actor_type: 'user', actor_ip: '1.2.3.4',
    reason: null, moderation_model: null, moderation_confidence: null, ...over,
  })

  it('renders entries with action labels, ip, reason and model confidence; dashes for missing values', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [
      entry({}),
      entry({ id: 2, action: 'invalidated', actor_ip: null, reason: 'spam', moderation_model: 'gpt', moderation_confidence: 0.876 }),
      entry({ id: 3, action: 'mystery', timestamp: 'not-a-date' }),
    ] })
    const { default: Page } = await import(`${P}/reviews/[id]/audit-log/page`)
    await show(Page, par({ id: '77' }))
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/admin\/reviews\/77\/audit-log$/)
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText(tr.reviews_audit_action_created)).toBeTruthy()
    expect(within(rows[0]).getByText('1.2.3.4')).toBeTruthy()
    expect(within(rows[1]).getByText(tr.reviews_audit_action_invalidated)).toBeTruthy()
    expect(within(rows[1]).getByText('spam')).toBeTruthy()
    expect(within(rows[1]).getByText('gpt (88%)')).toBeTruthy()
    expect(within(rows[2]).getByText('mystery')).toBeTruthy()      // unknown action -> raw value
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(`${tr.reviews_audit_log} #77`)
  })

  it('empty state when there are no entries or the request fails', async () => {
    const { default: Page } = await import(`${P}/reviews/[id]/audit-log/page`)
    fetchMock.mockResolvedValueOnce({ ok: false })
    const { unmount } = await show(Page, par({ id: '1' }))
    expect(screen.getByText(tr.reviews_no_items)).toBeTruthy()
    unmount()
    fetchMock.mockRejectedValueOnce(new Error('down'))
    await show(Page, par({ id: '1' }))
    expect(screen.getByText(tr.reviews_no_items)).toBeTruthy()
  })
})

// ─── Catalog review ─────────────────────────────────────────────────────────────

describe('catalog review pages', () => {
  const kase = (over: Record<string, unknown> = {}) => ({ id: 5, status: 'awaiting_owner_review', item_count: 10, completed_item_count: 4, ...over })

  it('overview passes the cases; empty on failure', async () => {
    vi.mocked(api.getCatalogCases).mockResolvedValueOnce({ cases: [kase()] } as never)
    const { default: Page } = await import(`${P}/catalog-review/page`)
    const { unmount } = await show(Page)
    expect(stubProps('CatalogReviewOverview').initialCases).toEqual([kase()])
    unmount()
    vi.mocked(api.getCatalogCases).mockRejectedValueOnce(new Error('x'))
    await show(Page)
    expect(stubProps('CatalogReviewOverview').initialCases).toEqual([])
  })

  it('detail: unknown case (or backend failure) shows the not-found hint with a way back', async () => {
    const { default: Page } = await import(`${P}/catalog-review/[caseId]/page`)
    vi.mocked(api.getCatalogCases).mockResolvedValueOnce({ cases: [kase({ id: 1 })] } as never)
    vi.mocked(api.getCatalogCaseSample).mockResolvedValue(null as never)
    const { unmount } = await show(Page, par({ caseId: '5' }))
    expect(screen.getByText(tr.catalog_review_not_found)).toBeTruthy()
    expect(screen.getByRole('link', { name: tr.catalog_review_back }).getAttribute('href')).toBe('/shop-admin/catalog-review')
    unmount()
    vi.mocked(api.getCatalogCases).mockRejectedValueOnce(new Error('x'))
    await show(Page, par({ caseId: '5' }))
    expect(screen.getByText(tr.catalog_review_not_found)).toBeTruthy()
  })

  it('awaiting review with a sample: comparison and action bar', async () => {
    vi.mocked(api.getCatalogCases).mockResolvedValue({ cases: [kase()] } as never)
    vi.mocked(api.getCatalogCaseSample).mockResolvedValue({ items: [] } as never)
    const { default: Page } = await import(`${P}/catalog-review/[caseId]/page`)
    await show(Page, par({ caseId: '5' }))
    expect(api.getCatalogCaseSample).toHaveBeenCalledWith('en', 5, 10)
    expect(screen.getByTestId('SampleComparison')).toBeTruthy()
    expect(stubProps('ReviewActionBar').caseId).toBe(5)
    expect(screen.queryByTestId('EnrichmentProgress')).toBeNull()
  })

  it('published cases can be compared but not approved again', async () => {
    vi.mocked(api.getCatalogCases).mockResolvedValue({ cases: [kase({ status: 'published' })] } as never)
    vi.mocked(api.getCatalogCaseSample).mockResolvedValue({ items: [] } as never)
    const { default: Page } = await import(`${P}/catalog-review/[caseId]/page`)
    await show(Page, par({ caseId: '5' }))
    expect(screen.getByTestId('SampleComparison')).toBeTruthy()
    expect(screen.queryByTestId('ReviewActionBar')).toBeNull()
  })

  it('reviewable but sample missing: shows the failure hint instead of the comparison', async () => {
    vi.mocked(api.getCatalogCases).mockResolvedValue({ cases: [kase()] } as never)
    vi.mocked(api.getCatalogCaseSample).mockRejectedValue(new Error('x'))
    const { default: Page } = await import(`${P}/catalog-review/[caseId]/page`)
    await show(Page, par({ caseId: '5' }))
    expect(screen.getByText(tr.catalog_review_action_failed)).toBeTruthy()
    expect(screen.queryByTestId('SampleComparison')).toBeNull()
  })

  it.each([
    ['enriching', 'enriching'],
    ['rejected', 'rework_in_progress'],
  ])('status %s shows progress (mapped to %s) and the in-progress notice', async (status, mapped) => {
    vi.mocked(api.getCatalogCases).mockResolvedValue({ cases: [kase({ status })] } as never)
    vi.mocked(api.getCatalogCaseSample).mockResolvedValue(null as never)
    const { default: Page } = await import(`${P}/catalog-review/[caseId]/page`)
    await show(Page, par({ caseId: '5' }))
    expect(screen.getByText(tr.catalog_review_in_progress_notice)).toBeTruthy()
    expect(stubProps('EnrichmentProgress')).toEqual({ completed: 4, total: 10, status: mapped })
    expect(screen.queryByTestId('SampleComparison')).toBeNull()
  })
})
