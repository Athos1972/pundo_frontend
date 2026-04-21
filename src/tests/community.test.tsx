import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VoteSlider } from '@/components/community/VoteSlider'
import { VoteToggle } from '@/components/community/VoteToggle'
import { LanguageTag } from '@/components/community/LanguageTag'
import { TrustProfileSection } from '@/components/account/TrustProfileSection'
import { t } from '@/lib/translations'

const tr_en = t('en')
const tr_de = t('de')
const tr_ar = t('ar')

// ── VoteSlider ────────────────────────────────────────────────────────────────

describe('VoteSlider', () => {
  it('renders 5 star buttons', () => {
    render(<VoteSlider value={null} onChange={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })

  it('marks stars up to value as filled (amber)', () => {
    render(<VoteSlider value={3} onChange={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveClass('text-amber-400')
    expect(buttons[2]).toHaveClass('text-amber-400')
    expect(buttons[3]).toHaveClass('text-gray-300')
  })

  it('calls onChange with clicked star value', () => {
    const onChange = vi.fn()
    render(<VoteSlider value={null} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('3 stars'))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('calls onChange with 0 when clicking the same star (deselect)', () => {
    const onChange = vi.fn()
    render(<VoteSlider value={3} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('3 stars'))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('is disabled when disabled=true', () => {
    render(<VoteSlider value={null} onChange={() => {}} disabled />)
    screen.getAllByRole('button').forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })
})

// ── VoteToggle ────────────────────────────────────────────────────────────────

describe('VoteToggle', () => {
  it('renders label and two buttons', () => {
    render(<VoteToggle label="Parking" value={null} count={0} onChange={() => {}} />)
    expect(screen.getByText('Parking')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('✓ button is pressed when value=true', () => {
    render(<VoteToggle label="Parking" value={true} count={5} onChange={() => {}} />)
    const yesBtn = screen.getByText('✓')
    expect(yesBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onChange(true) when ✓ clicked from null state', () => {
    const onChange = vi.fn()
    render(<VoteToggle label="Parking" value={null} count={0} onChange={onChange} />)
    fireEvent.click(screen.getByText('✓'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('shows count when count > 0', () => {
    render(<VoteToggle label="Parking" value={null} count={7} onChange={() => {}} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})

// ── LanguageTag ───────────────────────────────────────────────────────────────

describe('LanguageTag', () => {
  it('renders language code and score', () => {
    render(<LanguageTag languageCode="de" avgScore={4.2} voteCount={3} />)
    expect(screen.getByText(/DE/)).toBeInTheDocument()
    expect(screen.getByText(/4\.2/)).toBeInTheDocument()
  })

  it('returns null when voteCount=0', () => {
    const { container } = render(<LanguageTag languageCode="de" avgScore={0} voteCount={0} />)
    expect(container.firstChild).toBeNull()
  })
})

// ── TrustProfileSection ───────────────────────────────────────────────────────

describe('TrustProfileSection', () => {
  const profileBase = { user_id: 1, trust_level: 1, credits: 0, badges: [] }

  it('shows trust level and credits', () => {
    render(<TrustProfileSection profile={{ ...profileBase, trust_level: 2, credits: 75 }} tr={tr_en} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('shows no-badges message when badges empty', () => {
    render(<TrustProfileSection profile={profileBase} tr={tr_en} />)
    expect(screen.getByText(tr_en.trust_no_badges)).toBeInTheDocument()
  })

  it('renders badge name when badge present', () => {
    const profile = {
      ...profileBase,
      badges: [{ badge_type: 'island_hero', awarded_at: '2026-01-01T00:00:00Z' }],
    }
    render(<TrustProfileSection profile={profile} tr={tr_en} />)
    expect(screen.getByText(tr_en.trust_badge_island_hero)).toBeInTheDocument()
  })

  it('DE — shows German labels', () => {
    render(<TrustProfileSection profile={profileBase} tr={tr_de} />)
    expect(screen.getByText(tr_de.trust_level)).toBeInTheDocument()
    expect(screen.getByText(tr_de.trust_credits)).toBeInTheDocument()
  })

  it('AR — shows Arabic labels (RTL)', () => {
    render(<TrustProfileSection profile={profileBase} tr={tr_ar} />)
    expect(screen.getByText(tr_ar.trust_level)).toBeInTheDocument()
    expect(screen.getByText(tr_ar.trust_no_badges)).toBeInTheDocument()
  })
})

// ── community-api helpers ─────────────────────────────────────────────────────

describe('community translations coverage', () => {
  const langs = ['en', 'de', 'ru', 'el', 'ar', 'he']
  const requiredKeys: (keyof ReturnType<typeof t>)[] = [
    'community_votes_title',
    'community_votes_login_cta',
    'community_vote_parking',
    'community_vote_price_level',
    'community_vote_language_label',
    'trust_tab',
    'trust_level',
    'trust_credits',
    'trust_badges',
    'trust_no_badges',
  ]

  langs.forEach((lang) => {
    it(`${lang} has all community translation keys`, () => {
      const tr = t(lang)
      requiredKeys.forEach((key) => {
        expect(tr[key], `missing key ${key} in ${lang}`).toBeTruthy()
      })
    })
  })
})

// ── LanguageVotePanel ─────────────────────────────────────────────────────────

import { LanguageVotePanel } from '@/components/community/LanguageVotePanel'
import { ResponsiveLabelPanel } from '@/components/community/ResponsiveLabelPanel'
import type { VoteAggregateItem } from '@/types/api'

describe('LanguageVotePanel', () => {
  const baseAgg: VoteAggregateItem[] = [
    { attribute_type: 'language_de', weighted_avg: 4.2, vote_count: 3, my_value: null },
  ]

  it('shows LanguageTag pills for existing votes', () => {
    render(
      <LanguageVotePanel
        aggregates={baseAgg}
        isAuthenticated={false}
        onVote={async () => {}}
        onDelete={async () => {}}
        submitting={null}
        tr={tr_en}
      />
    )
    expect(screen.getByText(/DE/)).toBeInTheDocument()
    expect(screen.getByText(/4\.2/)).toBeInTheDocument()
  })

  it('does not show sliders when not authenticated', () => {
    const { container } = render(
      <LanguageVotePanel
        aggregates={baseAgg}
        isAuthenticated={false}
        onVote={async () => {}}
        onDelete={async () => {}}
        submitting={null}
        tr={tr_en}
      />
    )
    // No star buttons should be visible
    expect(container.querySelectorAll('button[aria-label$="stars"]')).toHaveLength(0)
  })

  it('shows sliders when authenticated', () => {
    const { container } = render(
      <LanguageVotePanel
        aggregates={[]}
        isAuthenticated={true}
        onVote={async () => {}}
        onDelete={async () => {}}
        submitting={null}
        tr={tr_en}
      />
    )
    // 6 languages × 5 stars = 30 buttons
    expect(container.querySelectorAll('button')).toHaveLength(30)
  })

  it('calls onVote when star clicked (authenticated)', async () => {
    const onVote = vi.fn().mockResolvedValue(undefined)
    render(
      <LanguageVotePanel
        aggregates={[]}
        isAuthenticated={true}
        onVote={onVote}
        onDelete={async () => {}}
        submitting={null}
        tr={tr_en}
      />
    )
    // Click the 4-star button for the first language row (English = first)
    const stars = screen.getAllByLabelText('4 stars')
    fireEvent.click(stars[0])
    expect(onVote).toHaveBeenCalledWith('language_en', 4)
  })
})

// ── ResponsiveLabelPanel ──────────────────────────────────────────────────────

describe('ResponsiveLabelPanel', () => {
  it('returns null when no votes and not authenticated', () => {
    const { container } = render(
      <ResponsiveLabelPanel
        aggregates={[]}
        shopTypeCanonical={null}
        isAuthenticated={false}
        onVote={async () => {}}
        onDelete={async () => {}}
        submitting={null}
        tr={tr_en}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows label buttons when authenticated', () => {
    render(
      <ResponsiveLabelPanel
        aggregates={[]}
        shopTypeCanonical={null}
        isAuthenticated={true}
        onVote={async () => {}}
        onDelete={async () => {}}
        submitting={null}
        tr={tr_en}
      />
    )
    // parking, price_level, delivery are generic — all visible
    expect(screen.getByText(tr_en.community_vote_parking)).toBeInTheDocument()
    expect(screen.getByText(tr_en.community_vote_price_level)).toBeInTheDocument()
    expect(screen.getByText(tr_en.community_vote_delivery)).toBeInTheDocument()
  })

  it('shows restaurant-specific labels for restaurant shop type', () => {
    render(
      <ResponsiveLabelPanel
        aggregates={[]}
        shopTypeCanonical="restaurant"
        isAuthenticated={true}
        onVote={async () => {}}
        onDelete={async () => {}}
        submitting={null}
        tr={tr_en}
      />
    )
    expect(screen.getByText(tr_en.community_vote_terrace)).toBeInTheDocument()
    expect(screen.getByText(tr_en.community_vote_reservation_required)).toBeInTheDocument()
  })

  it('shows existing vote result to unauthenticated user', () => {
    const agg: VoteAggregateItem[] = [
      { attribute_type: 'parking', weighted_avg: 1.0, vote_count: 2, my_value: null },
    ]
    render(
      <ResponsiveLabelPanel
        aggregates={agg}
        shopTypeCanonical={null}
        isAuthenticated={false}
        onVote={async () => {}}
        onDelete={async () => {}}
        submitting={null}
        tr={tr_en}
      />
    )
    expect(screen.getByText(tr_en.community_vote_parking)).toBeInTheDocument()
    expect(screen.getByText(/✓/)).toBeInTheDocument()
  })
})
