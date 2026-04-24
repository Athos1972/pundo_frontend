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

  it('shows Optional for category and available', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="en" />)
    const optionalBadges = screen.getAllByText('Optional')
    expect(optionalBadges).toHaveLength(2)
  })

  it('falls back to English for unknown lang', async () => {
    const { FieldCatalog } = await import('@/components/shop-admin/FieldCatalog')
    render(<FieldCatalog lang="xx" />)
    expect(screen.getByText('Field reference')).toBeInTheDocument()
  })
})
