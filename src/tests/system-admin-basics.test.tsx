import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { tSysAdmin } from '@/lib/system-admin-translations'
import type { SysAdminBrand } from '@/types/system-admin'

const push = vi.fn()
let pathname = '/admin/dashboard'
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => pathname,
}))
vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, onClick, ...rest }, children),
}))
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
}))

import { showToast, ToastProvider } from '@/components/system-admin/Toast'
vi.mock('@/components/system-admin/Toast', async (orig) => {
  const actual = await orig<typeof import('@/components/system-admin/Toast')>()
  return { ...actual, showToast: vi.fn(actual.showToast) }
})

import { SimpleEntityForm } from '@/components/system-admin/SimpleEntityForm'
import { BrandForm } from '@/components/system-admin/BrandForm'
import { BrandLogoInput } from '@/components/system-admin/BrandLogoInput'
import { SysAdminNav } from '@/components/system-admin/AdminNav'
import { SysAdminShell } from '@/components/system-admin/AdminShell'

const mockFetch = vi.fn()
const tr = tSysAdmin('en')
const trEl = tSysAdmin('el')

beforeEach(() => {
  push.mockReset()
  mockFetch.mockReset()
  vi.mocked(showToast).mockClear()
  pathname = '/admin/dashboard'
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

describe('Toast', () => {
  afterEach(() => vi.useRealTimers())

  it('renders nothing without messages, shows a toast, and removes it after 4 s', () => {
    vi.useFakeTimers()
    const { container } = render(<ToastProvider />)
    expect(container.firstChild).toBeNull()
    act(() => { showToast('Saved!', 'success') })
    expect(screen.getByRole('status').textContent).toBe('Saved!')
    act(() => { vi.advanceTimersByTime(4001) })
    expect(screen.queryByText('Saved!')).toBeNull()
  })

  it('stacks several toasts', () => {
    render(<ToastProvider />)
    act(() => { showToast('one', 'error'); showToast('two') })
    expect(screen.getByText('one')).toBeTruthy()
    expect(screen.getByText('two')).toBeTruthy()
  })

  it('is a no-op after the provider unmounted', () => {
    const { unmount } = render(<ToastProvider />)
    unmount()
    expect(() => showToast('late')).not.toThrow()
  })
})

describe('SimpleEntityForm', () => {
  const baseProps = {
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'note', label: 'Note', as: 'textarea' as const },
      { name: 'kind', label: 'Kind', as: 'select' as const, options: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }] },
    ],
    submitUrl: '/api/admin/things',
    method: 'POST' as const,
    backHref: '/admin/things',
    saveLabel: 'Save', savingLabel: 'Saving', cancelLabel: 'Cancel',
    savedMessage: 'ok!', errorMessage: 'rejected', backendErrorMessage: 'unreachable',
  }

  function Harness(props: Partial<Omit<typeof baseProps, 'method'>> & { method?: 'POST' | 'PATCH'; initial?: Record<string, string> }) {
    const [values, setValues] = React.useState<Record<string, string>>(props.initial ?? { name: '', note: '', kind: 'a' })
    return <SimpleEntityForm {...baseProps} {...props} values={values} onChange={(n, v) => setValues((s) => ({ ...s, [n]: v }))} />
  }

  it('submits trimmed values, blanks become null, then toasts and navigates back', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true })
    render(<Harness />)
    await user.type(screen.getByLabelText(/Name/), '  Cafe  ')
    await user.selectOptions(screen.getByLabelText('Kind'), 'b')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/things'))
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/admin/things')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ name: 'Cafe', note: null, kind: 'b' })
    expect(showToast).toHaveBeenCalledWith('ok!', 'success')
  })

  it('uses PATCH when told so and prefilled values are rendered', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true })
    render(<Harness method="PATCH" initial={{ name: 'Old', note: 'n', kind: 'a' }} />)
    expect((screen.getByLabelText(/Name/) as HTMLInputElement).value).toBe('Old')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
  })

  it('toasts an error and stays when the backend rejects', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false })
    render(<Harness initial={{ name: 'X', note: '', kind: 'a' }} />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('rejected', 'error'))
    expect(push).not.toHaveBeenCalled()
  })

  it('toasts the backend-unreachable message on network failure', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('down'))
    render(<Harness initial={{ name: 'X', note: '', kind: 'a' }} />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('unreachable', 'error'))
  })

  it('cancel navigates back without a request', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(push).toHaveBeenCalledWith('/admin/things')
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('BrandForm', () => {
  const brand: SysAdminBrand = {
    id: 7, slug: 'acme', names: { en: 'Acme', de: 'Acme DE' }, country_code: 'CY',
    homepages: { de: 'https://acme.de' }, logos: [{ url: 'https://cdn/x.png' }],
    created_at: '', updated_at: '',
  }

  it('create: requires a name before sending anything', async () => {
    const user = userEvent.setup()
    render(<BrandForm brand={null} tr={tr} />)
    await user.type(screen.getByLabelText(new RegExp(tr.name)), '   ')
    // the empty slug field is natively required too (B8100-001): submit the form directly to reach our own validation
    fireEvent.submit(screen.getByRole('button', { name: tr.save }).closest('form') as HTMLFormElement)
    expect(await screen.findByText('Name is required')).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('create: POSTs slug (derived from the name), names/logos/homepages, null for empty optional fields', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true })
    render(<BrandForm brand={null} tr={tr} />)
    await user.type(screen.getByLabelText(new RegExp(tr.name)), ' Zed ')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/brands'))
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/admin/brands')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ slug: 'zed', names: { en: 'Zed' }, logos: null, homepages: null })
    expect(showToast).toHaveBeenCalledWith(tr.saved, 'success')
  })

  it('edit: prefills from the brand (falls back to the first homepage) and PATCHes', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true })
    render(<BrandForm brand={brand} tr={tr} />)
    expect((screen.getByLabelText(new RegExp(tr.name)) as HTMLInputElement).value).toBe('Acme')
    expect((screen.getByLabelText(tr.website) as HTMLInputElement).value).toBe('https://acme.de')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/admin/brands/7')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({
      names: { en: 'Acme' }, logos: [{ url: 'https://cdn/x.png' }], homepages: { en: 'https://acme.de' },
    })
  })

  it('toasts generic error on rejection and backend error on network failure', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({ ok: false })
    render(<BrandForm brand={brand} tr={trEl} />)
    await user.click(screen.getByRole('button', { name: trEl.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(trEl.error_generic, 'error'))
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await user.click(screen.getByRole('button', { name: trEl.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(trEl.error_backend, 'error'))
    expect(push).not.toHaveBeenCalled()
  })

  it('cancel returns to the brand list', async () => {
    const user = userEvent.setup()
    render(<BrandForm brand={null} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.cancel }))
    expect(push).toHaveBeenCalledWith('/admin/brands')
  })
})

