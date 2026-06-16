// ─── CRM Lifecycle Badge (F7600) ──────────────────────────────────────────────
// Server/UI component — no 'use client' needed (pure display).

import { LIFECYCLE_BADGE_COLORS } from './transitions'
import type { CrmLifecycleState } from '@/types/system-admin'

interface LifecycleBadgeProps {
  state: string
  stateLabel: string
}

export function LifecycleBadge({ state, stateLabel }: LifecycleBadgeProps) {
  const colorClass =
    LIFECYCLE_BADGE_COLORS[state as CrmLifecycleState] ?? 'bg-gray-100 text-gray-600'

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colorClass}`}
    >
      {stateLabel}
    </span>
  )
}
