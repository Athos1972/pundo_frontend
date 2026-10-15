import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { tAdmin } from '@/lib/shop-admin-translations'

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

// ─── F5920: upload -> preview -> apply -> result (replaces the direct upload tests) ─────────────

import { fireEvent, act } from '@testing-library/react'

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const COUNTS = { new: 3, updated: 0, unchanged: 0, error: 0, possible_duplicate: 0, deactivate: 0 }
const rowOf = (n: number, extra: Record<string, unknown> = {}) => ({
  row: n, status: 'new', name: `Item ${n}`, language: 'en', changes: [], candidates: [], errors: [], hints: [], ...extra,
})
const previewOf = (extra: Record<string, unknown> = {}) => ({
  id: 'p-1', status: 'ready', full_list: false, default_lang: 'en', filename: 'a.csv', row_count: 3,
  expires_at: '2026-10-15T20:30:00Z', expired: false, can_apply: true, counts: COUNTS,
  rows: [rowOf(2), rowOf(3), rowOf(4)], rows_total: 3, deactivations: [], deactivations_total: 0, ...extra,
})
const RESULT = {
  created: 3, updated: 0, unchanged: 0, deactivated: 0, linked_existing: 0, image_download_pending: 0,
  translation_queued: 3, row_count: 3, hints: {},
}