describe('BrandLogoInput', () => {
  const labels = {
    urlTabLabel: 'URL', uploadTabLabel: 'Upload', logoUrlLabel: 'Logo URL', logoPreviewLabel: 'Preview',
    uploadLabel: 'Pick file', uploadingLabel: 'Uploading…', errorMessage: 'Upload failed', saveFirstLabel: 'Save brand first',
  }
  const file = () => new File(['x'], 'logo.png', { type: 'image/png' })

  it('typing a URL reports the change and shows a preview', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BrandLogoInput brandId={1} value={null} onChange={onChange} {...labels} />)
    expect(screen.queryByAltText('Preview')).toBeNull()
    await user.type(screen.getByPlaceholderText('https://…'), 'https://a/b.png')
    expect(onChange).toHaveBeenLastCalledWith('https://a/b.png')
    expect(screen.getByAltText('Preview').getAttribute('src')).toBe('https://a/b.png')
  })

  it('new brand (no id): upload is disabled and hints to save first', async () => {
    const user = userEvent.setup()
    render(<BrandLogoInput brandId={null} value={null} onChange={vi.fn()} {...labels} />)
    await user.click(screen.getByRole('button', { name: 'Upload' }))
    expect(screen.getByText('Save brand first')).toBeTruthy()
    expect((screen.getByLabelText('Pick file') as HTMLInputElement).disabled).toBe(true)
  })

  it('uploads a file, adopts the returned URL and switches back to the URL tab', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ logo_url: '/brand_logos/new.png' }) })
    render(<BrandLogoInput brandId={5} value={null} onChange={onChange} {...labels} />)
    await user.click(screen.getByRole('button', { name: 'Upload' }))
    await user.upload(screen.getByLabelText('Pick file'), file())
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/brand_logos/new.png'))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/brands/5/logo')
    expect((screen.getByPlaceholderText('https://…') as HTMLInputElement).value).toBe('/brand_logos/new.png')
  })

  it('shows the error when the upload is rejected or the network fails', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    mockFetch.mockResolvedValueOnce({ ok: false })
    render(<BrandLogoInput brandId={5} value={null} onChange={onChange} {...labels} />)
    await user.click(screen.getByRole('button', { name: 'Upload' }))
    await user.upload(screen.getByLabelText('Pick file'), file())
    expect(await screen.findByText('Upload failed')).toBeTruthy()
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await user.upload(screen.getByLabelText('Pick file'), file())
    expect(await screen.findByText('Upload failed')).toBeTruthy()
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('SysAdminNav / Shell', () => {
  it('marks the current section and links to every admin area', () => {
    pathname = '/admin/shops/12/edit'
    render(<SysAdminNav tr={tr} adminEmail="root@pundo.io" />)
    const current = screen.getAllByRole('link', { current: 'page' })
    expect(current).toHaveLength(1)
    expect(current[0].getAttribute('href')).toBe('/admin/shops')
    expect(screen.getByRole('link', { name: new RegExp(tr.nav_crm) }).getAttribute('href')).toBe('/admin/crm/orgs')
    expect(screen.getByText('root@pundo.io')).toBeTruthy()
  })

  it.each(['/admin/crm/orgs/7', '/admin/crm/persons/3', '/admin/crm/review', '/admin/crm/settings'])(
    'the CRM item is the current section on every CRM page (%s)',
    (path) => {
      pathname = path
      render(<SysAdminNav tr={tr} adminEmail="root@pundo.io" />)
      const current = screen.getAllByRole('link', { current: 'page' })
      expect(current).toHaveLength(1)
      expect(current[0].getAttribute('href')).toBe('/admin/crm/orgs')
    },
  )

  it('logout posts to the logout route and redirects to the login, even if the call fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('down'))
    render(<SysAdminNav tr={tr} adminEmail="a@b.io" />)
    await user.click(screen.getByRole('button', { name: tr.logout }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/login'))
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/auth/logout', { method: 'POST' })
  })

  it('mobile drawer opens via toggle, closes on navigation and on backdrop click', async () => {
    const user = userEvent.setup()
    const { container } = render(<SysAdminNav tr={trEl} adminEmail="a@b.io" />)
    const toggle = screen.getByRole('button', { name: trEl.nav_toggle_aria })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const drawer = container.querySelector('#mobile-nav') as HTMLElement
    expect(drawer).toBeTruthy()
    // clicking inside the panel does not close it
    await user.click(screen.getAllByText('a@b.io').at(-1)!)
    expect(container.querySelector('#mobile-nav')).toBeTruthy()
    // navigating closes it
    await user.click(within(drawer).getAllByRole('link')[0])
    expect(container.querySelector('#mobile-nav')).toBeNull()
    await user.click(toggle)
    fireEvent.click(container.querySelector('#mobile-nav')!)
    expect(container.querySelector('#mobile-nav')).toBeNull()
  })

  it('Shell renders children next to the nav and hosts the toast provider', () => {
    render(<SysAdminShell tr={tr} adminEmail="a@b.io"><p>page body</p></SysAdminShell>)
    expect(screen.getByRole('main').textContent).toBe('page body')
    act(() => { showToast('hello') })
    expect(screen.getByRole('status').textContent).toBe('hello')
  })
})

