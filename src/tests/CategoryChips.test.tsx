import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryChips } from '@/components/search/CategoryChips'
import type { CategoryItem } from '@/types/api'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

function makeCategory(id: number, name: string): CategoryItem {
  return { id, parent_id: null, taxonomy_type: 'google', external_id: String(id), level: null, name, child_count: 0 }
}

const MANY = [
  makeCategory(1, 'Pet Supplies'),
  makeCategory(2, 'Dog Supplies'),
  makeCategory(3, 'Cat Supplies'),
  makeCategory(4, 'Bird Supplies'),
  makeCategory(5, 'Fish Supplies'),
  makeCategory(6, 'Electronics'),
]

describe('CategoryChips', () => {
  it('renders nothing when categories is empty', () => {
    const { container } = render(<CategoryChips categories={[]} lang="en" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows first 4 chips and +N button when more than 4 categories', () => {
    render(<CategoryChips categories={MANY} lang="en" />)
    expect(screen.getByText('Pet Supplies')).toBeTruthy()
    expect(screen.getByText('Dog Supplies')).toBeTruthy()
    expect(screen.getByText('Cat Supplies')).toBeTruthy()
    expect(screen.getByText('Bird Supplies')).toBeTruthy()
    // 5th and 6th should be hidden
    expect(screen.queryByText('Fish Supplies')).toBeNull()
    expect(screen.queryByText('Electronics')).toBeNull()
    // +N button
    expect(screen.getByText('+2')).toBeTruthy()
  })

  it('expands all chips when +N button is clicked', () => {
    render(<CategoryChips categories={MANY} lang="en" />)
    fireEvent.click(screen.getByText('+2'))
    expect(screen.getByText('Fish Supplies')).toBeTruthy()
    expect(screen.getByText('Electronics')).toBeTruthy()
    expect(screen.queryByText('+2')).toBeNull()
    expect(screen.getByText('Show less')).toBeTruthy()
  })

  it('collapses back when "Show less" is clicked', () => {
    render(<CategoryChips categories={MANY} lang="en" />)
    fireEvent.click(screen.getByText('+2'))
    fireEvent.click(screen.getByText('Show less'))
    expect(screen.queryByText('Fish Supplies')).toBeNull()
    expect(screen.getByText('+2')).toBeTruthy()
  })

  it('shows all chips without +N when 4 or fewer categories', () => {
    const four = MANY.slice(0, 4)
    render(<CategoryChips categories={four} lang="en" />)
    expect(screen.getByText('Pet Supplies')).toBeTruthy()
    expect(screen.getByText('Bird Supplies')).toBeTruthy()
    expect(screen.queryByText(/^\+/)).toBeNull()
  })

  it('filters out BLOCKED categories (live animals, animals & pet supplies)', () => {
    const cats = [
      makeCategory(10, 'Live Animals'),
      makeCategory(11, 'Animals & Pet Supplies'),
      makeCategory(12, 'Dog Supplies'),
    ]
    render(<CategoryChips categories={cats} lang="en" />)
    expect(screen.queryByText('Live Animals')).toBeNull()
    expect(screen.queryByText('Animals & Pet Supplies')).toBeNull()
    expect(screen.getByText('Dog Supplies')).toBeTruthy()
  })

  it('preserves input order when preserveOrder=true', () => {
    const reversed = [
      makeCategory(6, 'Electronics'),
      makeCategory(1, 'Pet Supplies'),
    ]
    const { container } = render(<CategoryChips categories={reversed} lang="en" preserveOrder />)
    const links = container.querySelectorAll('a')
    // First link should be Electronics (input order preserved), not Pet Supplies
    expect(links[0].textContent).toContain('Electronics')
    expect(links[1].textContent).toContain('Pet Supplies')
  })

  it('sorts by PRIORITY_ORDER when preserveOrder=false', () => {
    const reversed = [
      makeCategory(6, 'Electronics'),
      makeCategory(1, 'Pet Supplies'),
    ]
    const { container } = render(<CategoryChips categories={reversed} lang="en" />)
    const links = container.querySelectorAll('a')
    // Pet Supplies has higher priority → shown first
    expect(links[0].textContent).toContain('Pet Supplies')
    expect(links[1].textContent).toContain('Electronics')
  })

  it('shows "عرض أقل" for Arabic (RTL) when expanded', () => {
    render(<CategoryChips categories={MANY} lang="ar" />)
    fireEvent.click(screen.getByText('+2'))
    expect(screen.getByText('عرض أقل')).toBeTruthy()
  })

  it('shows "הצג פחות" for Hebrew (RTL) when expanded', () => {
    render(<CategoryChips categories={MANY} lang="he" />)
    fireEvent.click(screen.getByText('+2'))
    expect(screen.getByText('הצג פחות')).toBeTruthy()
  })

  it('includes only category_id in link href (no category_name)', () => {
    const cat = [makeCategory(42, 'Dog Supplies')]
    const { container } = render(<CategoryChips categories={cat} lang="en" />)
    const link = container.querySelector('a')
    expect(link?.getAttribute('href')).toContain('category_id=42')
    expect(link?.getAttribute('href')).not.toContain('category_name')
  })
})
