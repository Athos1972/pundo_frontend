#!/usr/bin/env node
// Records real answers of the CRM person/relation/config API (F7600 CRM-Backbone, org cut, T16 person components and
// T17 settings) as `{status, body}` files next to this script. The Vitest suites crm-person-components.test.tsx,
// crm-birthdate.test.tsx and crm-safety-panel.test.tsx read exactly these files (R1: fixtures from the producer, never
// hand-written); the Playwright specs of T19 may use the same files for `page.route` mocks.
//
// Run against a TEST backend only (slot or 8500), never 8000:
//   source ~/.pundo/worktree-env/slots/slot-3/frontend.env
//   node e2e/fixtures/contracts/crm-persons/record.mjs
// It creates a small, labelled data set ("E2E F7600 T16 …", values under the reserved domain *.example) and changes
// nothing else: the config call writes back the values it has just read.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BACKEND = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://127.0.0.1:8500'
if (/:8000\b/.test(BACKEND)) throw new Error(`refusing to record against ${BACKEND} (production port)`)
const DIR = dirname(fileURLToPath(import.meta.url))
const RUN = new Date().toISOString().replace(/\D/g, '').slice(0, 12)

async function login() {
  const res = await fetch(`${BACKEND}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'e2e-admin@pundo-e2e.io', password: 'E2eAdminPassword!99' }),
  })
  const cookie = res.headers.get('set-cookie') ?? ''
  const token = /admin_token=([^;]+)/.exec(cookie)?.[1]
  if (!token) throw new Error(`admin login failed: ${res.status}`)
  return token
}

const token = await login()

async function call(method, path, body) {
  const res = await fetch(`${BACKEND}/api/v1/admin/crm/${path}`, {
    method,
    headers: { Cookie: `admin_token=${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

function save(name, answer, expectStatus) {
  if (answer.status !== expectStatus) {
    throw new Error(`${name}: expected ${expectStatus}, got ${answer.status} ${JSON.stringify(answer.body)}`)
  }
  writeFileSync(join(DIR, `${name}.json`), `${JSON.stringify(answer, null, 2)}\n`)
  console.log(`recorded ${name}.json (${answer.status})`)
  return answer.body
}

// Organisations: A is the employer with an org channel, B the former employer (ended relation)
const orgA = save('org-create', await call('POST', 'orgs', {
  name: `E2E F7600 T16 Taverna Kyma ${RUN}`, city: 'Larnaca', as_lead: false,
  channels: [{ kind: 'email', value: `info@t16-kyma-${RUN}.example` }], source: { source: 'manual' },
}), 201)
const orgB = (await call('POST', 'orgs', {
  name: `E2E F7600 T16 Cafe Limani ${RUN}`, city: 'Limassol', as_lead: false, channels: [], source: { source: 'manual' },
})).body
const orgChannelId = orgA.channels[0].id

// Persons: derived name with unknown birth year on 29 Feb; free name; free name with known year, later split
const maria = save('person-create-derived', await call('POST', 'persons', {
  first_name: 'Maria', last_name: 'Georgiou', salutation: 'ms', birth_date: '2000-02-29',
  birth_year_unknown: true, channels: [{ kind: 'email', value: `maria.private@t16-${RUN}.example` }],
}), 201)
const eleni = save('person-create-free', await call('POST', 'persons', { display_name: 'Γεωργίου Ελένη' }), 201)
const andreas = (await call('POST', 'persons', { display_name: `Andreas K. ${RUN}`, birth_date: '1987-03-14' })).body

// Relations: two roles + note + preferred org channel; without role (201, not 422); ended relation
const relA = save('relation-create', await call('POST', 'relations', {
  person_id: maria.id, org_id: orgA.id, note: 'Region West', roles: ['manager', 'accountant'],
  preferred_channel_id: orgChannelId,
}), 201)
save('relation-channel-add', await call('POST', `relations/${relA.id}/channels`, {
  kind: 'email', value: `maria@t16-kyma-${RUN}.example`,
}), 201)
save('relation-create-without-role', await call('POST', 'relations', { person_id: eleni.id, org_id: orgA.id }), 201)
const relB = save('relation-create-ended', await call('POST', 'relations', {
  person_id: maria.id, org_id: orgB.id, valid_from: '2024-01-01', valid_to: '2025-06-30', roles: ['owner'],
}), 201)

// Conflicts the person components handle
save('person-channel-exists', await call('POST', 'persons', {
  display_name: `Duplicate ${RUN}`, channels: [{ kind: 'email', value: `maria.private@t16-${RUN}.example` }],
}), 409)
save('relation-channel-owned-by-org', await call('POST', `relations/${relA.id}/channels`, {
  kind: 'email', value: `info@t16-kyma-${RUN}.example`,
}), 422)
save('relation-channel-exists-same-person', await call('POST', `relations/${relB.id}/channels`, {
  kind: 'email', value: `maria@t16-kyma-${RUN}.example`,
}), 409)
save('relation-role-exists', await call('POST', `relations/${relA.id}/roles`, { role: 'manager' }), 409)
save('person-display-name-derived', await call('PATCH', `persons/${maria.id}`, { display_name: 'Someone else' }), 422)
save('person-birth-date-invalid', await call('PATCH', `persons/${eleni.id}`, { birth_year_unknown: true }), 422)

// Splitting a free name: the derivation replaces it (AC 32)
save('person-patch-derive', await call('PATCH', `persons/${andreas.id}`, {
  first_name: 'Andreas', last_name: `Konstantinou ${RUN}`,
}), 200)

// Reads the pages render
save('person-detail', await call('GET', `persons/${maria.id}`), 200)
save('person-list', await call('GET', `persons?q=${encodeURIComponent('Maria Georgiou')}&limit=5`), 200)
save('org-detail-with-relations', await call('GET', `orgs/${orgA.id}`), 200)

// Settings (T17): read, then write back the same values (records the PUT answer without changing anything)
const config = save('config', await call('GET', 'config'), 200)
save('config-put', await call('PUT', 'config', {
  owner_optout_rule: config.owner_optout_rule,
  require_human_approval_for_tier: config.require_human_approval_for_tier,
}), 200)

console.log(`done: org ${orgA.id}/${orgB.id}, persons ${maria.id}/${eleni.id}/${andreas.id} (run ${RUN})`)
