import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ProgressionFeedbackNotice } from '@/components/account/ProgressionFeedbackNotice'
import { ProgressionSection } from '@/components/account/ProgressionSection'
import { WalletChargeConfirmDialog } from '@/components/wallet/WalletChargeConfirmDialog'
import { t } from '@/lib/translations'
import type { ProgressionAccountResponse } from '@/types/api'

const account: ProgressionAccountResponse = {
  standing: { xp: 45, level: 1, next_level: { level: 2, threshold_xp: 50, remaining_xp: 5 } },
  wallet: { credits: 1 }, allowances: [], badges: [],
  badge_goals: [{ badge_code: 'community_helper', next_tier: 'bronze', current: 1, target: 5, remaining: 4 }],
  history: { items: [{ display_kind: 'vote_language', brand: 'pundo', xp_delta: 5, credit_delta: 1, occurred_at: '2026-10-23T10:00:00Z', is_reversal: false }], next_cursor: null },
}

const paidPreview = {
  allowed: true as const,
  allowance: { kind: 'homesick', period: 'monthly', free_limit: 20, used: 20, unit_price: 2 },
  wallet_credits: 5,
  charge: { kind: 'credits' as const, credits: 2 },
  message_code: 'wallet_charge_required',
}

// Decision table in 01-design.md (2026-10-22), localized for all six supported UI languages.
const brandTerms = {
  en: { pundo: { standing: 'Island Rank', currency: 'Carobs', singular: 'Carob' }, naidivse: { standing: 'Instinct', currency: 'Coins', singular: 'Coin' } },
  de: { pundo: { standing: 'Inselrang', currency: 'Carobs', singular: 'Carob' }, naidivse: { standing: 'Instinkt', currency: 'Münzen', singular: 'Münze' } },
  ru: { pundo: { standing: 'Островной ранг', currency: 'Каробы', singular: 'Кароб' }, naidivse: { standing: 'Чутьё', currency: 'Монеты', singular: 'Монета' } },
  el: { pundo: { standing: 'Νησιωτικός βαθμός', currency: 'Χαρούπια', singular: 'Χαρούπι' }, naidivse: { standing: 'Ένστικτο', currency: 'Νομίσματα', singular: 'Νόμισμα' } },
  ar: { pundo: { standing: 'رتبة الجزيرة', currency: 'قرون الخروب', singular: 'قرن خروب' }, naidivse: { standing: 'الحدس', currency: 'عملات', singular: 'عملة' } },
  he: { pundo: { standing: 'דירוג האי', currency: 'חרובי קארוב', singular: 'חרוב קארוב' }, naidivse: { standing: 'אינסטינקט', currency: 'מטבעות', singular: 'מטבע' } },
} as const

describe('K4a brand terms', () => {
  it('matches every visible Account-tab brand term in all 12 brand/language combinations', () => {
    for (const [lang, brands] of Object.entries(brandTerms)) {
      const tr = t(lang)
      for (const [brand, expected] of Object.entries(brands)) {
        const section = render(<ProgressionSection account={account} tr={tr} lang={lang as keyof typeof brandTerms} brand={brand as 'pundo' | 'naidivse'} showMcp={false} />)
        const sectionScreen = within(section.container)

        // Standing heading, wallet heading, amount unit, history line: all must use the table's brand term.
        expect(sectionScreen.getByText(expected.standing)).toBeVisible()
        expect(sectionScreen.getByText(expected.currency)).toBeVisible()
        expect(sectionScreen.getByText(expected.singular)).toBeVisible()
        expect(sectionScreen.getByText(`+5 XP · +1 ${expected.singular}`)).toBeVisible()
        section.unmount()

        const preview = render(<WalletChargeConfirmDialog lang={lang} brand={brand} preview={paidPreview} onConfirm={() => undefined} onCancel={() => undefined} />)
        expect(within(preview.container).getByText(tr.progression_wallet_paid(2, expected.currency))).toBeVisible()
        preview.unmount()
      }
    }
  })

  it('renders an obvious Naidivse bar; changing its tone to Pundo would fail this countercheck', () => {
    const { rerender } = render(<ProgressionSection account={account} tr={t('en')} lang="en" brand="naidivse" showMcp={false} />)
    expect(screen.getByTestId('naidivse-progress-bar')).toBeVisible()
    rerender(<ProgressionSection account={account} tr={t('en')} lang="en" brand="pundo" showMcp={false} />)
    expect(screen.queryByTestId('naidivse-progress-bar')).not.toBeInTheDocument()
    expect(screen.getByTestId('pundo-progress-ring')).toBeVisible()
  })

  it('shows Carob singular and units in the history row', () => {
    render(<ProgressionSection account={account} tr={t('en')} lang="en" brand="pundo" showMcp={false} />)
    expect(screen.getByText('Carob')).toBeVisible()
    expect(screen.getByText('+5 XP · +1 Carob')).toBeVisible()
  })

  it('uses the grammatically correct tier form in Russian and Greek goals', () => {
    expect(t('ru').progression_goal('Значок', t('ru').progression_tier_name('bronze'), 1, 5)).toContain('для бронзы')
    expect(t('el').progression_goal('Διάκριση', t('el').progression_tier_name('bronze'), 1, 5)).toContain('για το χάλκινο')
  })

  it('does not render an error-like feedback notice for ordinary not_awarded updates', () => {
    const { container } = render(<ProgressionFeedbackNotice feedback={{ state: 'not_awarded', reason: 'vote_updated', event: null, standing: null, wallet: null, achievements: null }} lang="en" brand="pundo" />)
    expect(container).toBeEmptyDOMElement()
  })
})
