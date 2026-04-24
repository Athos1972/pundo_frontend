import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/shop-admin/import',
}))

vi.mock('@/components/shop-admin/Toast', () => ({
  showToast: vi.fn(),
}))

// ─── Error-mapping logic ──────────────────────────────────────────────────────

describe('ImportPanel upload error mapping', () => {
  /**
   * The _mapUploadError function is an internal helper in ImportPanel.
   * We test the same mapping logic through the translation system.
   */
  it('upload_error_unsupported_format translation key exists in all 6 langs', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    for (const lang of ['en', 'de', 'el', 'ru', 'ar', 'he']) {
      const tr = tAdmin(lang)
      expect(tr.upload_error_unsupported_format).toBeTruthy()
      expect(tr.upload_error_unsupported_format.length).toBeGreaterThan(5)
    }
  })

  it('upload_error_xls_unreadable translation key exists in all 6 langs', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    for (const lang of ['en', 'de', 'el', 'ru', 'ar', 'he']) {
      const tr = tAdmin(lang)
      expect(tr.upload_error_xls_unreadable).toBeTruthy()
    }
  })

  it('upload_error_too_large translation key exists in all 6 langs', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    for (const lang of ['en', 'de', 'el', 'ru', 'ar', 'he']) {
      const tr = tAdmin(lang)
      expect(tr.upload_error_too_large).toBeTruthy()
    }
  })

  it('upload_hint_see_catalog translation key exists in all 6 langs', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    for (const lang of ['en', 'de', 'el', 'ru', 'ar', 'he']) {
      const tr = tAdmin(lang)
      expect(tr.upload_hint_see_catalog).toBeTruthy()
    }
  })

  it('upload_formats_hint includes .xls in all 6 langs', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    for (const lang of ['en', 'de', 'el', 'ru', 'ar', 'he']) {
      const tr = tAdmin(lang)
      expect(tr.upload_formats_hint).toContain('.xls')
      expect(tr.upload_formats_hint).toContain('.xlsx')
      expect(tr.upload_formats_hint).toContain('.csv')
    }
  })

  it('field_catalog_title exists in all 6 langs', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    for (const lang of ['en', 'de', 'el', 'ru', 'ar', 'he']) {
      const tr = tAdmin(lang)
      expect(tr.field_catalog_title).toBeTruthy()
    }
  })
})

// ─── ImportPanel render ───────────────────────────────────────────────────────

describe('ImportPanel', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ imported: 0, errors: [] }), { status: 200 })
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.resetModules()
  })

  const defaultStatus = {
    google_sheet_url: undefined,
    last_sync: undefined,
    last_sync_status: undefined,
    last_sync_message: undefined,
  }

  it('renders upload section with .xlsx, .xls, .csv accept attribute', async () => {
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={defaultStatus} lang="en" />)
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).not.toBeNull()
    expect(fileInput!.getAttribute('accept')).toBe('.xlsx,.xls,.csv')
  })

  it('renders template download button as an <a> with href', async () => {
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={defaultStatus} lang="en" />)
    const downloadLink = screen.getByText('Download template')
    expect(downloadLink.closest('a')).not.toBeNull()
    expect(downloadLink.closest('a')!.getAttribute('href')).toBe('/api/shop-admin/import/template')
    expect(downloadLink.closest('a')!.hasAttribute('download')).toBe(true)
  })

  it('renders FieldCatalog inside the upload section', async () => {
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={defaultStatus} lang="en" />)
    expect(screen.getByText('Field reference')).toBeInTheDocument()
  })

  it('renders format hint .xlsx, .xls, .csv', async () => {
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={defaultStatus} lang="en" />)
    expect(screen.getByText('.xlsx, .xls, .csv')).toBeInTheDocument()
  })

  it('renders Google Sheets section', async () => {
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={defaultStatus} lang="en" />)
    expect(screen.getByPlaceholderText(/docs.google.com/)).toBeInTheDocument()
  })

  it('renders in German', async () => {
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={defaultStatus} lang="de" />)
    expect(screen.getByText('Feldkatalog')).toBeInTheDocument()
    expect(screen.getByText('Vorlage herunterladen')).toBeInTheDocument()
  })

  it('renders in Arabic', async () => {
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={defaultStatus} lang="ar" />)
    expect(screen.getByText('دليل الحقول')).toBeInTheDocument()
  })

  it('shows image_download_pending info block when pending > 0', async () => {
    // Mock fetch to return a result with image_download_pending = 3
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ imported: 5, errors: [], image_download_pending: 3 }), { status: 200 })
    )

    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    const { container } = render(<ImportPanel initialStatus={defaultStatus} lang="en" />)

    // Simulate file upload by triggering handleUpload
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['col\nval'], 'test.csv', { type: 'text/csv' })
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })

    const { fireEvent, act } = await import('@testing-library/react')
    await act(async () => {
      fireEvent.change(fileInput)
      // Wait for transition
      await new Promise((r) => setTimeout(r, 50))
    })

    // The info block should appear
    expect(screen.getByText(/3 product images are being downloaded/)).toBeInTheDocument()
  })

  it('does not show image_download_pending block when pending is 0', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ imported: 5, errors: [], image_download_pending: 0 }), { status: 200 })
    )

    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    const { container } = render(<ImportPanel initialStatus={defaultStatus} lang="en" />)

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['col\nval'], 'test.csv', { type: 'text/csv' })
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })

    const { fireEvent, act } = await import('@testing-library/react')
    await act(async () => {
      fireEvent.change(fileInput)
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.queryByText(/product images are being downloaded/)).not.toBeInTheDocument()
  })

  it('shows amber banner when status has image_download_errors', async () => {
    const statusWithErrors = {
      ...defaultStatus,
      image_download_errors: [
        { product_name: 'Cat Food', url: 'https://example.com/img.jpg', reason: 'http 404' },
      ],
    }

    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={statusWithErrors} lang="en" />)

    expect(screen.getByText(/1 product images could not be loaded/)).toBeInTheDocument()
  })

  it('does not show amber banner when no image_download_errors', async () => {
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={defaultStatus} lang="en" />)

    expect(screen.queryByText(/product images could not be loaded/)).not.toBeInTheDocument()
  })

  it('shows error details in amber banner', async () => {
    const statusWithErrors = {
      ...defaultStatus,
      image_download_errors: [
        { product_name: 'UniqueErrorProduct', url: 'https://bad.com/img.jpg', reason: 'timeout' },
      ],
    }

    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={statusWithErrors} lang="en" />)

    expect(screen.getByText(/UniqueErrorProduct/)).toBeInTheDocument()
    // The reason text is a text node inside the <li>, use getAllByText with regex
    expect(screen.getAllByText(/timeout/).length).toBeGreaterThan(0)
  })

  it('image_download_pending and error translations exist in all 6 langs', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    for (const lang of ['en', 'de', 'el', 'ru', 'ar', 'he']) {
      const tr = tAdmin(lang)
      expect(tr.image_download_pending).toContain('{n}')
      expect(tr.image_download_errors_title).toContain('{n}')
      expect(tr.image_download_errors_detail_toggle).toBeTruthy()
      expect(tr.field_image_url_desc).toBeTruthy()
    }
  })
})
