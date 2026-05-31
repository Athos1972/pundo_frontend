import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HomesickAndBar } from '@/components/layout/HomesickAndBar'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/en',
}))

vi.mock('@/components/auth/SessionProvider', () => ({
  useSession: () => ({ is_authenticated: false }),
}))

vi.mock('@/lib/useFabOnboarding', () => ({
  useFabOnboarding: () => ({ visible: false, dismiss: vi.fn() }),
}))

vi.mock('@/components/recently-viewed/RecentlyViewedList', () => ({
  RecentlyViewedList: () => <div>recently-viewed-list</div>,
}))

describe('HomesickAndBar', () => {
  it('renders FAB and BottomTabBar when recentlyViewed=drawer', () => {
    render(
      <HomesickAndBar lang="en" brandSlug="pundo" recentlyViewed="drawer" />
    )
    expect(screen.getByRole('navigation', { name: /bottom navigation/i })).toBeInTheDocument()
  })

  it('does not render BottomTabBar when recentlyViewed=hidden', () => {
    render(
      <HomesickAndBar lang="en" brandSlug="pundo" recentlyViewed="hidden" />
    )
    expect(screen.queryByRole('navigation', { name: /bottom navigation/i })).not.toBeInTheDocument()
  })

  it('hides BottomTabBar nav when FAB overlay opens', async () => {
    render(
      <HomesickAndBar lang="en" brandSlug="pundo" recentlyViewed="drawer" />
    )
    const nav = screen.getByRole('navigation', { name: /bottom navigation/i })
    expect(nav).not.toHaveClass('hidden')

    // Open the homesick overlay via the FAB button
    const fabButton = screen.getByRole('button', { name: /AI Search/i })
    fireEvent.click(fabButton)

    expect(nav).toHaveClass('hidden')
  })

  it('re-shows BottomTabBar nav after overlay closes', async () => {
    render(
      <HomesickAndBar lang="en" brandSlug="pundo" recentlyViewed="drawer" />
    )
    const nav = screen.getByRole('navigation', { name: /bottom navigation/i })
    const fabButton = screen.getByRole('button', { name: /AI Search/i })

    fireEvent.click(fabButton)
    expect(nav).toHaveClass('hidden')

    // Close via Escape key
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(nav).not.toHaveClass('hidden')
  })

  it('passes hasBottomBar=true to FAB when recentlyViewed=drawer', () => {
    const { container } = render(
      <HomesickAndBar lang="en" brandSlug="pundo" recentlyViewed="drawer" />
    )
    // FAB container should use 4.5rem offset when hasBottomBar=true
    const fabContainer = container.querySelector('[class*="4.5rem"]')
    expect(fabContainer).toBeInTheDocument()
  })

  it('passes hasBottomBar=false to FAB when recentlyViewed=hidden', () => {
    const { container } = render(
      <HomesickAndBar lang="en" brandSlug="pundo" recentlyViewed="hidden" />
    )
    // FAB container should use 1rem offset when hasBottomBar=false
    const fabContainer = container.querySelector('[class*="1rem"]')
    expect(fabContainer).toBeInTheDocument()
  })
})
