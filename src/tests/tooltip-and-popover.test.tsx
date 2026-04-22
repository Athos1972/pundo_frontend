import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/api', () => ({
  getShopReviews: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip'
import { ReviewsPopover } from '@/components/ui/ReviewsPopover'
import { LanguageChips } from '@/components/ui/LanguageChips'
import { VoteToggle } from '@/components/community/VoteToggle'
import { LanguageTag } from '@/components/community/LanguageTag'
import { getShopReviews } from '@/lib/api'

// ─── Tooltip ────────────────────────────────────────────────────────────────

describe('Tooltip', () => {
  it('renders children', () => {
    render(
      <TooltipProvider>
        <Tooltip content="English"><span>EN</span></Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('EN')).toBeInTheDocument()
  })

  it('renders tooltip content', () => {
    render(
      <TooltipProvider>
        <Tooltip content="English"><span>EN</span></Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByRole('tooltip')).toHaveTextContent('English')
  })

  it('renders nothing extra when content is empty', () => {
    render(
      <TooltipProvider>
        <Tooltip content=""><span>X</span></Tooltip>
      </TooltipProvider>
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})

// ─── LanguageChips ──────────────────────────────────────────────────────────

describe('LanguageChips', () => {
  it('renders language codes', () => {
    render(<LanguageChips languages={['EN', 'DE', 'EL']} label="Languages" lang="en" />)
    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(screen.getByText('DE')).toBeInTheDocument()
    expect(screen.getByText('EL')).toBeInTheDocument()
  })

  it('renders English full-name tooltip for EN chip', () => {
    render(<LanguageChips languages={['EN']} label="Languages" lang="en" />)
    expect(screen.getByRole('tooltip')).toHaveTextContent('English')
  })

  it('renders German full-name tooltip for EL chip in DE language', () => {
    render(<LanguageChips languages={['EL']} label="Languages" lang="de" />)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Griechisch')
  })

  it('renders nothing when languages is empty', () => {
    const { container } = render(<LanguageChips languages={[]} label="Languages" lang="en" />)
    expect(container.firstChild).toBeNull()
  })
})

// ─── VoteToggle ─────────────────────────────────────────────────────────────

describe('VoteToggle', () => {
  it('renders ✓ and ✗ buttons', () => {
    render(<VoteToggle label="Parking" value={null} count={0} onChange={vi.fn()} lang="en" />)
    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getByText('✗')).toBeInTheDocument()
  })

  it('shows yes-tooltip in English', () => {
    render(<VoteToggle label="Parking" value={null} count={0} onChange={vi.fn()} lang="en" />)
    const tooltips = screen.getAllByRole('tooltip')
    expect(tooltips.some(t => t.textContent?.includes('Yes, I confirm'))).toBe(true)
  })

  it('shows yes-tooltip in German', () => {
    render(<VoteToggle label="Parkplatz" value={null} count={0} onChange={vi.fn()} lang="de" />)
    const tooltips = screen.getAllByRole('tooltip')
    expect(tooltips.some(t => t.textContent?.includes('Ja, ich bestätige'))).toBe(true)
  })

  it('calls onChange when ✓ clicked', async () => {
    const onChange = vi.fn()
    render(<VoteToggle label="Parking" value={null} count={0} onChange={onChange} lang="en" />)
    await userEvent.click(screen.getByText('✓'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

// ─── LanguageTag ─────────────────────────────────────────────────────────────

describe('LanguageTag', () => {
  it('renders language code + score', () => {
    render(<LanguageTag languageCode="en" avgScore={4.2} voteCount={5} lang="en" />)
    expect(screen.getByText(/EN/)).toBeInTheDocument()
    expect(screen.getByText(/4\.2/)).toBeInTheDocument()
  })

  it('shows full name in tooltip', () => {
    render(<LanguageTag languageCode="de" avgScore={3.8} voteCount={3} lang="en" />)
    expect(screen.getByRole('tooltip')).toHaveTextContent('German')
  })

  it('shows German full name when lang=de', () => {
    render(<LanguageTag languageCode="el" avgScore={4.0} voteCount={2} lang="de" />)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Griechisch')
  })

  it('returns null when voteCount is 0', () => {
    const { container } = render(<LanguageTag languageCode="en" avgScore={0} voteCount={0} lang="en" />)
    expect(container.firstChild).toBeNull()
  })
})

// ─── ReviewsPopover ──────────────────────────────────────────────────────────

describe('ReviewsPopover', () => {
  beforeEach(() => {
    vi.mocked(getShopReviews).mockReset()
  })

  it('renders trigger', () => {
    render(
      <ReviewsPopover shopId={1} shopSlug="test-shop" lang="en" trigger={<button>4.2★</button>} />
    )
    expect(screen.getByText('4.2★')).toBeInTheDocument()
  })

  it('shows reviews on open', async () => {
    vi.mocked(getShopReviews).mockResolvedValue([
      { id: 1, user_display_name: 'Franzi', stars: 3, comment: 'Great place!', created_at: '2026-01-01' },
      { id: 2, user_display_name: 'Markus', stars: 5, comment: 'Best shop!', created_at: '2026-01-02' },
    ])
    render(
      <ReviewsPopover shopId={1} shopSlug="test-shop" lang="en" trigger={<button>Stars</button>} />
    )
    await userEvent.click(screen.getByRole('dialog').closest('div')!)
    await waitFor(() => {
      expect(screen.getByText('Franzi')).toBeInTheDocument()
      expect(screen.getByText('Markus')).toBeInTheDocument()
    })
  })

  it('shows empty message when no reviews', async () => {
    vi.mocked(getShopReviews).mockResolvedValue([])
    render(
      <ReviewsPopover shopId={2} shopSlug="empty-shop" lang="en" trigger={<button>Stars</button>} />
    )
    await userEvent.click(screen.getByRole('dialog').closest('div')!)
    await waitFor(() => {
      expect(screen.getByText('No reviews yet')).toBeInTheDocument()
    })
  })

  it('shows German empty message when lang=de', async () => {
    vi.mocked(getShopReviews).mockResolvedValue([])
    render(
      <ReviewsPopover shopId={3} shopSlug="shop-de" lang="de" trigger={<button>Stars</button>} />
    )
    await userEvent.click(screen.getByRole('dialog').closest('div')!)
    await waitFor(() => {
      expect(screen.getByText('Noch keine Bewertungen')).toBeInTheDocument()
    })
  })
})
