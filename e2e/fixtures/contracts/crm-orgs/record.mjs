#!/usr/bin/env node
// Records real answers of the CRM organisation API (F7600 CRM-Backbone, org cut, T14 org routes and T15 org components) as
// `{status, body}` files next to this script. The Vitest suites system-admin-pages.test.tsx, system-admin-crm-components
// .test.tsx and crm-outreach-gate.test.tsx read exactly these files through src/tests/helpers/crm-recorded.ts (R1: fixtures
// from the producer, never hand-written); the Playwright specs of T19 may use the same files for `page.route` mocks.
//
// Run against a TEST backend only (worktree slot or 8500), never 8000:
//   source ~/.pundo/worktree-env/slots/slot-3/frontend.env
//   node e2e/fixtures/contracts/crm-orgs/record.mjs
// It creates a small, labelled data set ("E2E F7600 T15 … <run>", values under the reserved domain *.example), sends ONE
// outreach mail (it lands in the slot mail sink) and, through psql on the slot database, adds what the API cannot create:
// a card image key on one source and one legacy review item (fictitious name). Review lists are filtered to the
// organisations of this run before saving, so no other (prod copy) data ends up in the repository.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BACKEND = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://127.0.0.1:8500'
if (/:8000\b/.test(BACKEND)) throw new Error(`refusing to record against ${BACKEND} (production port)`)
const DB_URL = (process.env.DATABASE_URL_TEST ?? '').replace('postgresql+psycopg://', 'postgresql://')
const DB_NAME = /\/([^/?]+)(\?|$)/.exec(DB_URL)?.[1] ?? ''
if (!DB_NAME || DB_NAME === 'pundo') throw new Error(`refusing to write into database "${DB_NAME}" (set DATABASE_URL_TEST of a slot)`)
const DIR = dirname(fileURLToPath(import.meta.url))
const RUN = new Date().toISOString().replace(/\D/g, '').slice(0, 12)
const DIGITS = RUN.slice(-7)
const DOMAIN = `t15-${RUN}.example`

