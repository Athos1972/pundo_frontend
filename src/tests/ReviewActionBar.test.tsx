import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReviewActionBar } from '@/components/shop-admin/catalog-review/ReviewActionBar'
import { tAdmin } from '@/lib/shop-admin-translations'

const pushMock = vi.fn()
const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

const tr = tAdmin('de')

function mockFetch(ok: boolean, status = ok ? 200 : 500) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => ({}) })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  pushMock.mockClear()
  refreshMock.mockClear()
})

describe('ReviewActionBar — Approve (AC 11)', () => {
  it('zeigt einen Confirm-Dialog vor dem Freigeben', () => {
    const confirmSpy = vi.fn(() => false)
    vi.stubGlobal('confirm', confirmSpy)
    mockFetch(true)
    render(<ReviewActionBar caseId={5} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: tr.catalog_review_approve }))
    expect(confirmSpy).toHaveBeenCalledWith(tr.catalog_review_approve_confirm)
  })

  it('sendet POST an /catalog-cases/{id}/approve und navigiert zur Übersicht bei Erfolg', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    const fetchMock = mockFetch(true)
    render(<ReviewActionBar caseId={5} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: tr.catalog_review_approve }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/shop-admin/catalog-cases/5/approve', { method: 'POST' })
      expect(pushMock).toHaveBeenCalledWith('/shop-admin/catalog-review')
    })
  })

  it('bricht ab, wenn der Confirm-Dialog abgebrochen wird — kein fetch-Call', () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    const fetchMock = mockFetch(true)
    render(<ReviewActionBar caseId={5} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: tr.catalog_review_approve }))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('zeigt einen Konflikt-Hinweis bei 409 (Case nicht mehr awaiting_owner_review)', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    mockFetch(false, 409)
    render(<ReviewActionBar caseId={5} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: tr.catalog_review_approve }))

    await waitFor(() => {
      expect(screen.getByText(tr.catalog_review_conflict_reload)).toBeInTheDocument()
    })
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('zeigt einen "nicht gefunden"-Hinweis bei 404', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    mockFetch(false, 404)
    render(<ReviewActionBar caseId={5} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: tr.catalog_review_approve }))

    await waitFor(() => {
      expect(screen.getByText(tr.catalog_review_not_found)).toBeInTheDocument()
    })
  })
})

describe('ReviewActionBar — Reject (AC 12, R3 — darf nicht wie Löschen wirken)', () => {
  it('zeigt erst nach Klick auf "Ablehnen" das Freitextfeld und den Erklärtext', () => {
    mockFetch(true)
    render(<ReviewActionBar caseId={5} tr={tr} />)
    expect(screen.queryByLabelText(tr.catalog_review_reject_feedback_label)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: tr.catalog_review_reject }))

    expect(screen.getByLabelText(tr.catalog_review_reject_feedback_label)).toBeInTheDocument()
    expect(screen.getByText(tr.catalog_review_reject_explains_rework)).toBeInTheDocument()
  })

  it('sendet POST an /catalog-cases/{id}/reject mit Feedback im Body', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    const fetchMock = mockFetch(true)
    render(<ReviewActionBar caseId={5} tr={tr} />)

    fireEvent.click(screen.getByRole('button', { name: tr.catalog_review_reject }))
    fireEvent.change(screen.getByLabelText(tr.catalog_review_reject_feedback_label), {
      target: { value: 'Bitte Farben korrigieren' },
    })
    // Two buttons now share the "Ablehnen" label (toggle + confirm) — the confirm one is inside the textarea panel.
    const rejectButtons = screen.getAllByRole('button', { name: tr.catalog_review_reject })
    fireEvent.click(rejectButtons[rejectButtons.length - 1])

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/shop-admin/catalog-cases/5/reject',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ feedback: 'Bitte Farben korrigieren' }),
        })
      )
      expect(pushMock).toHaveBeenCalledWith('/shop-admin/catalog-review')
    })
  })

  it('sendet ein leeres Body-Objekt (kein feedback-Key) wenn das Freitextfeld leer bleibt (Feedback ist optional)', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    const fetchMock = mockFetch(true)
    render(<ReviewActionBar caseId={5} tr={tr} />)

    fireEvent.click(screen.getByRole('button', { name: tr.catalog_review_reject }))
    const rejectButtons = screen.getAllByRole('button', { name: tr.catalog_review_reject })
    fireEvent.click(rejectButtons[rejectButtons.length - 1])

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/shop-admin/catalog-cases/5/reject', expect.anything())
      // JSON.stringify drops undefined-valued keys ({ feedback: undefined } -> '{}') —
      // confirms no accidental empty-string feedback is sent instead.
      const [, init] = fetchMock.mock.calls[0]
      expect(init.body).toBe('{}')
    })
  })

  it('"Abbrechen" schließt das Freitextfeld wieder, ohne einen Request zu senden', () => {
    const fetchMock = mockFetch(true)
    render(<ReviewActionBar caseId={5} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: tr.catalog_review_reject }))
    fireEvent.click(screen.getByRole('button', { name: tr.cancel }))

    expect(screen.queryByLabelText(tr.catalog_review_reject_feedback_label)).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('zeigt eine generische Fehlermeldung bei einem Server-Fehler (500)', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    mockFetch(false, 500)
    render(<ReviewActionBar caseId={5} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: tr.catalog_review_reject }))
    const rejectButtons = screen.getAllByRole('button', { name: tr.catalog_review_reject })
    fireEvent.click(rejectButtons[rejectButtons.length - 1])

    await waitFor(() => {
      expect(screen.getByText(tr.catalog_review_action_failed)).toBeInTheDocument()
    })
  })
})
