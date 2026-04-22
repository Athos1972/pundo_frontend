'use client'

import { useState } from 'react'
import type { VoteAggregateItem, AttributeType } from '@/types/api'
import { t } from '@/lib/translations'
import { submitVote, deleteVote } from '@/lib/community-api'
import { LanguageVotePanel } from './LanguageVotePanel'
import { ResponsiveLabelPanel } from './ResponsiveLabelPanel'
import { LoginToVoteCTA } from './LoginToVoteCTA'

interface Props {
  shopId: number
  shopTypeCanonical: string | null | undefined
  initialAggregates: VoteAggregateItem[]
  isAuthenticated: boolean
  lang: string
}

export function CommunityFeedbackClient({
  shopId, shopTypeCanonical, initialAggregates, isAuthenticated, lang,
}: Props) {
  const tr = t(lang)
  const [aggregates, setAggregates] = useState<VoteAggregateItem[]>(initialAggregates)
  const [submitting, setSubmitting] = useState<AttributeType | null>(null)
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, kind: 'ok' | 'err') {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 3500)
  }

  function updateAggregates(attr: AttributeType, newValue: number | null, creditsAwarded = 0) {
    setAggregates((prev) => {
      const existing = prev.find((a) => a.attribute_type === attr)
      if (newValue === null) {
        // deleted: remove from list or reduce count
        if (!existing) return prev
        const newCount = existing.vote_count - 1
        if (newCount <= 0) return prev.filter((a) => a.attribute_type !== attr)
        // re-compute avg optimistically (remove my old vote)
        const oldMy = existing.my_value ?? 0
        const newAvg = (existing.weighted_avg * existing.vote_count - oldMy) / newCount
        return prev.map((a) =>
          a.attribute_type === attr
            ? { ...a, my_value: null, vote_count: newCount, weighted_avg: Math.max(0, newAvg) }
            : a
        )
      }
      if (!existing) {
        return [...prev, { attribute_type: attr, weighted_avg: newValue, vote_count: 1, my_value: newValue }]
      }
      const isNew = existing.my_value === null
      const newCount = isNew ? existing.vote_count + 1 : existing.vote_count
      const oldMy = existing.my_value ?? newValue
      const newAvg = isNew
        ? (existing.weighted_avg * existing.vote_count + newValue) / newCount
        : (existing.weighted_avg * existing.vote_count - oldMy + newValue) / newCount
      return prev.map((a) =>
        a.attribute_type === attr
          ? { ...a, my_value: newValue, vote_count: newCount, weighted_avg: Math.max(0, newAvg) }
          : a
      )
    })

    if (creditsAwarded > 0) {
      showToast(tr.community_vote_submit_success(creditsAwarded), 'ok')
    }
  }

  async function handleVote(attr: AttributeType, value: number) {
    if (submitting) return
    setSubmitting(attr)
    // optimistic
    updateAggregates(attr, value)
    try {
      const res = await submitVote(shopId, attr, value, lang)
      if (res.is_new && res.credits_awarded > 0) {
        showToast(tr.community_vote_submit_success(res.credits_awarded), 'ok')
      }
    } catch {
      // revert optimistic (re-fetch not implemented — show error)
      showToast(tr.community_vote_error, 'err')
    } finally {
      setSubmitting(null)
    }
  }

  async function handleDelete(attr: AttributeType) {
    if (submitting) return
    setSubmitting(attr)
    updateAggregates(attr, null)
    try {
      await deleteVote(shopId, attr, lang)
    } catch {
      showToast(tr.community_vote_delete_error, 'err')
    } finally {
      setSubmitting(null)
    }
  }

  const hasAnyData = aggregates.length > 0
  if (!hasAnyData && !isAuthenticated) return null

  return (
    <section className="bg-surface border border-border rounded-xl p-4 mt-4 space-y-4" aria-label={tr.community_votes_title}>
      <h2
        className="font-bold text-sm text-text rtl:text-right font-heading"
      >
        {tr.community_votes_title}
      </h2>

      {!isAuthenticated && <LoginToVoteCTA tr={tr} />}

      <LanguageVotePanel
        aggregates={aggregates}
        isAuthenticated={isAuthenticated}
        onVote={handleVote}
        onDelete={handleDelete}
        submitting={submitting}
        tr={tr}
      />

      <ResponsiveLabelPanel
        aggregates={aggregates}
        shopTypeCanonical={shopTypeCanonical}
        isAuthenticated={isAuthenticated}
        onVote={handleVote}
        onDelete={handleDelete}
        submitting={submitting}
        tr={tr}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={[
            'fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm font-medium shadow-lg z-50 transition-opacity',
            toast.kind === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white',
          ].join(' ')}
        >
          {toast.msg}
        </div>
      )}
    </section>
  )
}
