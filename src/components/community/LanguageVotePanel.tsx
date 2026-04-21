'use client'

import type { VoteAggregateItem, AttributeType } from '@/types/api'
import type { Translations } from '@/lib/translations'
import { VoteSlider } from './VoteSlider'
import { LanguageTag } from './LanguageTag'

const LANGUAGE_ATTRS: AttributeType[] = [
  'language_en', 'language_de', 'language_el',
  'language_ru', 'language_ar', 'language_he',
]

function langCodeFromAttr(attr: AttributeType): string {
  return attr.replace('language_', '')
}

interface Props {
  aggregates: VoteAggregateItem[]
  isAuthenticated: boolean
  onVote: (attr: AttributeType, value: number) => Promise<void>
  onDelete: (attr: AttributeType) => Promise<void>
  submitting: AttributeType | null
  tr: Translations
}

export function LanguageVotePanel({ aggregates, isAuthenticated, onVote, onDelete, submitting, tr }: Props) {
  const aggByType = Object.fromEntries(aggregates.map((a) => [a.attribute_type, a]))

  const langLabelKey = (attr: AttributeType): keyof Translations => {
    const map: Record<string, keyof Translations> = {
      language_en: 'community_vote_language_en',
      language_de: 'community_vote_language_de',
      language_el: 'community_vote_language_el',
      language_ru: 'community_vote_language_ru',
      language_ar: 'community_vote_language_ar',
      language_he: 'community_vote_language_he',
    }
    return map[attr] ?? 'community_vote_language_en'
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text rtl:text-right">
        {tr.community_vote_language_label}
      </h3>

      {/* Read-only summary tags (shown above the sliders) */}
      {aggregates.filter((a) => LANGUAGE_ATTRS.includes(a.attribute_type) && a.vote_count > 0).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGE_ATTRS.map((attr) => {
            const agg = aggByType[attr]
            if (!agg || agg.vote_count === 0) return null
            return (
              <LanguageTag
                key={attr}
                languageCode={langCodeFromAttr(attr)}
                avgScore={agg.weighted_avg}
                voteCount={agg.vote_count}
              />
            )
          })}
        </div>
      )}

      {/* Voting sliders (only when authenticated) */}
      {isAuthenticated && (
        <div className="space-y-2 pt-1">
          {LANGUAGE_ATTRS.map((attr) => {
            const agg = aggByType[attr]
            const myValue = agg?.my_value ?? null
            const label = tr[langLabelKey(attr)] as string

            return (
              <div key={attr} className="flex items-center justify-between gap-3 rtl:flex-row-reverse">
                <span className="text-sm text-text-muted w-20 shrink-0">{label}</span>
                <div className="flex items-center gap-2">
                  <VoteSlider
                    value={myValue}
                    disabled={submitting === attr}
                    size="sm"
                    onChange={async (v) => {
                      if (v === 0 && myValue !== null) {
                        await onDelete(attr)
                      } else if (v > 0) {
                        await onVote(attr, v)
                      }
                    }}
                  />
                  {agg && agg.vote_count > 0 && (
                    <span className="text-xs text-text-light w-12 text-right rtl:text-left">
                      {tr.community_vote_n_votes(agg.vote_count)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
