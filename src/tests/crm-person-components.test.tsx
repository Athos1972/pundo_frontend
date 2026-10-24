import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PersonRoleEditor } from '@/components/system-admin/crm/PersonRoleEditor'
import { ContactPersonLink } from '@/components/system-admin/crm/ContactPersonLink'
import { tSysAdmin } from '@/lib/system-admin-translations'
import type { CrmPerson } from '@/types/system-admin'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }))

const tr = tSysAdmin('en')
const person: CrmPerson = {
  id: 17,
  display_name: 'Alex',
  address_id: null,
  identifiers: [{ id: 1, kind: 'email', value_normalized: 'alex@example.cy' }],
  roles: [{ id: 9, org_id: 22, role: 'owner', valid_from: '2026-01-01', valid_to: null, source: 'manual' }],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

afterEach(() => { vi.unstubAllGlobals(); refresh.mockReset() })

describe('CRM person UI', () => {
  it('ends an active role through the scoped person endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 9, valid_to: '2026-10-24' }))))
    render(<PersonRoleEditor person={person} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: 'End role' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/admin/crm/persons/17/roles/9/end', expect.objectContaining({ method: 'POST' })))
    expect(refresh).toHaveBeenCalled()
  })

  it('links an unlinked contact to the selected person ID', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ contact_id: 3, person_id: 17 }))))
    render(<ContactPersonLink contactId={3} personId={null} canWrite tr={tr} />)
    fireEvent.change(screen.getByLabelText('Person ID'), { target: { value: '17' } })
    fireEvent.click(screen.getByRole('button', { name: 'Link person' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/admin/crm/persons/17/contacts/3', expect.objectContaining({ method: 'POST' })))
    expect(refresh).toHaveBeenCalled()
  })
})
