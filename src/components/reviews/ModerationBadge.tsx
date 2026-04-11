'use client'

import { useEffect, useState } from 'react'
import type { PhotoStatusItem } from '@/types/api'
import type { Translations } from '@/lib/translations'

interface Props {
  reviewId: number
  tr: Translations
}

const MAX_POLLS = 10
const POLL_INTERVAL_MS = 3000

export function ModerationBadge({ reviewId, tr }: Props) {
  const [status, setStatus] = useState<'pending' | 'done' | 'rejected'>('pending')
  const [polls, setPolls] = useState(0)

  useEffect(() => {
    if (polls >= MAX_POLLS || status !== 'pending') return

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customer/customer/reviews/${reviewId}/photos/status`)
        if (!res.ok) return
        const items = await res.json() as PhotoStatusItem[]
        const hasRejected = items.some((p) => p.status === 'rejected')
        const allDone = items.every((p) => p.status !== 'pending')

        if (hasRejected) setStatus('rejected')
        else if (allDone) setStatus('done')
        else setPolls((n) => n + 1)
      } catch {
        // ignore transient errors
      }
    }, POLL_INTERVAL_MS)

    return () => clearTimeout(timer)
  }, [polls, reviewId, status])

  if (status === 'done') return null

  return (
    <p className={`text-xs mt-2 ${status === 'rejected' ? 'text-red-600' : 'text-text-muted'}`}>
      {status === 'rejected' ? tr.reviews_photos_rejected : tr.reviews_photos_pending}
    </p>
  )
}
