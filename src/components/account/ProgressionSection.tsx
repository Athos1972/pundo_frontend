'use client'

import { CreditsLevelHelp } from '@/components/wallet/CreditsLevelHelp'
import { formatDate } from '@/lib/format-date'
import type { Lang } from '@/lib/lang'
import type { Translations } from '@/lib/translations'
import type { ProgressionAccountResponse } from '@/types/api'

interface Props {
  account: ProgressionAccountResponse
  tr: Translations
  lang: Lang
  brand: 'pundo' | 'naidivse'
  showMcp: boolean
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

export function ProgressionSection({ account, tr, lang, brand, showMcp }: Props) {
  const { standing, wallet } = account
  const visibleAllowances = account.allowances.filter((allowance) => allowance.kind !== 'mcp' || showMcp)
  const currency = (amount: number) => tr.progression_brand_currency(brand, amount)

  return (
    <section className="space-y-6" aria-label={tr.progression_tab}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4 text-center" data-testid={brand === 'pundo' ? 'pundo-progress-ring' : undefined}>
          <div className="mb-1 flex items-center justify-center gap-1 text-xs text-text-muted">
            <span>{tr.progression_brand_standing(brand)}</span>
            <CreditsLevelHelp lang={lang} brand={brand} />
          </div>
          <p className="font-heading text-3xl font-extrabold text-accent">{standing.level}</p>
          {brand === 'naidivse' && standing.next_level ? (
            <div className="mt-3" data-testid="naidivse-progress-bar">
              <div className="h-2 overflow-hidden rounded-full bg-accent/20" role="progressbar" aria-valuemin={0} aria-valuemax={standing.next_level.threshold_xp} aria-valuenow={standing.xp}>
                {/* @csp-allow-inline-style -- API-derived progress value has no static Tailwind equivalent. */}
                <div className="h-full rounded-full bg-accent motion-reduce:transition-none" style={{ width: `${Math.min(100, (standing.xp / standing.next_level.threshold_xp) * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-text-muted">{tr.progression_until_next(standing.next_level.remaining_xp)}</p>
            </div>
          ) : standing.next_level ? (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-text-muted">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-accent/50" aria-hidden="true" />
              <p>{tr.progression_until_next(standing.next_level.remaining_xp)}</p>
            </div>
          ) : (
            <p className="mt-1 text-xs text-text-muted">{tr.progression_max_level}</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-xs text-text-muted">
            <span>{currency(2)}</span>
            <CreditsLevelHelp lang={lang} brand={brand} />
          </div>
          <p className="font-heading text-3xl font-extrabold text-accent">{wallet.credits}</p>
          <p className="mt-1 text-xs text-text-muted">{currency(wallet.credits)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-text rtl:text-right">{tr.progression_allowances}</h3>
        <ul className="space-y-2">
          {visibleAllowances.map((allowance) => (
            <li key={allowance.kind} className="flex items-center justify-between gap-3 text-sm rtl:flex-row-reverse">
              <span className="text-text">{tr.progression_allowance_kind(allowance.kind)}</span>
              <span className="text-end text-text-muted">
                {tr.progression_allowance_remaining(allowance.remaining, allowance.limit)}
                <span className="block text-xs">{tr.progression_reset_at(formatDate(allowance.reset_at, lang))}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-text rtl:text-right">{tr.progression_badges}</h3>
        {account.badges.length === 0 ? (
          <p className="text-sm text-text-muted rtl:text-right">{tr.progression_no_badges}</p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {account.badges.map((badge) => (
              <li key={`${badge.badge_code}-${badge.tier}`} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                <p className="font-medium text-text">{tr.progression_badge_name(badge.badge_code)}</p>
                <p className="text-xs text-text-muted">{tr.progression_tier_name(badge.tier)} · {formatDate(badge.awarded_at, lang)}</p>
              </li>
            ))}
          </ul>
        )}
        {account.badge_goals.length > 0 && (
          <ul className="mt-3 space-y-2">
            {account.badge_goals.map((goal) => (
              <li key={goal.badge_code} className="text-sm text-text-muted rtl:text-right">
                {tr.progression_goal(tr.progression_badge_name(goal.badge_code), tr.progression_tier_name(goal.next_tier), goal.current, goal.target)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-text rtl:text-right">{tr.progression_history}</h3>
        {account.history.items.length === 0 ? (
          <p className="text-sm text-text-muted rtl:text-right">{tr.progression_no_history}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {account.history.items.map((event) => (
              <li key={`${event.occurred_at}-${event.display_kind}`} className="flex items-center justify-between gap-3 p-3 text-sm rtl:flex-row-reverse">
                <div>
                  <p className="font-medium text-text">{tr.progression_event_name(event.display_kind)}</p>
                  <p className="text-xs text-text-muted">{tr.progression_history_brand(event.brand)} · {formatDate(event.occurred_at, lang)}</p>
                </div>
                <span className="text-end text-text-muted" dir="ltr">{tr.progression_history_delta(signed(event.xp_delta), `${signed(event.credit_delta)} ${currency(Math.abs(event.credit_delta))}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
