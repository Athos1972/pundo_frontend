// ─── CRM Lifecycle Transitions (F7600) ────────────────────────────────────────
// This is a CLIENT-SIDE MIRROR of ingestor/lib/crm/lifecycle.py :: ALLOWED_TRANSITIONS.
// IMPORTANT: Keep in sync with backend. If backend changes, update here too.
// Backend is source of truth — 422 "illegal_transition" is always the final guard.
// Last verified against: ingestor/lib/crm/lifecycle.py (2026-06-20)

import type { CrmLifecycleState } from '@/types/system-admin'

export const CRM_ALLOWED_TRANSITIONS: Record<CrmLifecycleState, CrmLifecycleState[]> = {
  SOURCED:          ['ENRICHED', 'NEEDS_REVIEW', 'QUEUED', 'UNREACHABLE', 'HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD'],
  ENRICHED:         ['NEEDS_REVIEW', 'QUEUED', 'UNREACHABLE', 'HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD'],
  NEEDS_REVIEW:     ['QUEUED', 'UNREACHABLE', 'HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD'],
  QUEUED:           ['CONTACTED', 'UNREACHABLE', 'HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD'],
  CONTACTED:        ['ENGAGED', 'INTERESTED', 'UNREACHABLE', 'HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD'],
  ENGAGED:          ['INTERESTED', 'REGISTERED', 'UNREACHABLE', 'HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD'],
  INTERESTED:       ['REGISTERED', 'UNREACHABLE', 'HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD'],
  REGISTERED:       ['HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD'],
  UNREACHABLE:      ['QUEUED', 'HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD'],
  HARD_OPTOUT:      [],
  REJECTED_PRIVATE: [],
  DEAD:             [],
}

// Badge colours for lifecycle states (used by LifecycleBadge)
export const LIFECYCLE_BADGE_COLORS: Record<CrmLifecycleState, string> = {
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

export const ALL_LIFECYCLE_STATES: CrmLifecycleState[] = [
  'SOURCED', 'ENRICHED', 'NEEDS_REVIEW', 'QUEUED', 'CONTACTED',
  'ENGAGED', 'INTERESTED', 'REGISTERED', 'UNREACHABLE',
  'HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD',
]

/**
 * Extra transitions available ONLY to superadmin (Stufe 1).
 * The backend enforces this via role-check — this map is UI-only for button visibility.
 */
export const SUPERADMIN_EXTRA_TRANSITIONS: Partial<Record<CrmLifecycleState, CrmLifecycleState[]>> = {
  SOURCED: ['REGISTERED'],
}
