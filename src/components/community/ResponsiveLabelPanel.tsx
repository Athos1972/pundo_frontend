'use client'

import type { VoteAggregateItem, AttributeType } from '@/types/api'
import type { Translations } from '@/lib/translations'
import { VoteToggle } from './VoteToggle'
import { VoteSlider } from './VoteSlider'

// Attributes always shown for every shop type
const GENERIC_ATTRS: AttributeType[] = ['parking', 'price_level', 'delivery']

// Attributes shown only for shop types whose canonical contains these keywords
const RESTAURANT_ATTRS: AttributeType[] = ['reservation_required', 'terrace']
const RETAIL_ATTRS: AttributeType[] = ['click_collect']

function getAttrsForShopType(shopTypeCanonical: string | null | undefined): AttributeType[] {
  const attrs: AttributeType[] = [...GENERIC_ATTRS]
  if (!shopTypeCanonical) return attrs
  const c = shopTypeCanonical.toLowerCase()
  if (c.includes('restaurant') || c.includes('cafe') || c.includes('bar') || c.includes('tavern')) {
    attrs.push(...RESTAURANT_ATTRS)
  }
  if (c.includes('retail') || c.includes('shop') || c.includes('store') || c.includes('market')) {
    attrs.push(...RETAIL_ATTRS)
  }
  return attrs
}

function attrLabel(attr: AttributeType, tr: Translations): string {
  const map: Record<string, keyof Translations> = {
    parking: 'community_vote_parking',
    price_level: 'community_vote_price_level',
    delivery: 'community_vote_delivery',
    click_collect: 'community_vote_click_collect',
    reservation_required: 'community_vote_reservation_required',
    terrace: 'community_vote_terrace',
  }
  return tr[map[attr] as keyof Translations] as string
}

interface Props {
  aggregates: VoteAggregateItem[]
  shopTypeCanonical: string | null | undefined
  isAuthenticated: boolean
  onVote: (attr: AttributeType, value: number) => Promise<void>
  onDelete: (attr: AttributeType) => Promise<void>
  submitting: AttributeType | null
  tr: Translations
}

export function ResponsiveLabelPanel({
  aggregates, shopTypeCanonical, isAuthenticated, onVote, onDelete, submitting, tr,
}: Props) {
  const attrs = getAttrsForShopType(shopTypeCanonical)
  const aggByType = Object.fromEntries(aggregates.map((a) => [a.attribute_type, a]))

  // Hide entire panel if no votes yet and user is not authenticated
  const hasAnyVote = attrs.some((a) => aggByType[a]?.vote_count ?? 0 > 0)
  if (!hasAnyVote && !isAuthenticated) return null

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <div className="space-y-2">
        {attrs.map((attr) => {
          const agg = aggByType[attr]
          const myValue = agg?.my_value ?? null

          if (attr === 'price_level') {
            return (
              <div key={attr} className="flex items-center justify-between gap-3 rtl:flex-row-reverse">
                <span className="text-sm text-text">{attrLabel(attr, tr)}</span>
                <div className="flex items-center gap-2">
                  {agg && agg.vote_count > 0 && !isAuthenticated && (
                    <span className="text-xs text-text-muted">
                      {'€'.repeat(Math.round(agg.weighted_avg))}
                      {' '}({tr.community_vote_n_votes(agg.vote_count)})
                    </span>
                  )}
                  {isAuthenticated && (
                    <>
                      <VoteSlider
                        value={myValue}
                        disabled={submitting === attr}
                        size="sm"
                        onChange={async (v) => {
                          if (v === 0 && myValue !== null) await onDelete(attr)
                          else if (v > 0) await onVote(attr, v)
                        }}
                      />
                      {agg && agg.vote_count > 0 && (
                        <span className="text-xs text-text-light">
                          {tr.community_vote_n_votes(agg.vote_count)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          }

          // Boolean attribute
          if (!isAuthenticated) {
            if (!agg || agg.vote_count === 0) return null
            const yesRatio = agg.weighted_avg  // 0 or 1 (avg of boolean 0/1 votes)
            const label = attrLabel(attr, tr)
            return (
              <div key={attr} className="flex items-center justify-between text-sm rtl:flex-row-reverse">
                <span className="text-text">{label}</span>
                <span className={yesRatio >= 0.5 ? 'text-green-600' : 'text-text-muted'}>
                  {yesRatio >= 0.5 ? '✓' : '✗'}
                  <span className="text-xs text-text-light ml-1">({tr.community_vote_n_votes(agg.vote_count)})</span>
                </span>
              </div>
            )
          }

          return (
            <VoteToggle
              key={attr}
              label={attrLabel(attr, tr)}
              value={myValue === null ? null : myValue >= 0.5}
              count={agg?.vote_count ?? 0}
              disabled={submitting === attr}
              onChange={async (v) => {
                await onVote(attr, v ? 1 : 0)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
