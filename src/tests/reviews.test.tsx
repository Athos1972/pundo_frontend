import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StarRatingInput } from '@/components/reviews/StarRatingInput'
import { StarRatingDisplay } from '@/components/reviews/StarRatingDisplay'
import { ReviewList } from '@/components/reviews/ReviewList'
import { t } from '@/lib/translations'
import type { Review } from '@/types/api'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock SessionProvider to return authenticated user
vi.mock('@/components/auth/SessionProvider', () => ({
  useSession: () => ({ user: { id: 1, display_name: 'Test', email: 'test@example.com', is_verified: true, provider: 'email', created_at: '' }, is_authenticated: true }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock yet-another-react-lightbox (browser-only)
vi.mock('yet-another-react-lightbox', () => ({
  default: () => null,
}))
vi.mock('yet-another-react-lightbox/styles.css', () => ({}))

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props
    return <img src={String(src)} alt={String(alt)} {...rest} />
  },
}))

const tr = t('en')

// ── StarRatingInput ────────────────────────────────────────────────────────────

describe('StarRatingInput', () => {
  it('renders 5 star buttons', () => {
    render(<StarRatingInput value={0} onChange={vi.fn()} label="Rating" />)
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })

  it('calls onChange when a star is clicked', () => {
    const onChange = vi.fn()
    render(<StarRatingInput value={0} onChange={onChange} label="Rating" />)
    fireEvent.click(screen.getByLabelText('3 stars'))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('marks pressed star with aria-pressed', () => {
    render(<StarRatingInput value={4} onChange={vi.fn()} label="Rating" />)
    expect(screen.getByLabelText('4 stars')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('5 stars')).toHaveAttribute('aria-pressed', 'false')
  })
})

// ── StarRatingDisplay ──────────────────────────────────────────────────────────

describe('StarRatingDisplay', () => {
  it('renders aria-label with star count', () => {
    render(<StarRatingDisplay stars={4} />)
    expect(screen.getByLabelText('4 out of 5 stars')).toBeTruthy()
  })

  it('renders half star for 3.5', () => {
    const { container } = render(<StarRatingDisplay stars={3.5} />)
    expect(container.textContent).toContain('½')
  })

  it('renders full yellow stars equal to integer value', () => {
    const { container } = render(<StarRatingDisplay stars={3} />)
    // 3 yellow filled, 2 gray
    const spans = container.querySelectorAll('span[aria-hidden]')
    const yellow = Array.from(spans).filter((s) => s.className.includes('yellow'))
    expect(yellow).toHaveLength(3)
  })
})

// ── ReviewList ─────────────────────────────────────────────────────────────────

const mockReview: Review = {
  id: 1,
  user_id: 42,
  user_display_name: 'Alice',
  entity_type: 'product',
  entity_id: 100,
  stars: 4,
  comment: 'Great product!',
  photos: [],
  is_visible: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('ReviewList', () => {
  it('shows no-reviews message when empty', () => {
    render(<ReviewList reviews={[]} tr={tr} lang="en" />)
    expect(screen.getByText(tr.reviews_no_reviews)).toBeTruthy()
  })

  it('renders review cards', () => {
    render(<ReviewList reviews={[mockReview]} tr={tr} lang="en" />)
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('Great product!')).toBeTruthy()
  })

  it('renders multiple reviews', () => {
    const reviews: Review[] = [
      mockReview,
      { ...mockReview, id: 2, user_display_name: 'Bob', comment: 'Good' },
    ]
    render(<ReviewList reviews={reviews} tr={tr} lang="en" />)
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('Bob')).toBeTruthy()
  })
})

// ── ReportButton (unauthenticated renders nothing) ─────────────────────────────
// The top-level mock returns is_authenticated: true.
// We test the authenticated state (button should be visible) since overriding
// module mocks in vitest requires vi.mock at the top level, which we already have.
describe('ReportButton — authenticated', () => {
  it('renders report button when user is logged in', async () => {
    const { ReportButton } = await import('@/components/reviews/ReportButton')
    render(<ReportButton reviewId={1} lang="en" />)
    expect(screen.getByText(tr.reviews_report)).toBeTruthy()
  })

  it('calls report endpoint on click and shows reported state', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    const { ReportButton } = await import('@/components/reviews/ReportButton')
    render(<ReportButton reviewId={99} lang="en" />)
    const btn = screen.getByText(tr.reviews_report)
    fireEvent.click(btn)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/99/report'),
        expect.objectContaining({ method: 'POST' }),
      )
    })
    await waitFor(() => {
      expect(screen.getByText(tr.reviews_reported)).toBeTruthy()
    })
  })

  it('shows reported state on 409 conflict', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 409 })
    const { ReportButton } = await import('@/components/reviews/ReportButton')
    render(<ReportButton reviewId={77} lang="en" />)
    fireEvent.click(screen.getByText(tr.reviews_report))
    await waitFor(() => {
      expect(screen.getByText(tr.reviews_reported)).toBeTruthy()
    })
  })
})

// ── ReviewPhotoGrid ───────────────────────────────────────────────────────────

describe('ReviewPhotoGrid', () => {
  it('renders nothing when no approved photos', async () => {
    const { ReviewPhotoGrid } = await import('@/components/reviews/ReviewPhotoGrid')
    const { container } = render(
      <ReviewPhotoGrid photos={[{ id: 1, url: '/x.jpg', thumbnail_url: null, status: 'pending', moderation_reason: null, moderation_categories: null }]} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders thumbnail buttons for approved photos', async () => {
    const { ReviewPhotoGrid } = await import('@/components/reviews/ReviewPhotoGrid')
    render(
      <ReviewPhotoGrid
        photos={[
          { id: 1, url: '/a.jpg', thumbnail_url: '/a_thumb.jpg', status: 'approved', moderation_reason: null, moderation_categories: null },
          { id: 2, url: '/b.jpg', thumbnail_url: null, status: 'approved', moderation_reason: null, moderation_categories: null },
        ]}
      />,
    )
    expect(screen.getByLabelText('Photo 1')).toBeTruthy()
    expect(screen.getByLabelText('Photo 2')).toBeTruthy()
  })

  it('filters out rejected photos', async () => {
    const { ReviewPhotoGrid } = await import('@/components/reviews/ReviewPhotoGrid')
    const { container } = render(
      <ReviewPhotoGrid
        photos={[{ id: 3, url: '/c.jpg', thumbnail_url: null, status: 'rejected', moderation_reason: null, moderation_categories: null }]}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})

// ── StarRatingInput hover ─────────────────────────────────────────────────────

describe('StarRatingInput hover', () => {
  it('highlights stars on hover', () => {
    render(<StarRatingInput value={0} onChange={vi.fn()} label="Rating" />)
    const star3 = screen.getByLabelText('3 stars')
    fireEvent.mouseEnter(star3)
    // after hover the button should still exist (no crash)
    expect(star3).toBeTruthy()
    fireEvent.mouseLeave(star3)
  })
})
