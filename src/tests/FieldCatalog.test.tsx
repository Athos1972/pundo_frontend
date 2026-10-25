import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/shop-admin/import',
}))

// ─── FieldCatalog ─────────────────────────────────────────────────────────────

describe('FieldCatalog', () => {
  it('renders field names for English', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="en" />)
    expect(screen.getByText('Field reference')).toBeInTheDocument()
    // Field names appear as code elements
    const codeElements = document.querySelectorAll('code')
    const codeTexts = Array.from(codeElements).map((el) => el.textContent)
    expect(codeTexts).toContain('name')
    expect(codeTexts).toContain('category')
    expect(codeTexts).toContain('available')
    expect(codeTexts).toContain('image_url')
  })

  it('renders field names for German', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="de" />)
    expect(screen.getByText('Feldkatalog')).toBeInTheDocument()
    const codeElements = document.querySelectorAll('code')
    const codeTexts = Array.from(codeElements).map((el) => el.textContent)
    expect(codeTexts).toContain('name')
    expect(codeTexts).toContain('category')
    expect(codeTexts).toContain('available')
    expect(codeTexts).toContain('image_url')
  })

  it('renders field names for Greek', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="el" />)
    expect(screen.getByText('Κατάλογος πεδίων')).toBeInTheDocument()
    const codeElements = document.querySelectorAll('code')
    const codeTexts = Array.from(codeElements).map((el) => el.textContent)
    expect(codeTexts).toContain('name')
    expect(codeTexts).toContain('category')
    expect(codeTexts).toContain('available')
    expect(codeTexts).toContain('image_url')
  })

  it('renders field names for Russian', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="ru" />)
    expect(screen.getByText('Справочник полей')).toBeInTheDocument()
    const codeElements = document.querySelectorAll('code')
    const codeTexts = Array.from(codeElements).map((el) => el.textContent)
    expect(codeTexts).toContain('name')
    expect(codeTexts).toContain('category')
    expect(codeTexts).toContain('available')
    expect(codeTexts).toContain('image_url')
  })

  it('renders field names for Arabic', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="ar" />)
    expect(screen.getByText('دليل الحقول')).toBeInTheDocument()
    const codeElements = document.querySelectorAll('code')
    const codeTexts = Array.from(codeElements).map((el) => el.textContent)
    expect(codeTexts).toContain('name')
    expect(codeTexts).toContain('category')
    expect(codeTexts).toContain('available')
    expect(codeTexts).toContain('image_url')
  })

  it('renders field names for Hebrew', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="he" />)
    expect(screen.getByText('מדריך שדות')).toBeInTheDocument()
    const codeElements = document.querySelectorAll('code')
    const codeTexts = Array.from(codeElements).map((el) => el.textContent)
    expect(codeTexts).toContain('name')
    expect(codeTexts).toContain('category')
    expect(codeTexts).toContain('available')
    expect(codeTexts).toContain('image_url')
  })

  it('RTL: code elements have dir="ltr" for Arabic', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="ar" />)
    const codeElements = document.querySelectorAll('code')
    codeElements.forEach((el) => {
      expect(el.getAttribute('dir')).toBe('ltr')
    })
  })

  it('RTL: code elements have dir="ltr" for Hebrew', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="he" />)
    const codeElements = document.querySelectorAll('code')
    codeElements.forEach((el) => {
      expect(el.getAttribute('dir')).toBe('ltr')
    })
  })

  it('details element is open by default', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    const { container } = render(<FieldCatalog lang="en" />)
    const details = container.querySelector('details')
    expect(details).not.toBeNull()
    expect(details!.open).toBe(true)
  })

  it('shows Required badge for name field', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="en" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('shows Optional for every column except name (9 of 10, F5920 AK 20 + B5920-002; was 3 of 4)', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="en" />)
    const optionalBadges = screen.getAllByText('Optional')
    expect(optionalBadges).toHaveLength(9)
  })

  it('falls back to English for unknown lang', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="xx" />)
    expect(screen.getByText('Field reference')).toBeInTheDocument()
  })

  // ── F5920 AK 20 (+ B5920-002): ten columns, recognition order, all 6 languages ───────────────

  const TEN = ['sku', 'name', 'language', 'ean', 'category', 'available', 'price', 'currency', 'image_url', 'description']

  it.each(['en', 'de', 'el', 'ru', 'ar', 'he'])('lists all ten template columns in template order (%s)', async (lang) => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    const { container } = render(<FieldCatalog lang={lang} />)
    const names = Array.from(container.querySelectorAll('tbody tr td:first-child code')).map((c) => c.textContent)
    expect(names).toEqual(TEN)
  })

  it('column order matches the downloadable template (backend generate_template_xlsx)', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    const { container } = render(<FieldCatalog lang="en" />)
    const first = container.querySelector('tbody tr td:first-child code')!.textContent
    expect(first).toBe('sku')
  })

  it.each(['en', 'de', 'el', 'ru', 'ar', 'he'])('every row has a description and an example (%s)', async (lang) => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    const { container } = render(<FieldCatalog lang={lang} />)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(10)
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td')
      expect(cells).toHaveLength(4) // journey AC-1 relies on the 4-cell structure
      expect((cells[2].textContent ?? '').length).toBeGreaterThan(10)
      expect((cells[3].textContent ?? '').length).toBeGreaterThan(0)
    })
  })

  it.each(['en', 'de', 'el', 'ru', 'ar', 'he'])('explains the recognition order SKU -> EAN -> name and the "complete list" box (%s)', async (lang) => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin(lang)
    const { container } = render(<FieldCatalog lang={lang} />)
    expect(screen.getByText(tr.fc_recognition_title)).toBeInTheDocument()
    const items = Array.from(container.querySelectorAll('ol li')).map((li) => li.textContent)
    expect(items).toEqual([tr.fc_recognition_sku, tr.fc_recognition_ean, tr.fc_recognition_name])
    expect(screen.getByText(tr.fc_full_list_note)).toBeInTheDocument()
    expect(screen.getByText(tr.fc_recognition_none)).toBeInTheDocument()
  })

  it('English texts: category is a hint with automatic suggestion; price/currency are imported', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="en" />)
    expect(screen.getByText(/suggests a category automatically/)).toBeInTheDocument()
    expect(screen.getByText(/Price per piece/)).toBeInTheDocument()
    expect(screen.queryByText(/NOT imported/)).toBeNull() // the old footnote said price and unit are not imported
  })

  it('RTL: all code cells stay left-to-right in Arabic and Hebrew (also the new ones)', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    for (const lang of ['ar', 'he']) {
      const { container, unmount } = render(<FieldCatalog lang={lang} />)
      expect(container.querySelectorAll('code').length).toBe(20)
      container.querySelectorAll('code').forEach((el) => expect(el.getAttribute('dir')).toBe('ltr'))
      unmount()
    }
  })
})
