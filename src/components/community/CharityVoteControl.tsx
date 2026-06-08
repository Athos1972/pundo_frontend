'use client'

// CharityVoteControl — F3800 Phase 2
// Slim up-vote toggle for attribute_type='charity'.
// Optimistic UI: counter + button state updated locally; on error → rollback.

import { useState } from 'react'
import { submitVote, deleteVote } from '@/lib/community-api'
import { tCommunity } from '@/lib/i18n/community'
import { t } from '@/lib/translations'
import { LoginToVoteCTA } from './LoginToVoteCTA'

interface Props {
  shopId: number
  lang: string
  initialVoteCount: number
  initialMyValue: number | null
  isAuthenticated: boolean
}

export function CharityVoteControl({
  shopId,
  lang,
  initialVoteCount,
  initialMyValue,
  isAuthenticated,
}: Props) {
  const tr = t(lang)
  const tC = tCommunity(lang)

  const [voteCount, setVoteCount] = useState(initialVoteCount)
  const [myValue, setMyValue] = useState<number | null>(initialMyValue)
  const [submitting, setSubmitting] = useState(false)
  const [showLoginCTA, setShowLoginCTA] = useState(false)

  const hasConfirmed = myValue != null && myValue > 0

  async function handleToggle() {
    if (submitting) return

    if (!isAuthenticated) {
      setShowLoginCTA(true)
      return
    }

    // Optimistic update
    const prevCount = voteCount
    const prevMyValue = myValue

    if (hasConfirmed) {
      setVoteCount(Math.max(0, voteCount - 1))
      setMyValue(null)
    } else {
      setVoteCount(voteCount + 1)
      setMyValue(1)
    }

    setSubmitting(true)
    try {
      if (hasConfirmed) {
        await deleteVote(shopId, 'charity', lang)
      } else {
        await submitVote(shopId, 'charity', 1, lang)
      }
    } catch {
      // Rollback on error
      setVoteCount(prevCount)
      setMyValue(prevMyValue)
    } finally {
      setSubmitting(false)
    }
  }

  if (showLoginCTA && !isAuthenticated) {
    return (
      <div className="mt-3 rtl:text-right">
        <p className="text-sm text-text-muted mb-2 rtl:text-right">{tC.charity_vote_question}</p>
        <LoginToVoteCTA tr={tr} />
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rtl:items-end">
      <p className="text-sm text-text-muted rtl:text-right">{tC.charity_vote_question}</p>
      <div className="flex items-center gap-3 rtl:flex-row-reverse">
        <button
          type="button"
          onClick={handleToggle}
          disabled={submitting}
          aria-pressed={hasConfirmed}
          className={[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            hasConfirmed
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-surface border border-border text-text-muted hover:border-accent hover:text-accent',
            submitting ? 'opacity-60 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          {hasConfirmed ? tC.charity_vote_confirmed : tC.charity_vote_confirm}
        </button>
        {voteCount > 0 && (
          <span className="text-xs text-text-muted rtl:text-right">
            {tC.charity_vote_count(voteCount)}
          </span>
        )}
      </div>
    </div>
  )
}
