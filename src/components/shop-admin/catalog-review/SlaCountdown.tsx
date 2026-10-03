'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)
// Rein informativ — kein Auto-Publish (AC 16, Content-Publish-Gate bleibt menschlich).

import { useEffect, useState } from 'react'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface Props {
  deadline: string // ISO datetime
  tr: ShopAdminTranslations
}

function formatRemaining(ms: number): { hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000))
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 }
}

export function SlaCountdown({ deadline, tr }: Props) {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    // Minute resolution is enough for a 24h SLA — see 02-architecture.md §6.4.
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const deadlineMs = new Date(deadline).getTime()
  const remainingMs = deadlineMs - now
  const breached = remainingMs <= 0

  if (breached) {
    return <span className="text-xs font-medium text-red-600">{tr.catalog_review_sla_breached}</span>
  }

  const { hours, minutes } = formatRemaining(remainingMs)
  const timeStr = `${hours}h ${minutes}min`

  return (
    <span className="text-xs text-gray-500">
      {tr.catalog_review_sla_remaining.replace('{time}', timeStr)}
    </span>
  )
}
