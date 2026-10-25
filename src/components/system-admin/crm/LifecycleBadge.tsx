// ─── CRM lead status badge (F7600, org cut) ───────────────────────────────────────────────────────────────────────────
// Server/UI component — no 'use client' needed (pure display). An empty lead status (`null`) is a valid state: the
// organisation is no acquisition target (plain master data); it gets its own dashed badge, never "—".

import { LIFECYCLE_BADGE_COLORS } from './transitions'
import type { CrmLeadState } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface LifecycleBadgeProps {
  /** Lead status; `null` = no acquisition target. Unknown values fall back to a neutral colour. */
  state: CrmLeadState | string | null
  stateLabel: string
}

/** Translated label of a lead status; `null` = "no acquisition target", an unknown value is shown raw. */
export function leadStateLabel(tr: SysAdminTranslations, state: CrmLeadState | string | null): string {
  if (state === null) return tr.crm_lead_none
  const value = tr[`crm_state_${state}` as keyof SysAdminTranslations]
  return typeof value === 'string' ? value : state
}

export function LifecycleBadge({ state, stateLabel }: LifecycleBadgeProps) {
  const colorClass = state === null
    ? 'border border-dashed border-gray-300 text-gray-500'
    : (LIFECYCLE_BADGE_COLORS[state as CrmLeadState] ?? 'bg-gray-100 text-gray-600')

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colorClass}`}
      data-lead-state={state ?? 'none'}
    >
      {stateLabel}
    </span>
  )
}
