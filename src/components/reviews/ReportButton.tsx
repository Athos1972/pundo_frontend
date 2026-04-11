'use client'

import { useState } from 'react'
import type { Translations } from '@/lib/translations'
import { useSession } from '@/components/auth/SessionProvider'

interface Props {
  reviewId: number
  tr: Translations
}

export function ReportButton({ reviewId, tr }: Props) {
  const session = useSession()
  const [reported, setReported] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!session.is_authenticated) return null

  async function handleReport() {
    if (loading || reported) return
    setLoading(true)
    try {
      const res = await fetch(`/api/customer/customer/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: null }),
      })
      if (res.ok || res.status === 409) {
        setReported(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleReport}
      disabled={loading || reported}
      className="text-xs text-text-muted hover:text-red-500 transition-colors disabled:opacity-50"
    >
      {reported ? tr.reviews_reported : tr.reviews_report}
    </button>
  )
}
