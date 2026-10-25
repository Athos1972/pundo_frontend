// Recorded answers of the slot backend for the person components (F7600 CRM-Backbone, org cut, T16/T17).
// Source: e2e/fixtures/contracts/crm-persons/*.json, written by `record.mjs` in that folder from real calls against the
// worktree slot backend (8513); never edited by hand (R1). Re-record: see the header of record.mjs. The shape is tied to
// the frontend types by src/types/contracts.ts (backend schema vs. frontend type); here the files are only loaded.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type * as T from '@/types/system-admin'

const DIR = join(__dirname, '..', '..', '..', 'e2e', 'fixtures', 'contracts', 'crm-persons')

export interface Recorded<B> { status: number; body: B }

export function recorded<B>(name: string): Recorded<B> {
  return JSON.parse(readFileSync(join(DIR, `${name}.json`), 'utf8')) as Recorded<B>
}

/** Fresh copies per call, so a test cannot change the data of another one. */
export const rec = {
  /** Maria Georgiou: first/last name, salutation ms, birthday 29 Feb with unknown year, one personal channel,
   *  an active relation (roles manager + accountant, note, preferred = organisation channel) and an ended one. */
  personDetail: () => recorded<T.CrmPerson>('person-detail').body,
  /** Γεωργίου Ελένη: free name, no channel, no relation. */
  personFree: () => recorded<T.CrmPerson>('person-create-free').body,
  /** Organisation with its own channel and two relations: Maria (two roles) and Eleni (no role → role_missing). */
  orgDetail: () => recorded<T.CrmOrgDetail>('org-detail-with-relations').body,
  personList: () => recorded<T.PaginatedResponse<T.CrmPerson>>('person-list').body,
  config: () => recorded<T.CrmConfigOut>('config').body,
}