async function login() {
  const res = await fetch(`${BACKEND}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'e2e-admin@pundo-e2e.io', password: 'E2eAdminPassword!99' }),
  })
  const token = /admin_token=([^;]+)/.exec(res.headers.get('set-cookie') ?? '')?.[1]
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

function must(name, answer, expectStatus) {
  if (answer.status !== expectStatus) throw new Error(`${name}: expected ${expectStatus}, got ${answer.status} ${JSON.stringify(answer.body)}`)
  return answer.body
}

function sql(statement) {
  execFileSync('psql', [DB_URL, '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-q', '-c', statement], { stdio: 'inherit' })
}

// ─── Organisations: head office, branch (the main org), plain master data without lead ────────────────────────────────
const head = save('org-create-head', await call('POST', 'orgs', {
  name: `E2E F7600 T15 Ocean Basket Head Office ${RUN}`, city: 'Nicosia', as_lead: true,
  channels: [{ kind: 'email', value: `info@hq.${DOMAIN}` }], source: { source: 'manual' },
}), 201)
const org = save('org-create', await call('POST', 'orgs', {
  name: `E2E F7600 T15 Alpha Bakery ${RUN}`, legal_name: 'Alpha Bakery Ltd', city: 'Larnaca', category: 'bakery', as_lead: true,
  channels: [{ kind: 'email', value: `info@alpha.${DOMAIN}` }, { kind: 'phone', value: `+3572${DIGITS}` }],
  source: { source: 'business_card', source_ref: `t15-${RUN}` },
}), 201)
const orgMail = () => org.channels.find((c) => c.kind === 'email')
const plain = save('org-create-no-lead', await call('POST', 'orgs', {
  name: `E2E F7600 T15 Beta Tax Office ${RUN}`, city: 'Limassol', as_lead: false, channels: [], source: { source: 'manual' },
}), 201)

// Head office (one level): assign, then the three refusals
save('org-patch-parent', await call('PATCH', `orgs/${org.id}`, { parent_org_id: head.id }), 200)
save('org-parent-self', await call('PATCH', `orgs/${plain.id}`, { parent_org_id: plain.id }), 422)
save('org-parent-has-parent', await call('PATCH', `orgs/${plain.id}`, { parent_org_id: org.id }), 422)
save('org-parent-has-children', await call('PATCH', `orgs/${head.id}`, { parent_org_id: plain.id }), 422)

// ─── Persons and relations ────────────────────────────────────────────────────────────────────────────────────────────
const maria = must('person maria', await call('POST', 'persons', {
  first_name: 'Maria', last_name: `Georgiou ${RUN}`, channels: [{ kind: 'email', value: `maria.private@${DOMAIN}` }],
}), 201)
const eleni = must('person eleni', await call('POST', 'persons', { display_name: `Eleni T15 ${RUN}` }), 201)

const relA = must('relation maria-alpha', await call('POST', 'relations', {
  person_id: maria.id, org_id: org.id, roles: ['owner'], note: 'Region West',
}), 201)
const relWork = must('relation channel maria', await call('POST', `relations/${relA.id}/channels`, {
  kind: 'email', value: `maria@alpha.${DOMAIN}`,
}), 201).channels.find((c) => c.value_normalized === `maria@alpha.${DOMAIN}`)
const relB = must('relation eleni-alpha', await call('POST', 'relations', { person_id: eleni.id, org_id: org.id }), 201)
must('relation channel eleni', await call('POST', `relations/${relB.id}/channels`, { kind: 'phone', value: `+3579${DIGITS}` }), 201)
const relC = must('relation maria-beta', await call('POST', 'relations', { person_id: maria.id, org_id: plain.id, roles: ['accountant'] }), 201)
const betaMail = must('relation channel maria beta', await call('POST', `relations/${relC.id}/channels`, {
  kind: 'email', value: `maria@beta.${DOMAIN}`,
}), 201).channels.find((c) => c.value_normalized === `maria@beta.${DOMAIN}`)

// ─── Channel conflicts the ChannelEditor handles ──────────────────────────────────────────────────────────────────────
save('org-channel-add', await call('POST', `orgs/${org.id}/channels`, { kind: 'whatsapp', value: `+3579${DIGITS.slice(1)}1` }), 201)
save('org-channel-duplicate', await call('POST', `orgs/${org.id}/channels`, { kind: 'email', value: `info@alpha.${DOMAIN}` }), 422)
save('org-channel-owned-by-other-person', await call('POST', `orgs/${org.id}/channels`, {
  kind: 'email', value: `maria@alpha.${DOMAIN}`,
}), 422)
save('relation-channel-owned-by-org', await call('POST', `relations/${relA.id}/channels`, {
  kind: 'email', value: `info@alpha.${DOMAIN}`,
}), 422)
save('relation-channel-owned-by-other-person', await call('POST', `relations/${relB.id}/channels`, {
  kind: 'email', value: `maria@alpha.${DOMAIN}`,
}), 422)
save('relation-channel-exists-same-person', await call('POST', `relations/${relA.id}/channels`, {
  kind: 'email', value: `maria@beta.${DOMAIN}`,
}), 409)
save('relation-update-preferred', await call('PATCH', `relations/${relA.id}`, { preferred_channel_id: orgMail().id }), 200)
save('channel-move-to-person', await call('POST', `channels/${betaMail.id}/move`, { owner: { type: 'person', id: maria.id } }), 200)
const headChannel = head.channels[0]
save('org-channel-remove-last', await call('DELETE', `orgs/${head.id}/channels/${headChannel.id}`), 422)
save('channel-tier-red', await call('PATCH', `channels/${relWork.id}`, { legal_tier: 'red' }), 200)

// ─── Outreach and send gate ───────────────────────────────────────────────────────────────────────────────────────────
save('outreach-recipients', await call('GET', `orgs/${org.id}/outreach/recipients`), 200)
save('outreach-preview-gate-red', await call('POST', `orgs/${org.id}/outreach/preview`, {
  language: 'en', template_id: 'first_contact_email', recipient_channel_id: relWork.id,
}), 200)
save('outreach-preview-default', await call('POST', `orgs/${org.id}/outreach/preview`, {
  language: 'el', template_id: 'first_contact_email',
}), 200)
save('outreach-send-tier-approval-required', await call('POST', `orgs/${org.id}/outreach/send`, {
  language: 'en', subject: 'Hello', body: 'Test body', idempotency_key: `t15-blocked-${RUN}`, recipient_channel_id: relWork.id,
}), 422)
save('outreach-approve-reason-required', await call('POST', `orgs/${org.id}/outreach/approve`, {
  recipient_channel_id: relWork.id, reason: 'short',
}), 422)
save('outreach-approve-not-required', await call('POST', `orgs/${org.id}/outreach/approve`, {
  recipient_channel_id: orgMail().id, reason: 'Recorded by the T15 fixture script',
}), 422)
save('outreach-approve', await call('POST', `orgs/${org.id}/outreach/approve`, {
  recipient_channel_id: relWork.id, reason: 'Owner asked for the offer at the trade fair',
}), 201)
save('outreach-recipients-approved', await call('GET', `orgs/${org.id}/outreach/recipients`), 200)
save('outreach-preview-approved', await call('POST', `orgs/${org.id}/outreach/preview`, {
  language: 'en', template_id: 'first_contact_email', recipient_channel_id: relWork.id,
}), 200)
save('outreach-send', await call('POST', `orgs/${org.id}/outreach/send`, {
  language: 'en', subject: 'Hello from pundo', body: 'Test body (T15 fixture)', idempotency_key: `t15-sent-${RUN}`,
  recipient_channel_id: relWork.id,
}), 201)

// ─── Lead actions ─────────────────────────────────────────────────────────────────────────────────────────────────────
save('org-interaction', await call('POST', `orgs/${org.id}/interactions`, {
  kind: 'call', channel: 'phone', direction: 'out', content: 'Called about the offer', relation_id: relA.id,
}), 201)
const before = must('org before lead', await call('GET', `orgs/${org.id}`), 200)
save('org-lead-transition', await call('POST', `orgs/${org.id}/lead`, { to_state: 'ENRICHED', lead_version: before.lead.version }), 200)
save('org-lead-version-conflict', await call('POST', `orgs/${org.id}/lead`, { to_state: 'QUEUED', lead_version: before.lead.version }), 409)
save('org-lead-illegal-transition', await call('POST', `orgs/${org.id}/lead`, { to_state: 'CONTACTED', lead_version: before.lead.version + 1 }), 422)
const plainNow = save('org-detail-no-lead', await call('GET', `orgs/${plain.id}`), 200)
save('org-legal', await call('POST', `orgs/${plain.id}/legal`, { effective_legal_tier: 'amber', lead_version: plainNow.lead.version }), 200)

// ─── Review: owner conflict (API), legacy case and card image (slot database, fictitious values) ─────────────────────
const conflict = save('org-create-owner-conflict', await call('POST', 'orgs', {
  name: `E2E F7600 T15 Gamma Kiosk ${RUN}`, city: 'Paphos', as_lead: true,
  channels: [{ kind: 'email', value: `maria.private@${DOMAIN}` }], source: { source: 'manual' },
}), 201)
sql(`INSERT INTO crm_review_item (kind, org_id, payload, status) VALUES ('legacy_contact_name', ${org.id}, '{"display_name": "Andreas T15 Fixture", "role_title": "Shop manager"}'::jsonb, 'open')`)
sql(`UPDATE crm_org_source SET card_image_front_key = 'e2e/t15-${RUN}-front.jpg', card_image_back_key = 'e2e/t15-${RUN}-back.jpg' WHERE org_id = ${org.id}`)

const mine = new Set([head.id, org.id, plain.id, conflict.id])
const minePersons = new Set([maria.id, eleni.id])
for (const category of ['legacy', 'channel_owner', 'relations_without_role', 'persons_name_parts']) {
  const page = must(`review ${category}`, await call('GET', `review?category=${category}&limit=200`), 200)
  const items = page.items.filter((item) => (item.org && mine.has(item.org.id)) || (!item.org && item.person && minePersons.has(item.person.id)))
  if (items.length === 0) throw new Error(`review ${category}: no item of this run`)
  save(`review-${category.replaceAll('_', '-')}`, { status: 200, body: { ...page, items, total: items.length, offset: 0 } }, 200)
}
const legacyItem = must('review legacy', await call('GET', 'review?category=legacy&limit=200'), 200).items.find((item) => item.org?.id === org.id)
save('review-resolve', await call('POST', `review/${legacyItem.id}/resolve`, { status: 'resolved' }), 200)

// ─── Reads the pages render ───────────────────────────────────────────────────────────────────────────────────────────
save('org-detail', await call('GET', `orgs/${org.id}`), 200)
save('org-detail-head', await call('GET', `orgs/${head.id}`), 200)
save('org-list', await call('GET', `orgs?q=${RUN}&limit=50`), 200)
save('org-list-lead-only', await call('GET', `orgs?q=${RUN}&lead_only=true&limit=50`), 200)
save('org-search-parent-candidates', await call('GET', `orgs/search?q=${RUN}&parent_candidates_only=true&exclude_id=${plain.id}`), 200)
save('org-not-found', await call('GET', 'orgs/999999999'), 404)

console.log(`done: orgs ${head.id}/${org.id}/${plain.id}/${conflict.id}, persons ${maria.id}/${eleni.id} (run ${RUN})`)
