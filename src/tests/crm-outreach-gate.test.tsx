// Send gate in the outreach composer (F7600 CRM-Backbone, org cut, EA9 legal tier red; AC 49/50/51, Architektur §7/§11).
// Recipients, preview gate, approval and the 422 answers are the recorded files of e2e/fixtures/contracts/crm-orgs
// (src/tests/helpers/crm-recorded.ts): the red recipient is a relation mail whose channel tier was set to red in the slot.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { recorded, rec } from './helpers/crm-recorded'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh, replace: vi.fn() }) }))
vi.mock('@/components/system-admin/Toast', () => ({ showToast: vi.fn() }))

import { showToast } from '@/components/system-admin/Toast'
import { OutreachComposer } from '@/components/system-admin/crm/OutreachComposer'

const tr = tSysAdmin('en')
const trEl = tSysAdmin('el')
const mockFetch = vi.fn()
const res = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const answer = (name: string) => { const r = recorded(name); return res(r.status, r.body) }
const body = (i: number) => JSON.parse(mockFetch.mock.calls[i][1].body)

beforeEach(() => {
  refresh.mockReset(); mockFetch.mockReset(); vi.mocked(showToast).mockClear()
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

const org = rec.orgDetail()
const recipients = rec.recipients()
const red = recipients.find((r) => r.approval_required)!
const green = recipients.find((r) => r.is_default)!

async function setup(props: Partial<Parameters<typeof OutreachComposer>[0]> = {}) {
  const user = userEvent.setup()
  render(<OutreachComposer org={org} recipients={recipients} tr={tr} canSend canApprove {...props} />)
  return user
}
async function chooseRedAndWrite(user: ReturnType<typeof userEvent.setup>, t = tr) {
  await user.selectOptions(screen.getByLabelText(t.crm_outreach_recipient), String(red.channel_id))
  await user.type(screen.getByLabelText(t.crm_composer_subject), 'Hello')
  await user.type(screen.getByLabelText(t.crm_composer_body), 'Text')
}
const sendButton = (t = tr) => screen.getByRole('button', { name: t.crm_composer_send }) as HTMLButtonElement

describe('send gate (legal tier)', () => {
  it('the recording has a red recipient that needs an approval and a green default that does not', () => {
    expect(red.effective_tier).toBe('red')
    expect(red.approval_open).toBe(false)
    expect(green.approval_required).toBe(false)
  })

  it.each([['en', tr], ['el', trEl]] as const)('red recipient without approval: warning box, tier badge, "Send" disabled (%s, AC 49)', async (_lang, t) => {
    const user = userEvent.setup()
    render(<OutreachComposer org={org} recipients={recipients} tr={t} canSend canApprove />)
    await chooseRedAndWrite(user, t)
    const gate = screen.getByTestId('crm-outreach-gate')
    expect(gate.getAttribute('role')).toBe('alert')
    expect(within(gate).getByText(t.crm_err_tier_approval_required.replace('{tier}', t.crm_tier_red))).toBeTruthy()
    expect(screen.getByTestId('crm-outreach-tier').textContent).toBe(t.crm_outreach_tier.replace('{tier}', t.crm_tier_red))
    expect(sendButton(t).disabled).toBe(true)
    await user.click(sendButton(t))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('green default recipient: no gate box, "Send" enabled', async () => {
    const user = await setup()
    await user.type(screen.getByLabelText(tr.crm_composer_subject), 'Hello')
    await user.type(screen.getByLabelText(tr.crm_composer_body), 'Text')
    expect(screen.queryByTestId('crm-outreach-gate')).toBeNull()
    expect(sendButton().disabled).toBe(false)
  })

  it('with crm:send_approve: approve dialog with mandatory reason (10..500), then "approved by … until …" and sending works (AC 50)', async () => {
    const approval = recorded<{ approved_by: string; expires_at: string }>('outreach-approve')
    mockFetch.mockResolvedValueOnce(res(approval.status, approval.body)).mockResolvedValueOnce(answer('outreach-send'))
    const user = await setup()
    await chooseRedAndWrite(user)
    await user.click(within(screen.getByTestId('crm-outreach-gate')).getByRole('button', { name: tr.crm_outreach_approve }))
    const dialog = screen.getByRole('dialog', { name: tr.crm_outreach_approve_title })
    const confirm = within(dialog).getByRole('button', { name: tr.crm_outreach_approve }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    await user.type(within(dialog).getByLabelText(tr.crm_outreach_approve_reason), 'too short')
    expect(confirm.disabled).toBe(true)
    await user.type(within(dialog).getByLabelText(tr.crm_outreach_approve_reason), ' — owner asked for it')
    expect(confirm.disabled).toBe(false)
    await user.click(confirm)
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(mockFetch.mock.calls[0][0]).toBe(`/api/admin/crm/orgs/${org.id}/outreach/approve`)
    expect(body(0)).toEqual({ recipient_channel_id: red.channel_id, reason: 'too short — owner asked for it' })
    const gate = screen.getByTestId('crm-outreach-gate')
    expect(gate.getAttribute('role')).toBe('status')
    expect(gate.textContent).toContain(tr.crm_outreach_approved.split('{by}')[0] + approval.body.approved_by)
    expect(sendButton().disabled).toBe(false)
    await user.click(sendButton())
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    expect(mockFetch.mock.calls[1][0]).toBe(`/api/admin/crm/orgs/${org.id}/outreach/send`)
    expect(body(1)).toMatchObject({ recipient_channel_id: red.channel_id, subject: 'Hello', body: 'Text' })
  })

  it('without crm:send_approve: no approve button, the box says who may approve, "Send" stays disabled', async () => {
    const user = await setup({ canApprove: false })
    await chooseRedAndWrite(user)
    const gate = screen.getByTestId('crm-outreach-gate')
    expect(within(gate).queryByRole('button')).toBeNull()
    expect(within(gate).getByText(tr.crm_outreach_approval_needs_permission)).toBeTruthy()
    expect(sendButton().disabled).toBe(true)
  })

  it('an open approval from the backend (recorded recipients after approval) unlocks "Send"', async () => {
    const user = await setup({ recipients: rec.recipientsApproved() })
    await chooseRedAndWrite(user)
    expect(within(screen.getByTestId('crm-outreach-gate')).getByText(tr.crm_outreach_approval_open)).toBeTruthy()
    expect(sendButton().disabled).toBe(false)
  })

  it('the preview carries the gate state: its approval shows who approved and until when (recorded preview)', async () => {
    const preview = rec.previewApproved()
    mockFetch.mockResolvedValue(res(200, preview))
    const user = await setup()
    await user.selectOptions(screen.getByLabelText(tr.crm_outreach_recipient), String(red.channel_id))
    expect(sendButton().disabled).toBe(true)
    await user.click(screen.getByRole('button', { name: tr.crm_composer_preview }))
    await waitFor(() => expect((screen.getByLabelText(tr.crm_composer_subject) as HTMLInputElement).value).toBe(preview.subject))
    expect(body(0)).toMatchObject({ recipient_channel_id: red.channel_id })
    expect(screen.getByTestId('crm-outreach-gate').textContent).toContain(`#${preview.gate.approval!.approved_by}`)
    expect(sendButton().disabled).toBe(false)
  })

  it('a preview without approval (recorded gate red) keeps the box and the block', async () => {
    const preview = rec.previewGateRed()
    expect(preview.gate).toMatchObject({ effective_tier: 'red', approval_required: true, approval: null })
    mockFetch.mockResolvedValue(res(200, preview))
    const user = await setup()
    await user.selectOptions(screen.getByLabelText(tr.crm_outreach_recipient), String(red.channel_id))
    await user.click(screen.getByRole('button', { name: tr.crm_composer_preview }))
    await waitFor(() => expect((screen.getByLabelText(tr.crm_composer_subject) as HTMLInputElement).value).toBe(preview.subject))
    expect(screen.getByTestId('crm-outreach-gate').getAttribute('role')).toBe('alert')
    expect(sendButton().disabled).toBe(true)
  })

  it.each([['en', tr], ['el', trEl]] as const)(
    'backend still refuses (recorded 422 outreach_tier_approval_required with tier): translated toast (%s)',
    async (_lang, t) => {
      mockFetch.mockResolvedValue(answer('outreach-send-tier-approval-required'))
      const user = userEvent.setup()
      // stale list: the approval the UI saw was used up meanwhile
      render(<OutreachComposer org={org} recipients={rec.recipientsApproved()} tr={t} canSend canApprove />)
      await chooseRedAndWrite(user, t)
      await user.click(sendButton(t))
      await waitFor(() => expect(showToast).toHaveBeenCalledWith(t.crm_err_tier_approval_required.replace('{tier}', t.crm_tier_red), 'error'))
      expect(refresh).not.toHaveBeenCalled()
    },
  )

  it('backend refuses the reason (recorded 422 outreach_approval_reason_required): toast, dialog stays open', async () => {
    mockFetch.mockResolvedValue(answer('outreach-approve-reason-required'))
    const user = await setup()
    await chooseRedAndWrite(user)
    await user.click(within(screen.getByTestId('crm-outreach-gate')).getByRole('button', { name: tr.crm_outreach_approve }))
    const dialog = screen.getByRole('dialog', { name: tr.crm_outreach_approve_title })
    // the client accepts 10+ characters; the backend has the last word
    await user.type(within(dialog).getByLabelText(tr.crm_outreach_approve_reason), 'owner asked for it')
    await user.click(within(dialog).getByRole('button', { name: tr.crm_outreach_approve }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.crm_err_approval_reason_required, 'error'))
    expect(screen.getByRole('dialog', { name: tr.crm_outreach_approve_title })).toBeTruthy()
    expect(sendButton().disabled).toBe(true)
  })
})
