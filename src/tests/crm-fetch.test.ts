import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crmDelete, crmPatch, crmPost, crmPut, crmRequest, CRM_ERROR_KEYS } from '@/components/system-admin/crm/crmFetch'
import { showToast } from '@/components/system-admin/Toast'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { errorBody } from './helpers/crm-fixtures'

vi.mock('@/components/system-admin/Toast', () => ({ showToast: vi.fn() }))

const tr = tSysAdmin('en')
const el = tSysAdmin('el')
const answer = (status: number, body?: unknown) => ({ status, ok: status < 400, json: async () => { if (body === undefined) throw new Error('no body'); return body } })
const stub = (status: number, body?: unknown) => {
  const fetchMock = vi.fn().mockResolvedValue(answer(status, body))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => vi.mocked(showToast).mockClear())
afterEach(() => vi.unstubAllGlobals())

describe('crmRequest: 409 with a known code shows its own text (org cut)', () => {
  it.each([
    ['channel_exists_same_person', { channel_id: 12 }, tr.crm_err_channel_exists_same_person],
    ['person_channel_exists', { person_id: 17 }, tr.crm_err_person_channel_exists],
    ['relation_active_exists', undefined, tr.crm_err_relation_active_exists],
    ['relation_role_exists', undefined, tr.crm_err_relation_role_exists],
  ])('%s -> own toast, code and extras returned to the caller', async (code, extras, text) => {
    stub(409, errorBody(code, extras))
    const result = await crmPost('crm/relations/5/roles', { role: 'owner' }, tr)
    expect(result).toMatchObject({ ok: false, status: 409, code })
    expect(result.extras).toEqual(extras)
    expect(showToast).toHaveBeenCalledOnce()
    expect(showToast).toHaveBeenCalledWith(text, 'error')
    expect(text).not.toBe(tr.crm_err_conflict)
  })

  it('version_conflict keeps the "changed by someone else" text and returns current_version', async () => {
    stub(409, errorBody('version_conflict', { current_version: 7 }))
    const result = await crmPost('crm/orgs/41/lead', {}, tr)
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_conflict, 'error')
    expect(result).toMatchObject({ status: 409, code: 'version_conflict', extras: { current_version: 7 } })
  })

  it.each([
    ['unknown code', errorBody('something_new')],
    ['empty object', {}],
    ['no JSON body', undefined],
    ['validation list', { detail: [{ loc: ['body'], msg: 'x' }] }],
  ])('409 with %s -> generic conflict text', async (_name, body) => {
    stub(409, body)
    const result = await crmPost('crm/orgs/41/lead', {}, tr)
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_conflict, 'error')
    expect(result.status).toBe(409)
    expect(result.ok).toBe(false)
  })
})

describe('crmRequest: 422 codes and the {tier} placeholder', () => {
  it('send gate: the text carries the translated tier from the error body (EN and EL, T18)', async () => {
    stub(422, errorBody('outreach_tier_approval_required', { tier: 'red' }))
    const result = await crmPost('crm/orgs/41/outreach/send', {}, tr)
    expect(showToast).toHaveBeenLastCalledWith('Legal tier Red: sending only after admin approval.', 'error')
    expect(result).toMatchObject({ status: 422, code: 'outreach_tier_approval_required', extras: { tier: 'red' } })
    stub(422, errorBody('outreach_tier_approval_required', { tier: 'amber' }))
    await crmPost('crm/orgs/41/outreach/send', {}, el)
    expect(showToast).toHaveBeenLastCalledWith('Νομική βαθμίδα Πορτοκαλί: αποστολή μόνο μετά από έγκριση διαχειριστή.', 'error')
    expect(vi.mocked(showToast).mock.calls.at(-1)![0]).not.toContain('{tier}')
  })

  it('an unknown tier value from the backend stays visible raw', async () => {
    stub(422, errorBody('outreach_tier_approval_required', { tier: 'purple' }))
    await crmPost('crm/orgs/41/outreach/send', {}, tr)
    expect(showToast).toHaveBeenLastCalledWith('Legal tier purple: sending only after admin approval.', 'error')
  })

  it('a placeholder without a value in the body stays visible instead of vanishing', async () => {
    stub(422, errorBody('outreach_tier_approval_required'))
    await crmPost('crm/orgs/41/outreach/send', {}, tr)
    expect(showToast).toHaveBeenLastCalledWith(tr.crm_err_tier_approval_required, 'error')
  })

  it.each([
    ['outreach_approval_not_required', { tier: 'green' }, tr.crm_err_approval_not_required.replace('{tier}', tr.crm_tier_green)],
    ['outreach_approval_reason_required', undefined, tr.crm_err_approval_reason_required],
    ['channel_owned_by_org', { channel_id: 11 }, tr.crm_err_channel_owned_by_org],
    ['channel_owned_by_other_person', undefined, tr.crm_err_channel_owned_by_other_person],
    ['org_parent_has_children', undefined, tr.crm_err_org_parent_has_children],
    ['person_display_name_derived', undefined, tr.crm_err_person_display_name_derived],
    ['person_birth_date_invalid', undefined, tr.crm_err_person_birth_date_invalid],
    ['relation_dates_invalid', undefined, tr.crm_err_relation_dates_invalid],
    ['invalid_channel_value', undefined, tr.crm_err_invalid_channel_value],
  ])('%s -> its text', async (code, extras, text) => {
    stub(422, errorBody(code, extras))
    await crmPost('crm/x', {}, tr)
    expect(showToast).toHaveBeenCalledWith(text, 'error')
  })

  it('422 with an unknown code -> generic text, the code is still returned for the caller', async () => {
    stub(422, errorBody('something_new'))
    const result = await crmPost('crm/x', {}, tr)
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_generic, 'error')
    expect(result.code).toBe('something_new')
  })

  it.each([
    ['validation list', { detail: [{ loc: ['body', 'x'], msg: 'bad', type: 'value_error' }] }],
    ['no JSON body', undefined],
  ])('422 with %s -> generic text, no code', async (_name, body) => {
    stub(422, body)
    const result = await crmPost('crm/x', {}, tr)
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_generic, 'error')
    expect(result.code).toBeUndefined()
  })
})

