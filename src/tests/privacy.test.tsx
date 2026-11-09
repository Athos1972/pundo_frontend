import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }))

import { PrivacyRequestForm } from '@/components/privacy/PrivacyRequestForm'
import { PrivacyTab } from '@/components/account/PrivacyTab'

describe('F6110 privacy UI', () => {
  it('submits the public form through the allowlisted proxy without revealing a record', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ status: 'confirmation_sent' }) })
    global.fetch = fetchMock
    render(<PrivacyRequestForm lang="de" />)
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'person@example.com' } })
    fireEvent.submit(screen.getByRole('button').closest('form')!)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/privacy/privacy-requests', expect.objectContaining({ method: 'POST' })))
    expect(screen.getByRole('status')).toHaveTextContent('Anfrage bestätigen')
  })

  it('offers an export download only after the own-session status says ready', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ export: { id: 'own-export', state: 'ready' } }) })
    render(<PrivacyTab lang="en" />)
    expect(await screen.findByRole('link', { name: /export is ready/i })).toHaveAttribute('href', '/api/customer/customer/privacy-requests/exports/own-export/download')
  })
})
