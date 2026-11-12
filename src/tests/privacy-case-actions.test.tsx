import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { PrivacyCaseActions } from '@/components/system-admin/privacy/PrivacyCaseActions'

const refresh = vi.fn()
const mockFetch = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const tr = tSysAdmin('en')

type CaseProps = {
  right: 'access' | 'export' | 'erasure' | 'correction'
  status: 'open' | 'extended' | 'closed' | 'rejected'
  canWrite: boolean
  canExecuteErasure: boolean
  canExtend: boolean
}

function show(props: Partial<CaseProps> = {}) {
  const defaults: CaseProps = {
    right: 'access', status: 'open', canWrite: true, canExecuteErasure: false, canExtend: true,
  }
  return render(<PrivacyCaseActions caseId="case-1" tr={tr} {...defaults} {...props} />)
}

describe('PrivacyCaseActions', () => {
  it.each<CaseProps & { visible: string[] }>([
    { right: 'access', status: 'open', canWrite: true, canExecuteErasure: false, canExtend: true, visible: ['Generate export', 'Release export', 'Extend deadline', 'Decline', 'Send response', 'Send no-data response', 'Close case'] },
    { right: 'export', status: 'open', canWrite: true, canExecuteErasure: false, canExtend: true, visible: ['Generate export', 'Release export', 'Extend deadline', 'Decline', 'Send response', 'Send no-data response', 'Close case'] },
    { right: 'erasure', status: 'open', canWrite: true, canExecuteErasure: true, canExtend: true, visible: ['Preview', 'Extend deadline', 'Decline', 'Send response', 'Execute erasure', 'Close case'] },
    { right: 'correction', status: 'open', canWrite: true, canExecuteErasure: false, canExtend: true, visible: ['Extend deadline', 'Decline', 'Record correction', 'Send response', 'Close case'] },
    { right: 'access', status: 'extended', canWrite: true, canExecuteErasure: false, canExtend: false, visible: ['Generate export', 'Release export', 'Decline', 'Send response', 'Send no-data response', 'Close case'] },
    { right: 'erasure', status: 'closed', canWrite: true, canExecuteErasure: true, canExtend: true, visible: [] },
    { right: 'access', status: 'rejected', canWrite: true, canExecuteErasure: false, canExtend: true, visible: [] },
    { right: 'access', status: 'open', canWrite: false, canExecuteErasure: false, canExtend: true, visible: [] },
  ])('shows only the backend-allowed controls for $right/$status/write=$canWrite', ({ visible, ...props }) => {
    show(props)
    for (const name of visible) expect(screen.getByRole('button', { name })).toBeVisible()
    for (const name of ['Preview', 'Generate export', 'Release export', 'Extend deadline', 'Decline', 'Record correction', 'Send response', 'Send no-data response', 'Execute erasure', 'Close case']) {
      if (!visible.includes(name)) expect(screen.queryByRole('button', { name })).toBeNull()
    }
  })

  it('refreshes the route after a successful action', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', mockFetch)
    show()
    await user.click(screen.getByRole('button', { name: 'Send no-data response' }))
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    vi.unstubAllGlobals()
  })
})
