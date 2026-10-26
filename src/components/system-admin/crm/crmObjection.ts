// ─── Objection of a person: pure helpers (F7600 follow-up "Widerspruch einer Person im Admin erfassen") ──────────────
// No 'use client' and no server-only import: the person page (Server Component) computes the dialog data with these,
// the dialog (PersonObjectionAction, Client Component) uses the same limits. A function exported from a 'use client'
// module cannot be called on the server, hence this module.

import type { CrmLeadState, CrmPerson } from '@/types/system-admin'

/** Reason limits of the backend (`OBJECTION_REASON_MIN/MAX`, trimmed). */
export const OBJECTION_REASON_MIN = 10
export const OBJECTION_REASON_MAX = 500

/** An organisation of an active relation of the person, as the objection dialog lists it. */
export interface ObjectionOrg {
  id: number
  name: string
  /** The person holds the role "owner" in this active relation. */
  isOwner: boolean
  /** Lead status of the organisation; `undefined` if it could not be read. */
  leadState?: CrmLeadState | null
}

/** Channels the objection blocks: personal channels plus the channels of every relation (active and ended). */
export function objectionChannelCount(person: Pick<CrmPerson, 'channels' | 'relations'>): number {
  return person.channels.length + person.relations.reduce((sum, relation) => sum + relation.channels.length, 0)
}

/** Organisations of the active relations, one entry per organisation (owner if any active relation has the role). */
export function objectionOrgsOf(
  person: Pick<CrmPerson, 'relations'>,
  leadStates: Record<number, CrmLeadState | null> = {},
): ObjectionOrg[] {
  const byOrg = new Map<number, ObjectionOrg>()
  for (const relation of person.relations.filter((r) => r.active)) {
    const isOwner = relation.roles.includes('owner') || (byOrg.get(relation.org.id)?.isOwner ?? false)
    byOrg.set(relation.org.id, { id: relation.org.id, name: relation.org.name, isOwner, leadState: leadStates[relation.org.id] })
  }
  return [...byOrg.values()]
}