describe('crmRequest: options.silent (the caller shows a dialog instead of a toast)', () => {
  it('silent code: no toast, but code and extras are returned', async () => {
    stub(409, errorBody('channel_exists_same_person', { channel_id: 12 }))
    const result = await crmPost('crm/persons/17/channels', { kind: 'email', value: 'a@b.cy' }, tr, { silent: ['channel_exists_same_person'] })
    expect(showToast).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: false, status: 409, code: 'channel_exists_same_person', extras: { channel_id: 12 } })
  })

  it('last_channel (422) can be handled by a dialog the same way', async () => {
    stub(422, errorBody('last_channel'))
    const result = await crmDelete('crm/orgs/41/channels/11', tr, { silent: ['last_channel'] })
    expect(showToast).not.toHaveBeenCalled()
    expect(result).toMatchObject({ status: 422, code: 'last_channel' })
  })

  it('a code that is not in the list still gets its toast', async () => {
    stub(422, errorBody('suppressed', { channel_kind: 'email' }))
    await crmPost('crm/orgs/41/channels', {}, tr, { silent: ['last_channel'] })
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_suppressed, 'error')
  })

  it('the options reach crmPatch, crmPut and crmDelete', async () => {
    for (const call of [
      () => crmPatch('crm/x', {}, tr, { silent: ['suppressed'] }),
      () => crmPut('crm/x', {}, tr, { silent: ['suppressed'] }),
      () => crmDelete('crm/x', tr, { silent: ['suppressed'] }),
    ]) {
      stub(422, errorBody('suppressed'))
      await call()
    }
    expect(showToast).not.toHaveBeenCalled()
  })
})

describe('crmRequest: other statuses', () => {
  it('404 keeps the "not found" text and also returns the code', async () => {
    stub(404, errorBody('org_not_found'))
    const result = await crmPost('crm/orgs/999/lead', {}, tr)
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_not_found, 'error')
    expect(result).toMatchObject({ status: 404, code: 'org_not_found' })
  })

  it.each([[423, 'outreach_paused', 'crm_err_paused'], [429, 'send_cap_reached', 'crm_err_cap'], [502, 'smtp_failed', 'crm_err_send_failed']] as const)(
    '%i %s -> status text (the code does not change it)', async (status, code, key) => {
      stub(status, errorBody(code, { cap: 50 }))
      const result = await crmPost('crm/orgs/41/outreach/send', {}, tr)
      expect(showToast).toHaveBeenCalledWith(tr[key], 'error')
      expect(result).toMatchObject({ status, code })
    })

  it('403 detail is a text, not a code: no code is returned', async () => {
    stub(403, { detail: 'Not enough permissions' })
    const result = await crmPost('crm/orgs/41/outreach/approve', {}, tr)
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_forbidden, 'error')
    expect(result).toEqual({ ok: false, status: 403 })
  })

  it('network error -> generic text, no status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    expect(await crmPost('crm/x', {}, tr)).toEqual({ ok: false })
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_generic, 'error')
  })

  it('500 without a mapping -> generic text', async () => {
    stub(500, {})
    expect(await crmPost('crm/x', {}, tr)).toMatchObject({ ok: false, status: 500 })
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_generic, 'error')
  })

  it('success: request goes to the proxy with method and JSON body; 204 has no data', async () => {
    const fetchMock = stub(201, { id: 5 })
    const ok = await crmRequest<{ id: number }>('PUT', 'crm/config', { owner_optout_rule: false, require_human_approval_for_tier: ['red', 'amber'] }, tr)
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/crm/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_optout_rule: false, require_human_approval_for_tier: ['red', 'amber'] }),
    })
    expect(ok).toEqual({ ok: true, data: { id: 5 }, status: 201 })
    const empty = stub(204)
    expect(await crmDelete('crm/persons/17', tr)).toEqual({ ok: true, data: undefined, status: 204 })
    expect(empty).toHaveBeenCalledWith('/api/admin/crm/persons/17', { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
    expect(showToast).not.toHaveBeenCalled()
  })
})

describe('CRM_ERROR_KEYS', () => {
  it('maps the codes the removed contact model raised to nothing (they are gone, not silently generic)', () => {
    for (const gone of ['contact_not_found', 'person_role_not_found', 'invalid_role_dates', 'invalid_identifier_kind', 'person_identifier_required', 'person_identifier_exists']) {
      expect(gone in CRM_ERROR_KEYS, gone).toBe(false)
    }
  })
})
