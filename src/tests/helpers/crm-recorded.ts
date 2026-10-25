// Recorded answers of the CRM organisation API (F7600 CRM-Backbone, org cut, T14/T15) for the Vitest suites.
// Source: e2e/fixtures/contracts/crm-orgs/*.json, recorded from the slot backend by
// e2e/fixtures/contracts/crm-orgs/record.mjs (real producer answers, never hand-written; R1). The Playwright specs of T19
// may mock `page.route` with the same files. Every call parses the file again, so a test may change its copy freely.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type * as T from '@/types/system-admin'

const DIR = join(process.cwd(), 'e2e', 'fixtures', 'contracts', 'crm-orgs')

export interface Recorded<B> { status: number; body: B }

export function recorded<B = unknown>(name: string): Recorded<B> {
  return JSON.parse(readFileSync(join(DIR, `${name}.json`), 'utf8')) as Recorded<B>
}

/** Body of a recorded answer. */
export const body = <B,>(name: string): B => recorded<B>(name).body

export const rec = {
  /** Branch with parent, org channels (email, phone, whatsapp), two relations (with role + red relation mail, without role), card source, one sent message. */
  orgDetail: () => body<T.CrmOrgDetail>('org-detail'),
  /** Head office with one branch. */
  orgDetailHead: () => body<T.CrmOrgDetail>('org-detail-head'),
  /** Plain master data: lead status null, one relation to Maria. */
  orgDetailNoLead: () => body<T.CrmOrgDetail>('org-detail-no-lead'),
  /** Created with a value owned by a person: open review (`open_review_count` 1). */
  orgOwnerConflict: () => body<T.CrmOrgDetail>('org-create-owner-conflict'),
  orgList: () => body<T.PaginatedResponse<T.CrmOrgListItem>>('org-list'),
  orgListLeadOnly: () => body<T.PaginatedResponse<T.CrmOrgListItem>>('org-list-lead-only'),
  orgSearchParentCandidates: () => body<T.PaginatedResponse<T.CrmOrgSearchHit>>('org-search-parent-candidates'),
  recipients: () => body<T.CrmOutreachRecipient[]>('outreach-recipients'),
  recipientsApproved: () => body<T.CrmOutreachRecipient[]>('outreach-recipients-approved'),
  previewGateRed: () => body<T.CrmOutreachPreviewResponse>('outreach-preview-gate-red'),
  previewApproved: () => body<T.CrmOutreachPreviewResponse>('outreach-preview-approved'),
  previewDefault: () => body<T.CrmOutreachPreviewResponse>('outreach-preview-default'),
  approve: () => body<T.CrmSendApprovalOut>('outreach-approve'),
  send: () => body<T.CrmOutreachSendResponse>('outreach-send'),
  review: (category: T.CrmReviewCategory) =>
    body<T.PaginatedResponse<T.CrmReviewItemOut>>(`review-${category.replaceAll('_', '-')}`),
}
