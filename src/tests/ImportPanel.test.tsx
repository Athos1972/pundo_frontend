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

  // ── B5900-030: all-or-nothing results, translated messages ──────────────────

  const sheetUrl = 'https://docs.google.com/spreadsheets/d/X/edit'
  const base = { ...defaultStatus, google_sheet_url: sheetUrl, last_sync: '2026-10-15T10:00:00Z' }

  it('sync error rows_failed: shows translated summary + every row, details only inside <details>', async () => {
    const status = {
      ...base,
      last_sync_status: 'error' as const,
      last_sync_message: '2 row error(s), nothing imported: missing required column: name',
      last_sync_result: {
        imported: 0, error_count: 2, errors_truncated: false, image_download_pending: 0,
        error_code: 'rows_failed' as const,
        errors: [
          { row: 3, code: 'missing_name' as const, message: 'missing required column: name' },
          { row: 9, code: 'row_failed' as const, message: 'row could not be imported' },
        ],
      },
    }
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={status} lang="de" />)
    expect(screen.getByText(/Es wurde nichts importiert, weil 2 Zeilen Fehler enthalten/)).toBeInTheDocument()
    expect(screen.getByText(/Zeile 3: Name fehlt/)).toBeInTheDocument()
    expect(screen.getByText(/Zeile 9: Zeile konnte nicht importiert werden/)).toBeInTheDocument()
    const msg = screen.getByText(/nothing imported: missing required column/)
    expect(msg.closest('details')).not.toBeNull()
  })

  it('sync error sheet_not_public shows the sharing hint', async () => {
    const status = {
      ...base,
      last_sync_status: 'error' as const,
      last_sync_result: {
        imported: 0, error_count: 0, errors: [], errors_truncated: false, image_download_pending: 0,
        error_code: 'sheet_not_public' as const,
      },
    }
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={status} lang="en" />)
    expect(screen.getByText(/The sheet is not public/)).toBeInTheDocument()
  })

  it('unknown status value falls back to the neutral text', async () => {
    const status = { ...base, last_sync_status: 'weird' as unknown as 'ok' }
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    render(<ImportPanel initialStatus={status} lang="en" />)
    expect(screen.getByText('Unknown status')).toBeInTheDocument()
  })

  it('unknown row code falls back to the raw message', async () => {
    const { ImportRowErrorList } = await import('@/components/shop-admin/ImportRowErrorList')
    render(<ImportRowErrorList lang="en" errors={[{ row: 4, code: 'future_code' as never, message: 'raw text' }]} />)
    expect(screen.getByText(/Row 4: raw text/)).toBeInTheDocument()
  })

  it('maps the xlsx read error to a dedicated translated message', async () => {
    const { showToast } = await import('@/components/shop-admin/Toast')
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'xlsx file could not be read — please check the file or use the template' }), { status: 400 })
    )
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    const { container } = render(<ImportPanel initialStatus={defaultStatus} lang="en" />)
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(fileInput, 'files', { value: [new File(['x'], 'a.xlsx')], configurable: true })
    const { fireEvent, act } = await import('@testing-library/react')
    await act(async () => {
      fireEvent.change(fileInput)
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(showToast).toHaveBeenCalledWith('This .xlsx file could not be read. Please check the file or use the template.', 'error')
  })

  it('upload with faulty rows shows nothing-imported message and every row error', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({
        imported: 0, image_download_pending: 0,
        errors: [{ row: 3, code: 'missing_name', message: 'missing required column: name' }],
      }), { status: 200 })
    )
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    const { container } = render(<ImportPanel initialStatus={defaultStatus} lang="en" />)
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(fileInput, 'files', { value: [new File(['x'], 'a.csv')], configurable: true })
    const { fireEvent, act } = await import('@testing-library/react')
    await act(async () => {
      fireEvent.change(fileInput)
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(screen.getByText(/Nothing was imported because 1 rows contain errors/)).toBeInTheDocument()
    expect(screen.getByText(/Row 3: Name is missing/)).toBeInTheDocument()
  })

  it('new B5900-030 keys exist in all 6 langs', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const keys = [
      'sheets_connected_toast', 'sheets_removed_toast', 'sheets_connecting', 'sheets_status_unknown',
      'sheets_errors_truncated', 'sheets_error_url_invalid', 'sheets_error_fetch_failed',
      'sheets_error_not_public', 'sheets_error_rows_failed', 'sheets_error_sync_failed',
      'sheets_technical_details', 'import_status_poll_timeout', 'upload_error_xlsx_unreadable',
      'upload_nothing_imported', 'row_error_missing_name', 'row_error_failed',
    ] as const
    for (const lang of ['en', 'de', 'el', 'ru', 'ar', 'he']) {
      const tr = tAdmin(lang) as unknown as Record<string, string>
      for (const k of keys) expect(tr[k], `${lang}.${k}`).toBeTruthy()
    }
  })
})
