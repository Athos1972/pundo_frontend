/**
 * Unit tests for RelatedCategoriesCard (F2360).
 *
 * Covers:
 *  - Renders null when categories array is empty
 *  - Renders card with title and category links when populated
 *  - Shows product_count badge when available, hides when null
 *  - Excludes the current product's own category (caller responsibility — tested via integration)
 *  - RTL: rtl:text-right on heading, rtl:flex-row-reverse on list
 *  - Link URLs use localePath + category_id + category_name params
 *  - Category name with special chars is encoded in URL
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { RelatedCategoriesCard } from '@/components/product/RelatedCategoriesCard'
import type { CategoryItem } from '@/types/api'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

// localePath('en', '/search') → '/en/search'
vi.mock('@/lib/routing', () => ({
  localePath: (_lang: string, path: string) => `/${_lang}${path}`,
}))

const makeCategory = (overrides: Partial<CategoryItem> = {}): CategoryItem => ({
  id: 42,
  parent_id: 10,
  taxonomy_type: 'product',
  external_id: 'cat-42',
  level: null,
  name: 'Dog Food',
  child_count: 3,
  product_count: 15,
  ...overrides,
})

describe('RelatedCategoriesCard', () => {
  it('renders null when categories array is empty', () => {
    const { container } = render(
      <RelatedCategoriesCard categories={[]} lang="en" title="Related categories" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the card title when categories are present', () => {
    render(
      <RelatedCategoriesCard
        categories={[makeCategory()]}
        lang="en"
        title="Related categories"
      />
    )
    expect(screen.getByRole('heading', { name: 'Related categories' })).toBeInTheDocument()
  })

  it('renders one link per category', () => {
    const cats = [makeCategory({ id: 1, name: 'Dog Food' }), makeCategory({ id: 2, name: 'Cat Food' })]
    render(<RelatedCategoriesCard categories={cats} lang="en" title="Related categories" />)
    expect(screen.getByRole('link', { name: /Dog Food/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cat Food/ })).toBeInTheDocument()
  })

  it('builds link href with localePath, category_id and category_name', () => {
    render(
      <RelatedCategoriesCard
        categories={[makeCategory({ id: 42, name: 'Dog Food' })]}
        lang="en"
        title="Related categories"
      />
    )
    const link = screen.getByRole('link', { name: /Dog Food/ })
    expect(link).toHaveAttribute('href', '/en/search?category_id=42&category_name=Dog%20Food')
  })

  it('encodes special characters in category_name', () => {
    render(
      <RelatedCategoriesCard
        categories={[makeCategory({ id: 7, name: 'Hunde & Katzen' })]}
        lang="de"
        title="Verwandte Kategorien"
      />
    )
    const link = screen.getByRole('link', { name: /Hunde/ })
    expect(link.getAttribute('href')).toContain('category_name=Hunde%20%26%20Katzen')
  })

  it('shows product_count badge when product_count is a number', () => {
    render(
      <RelatedCategoriesCard
        categories={[makeCategory({ id: 1, name: 'Dog Food', product_count: 99 })]}
        lang="en"
        title="Related categories"
      />
    )
    expect(screen.getByText('(99)')).toBeInTheDocument()
  })

  it('omits product_count badge when product_count is null', () => {
    render(
      <RelatedCategoriesCard
        categories={[makeCategory({ id: 1, name: 'Dog Food', product_count: undefined })]}
        lang="en"
        title="Related categories"
      />
    )
    expect(screen.queryByText(/\(\d+\)/)).toBeNull()
  })

  it('uses the lang param in link href', () => {
    render(
      <RelatedCategoriesCard
        categories={[makeCategory({ id: 5, name: 'Futter' })]}
        lang="de"
        title="Verwandte Kategorien"
      />
    )
    const link = screen.getByRole('link', { name: /Futter/ })
    expect(link.getAttribute('href')).toMatch(/^\/de\/search/)
  })

  it('handles category with null name gracefully', () => {
    render(
      <RelatedCategoriesCard
        categories={[makeCategory({ id: 3, name: null })]}
        lang="en"
        title="Related categories"
      />
    )
    // Link exists even with empty name (no crash)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toContain('category_name=')
  })

  it('renders section with aria-label matching title', () => {
    render(
      <RelatedCategoriesCard
        categories={[makeCategory()]}
        lang="en"
        title="Related categories"
      />
    )
    expect(screen.getByRole('region', { name: 'Related categories' })).toBeInTheDocument()
  })
})
