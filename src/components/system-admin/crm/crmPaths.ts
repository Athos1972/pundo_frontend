// ─── CRM route table (F7600 CRM-Backbone) ─────────────────────────────────────────────────────────────────────────────
// All `/api/v1/admin/crm/*` routes the admin UI calls, as `crm/...` paths for `crmRequest`/`crmSearch` (the browser goes
// through the proxy /api/admin/[...path], which prepends `/api/v1/admin/`). One table instead of path strings in every
// component; `src/tests/crm-paths.test.ts` checks every entry (path and method) against the backend OpenAPI snapshot.
// Pure module (no 'use client', no server-only import): usable in Client and Server Components.

export const CRM_ROUTES = {
  // Organisations
  orgList: { method: 'GET', path: 'crm/orgs' },
  orgCreate: { method: 'POST', path: 'crm/orgs' },
  orgSearch: { method: 'GET', path: 'crm/orgs/search' },
  orgGet: { method: 'GET', path: 'crm/orgs/{org_id}' },
  orgUpdate: { method: 'PATCH', path: 'crm/orgs/{org_id}' },
  orgConfirmBusiness: { method: 'POST', path: 'crm/orgs/{org_id}/confirm-business' },
  orgLead: { method: 'POST', path: 'crm/orgs/{org_id}/lead' },
  orgSuppress: { method: 'POST', path: 'crm/orgs/{org_id}/suppress' },
  orgLegal: { method: 'POST', path: 'crm/orgs/{org_id}/legal' },
  orgChannelAdd: { method: 'POST', path: 'crm/orgs/{org_id}/channels' },
  orgChannelRemove: { method: 'DELETE', path: 'crm/orgs/{org_id}/channels/{channel_id}' },
  orgInteraction: { method: 'POST', path: 'crm/orgs/{org_id}/interactions' },
  orgCardImage: { method: 'GET', path: 'crm/orgs/{org_id}/sources/{source_id}/card-image/{side}' },
  // Outreach
  outreachRecipients: { method: 'GET', path: 'crm/orgs/{org_id}/outreach/recipients' },
  outreachPreview: { method: 'POST', path: 'crm/orgs/{org_id}/outreach/preview' },
  outreachApprove: { method: 'POST', path: 'crm/orgs/{org_id}/outreach/approve' },
  outreachSend: { method: 'POST', path: 'crm/orgs/{org_id}/outreach/send' },
  // Relations (person x organisation)
  relationCreate: { method: 'POST', path: 'crm/relations' },
  relationUpdate: { method: 'PATCH', path: 'crm/relations/{relation_id}' },
  relationEnd: { method: 'POST', path: 'crm/relations/{relation_id}/end' },
  relationRoleAdd: { method: 'POST', path: 'crm/relations/{relation_id}/roles' },
  relationRoleRemove: { method: 'DELETE', path: 'crm/relations/{relation_id}/roles/{role}' },
  relationChannelAdd: { method: 'POST', path: 'crm/relations/{relation_id}/channels' },
  relationChannelRemove: { method: 'DELETE', path: 'crm/relations/{relation_id}/channels/{channel_id}' },
  // Channels (owner-neutral)
  channelMove: { method: 'POST', path: 'crm/channels/{channel_id}/move' },
  channelTier: { method: 'PATCH', path: 'crm/channels/{channel_id}' },
  // Review
  reviewList: { method: 'GET', path: 'crm/review' },
  reviewResolve: { method: 'POST', path: 'crm/review/{item_id}/resolve' },
  // Persons
  personList: { method: 'GET', path: 'crm/persons' },
  personCreate: { method: 'POST', path: 'crm/persons' },
  personGet: { method: 'GET', path: 'crm/persons/{person_id}' },
  personUpdate: { method: 'PATCH', path: 'crm/persons/{person_id}' },
  personDelete: { method: 'DELETE', path: 'crm/persons/{person_id}' },
  personChannelAdd: { method: 'POST', path: 'crm/persons/{person_id}/channels' },
  personChannelRemove: { method: 'DELETE', path: 'crm/persons/{person_id}/channels/{channel_id}' },
  personOptOut: { method: 'POST', path: 'crm/persons/{person_id}/opt-out' },
  personExport: { method: 'GET', path: 'crm/persons/{person_id}/export' },
  // Safety settings
  configGet: { method: 'GET', path: 'crm/config' },
  configUpdate: { method: 'PUT', path: 'crm/config' },
} as const satisfies Record<string, { method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; path: string }>

export type CrmRouteName = keyof typeof CRM_ROUTES

/** `'crm/orgs/{org_id}/channels/{channel_id}'` -> `'org_id' | 'channel_id'` */
type PathParams<S extends string> = S extends `${string}{${infer P}}${infer Rest}` ? P | PathParams<Rest> : never
type ParamsOf<N extends CrmRouteName> = PathParams<(typeof CRM_ROUTES)[N]['path']>
type Query = Record<string, string | number | boolean | null | undefined>

/**
 * Path of a route for `crmRequest`/`crmSearch`: `crmPath('orgLead', { org_id: 7 })` -> `'crm/orgs/7/lead'`.
 * Path parameters are checked by the type (a missing or misspelt one does not compile) and URL-encoded; `query` skips
 * null, undefined and empty values but keeps `0` and `false`.
 */
export function crmPath<N extends CrmRouteName>(
  name: N,
  ...args: [ParamsOf<N>] extends [never]
    ? [query?: Query]
    : [params: Record<ParamsOf<N>, string | number>, query?: Query]
): string {
  const hasParams = CRM_ROUTES[name].path.includes('{')
  const params = (hasParams ? args[0] : {}) as Record<string, string | number>
  const query = (hasParams ? args[1] : args[0]) as Query | undefined
  const path = CRM_ROUTES[name].path.replace(/\{([a-z_]+)\}/g, (_, key: string) => {
    const value = params[key]
    if (value === undefined || value === null || value === '') throw new Error(`crmPath(${name}): missing path parameter ${key}`)
    return encodeURIComponent(String(value))
  })
  // encodeURIComponent (space = %20) instead of URLSearchParams ('+'): same wire format as the hand-built URLs before
  const pairs = Object.entries(query ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return pairs.length ? `${path}?${pairs.join('&')}` : path
}
