import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { ImportPreview } from '@/components/shop-admin/ImportPreview'
import { ImportResult } from '@/components/shop-admin/ImportResult'
import { ImportCountTiles } from '@/components/shop-admin/ImportCountTiles'
import type { ImportApplyResult, ImportPreview as Preview, ImportPreviewRow } from '@/types/shop-admin'

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

function row(n: number, extra: Partial<ImportPreviewRow> = {}): ImportPreviewRow {
  return { row: n, status: 'new', name: `Item ${n}`, language: 'en', changes: [], candidates: [], errors: [], hints: [], ...extra }
}

function preview(extra: Partial<Preview> = {}): Preview {
  return {
    id: 'p-1', status: 'ready', full_list: false, default_lang: 'en', filename: 'list.csv', row_count: 3,
    expires_at: '2026-10-15T20:30:00Z', expired: false, can_apply: true,
    counts: { new: 2, updated: 1, unchanged: 0, error: 0, possible_duplicate: 0, deactivate: 0 },
    rows: [row(2), row(3, { status: 'updated', changes: ['price'], matched_by: 'sku', matched_name: 'Dog Food' }), row(4)],
    rows_total: 3, deactivations: [], deactivations_total: 0, ...extra,
  }
}

function setup(p: Preview, props: Partial<React.ComponentProps<typeof ImportPreview>> = {}, lang = 'en') {
  const handlers = { onApply: vi.fn(), onCancel: vi.fn(), onFilter: vi.fn(), onLoadMore: vi.fn() }
  const utils = render(
    <ImportPreview preview={p} lang={lang} applying={false} error={null} timedOut={false} filter={null} loadingMore={false}
      {...handlers} {...props} />,
  )
  return { ...utils, ...handlers }
}

describe('ImportPreview — counters and rows (AK 1)', () => {
  it('shows the five counters; the "not available" counter only for a complete list', () => {
    const { rerender } = setup(preview())
    const tiles = screen.getByTestId('import-count-tiles')
    expect(within(tiles).getAllByText(/./).length).toBeGreaterThan(0)
    for (const label of ['New', 'Updated', 'Unchanged', 'Errors', 'Possible duplicates']) {
      expect(within(tiles).getByText(label)).toBeInTheDocument()
    }
    expect(within(tiles).queryByText(/not available/)).toBeNull()
    expect(tiles.querySelector('[data-tile="new"] dd')!.textContent).toBe('2')

    rerender(
      <ImportPreview preview={preview({ full_list: true, counts: { new: 0, updated: 0, unchanged: 7, error: 0, possible_duplicate: 0, deactivate: 3 } })}
        lang="en" applying={false} error={null} timedOut={false} filter={null} loadingMore={false}
        onApply={vi.fn()} onCancel={vi.fn()} onFilter={vi.fn()} onLoadMore={vi.fn()} />,
    )
    expect(screen.getByTestId('import-count-tiles').querySelector('[data-tile="deactivate"] dd')!.textContent).toBe('3')
  })

  it('says nothing has been saved yet and how long the preview is valid', () => {
    setup(preview())
    expect(screen.getByText('Preview — nothing has been saved yet')).toBeInTheDocument()
    expect(screen.getByText(/File: list\.csv · 3 rows/)).toBeInTheDocument()
    expect(screen.getByText(/Valid until/)).toBeInTheDocument()
  })

  it('renders one row per entry with status, name, SKU, EAN, language, price, availability', () => {
    setup(preview({
      rows: [row(2, { sku: 'A-100', ean: '4006381333931', language: 'el', price: '3.5', currency: 'EUR', available: false })],
    }))
    const li = screen.getByTestId('import-preview-row')
    expect(li).toHaveAttribute('data-status', 'new')
    expect(li).toHaveTextContent('Item 2')
    expect(li).toHaveTextContent('Row 2')
    expect(within(li).getByText('A-100').getAttribute('dir')).toBe('ltr')
    expect(within(li).getByText('4006381333931').getAttribute('dir')).toBe('ltr')
    expect(within(li).getByText('el').getAttribute('dir')).toBe('ltr')
    expect(within(li).getByText('3.5 EUR').getAttribute('dir')).toBe('ltr')
    expect(li).toHaveTextContent('Not available')
  })

  it('updated row: matched article, how it was recognised, and what changes', () => {
    setup(preview({ rows: [row(3, { status: 'updated', matched_by: 'sku', matched_name: 'Dog Food', changes: ['price', 'reactivated', 'sku'] })] }))
    const li = screen.getByTestId('import-preview-row')
    expect(li).toHaveTextContent('Existing article: Dog Food')
    expect(li).toHaveTextContent('Recognised by article number')
    expect(li).toHaveTextContent('price changes')
    expect(li).toHaveTextContent('available again')
    expect(li).toHaveTextContent('article number is set')
  })

  it('shows the suggested category with its path and where it comes from (AK 13); none -> "No category"', () => {
    setup(preview({
      rows: [
        row(2, { category_id: 3, category_path: 'Animals > Pet Supplies > Cat Food', category_source: 'suggested' }),
        row(3, { hints: ['category_unresolved'] }),
      ],
    }))
    const [first, second] = screen.getAllByTestId('import-preview-row')
    expect(first).toHaveTextContent('Animals > Pet Supplies > Cat Food (suggested)')
    expect(second).toHaveTextContent('No category')
    expect(second).toHaveTextContent('No category could be suggested')
  })

  it('translates hints; unknown hint codes are skipped instead of showing a raw code', () => {
    setup(preview({ rows: [row(2, { hints: ['no_price', 'photo_skipped_shared', 'brand_new_hint' as never] })] }))
    const li = screen.getByTestId('import-preview-row')
    expect(li).toHaveTextContent('No price: customers only see this article once a price is set.')
    expect(li).toHaveTextContent('The photo was not added')
    expect(li).not.toHaveTextContent('brand_new_hint')
  })

  it('row without name shows a dash, row without price shows "No price"', () => {
    setup(preview({ rows: [row(2, { name: null })] }))
    const li = screen.getByTestId('import-preview-row')
    expect(li).toHaveTextContent('—')
    expect(li).toHaveTextContent('No price')
  })
})

