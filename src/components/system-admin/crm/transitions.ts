// ─── CRM lead status transitions (F7600, org cut) ─────────────────────────────────────────────────────────────────────
// CLIENT-SIDE MIRROR of ingestor/lib/crm/lifecycle.py :: ALLOWED_TRANSITIONS (lead status of the organisation).
// The backend is the source of truth — 422 "illegal_transition" is always the final guard; this table only decides which
// buttons and options the UI offers. Last verified against the org cut (f7600om01, T2): REGISTERED is terminal, an empty
// status (`null` = no acquisition target) can become SOURCED, HARD_OPTOUT or REJECTED_PRIVATE, there is no way back to empty.

import type { CrmLeadState } from '@/types/system-admin'

export const CRM_ALLOWED_TRANSITIONS: Record<CrmLeadState, CrmLeadState[]> = {
  SOURCED:          ['ENRICHED', 'QUEUED', 'NEEDS_REVIEW', 'REJECTED_PRIVATE', 'HARD_OPTOUT', 'UNREACHABLE'],
  ENRICHED:         ['QUEUED', 'NEEDS_REVIEW', 'REJECTED_PRIVATE', 'HARD_OPTOUT', 'UNREACHABLE'],
  NEEDS_REVIEW:     ['SOURCED', 'QUEUED', 'REJECTED_PRIVATE', 'HARD_OPTOUT', 'UNREACHABLE'],  // SOURCED: "confirm card"
  QUEUED:           ['CONTACTED', 'HARD_OPTOUT', 'UNREACHABLE', 'DEAD'],
  CONTACTED:        ['ENGAGED', 'INTERESTED', 'REGISTERED', 'HARD_OPTOUT', 'UNREACHABLE', 'DEAD'],
  ENGAGED:          ['INTERESTED', 'REGISTERED', 'HARD_OPTOUT', 'UNREACHABLE', 'DEAD'],
  INTERESTED:       ['REGISTERED', 'HARD_OPTOUT', 'UNREACHABLE', 'DEAD'],
  UNREACHABLE:      ['QUEUED', 'DEAD', 'HARD_OPTOUT'],
  REGISTERED:       [],
  HARD_OPTOUT:      [],
  REJECTED_PRIVATE: [],
  DEAD:             [],
}

/** Transitions out of the empty status (`null`, no acquisition target): "make it an acquisition target" or block it. */
export const LEAD_START_TRANSITIONS: CrmLeadState[] = ['SOURCED', 'HARD_OPTOUT', 'REJECTED_PRIVATE']

/** Terminal lead states (backend `TERMINAL_STATES`). */
export const TERMINAL_LEAD_STATES: readonly CrmLeadState[] = ['REGISTERED', 'HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD']

/** States in which the backend refuses outreach (`outreach_not_allowed_state`); the empty status refuses as well. */
export const NO_OUTREACH_STATES: readonly CrmLeadState[] = [...TERMINAL_LEAD_STATES, 'NEEDS_REVIEW', 'UNREACHABLE']

export function allowedTransitions(state: CrmLeadState | null): CrmLeadState[] {
  return state === null ? LEAD_START_TRANSITIONS : (CRM_ALLOWED_TRANSITIONS[state] ?? [])
}

export function isTerminalLeadState(state: CrmLeadState | null): boolean {
  return state !== null && TERMINAL_LEAD_STATES.includes(state)
}

// Badge colours for lead states (used by LifecycleBadge)
export const LIFECYCLE_BADGE_COLORS: Record<CrmLeadState, string> = {
  SOURCED:          'bg-gray-100 text-gray-700',
  ENRICHED:         'bg-blue-50 text-blue-700',
  NEEDS_REVIEW:     'bg-yellow-50 text-yellow-700',
  QUEUED:           'bg-purple-50 text-purple-700',
  CONTACTED:        'bg-indigo-50 text-indigo-700',
  ENGAGED:          'bg-cyan-50 text-cyan-700',
  INTERESTED:       'bg-teal-50 text-teal-700',
  REGISTERED:       'bg-green-100 text-green-800',
  UNREACHABLE:      'bg-orange-50 text-orange-700',
  HARD_OPTOUT:      'bg-red-100 text-red-800',
  REJECTED_PRIVATE: 'bg-red-50 text-red-700',
  DEAD:             'bg-gray-200 text-gray-500',
}

export const ALL_LIFECYCLE_STATES: CrmLeadState[] = [
  'SOURCED', 'ENRICHED', 'NEEDS_REVIEW', 'QUEUED', 'CONTACTED',
  'ENGAGED', 'INTERESTED', 'REGISTERED', 'UNREACHABLE',
  'HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD',
]

/**
 * Extra transitions available ONLY to superadmin (Stufe 1). The backend lets a superadmin jump to REGISTERED from any
 * non-terminal state (`CrmService.transition(is_superadmin=True)`); the UI offers the direct button from SOURCED only.
 */
export const SUPERADMIN_EXTRA_TRANSITIONS: Partial<Record<CrmLeadState, CrmLeadState[]>> = {
  SOURCED: ['REGISTERED'],
}