describe('ImportPanel — catalog import flow (F5920)', () => {
  type Call = { url: string; method: string; body: unknown }
  let calls: Call[]
  let routes: { post: () => Response; get: () => Response; apply: () => Response; del: () => Response; status: () => Response }

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    calls = []
    routes = {
      post: () => json(202, { id: 'p-1', status: 'processing', expires_at: 'x', row_count: 3 }),
      get: () => json(200, previewOf()),
      apply: () => json(202, { id: 'p-1', status: 'applying' }),
      del: () => new Response(null, { status: 204 }),
      status: () => json(200, {}),
    }
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body ?? null })
      if (url.endsWith('/import/previews') && method === 'POST') return routes.post()
      if (url.endsWith('/apply')) return routes.apply()
      if (url.includes('/import/previews/') && method === 'DELETE') return routes.del()
      if (url.includes('/import/previews/')) return routes.get()
      if (url.endsWith('/import/status')) return routes.status()
      return json(200, {})
    }))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  const base = { google_sheet_url: undefined, last_sync: undefined, last_sync_status: undefined, last_sync_message: undefined }

  async function mount(lang = 'en', status: Record<string, unknown> = base) {
    const { ImportPanel } = await import('@/components/shop-admin/ImportPanel')
    return render(<ImportPanel initialStatus={status} lang={lang} />)
  }

  async function choose(container: HTMLElement, name = 'a.csv') {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [new File(['name\nX\n'], name)], configurable: true })
    await act(async () => { fireEvent.change(input) })
  }
  const tick = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }

  it('AK 1: choosing a file starts a PREVIEW (no direct import) with the UI language; nothing is saved', async () => {
    const { container } = await mount('el')
    await choose(container)
    const post = calls.find((c) => c.method === 'POST')!
    expect(post.url).toBe('/api/shop-admin/import/previews')
    expect(calls.some((c) => c.url.endsWith('/import/upload'))).toBe(false)
    const form = post.body as FormData
    expect(form.get('default_lang')).toBe('el')
    expect(form.get('full_list')).toBe('false')
    expect(screen.getByTestId('import-checking')).toBeInTheDocument()
    await tick(1000)
    expect(screen.getByTestId('import-preview')).toBeInTheDocument()
    expect(screen.getAllByTestId('import-preview-row')).toHaveLength(3)
    expect(screen.getByTestId('import-count-tiles').querySelector('[data-tile="new"] dd')!.textContent).toBe('3')
  })

  it('the "This file is my complete list" box is unchecked by default, explained, and sent as full_list=true when ticked', async () => {
    const { container } = await mount()
    const box = screen.getByTestId('import-full-list') as HTMLInputElement
    expect(box.checked).toBe(false)
    expect(screen.getByText('This file is my complete list')).toBeInTheDocument()
    expect(screen.getByText(/missing in this file are set to “not available”/)).toBeInTheDocument()
    fireEvent.click(box)
    await choose(container)
    expect(((calls.find((c) => c.method === 'POST')!.body) as FormData).get('full_list')).toBe('true')
  })

  it('shows the progress of the analysis while it runs', async () => {
    routes.get = () => json(200, previewOf({ status: 'processing', rows: [], counts: null, progress: { phase: 'enrich', done: 40, total: 100 } }))
    const { container } = await mount()
    await choose(container)
    await tick(1000)
    expect(screen.getByTestId('import-checking')).toHaveTextContent('Looking for categories and similar articles… 40 of 100')
  })

  it('shows a progress bar with percent and rows while the (long) analysis runs', async () => {
    routes.get = () => json(200, previewOf({ status: 'processing', rows: [], counts: null, progress: { phase: 'enrich', done: 1250, total: 5000 } }))
    const { container } = await mount()
    await choose(container)
    await tick(1000)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '25')
    expect(screen.getByTestId('import-checking')).toHaveTextContent('25%')
    expect(screen.getByTestId('import-checking')).toHaveTextContent('1250 of 5000')
  })

  it('AK 2: "Cancel" discards the preview and shows the empty upload form again', async () => {
    const { container } = await mount()
    await choose(container)
    await tick(1000)
    await act(async () => { fireEvent.click(screen.getByTestId('import-cancel')) })
    expect(calls.some((c) => c.method === 'DELETE' && c.url.endsWith('/previews/p-1'))).toBe(true)
    expect(screen.queryByTestId('import-preview')).toBeNull()
    expect(container.querySelector('input[type="file"]')).not.toBeNull()
    expect((screen.getByTestId('import-full-list') as HTMLInputElement).checked).toBe(false)
    expect(screen.getByText('Field reference')).toBeInTheDocument()
  })

  it('AK 3: "Apply" writes, then the result shows the counters and the link to the offers', async () => {
    let applied = false
    routes.apply = () => { applied = true; return json(202, { id: 'p-1', status: 'applying' }) }
    routes.get = () => json(200, applied ? previewOf({ status: 'applied', rows: [], result: RESULT }) : previewOf())
    const { container } = await mount()
    await choose(container)
    await tick(1000)
    await act(async () => { fireEvent.click(screen.getByTestId('import-apply')) })
    expect(calls.find((c) => c.url.endsWith('/apply'))!.body).toBe(JSON.stringify({ decisions: [] }))
    await tick(1000)
    const result = screen.getByTestId('import-result')
    expect(result).toHaveTextContent('3 new')
    expect(screen.getByRole('link', { name: 'Go to my offers' })).toHaveAttribute('href', '/shop-admin/offers')
    fireEvent.click(screen.getByRole('button', { name: 'Upload another file' }))
    expect(container.querySelector('input[type="file"]')).not.toBeNull()
  })

  it('shows the image_download_pending info block after apply and waits for the downloads (was: after upload)', async () => {
    let applied = false
    routes.apply = () => { applied = true; return json(202, { id: 'p-1', status: 'applying' }) }
    routes.get = () => json(200, applied ? previewOf({ status: 'applied', rows: [], result: { ...RESULT, image_download_pending: 3 } }) : previewOf())
    const { container } = await mount()
    await choose(container)
    await tick(1000)
    await act(async () => { fireEvent.click(screen.getByTestId('import-apply')) })
    await tick(1000)
    expect(screen.getByText(/3 product images are being downloaded/)).toBeInTheDocument()
    await tick(2000) // the status poll for the downloads runs
    expect(calls.some((c) => c.url.endsWith('/import/status'))).toBe(true)
  })

  it('does not show the image block when no download is pending', async () => {
    let applied = false
    routes.apply = () => { applied = true; return json(202, { id: 'p-1', status: 'applying' }) }
    routes.get = () => json(200, applied ? previewOf({ status: 'applied', rows: [], result: RESULT }) : previewOf())
    const { container } = await mount()
    await choose(container)
    await tick(1000)
    await act(async () => { fireEvent.click(screen.getByTestId('import-apply')) })
    await tick(1000)
    expect(screen.queryByText(/product images are being downloaded/)).toBeNull()
  })

  it('AK 23: faulty rows -> "Apply" disabled, reason shown, every row error translated, nothing applied (was: direct upload with errors)', async () => {
    routes.get = () => json(200, previewOf({
      can_apply: false, counts: { ...COUNTS, new: 0, error: 1 }, rows_total: 1,
      rows: [rowOf(3, { status: 'error', name: null, errors: [{ row: 3, code: 'missing_name', message: 'missing required column: name' }] })],
    }))
    const { container } = await mount()
    await choose(container)
    await tick(1000)
    expect(screen.getByTestId('import-apply')).toBeDisabled()
    expect(screen.getByTestId('import-apply-blocked')).toHaveTextContent('Fix the 1 faulty rows in your file')
    expect(screen.getByTestId('import-row-errors')).toHaveTextContent('Name is missing')
    expect(calls.some((c) => c.url.endsWith('/apply'))).toBe(false)
  })

  it.each([
    ['xlsx_unreadable', 'This .xlsx file could not be read. Please check the file or use the template.'],
    ['xls_unreadable', 'This .xls file could not be read. Please save it as .xlsx or .csv.'],
    ['unsupported_format', 'Unsupported file format. Use .xlsx, .xls or .csv.'],
    ['file_too_large', 'File too large. Maximum size is 20 MB.'],
    ['missing_name_column', 'The file needs a column called “name”.'],
    ['empty_file', 'The file contains no rows.'],
    ['csv_unreadable', 'This .csv file could not be read.'],
    ['preview_in_progress', 'Another import is still running.'],
  ])('upload error %s is shown translated inline and the form stays usable', async (code, text) => {
    routes.post = () => json(code === 'file_too_large' ? 413 : code === 'preview_in_progress' ? 429 : 400, { detail: { code } })
    const { container } = await mount()
    await choose(container)
    expect(screen.getByTestId('import-upload-error')).toHaveTextContent(text)
    expect(container.querySelector('input[type="file"]')).not.toBeDisabled()
  })

  it('too_many_rows names the limit of the shop', async () => {
    routes.post = () => json(400, { detail: { code: 'too_many_rows', limit: 65536 } })
    const { container } = await mount()
    await choose(container)
    expect(screen.getByTestId('import-upload-error')).toHaveTextContent('65536')
  })

  it('AK 18: a failed apply (preview expired / stale) shows the translated message and the user can upload again', async () => {
    routes.apply = () => json(410, { detail: { code: 'preview_expired' } })
    const { container } = await mount()
    await choose(container)
    await tick(1000)
    await act(async () => { fireEvent.click(screen.getByTestId('import-apply')) })
    expect(screen.getByRole('alert')).toHaveTextContent('The preview has expired. Please upload the file again.')
    expect(screen.getByTestId('import-preview')).toBeInTheDocument() // still shown, nothing was written
  })

  it('a job that failed on the server ends on a message with "upload another file"', async () => {
    routes.get = () => json(200, previewOf({ status: 'failed', rows: [], counts: null, error_code: 'job_lost' }))
    const { container } = await mount()
    await choose(container)
    await tick(1000)
    expect(screen.getByRole('alert')).toHaveTextContent('The check was interrupted. Please upload the file again.')
    fireEvent.click(screen.getByRole('button', { name: 'Upload another file' }))
    expect(container.querySelector('input[type="file"]')).not.toBeNull()
  })

  it('AK 21: the preview uses the wide layout; Arabic is rendered right-to-left safe (no physical margins)', async () => {
    const { container } = await mount('ar')
    await choose(container)
    await tick(1000)
    expect(container.firstElementChild!.className).toContain('max-w-4xl')
    expect(container.innerHTML).not.toMatch(/(^|[\s"'])(ml|mr|pl|pr|text-left|text-right)-/)
  })

  // ── Google Sheets (AK 19) ──────────────────────────────────────────────────

  const sheet = 'https://docs.google.com/spreadsheets/d/X/edit'
  const synced = (result: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
    ...base, google_sheet_url: sheet, last_sync: '2026-10-15T10:00:00Z', last_sync_status: 'ok', last_sync_result: {
      imported: 2, error_count: 0, errors: [], errors_truncated: false, image_download_pending: 0, ...result,
    }, ...extra,
  })

  it('AK 19: status line shows time and the counters "n new, n updated, n not available, n errors"', async () => {
    await mount('en', synced({ created: 0, updated: 1, unchanged: 1, deactivated: 1 }))
    const tiles = screen.getByTestId('sheets-sync-tiles')
    expect(tiles.querySelector('[data-tile="updated"]')).toHaveTextContent('1 Updated')
    expect(tiles.querySelector('[data-tile="deactivate"]')).toHaveTextContent('1 Set to “not available”')
    expect(tiles.querySelector('[data-tile="new"]')).toHaveTextContent('0 New')
    expect(tiles.querySelector('[data-tile="error"]')).toHaveTextContent('0 Errors')
    expect(screen.getByText(/Last sync:/)).toBeInTheDocument()
  })

  it('an old result without counters shows no counter line (no crash)', async () => {
    await mount('en', synced({}))
    expect(screen.queryByTestId('sheets-sync-tiles')).toBeNull()
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('possible duplicates of a sync are listed in a collapsible block', async () => {
    await mount('en', synced({ created: 2, possible_duplicates: 2, possible_duplicate_rows: [{ row: 4, name: 'Cat Food' }, { row: 9, name: 'Dog Food' }] }))
    const block = screen.getByTestId('sheets-possible-duplicates')
    expect(block.tagName).toBe('DETAILS')
    expect(block).toHaveTextContent('2 possible duplicates were created as new articles')
    expect(block).toHaveTextContent('Row 4: Cat Food')
  })

  it.each([
    ['empty_sheet', 'The sheet contains no rows. Nothing was changed.'],
    ['missing_name_column', 'The sheet needs a column called “name”. Nothing was changed.'],
    ['too_many_rows', 'The sheet has more rows than allowed for your shop. Nothing was changed.'],
  ])('sync error %s is translated', async (code, text) => {
    await mount('en', synced({ error_code: code }, { last_sync_status: 'error' }))
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('new row error codes of a failed sync are translated (AK 23, sheet)', async () => {
    await mount('de', synced({
      error_code: 'rows_failed', error_count: 2,
      errors: [{ row: 3, code: 'invalid_ean', message: 'x' }, { row: 5, code: 'duplicate_in_file', message: 'x' }],
    }, { last_sync_status: 'error' }))
    expect(screen.getByText(/Zeile 3: EAN ist ungültig/)).toBeInTheDocument()
    expect(screen.getByText(/Zeile 5: Doppelt in der Datei/)).toBeInTheDocument()
  })

  it('connecting the sheet sends the UI language; a manual sync passes it as ?lang=', async () => {
    await mount('ru')
    fireEvent.change(screen.getByPlaceholderText(/docs.google.com/), { target: { value: sheet } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: tAdmin('ru').sheets_connect }) ) })
    const connect = calls.find((c) => c.url.endsWith('/import/google-sheets') && c.method === 'POST')!
    expect(JSON.parse(connect.body as string)).toEqual({ url: sheet, default_lang: 'ru' })
  })

  it('manual sync call carries the language', async () => {
    await mount('de', synced({ created: 1 }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: tAdmin('de').sheets_sync })) })
    expect(calls.some((c) => c.url === '/api/shop-admin/import/google-sheets/sync?lang=de' && c.method === 'POST')).toBe(true)
  })
})
