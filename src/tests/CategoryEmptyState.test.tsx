/**
 * Unit tests for CategoryEmptyState component (F2350).
 *
 * Covers:
 *  - Renders category_empty_intro in all branches
 *  - With suggestions: shows category_empty_suggestions + up to 6 links
 *  - With suggestions: shows product_count badge when > 0
 *  - Without suggestions: shows fallback link (category_empty_browse_all)
 *  - Limits to max 6 items even when more are provided
 *  - RTL: renders correct Tailwind RTL classes for ar/he
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import type { CategoryItem } from '@/types/api'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

vi.mock('@/lib/routing', () => ({
  localePath: (_lang: string, path: string) => `/en${path}`,
}))

// ─── Helper factories ─────────────────────────────────────────────────────────

function makeCategoryItem(id: number, name: string, productCount?: number): CategoryItem {
  return {
    id,
    parent_id: null,
    taxonomy_type: 'GPC',
    external_id: `ext-${id}`,
    level: '1',
    name,
    child_count: 0,
    product_count: productCount,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CategoryEmptyState — with related categories', () => {
  it('renders category_empty_intro in EN', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    const cats = [makeCategoryItem(1, 'Dog Supplies', 5)]
    render(<CategoryEmptyState relatedCategories={cats} lang="en" />)

    expect(screen.getByText('Currently no products in this category.')).toBeInTheDocument()
  })

  it('renders category_empty_suggestions label when related categories exist', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    const cats = [makeCategoryItem(1, 'Dog Supplies', 3)]
    render(<CategoryEmptyState relatedCategories={cats} lang="en" />)

    expect(screen.getByText('Here are some suggestions:')).toBeInTheDocument()
  })

  it('renders a link for each related category', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    const cats = [
      makeCategoryItem(10, 'Dog Supplies', 5),
      makeCategoryItem(11, 'Cat Supplies', 3),
    ]
    render(<CategoryEmptyState relatedCategories={cats} lang="en" />)

    expect(screen.getByText('Dog Supplies')).toBeInTheDocument()
    expect(screen.getByText('Cat Supplies')).toBeInTheDocument()
  })

  it('includes only category_id in href (no category_name)', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    const cats = [makeCategoryItem(42, 'Dog Supplies', 10)]
    render(<CategoryEmptyState relatedCategories={cats} lang="en" />)

    const link = screen.getByText('Dog Supplies').closest('a')
    expect(link?.href).toContain('category_id=42')
    expect(link?.href).not.toContain('category_name')
  })

  it('shows product_count badge when product_count > 0', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    const cats = [makeCategoryItem(1, 'Dog Supplies', 42)]
    render(<CategoryEmptyState relatedCategories={cats} lang="en" />)

    expect(screen.getByText('(42)')).toBeInTheDocument()
  })

  it('does not show product_count badge when product_count is 0', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    const cats = [makeCategoryItem(1, 'Dog Supplies', 0)]
    render(<CategoryEmptyState relatedCategories={cats} lang="en" />)

    expect(screen.queryByText('(0)')).not.toBeInTheDocument()
  })

  it('does not show product_count badge when product_count is undefined', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    const cats = [makeCategoryItem(1, 'Dog Supplies')]
    render(<CategoryEmptyState relatedCategories={cats} lang="en" />)

    // No badge-like text "(X)" should appear
    const allText = document.body.textContent ?? ''
    expect(allText).not.toMatch(/\(\d+\)/)
  })

  it('limits display to max 6 items when more than 6 are provided', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    const cats = Array.from({ length: 8 }, (_, i) => makeCategoryItem(i + 1, `Category ${i + 1}`, i + 1))
    render(<CategoryEmptyState relatedCategories={cats} lang="en" />)

    // Only 6 should appear
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByText(`Category ${i}`)).toBeInTheDocument()
    }
    expect(screen.queryByText('Category 7')).not.toBeInTheDocument()
    expect(screen.queryByText('Category 8')).not.toBeInTheDocument()
  })

  it('does NOT show fallback browse link when related categories exist', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    const cats = [makeCategoryItem(1, 'Dog Supplies', 5)]
    render(<CategoryEmptyState relatedCategories={cats} lang="en" />)

    expect(screen.queryByText('Browse all categories')).not.toBeInTheDocument()
  })
})

describe('CategoryEmptyState — without related categories (fallback)', () => {
  it('renders category_empty_intro', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    render(<CategoryEmptyState relatedCategories={[]} lang="en" />)

    expect(screen.getByText('Currently no products in this category.')).toBeInTheDocument()
  })

  it('renders fallback browse all link', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    render(<CategoryEmptyState relatedCategories={[]} lang="en" />)

    expect(screen.getByText('Browse all categories')).toBeInTheDocument()
  })

  it('fallback link points to home', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    render(<CategoryEmptyState relatedCategories={[]} lang="en" />)

    const link = screen.getByText('Browse all categories').closest('a')
    expect(link?.href).toContain('/en/')
  })

  it('does NOT render suggestions label', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    render(<CategoryEmptyState relatedCategories={[]} lang="en" />)

    expect(screen.queryByText('Here are some suggestions:')).not.toBeInTheDocument()
  })
})

describe('CategoryEmptyState — German (DE)', () => {
  it('renders DE intro text', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    render(<CategoryEmptyState relatedCategories={[]} lang="de" />)

    expect(screen.getByText('In dieser Kategorie sind noch keine Produkte verfügbar.')).toBeInTheDocument()
  })

  it('renders DE fallback link text', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    render(<CategoryEmptyState relatedCategories={[]} lang="de" />)

    expect(screen.getByText('Alle Kategorien durchstöbern')).toBeInTheDocument()
  })
})

describe('CategoryEmptyState — RTL (ar/he)', () => {
  it('renders Arabic text for ar locale', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    render(<CategoryEmptyState relatedCategories={[]} lang="ar" />)

    expect(screen.getByText('لا توجد منتجات في هذه الفئة حالياً.')).toBeInTheDocument()
    expect(screen.getByText('تصفح جميع الفئات')).toBeInTheDocument()
  })

  it('renders Hebrew text for he locale', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    render(<CategoryEmptyState relatedCategories={[]} lang="he" />)

    expect(screen.getByText('כרגע אין מוצרים בקטגוריה זו.')).toBeInTheDocument()
    expect(screen.getByText('עיין בכל הקטגוריות')).toBeInTheDocument()
  })

  it('uses rtl:text-right class on intro text for RTL support', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    render(<CategoryEmptyState relatedCategories={[]} lang="ar" />)

    const introP = screen.getByText('لا توجد منتجات في هذه الفئة حالياً.')
    expect(introP.className).toContain('rtl:text-right')
  })

  it('uses rtl:flex-row-reverse class on chip container for RTL with suggestions', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    const cats = [makeCategoryItem(1, 'فئة', 5)]
    const { container } = render(<CategoryEmptyState relatedCategories={cats} lang="ar" />)

    const flexContainer = container.querySelector('.rtl\\:flex-row-reverse')
    expect(flexContainer).not.toBeNull()
  })
})

describe('CategoryEmptyState — ContactCtaLink (F2360)', () => {
  it('renders "Product or shop missing?" CTA in empty state (EN)', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    render(<CategoryEmptyState relatedCategories={[]} lang="en" />)

    expect(screen.getByText('Product or shop missing?')).toBeInTheDocument()
    expect(screen.getByText('Report it')).toBeInTheDocument()
  })

  it('renders "Produkt oder Shop fehlt?" CTA (DE)', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    render(<CategoryEmptyState relatedCategories={[]} lang="de" />)

    expect(screen.getByText('Produkt oder Shop fehlt?')).toBeInTheDocument()
  })

  it('renders CTA even when related categories are present', async () => {
    const { CategoryEmptyState } = await import('@/components/search/CategoryEmptyState')
    const cats = [makeCategoryItem(1, 'Dog Supplies', 5)]
    render(<CategoryEmptyState relatedCategories={cats} lang="en" />)

    // CTA always shown, regardless of related categories
    expect(screen.getByText('Product or shop missing?')).toBeInTheDocument()
  })
})