describe('ImportPreview — all or nothing (AK 23)', () => {
  const errs = preview({
    can_apply: false,
    counts: { new: 9, updated: 0, unchanged: 0, error: 1, possible_duplicate: 0, deactivate: 0 },
    rows: [row(11, { status: 'error', errors: [
      { row: 11, code: 'missing_name', message: 'x' }, { row: 11, code: 'invalid_ean', message: 'x' },
      { row: 11, code: 'duplicate_in_file', message: 'x' },
    ] })],
    rows_total: 1,
  })

  it('"Apply" is disabled and the reason with the number of faulty rows is visible', () => {
    const { onApply } = setup(errs)
    const button = screen.getByTestId('import-apply')
    expect(button).toBeDisabled()
    expect(screen.getByTestId('import-apply-blocked')).toHaveTextContent('Fix the 1 faulty rows in your file and upload it again.')
    fireEvent.click(button)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('lists every error of the faulty row with a translated reason', () => {
    setup(errs)
    const list = screen.getByTestId('import-row-errors')
    expect(list).toHaveTextContent('Name is missing')
    expect(list).toHaveTextContent('EAN is invalid (8 to 14 digits)')
    expect(list).toHaveTextContent('Duplicate in the file')
  })

  it('error rows are in German too', () => {
    setup(errs, {}, 'de')
    expect(screen.getByTestId('import-row-errors')).toHaveTextContent('EAN ist ungültig (8 bis 14 Ziffern)')
    expect(screen.getByTestId('import-apply-blocked')).toHaveTextContent('Korrigiere die 1 fehlerhaften Zeilen')
  })
})

describe('ImportPreview — actions', () => {
  it('"Apply" sends no decisions when nothing was chosen; "Cancel" calls onCancel', () => {
    const { onApply, onCancel } = setup(preview())
    fireEvent.click(screen.getByTestId('import-apply'))
    expect(onApply).toHaveBeenCalledWith([])
    fireEvent.click(screen.getByTestId('import-cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('applying: both buttons disabled and the phase with progress is shown', () => {
    setup(preview({ status: 'applying', progress: { phase: 'apply', done: 10, total: 50 } }), { applying: true })
    expect(screen.getByTestId('import-apply')).toBeDisabled()
    expect(screen.getByTestId('import-apply')).toHaveTextContent('Applying…')
    expect(screen.getByTestId('import-cancel')).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Saving… 10 of 50')
  })

  it('an expired preview cannot be applied and says why (AK 18)', () => {
    setup(preview({ expired: true, can_apply: false }))
    expect(screen.getByRole('alert')).toHaveTextContent('The preview has expired. Please upload the file again.')
    expect(screen.getByTestId('import-apply')).toBeDisabled()
  })

  it.each([
    ['preview_stale', 'Your articles changed since the check. Nothing was saved. Please upload the file again.'],
    ['apply_failed', 'The import could not be completed. Nothing was saved. Please try again.'],
    ['decision_conflict', 'Two rows would use the same article.'],
    ['preview_expired', 'The preview has expired.'],
  ])('shows the translated error %s', (code, text) => {
    setup(preview(), { error: { code } })
    expect(screen.getByRole('alert')).toHaveTextContent(text)
  })

  it('shows the slow-job hint after the poll timeout', () => {
    setup(preview(), { timedOut: true })
    expect(screen.getByText(/taking longer than usual/)).toBeInTheDocument()
  })
})

describe('ImportPreview — possible duplicates (AK 12)', () => {
  const dup = row(2, {
    status: 'possible_duplicate', name: 'Royal Canin Cat 5 kg',
    candidates: [
      { item_id: 11, name: 'Royal Canin Adult Cat 5kg', photo_url: '/product_images/rc_card.webp', score: 96 },
      { item_id: 12, name: 'Royal Canin Cat 5kg', photo_url: null, score: 91 },
    ],
  })
  const dupPreview = () => preview({ rows: [dup], rows_total: 1, counts: { new: 0, updated: 0, unchanged: 0, error: 0, possible_duplicate: 1, deactivate: 0 } })

  it('offers each candidate with name, similarity and photo (with alt text), plus "create as new" (default)', () => {
    setup(dupPreview())
    const group = screen.getByRole('group', { name: /similar article already exists/ })
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(within(group).getByAltText('Royal Canin Adult Cat 5kg')).toHaveAttribute('src', '/product_images/rc_card.webp')
    expect(within(group).getByText('Use existing article · 96% similar')).toBeInTheDocument()
    expect(within(group).getAllByText(/^Use existing article ·/)).toHaveLength(2)
    expect(screen.getByLabelText('Create as new article')).toBeChecked()
  })

  it('choosing a candidate puts "use_existing" with its item id into the apply body; choosing "new" again removes it', () => {
    const { onApply } = setup(dupPreview())
    fireEvent.click(screen.getAllByRole('radio')[0])
    fireEvent.click(screen.getByTestId('import-apply'))
    expect(onApply).toHaveBeenLastCalledWith([{ row: 2, action: 'use_existing', item_id: 11 }])
    fireEvent.click(screen.getByLabelText('Create as new article'))
    fireEvent.click(screen.getByTestId('import-apply'))
    expect(onApply).toHaveBeenLastCalledWith([])
  })

  it('a possible duplicate is not an error: apply stays enabled', () => {
    setup(dupPreview())
    expect(screen.getByTestId('import-apply')).toBeEnabled()
  })
})

describe('ImportPreview — filter, paging, deactivations', () => {
  it('filter chips only for statuses that occur; the active one is pressed; clicking calls onFilter', () => {
    const { onFilter } = setup(
      preview({ counts: { new: 2, updated: 0, unchanged: 0, error: 1, possible_duplicate: 0, deactivate: 0 } }),
      { filter: 'error' },
    )
    const group = screen.getByRole('group', { name: 'Show rows' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['All', 'Errors (1)', 'New (2)'])
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(buttons[0])
    expect(onFilter).toHaveBeenCalledWith(null)
    fireEvent.click(buttons[2])
    expect(onFilter).toHaveBeenCalledWith('new')
  })

  it('"Show more rows" shows how many are left and loads the next page', () => {
    const { onLoadMore } = setup(preview({ rows_total: 250 }))
    const more = screen.getByRole('button', { name: 'Show more rows (247 left)' })
    fireEvent.click(more)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('no "more" button when all rows are loaded; empty filter result text', () => {
    setup(preview({ rows: [], rows_total: 0 }))
    expect(screen.queryByRole('button', { name: /Show more rows/ })).toBeNull()
    expect(screen.getByText('No rows with this status.')).toBeInTheDocument()
  })

  it('complete list: collapsible list of the articles that will be set to "not available" (AK 8)', () => {
    setup(preview({
      full_list: true,
      counts: { new: 0, updated: 0, unchanged: 7, error: 0, possible_duplicate: 0, deactivate: 3 },
      deactivations: [{ listing_id: 1, item_id: 1, name: 'Old Article', sku: 'S7' }],
      deactivations_total: 3,
    }))
    const details = screen.getByTestId('import-deactivations')
    expect(details).toHaveTextContent('3 articles will be set to “not available”')
    expect(details).toHaveTextContent('Old Article')
    expect(within(details).getByText('S7').getAttribute('dir')).toBe('ltr')
    expect(details).toHaveTextContent('…and 2 more')
    expect(details).toHaveTextContent('They stay in your list')
  })

  it('without the complete-list flag no deactivation block is rendered (AK 9)', () => {
    setup(preview({ full_list: false, deactivations_total: 0 }))
    expect(screen.queryByTestId('import-deactivations')).toBeNull()
  })
})

describe('ImportPreview — mobile cards, RTL, languages (AK 21)', () => {
  it('rows are cards on small screens and a table-like grid from md; the column header is hidden below md', () => {
    const { container } = setup(preview())
    const li = screen.getAllByTestId('import-preview-row')[0]
    expect(li.className).toContain('md:grid')
    expect(li.className).toContain('flex-col')
    const header = container.querySelector('[aria-hidden="true"].hidden')!
    expect(header.className).toContain('md:grid')
  })

  it.each(['ar', 'he'])('%s: no physical left/right classes anywhere in the preview markup, numbers stay ltr', (lang) => {
    const { container } = setup(
      preview({ rows: [row(2, { sku: 'A-1', price: '2', currency: 'EUR' }), row(3, { status: 'possible_duplicate', candidates: [{ item_id: 1, name: 'X', score: 90 }] })] }),
      {}, lang,
    )
    const html = container.innerHTML
    expect(html).not.toMatch(/(^|[\s"'])(ml|mr|pl|pr|left|right|text-left|text-right)-/)
    container.querySelectorAll('code').forEach((c) => expect(c.getAttribute('dir')).toBe('ltr'))
    expect(screen.getByText(tAdmin(lang).preview_title)).toBeInTheDocument()
  })

  it.each(['en', 'de', 'el', 'ru', 'ar', 'he'])('renders title, tiles and buttons in %s', (lang) => {
    setup(preview(), {}, lang)
    const tr = tAdmin(lang)
    expect(screen.getByText(tr.preview_title)).toBeInTheDocument()
    expect(within(screen.getByTestId('import-count-tiles')).getByText(tr.count_new)).toBeInTheDocument()
    expect(screen.getByTestId('import-apply')).toHaveTextContent(tr.preview_apply)
    expect(screen.getByTestId('import-cancel')).toHaveTextContent(tr.preview_cancel)
  })
})

describe('ImportResult', () => {
  const result: ImportApplyResult = {
    created: 3, updated: 1, unchanged: 2, deactivated: 3, linked_existing: 1, image_download_pending: 4,
    translation_queued: 3, row_count: 6, hints: { photo_skipped_shared: 2, no_price: 1, future_hint: 5 },
  }

  it('shows the counters like the preview (AK 3: "3 new") and the link to the offers', () => {
    const onNew = vi.fn()
    render(<ImportResult result={result} lang="en" onNewUpload={onNew} />)
    const box = screen.getByTestId('import-result')
    expect(box).toHaveTextContent('Import complete')
    expect(box).toHaveTextContent('3 new')
    expect(box).toHaveTextContent('1 updated')
    expect(box).toHaveTextContent('2 unchanged')
    expect(box).toHaveTextContent('3 set to “not available”')
    expect(box).toHaveTextContent('1 linked to existing catalogue articles')
    expect(box).toHaveTextContent('6 rows processed')
    const link = screen.getByRole('link', { name: 'Go to my offers' })
    expect(link).toHaveAttribute('href', '/shop-admin/offers') // bypass path: no language prefix
    fireEvent.click(screen.getByRole('button', { name: 'Upload another file' }))
    expect(onNew).toHaveBeenCalled()
  })

  it('mentions translation, pending photos, and hint counters (unknown hint codes are skipped)', () => {
    render(<ImportResult result={result} lang="en" onNewUpload={vi.fn()} />)
    expect(screen.getByText('3 new articles are being translated into all languages.')).toBeInTheDocument()
    expect(screen.getByText(/4 product images are being downloaded/)).toBeInTheDocument()
    expect(screen.getByText(/The photo was not added/).closest('li')).toHaveTextContent('2×')
    expect(screen.getByText(/No price: customers only see/)).toBeInTheDocument()
    expect(screen.queryByText(/future_hint/)).toBeNull()
  })

  it('zero optional counters are not shown', () => {
    render(<ImportResult result={{ ...result, deactivated: 0, linked_existing: 0, translation_queued: 0, image_download_pending: 0, hints: {} }} lang="en" onNewUpload={vi.fn()} />)
    const box = screen.getByTestId('import-result')
    expect(box).not.toHaveTextContent('not available')
    expect(box).not.toHaveTextContent('linked')
    expect(screen.queryByText(/translated into all languages/)).toBeNull()
    expect(screen.queryByText('Notes')).toBeNull()
  })

  it.each(['de', 'el', 'ru', 'ar', 'he'])('renders in %s', (lang) => {
    render(<ImportResult result={result} lang={lang} onNewUpload={vi.fn()} />)
    expect(screen.getByText(tAdmin(lang).result_title)).toBeInTheDocument()
  })
})

describe('ImportCountTiles', () => {
  it('compact mode is a single wrapping list, errors are red only when > 0', () => {
    render(
      <ImportCountTiles compact tiles={[
        { key: 'new', label: 'new', value: 1, tone: 'green' },
        { key: 'error', label: 'errors', value: 0, tone: 'red' },
        { key: 'error2', label: 'errors2', value: 2, tone: 'red' },
      ]} />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[1].className).not.toContain('red')
    expect(items[2].className).toContain('red')
  })
})
