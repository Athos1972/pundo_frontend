import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }))

import { PrivacyRequestForm } from '@/components/privacy/PrivacyRequestForm'
import { PrivacyTab } from '@/components/account/PrivacyTab'
import { DownloadPrivacyExport } from '@/components/privacy/DownloadPrivacyExport'
import { ConfirmPrivacyRequest } from '@/components/privacy/ConfirmPrivacyRequest'

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

  it('posts a fragment token once and uses only the grant-cookie download path', async () => {
    window.history.replaceState(null, '', '/de/privacy-request/download#fragment-only-token')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'x-privacy-export-id': 'export-123' }) })
    global.fetch = fetchMock
    render(<DownloadPrivacyExport lang="de" />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/privacy/privacy-requests/external-download/confirm', expect.objectContaining({ method: 'POST' })))
    expect(window.location.hash).toBe('')
    expect(await screen.findByRole('link', { name: /Datenkopie herunterladen/i })).toHaveAttribute('href', '/api/privacy/privacy-exports/export-123/download')
  })

  it.each([
    ['confirmed', 'Ihre Datenschutzanfrage wurde bestätigt.'],
    ['already_confirmed', 'Ihre Datenschutzanfrage wurde bereits bestätigt.'],
    ['expired', 'Dieser Bestätigungslink ist abgelaufen.'],
    ['public_intake_disabled', 'Datenschutzanfragen sind über dieses Formular derzeit nicht verfügbar.'],
  ])('shows the dedicated confirmation message for %s and removes the fragment before posting', async (status, message) => {
    window.history.replaceState(null, '', '/de/privacy-request/confirm#confirm-token')
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ status }) })
    global.fetch = fetchMock
    render(<ConfirmPrivacyRequest lang="de" />)
    expect(await screen.findByRole('heading')).toHaveTextContent(message)
    expect(window.location.hash).toBe('')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/privacy/privacy-requests/confirm', expect.objectContaining({ body: JSON.stringify({ token: 'confirm-token' }) }))
  })

  it('shows a dedicated confirmation error when the fragment is missing or the request fails', async () => {
    window.history.replaceState(null, '', '/de/privacy-request/confirm')
    global.fetch = vi.fn()
    const { rerender } = render(<ConfirmPrivacyRequest lang="de" />)
    expect(await screen.findByRole('heading')).toHaveTextContent('Der Bestätigungslink ist ungültig.')
    expect(global.fetch).not.toHaveBeenCalled()
    window.history.replaceState(null, '', '/de/privacy-request/confirm#network-token')
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'))
    rerender(<ConfirmPrivacyRequest lang="en" />)
    expect(await screen.findByRole('heading')).toHaveTextContent('We could not confirm your privacy request.')
  })
})
