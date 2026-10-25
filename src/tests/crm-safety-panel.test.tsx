// F7600 CRM-Backbone, org cut, T17: settings page panel with the owner rule (E3, `owner_optout_rule`, default on) and
// the legal tiers that need an admin approval before sending (EA9, `require_human_approval_for_tier`, default ['red']).
// The backend answers are the recorded GET/PUT /admin/crm/config of the slot backend (e2e/fixtures/contracts/crm-persons).
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SafetyPanel } from '@/components/system-admin/crm/SafetyPanel'
import { showToast } from '@/components/system-admin/Toast'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { rec, recorded } from './helpers/crm-person-recorded'
import type { CrmConfigOut } from '@/types/system-admin'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }))
vi.mock('@/components/system-admin/Toast', () => ({ showToast: vi.fn() }))

const en = tSysAdmin('en')
const el = tSysAdmin('el')

afterEach(() => { vi.unstubAllGlobals(); refresh.mockReset(); vi.mocked(showToast).mockReset() })

function stubPut(answer = recorded<CrmConfigOut>('config-put')) {
  const mock = vi.fn(async () => new Response(JSON.stringify(answer.body), { status: answer.status }))
  vi.stubGlobal('fetch', mock)
  return mock
}
const putBody = (mock: ReturnType<typeof stubPut>) => {
  const [url, init] = mock.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe('/api/admin/crm/config')
  expect(init.method).toBe('PUT')
  return JSON.parse(String(init.body))
}
const tierBox = (label: string) => screen.getByLabelText(label) as HTMLInputElement

describe('SafetyPanel: owner rule and approval tiers', () => {
  it('recorded default config: owner rule on, only "Red" needs an approval', () => {
    const config = rec.config()
    expect(config.owner_optout_rule).toBe(true)
    expect(config.require_human_approval_for_tier).toEqual(['red'])
    render(<SafetyPanel config={config} canWrite tr={en} />)
    expect((screen.getByLabelText(en.crm_owner_rule_label) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText(en.crm_owner_rule_on)).toBeTruthy()
    expect([tierBox('Green').checked, tierBox('Amber').checked, tierBox('Red').checked]).toEqual([false, false, true])
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('save sends both new values together with kill switch and cap (PUT /config)', async () => {
    const config = rec.config()
    const mock = stubPut()
    render(<SafetyPanel config={config} canWrite tr={en} />)
    fireEvent.click(screen.getByRole('button', { name: en.crm_safety_save }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(putBody(mock)).toEqual({
      outbound_kill_switch: config.outbound_kill_switch,
      send_caps: { email: config.send_caps.email.limit },
      owner_optout_rule: true,
      require_human_approval_for_tier: ['red'],
    })
    expect(showToast).toHaveBeenCalledWith(en.crm_safety_saved, 'success')
  })

  it('owner rule off and amber added: sends false and the tiers in the order green < amber < red', async () => {
    const mock = stubPut()
    render(<SafetyPanel config={rec.config()} canWrite tr={en} />)
    fireEvent.click(screen.getByLabelText(en.crm_owner_rule_label))
    expect(screen.getByText(en.crm_owner_rule_off)).toBeTruthy()
    fireEvent.click(tierBox('Amber'))
    fireEvent.click(screen.getByRole('button', { name: en.crm_safety_save }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(putBody(mock)).toMatchObject({ owner_optout_rule: false, require_human_approval_for_tier: ['amber', 'red'] })
  })

  it('no tier at all is allowed but shows a warning, and sends an empty list', async () => {
    const mock = stubPut()
    render(<SafetyPanel config={rec.config()} canWrite tr={en} />)
    fireEvent.click(tierBox('Red'))
    expect(screen.getByRole('status').textContent).toBe(en.crm_approval_tiers_none)
    fireEvent.click(screen.getByRole('button', { name: en.crm_safety_save }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(putBody(mock).require_human_approval_for_tier).toEqual([])
  })

  it('a stored config is shown as stored (owner rule off, green + red)', () => {
    render(<SafetyPanel config={{ ...rec.config(), owner_optout_rule: false, require_human_approval_for_tier: ['green', 'red'] }} canWrite tr={en} />)
    expect((screen.getByLabelText(en.crm_owner_rule_label) as HTMLInputElement).checked).toBe(false)
    expect([tierBox('Green').checked, tierBox('Amber').checked, tierBox('Red').checked]).toEqual([true, false, true])
  })

  it('failed save (403) shows no success and does not refresh', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"detail":"Forbidden"}', { status: 403 })))
    render(<SafetyPanel config={rec.config()} canWrite tr={en} />)
    fireEvent.click(screen.getByRole('button', { name: en.crm_safety_save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(en.crm_err_forbidden, 'error'))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('without crm:config:write: everything disabled, no save button', () => {
    render(<SafetyPanel config={rec.config()} canWrite={false} tr={en} />)
    expect((screen.getByLabelText(en.crm_owner_rule_label) as HTMLInputElement).disabled).toBe(true)
    expect(tierBox('Red').disabled).toBe(true)
    expect(screen.queryByRole('button', { name: en.crm_safety_save })).toBeNull()
    expect(screen.getByText(en.crm_safety_no_permission)).toBeTruthy()
  })

  it('Greek labels', () => {
    render(<SafetyPanel config={rec.config()} canWrite tr={el} />)
    expect(screen.getByText(el.crm_owner_rule_title)).toBeTruthy()
    expect(screen.getByText(el.crm_approval_tiers_title)).toBeTruthy()
    expect((screen.getByLabelText('Κόκκινη') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Πορτοκαλί') as HTMLInputElement).checked).toBe(false)
  })
})
