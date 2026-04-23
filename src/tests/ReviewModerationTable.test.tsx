import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReviewModerationTable } from '@/components/shop-admin/ReviewModerationTable'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { AdminReview } from '@/types/shop-admin'

// ─── Globals ─────────────────────────────────────────────────────────────────

vi.stubGlobal('confirm', vi.fn(() => true))

// ─── Fixtures ────────────────────────────────────────────────────────────────

const tr = tAdmin('de')

const VISIBLE_REVIEW: AdminReview = {
  id: 1,
  user_id: 10,
  user_display_name: 'Alice',
  entity_type: 'shop',
  entity_id: 99,
  stars: 4,
  comment: 'Sehr gut',
  photos: [],
  is_visible: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  reporter_count: 0,
  last_reported_at: null,
  invalidated_at: null,
  invalidated_by: null,
}

const INVALIDATED_REVIEW: AdminReview = {
  ...VISIBLE_REVIEW,
  id: 2,
  user_display_name: 'Bob',
  is_visible: false,
  invalidated_at: '2024-01-02T00:00:00Z',
  invalidated_by: 1,
}

const SECOND_VISIBLE_REVIEW: AdminReview = {
  ...VISIBLE_REVIEW,
  id: 3,
  user_display_name: 'Carol',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetch(ok: boolean, status = ok ? 200 : 500) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => ({}),
    })
  )
}

// ─── Test 1: Renders list correctly ──────────────────────────────────────────

describe('ReviewModerationTable — Render', () => {
  it('zeigt sichtbare und invalidierte Reviews korrekt an', () => {
    mockFetch(true)
    render(
      <ReviewModerationTable
        reviews={[VISIBLE_REVIEW, INVALIDATED_REVIEW]}
        tr={tr}
      />
    )

    // Beide Nutzernamen sichtbar
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()

    // Invalidierter Review zeigt Badge
    expect(screen.getByText(tr.reviews_invalidated_badge)).toBeInTheDocument()

    // Sichtbarer Review hat "Invalidate"-Button, invalidierter hat "Restore"
    expect(screen.getByRole('button', { name: tr.reviews_invalidate })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: tr.reviews_restore })).toBeInTheDocument()
  })

  it('zeigt Leertext wenn keine Reviews vorhanden', () => {
    render(<ReviewModerationTable reviews={[]} tr={tr} />)
    expect(screen.getByText(tr.reviews_no_items)).toBeInTheDocument()
  })
})

// ─── Test 2: Erfolgreiches Invalidate — nur betroffenen Review markieren ─────

describe('ReviewModerationTable — Invalidate (Erfolg)', () => {
  beforeEach(() => {
    mockFetch(true)
  })

  it('markiert nach Invalidate nur den betroffenen Review als invalidiert', async () => {
    render(
      <ReviewModerationTable
        reviews={[VISIBLE_REVIEW, SECOND_VISIBLE_REVIEW]}
        tr={tr}
      />
    )

    // Vor dem Klick: 2 "Deaktivieren"-Buttons (Alice und Carol)
    const initialBtns = screen.getAllByRole('button', { name: tr.reviews_invalidate })
    expect(initialBtns).toHaveLength(2)

    // Alice (review.id=1) in Pending-Modus bringen — jetzt erscheint ein Select
    fireEvent.click(initialBtns[0])

    // Nach Klick: Pending-Panel hat einen Confirm-Button (index 0 = confirm für Alice),
    // und Carol hat ihren eigenen äußeren Button (index 1).
    // Der Confirm-Button ist der erste, weil er im DOM vor Carols Button steht.
    const btnsAfterPending = screen.getAllByRole('button', { name: tr.reviews_invalidate })
    expect(btnsAfterPending).toHaveLength(2) // confirm(Alice) + outer(Carol)
    fireEvent.click(btnsAfterPending[0]) // Confirm-Button für Alice

    await waitFor(() => {
      // Alice ist jetzt invalidiert (zeigt "Restore"), Carol noch sichtbar
      expect(screen.getByRole('button', { name: tr.reviews_restore })).toBeInTheDocument()
      // Carol hat immer noch genau einen "Deaktivieren"-Button
      const invalidateAfter = screen.getAllByRole('button', { name: tr.reviews_invalidate })
      expect(invalidateAfter).toHaveLength(1)
    })
  })

  it('kein errorById wird angezeigt nach erfolgreichem Invalidate', async () => {
    render(
      <ReviewModerationTable
        reviews={[VISIBLE_REVIEW]}
        tr={tr}
      />
    )

    // Single review: outer button → pending panel → confirm button (now the only one)
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))

    await waitFor(() => {
      expect(screen.queryByText(tr.reviews_action_failed)).not.toBeInTheDocument()
    })
  })
})

// ─── Test 3: Fehlgeschlagenes Invalidate (fetch → 500) ───────────────────────

describe('ReviewModerationTable — Invalidate (Fehler)', () => {
  beforeEach(() => {
    mockFetch(false, 500)
  })

  it('zeigt Fehlermeldung wenn fetch 500 zurückgibt', async () => {
    render(
      <ReviewModerationTable
        reviews={[VISIBLE_REVIEW]}
        tr={tr}
      />
    )

    // Single review: outer button → pending → confirm button (now the only one)
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))

    await waitFor(() => {
      expect(screen.getByText(tr.reviews_action_failed)).toBeInTheDocument()
    })
  })

  it('markiert keinen Review als invalidiert wenn fetch fehlschlägt', async () => {
    render(
      <ReviewModerationTable
        reviews={[VISIBLE_REVIEW]}
        tr={tr}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))

    await waitFor(() => {
      // Badge "Deaktiviert" darf nicht auftauchen
      expect(screen.queryByText(tr.reviews_invalidated_badge)).not.toBeInTheDocument()
      // Restore-Button darf nicht auftauchen
      expect(screen.queryByRole('button', { name: tr.reviews_restore })).not.toBeInTheDocument()
    })
  })
})

// ─── Test 4: Pending-State ────────────────────────────────────────────────────

describe('ReviewModerationTable — Pending-State', () => {
  beforeEach(() => {
    mockFetch(true)
  })

  it('zeigt Reason-Select und Confirm-Button wenn pendingId gesetzt', () => {
    render(<ReviewModerationTable reviews={[VISIBLE_REVIEW]} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))

    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: tr.cancel })).toBeInTheDocument()
  })

  it('pendingId wird nach Invalidate zurückgesetzt (kein Reason-Select mehr)', async () => {
    render(<ReviewModerationTable reviews={[VISIBLE_REVIEW]} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))

    await waitFor(() => {
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })
  })

  it('pendingId wird nach Restore zurückgesetzt', async () => {
    render(
      <ReviewModerationTable
        reviews={[INVALIDATED_REVIEW]}
        tr={tr}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: tr.reviews_restore }))

    await waitFor(() => {
      // Nach Restore: Review ist wieder sichtbar → kein Restore-Button mehr
      expect(screen.queryByRole('button', { name: tr.reviews_restore })).not.toBeInTheDocument()
    })
  })
})

// ─── Test 5: Reason-Payload enthält Key, nicht lokalisierten String ───────────

describe('ReviewModerationTable — Reason-Payload', () => {
  it('sendet den Schlüssel "spam" statt des lokalisierten Strings im Body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ReviewModerationTable reviews={[VISIBLE_REVIEW]} tr={tr} />)

    // Pending-Modus: Default-Reason ist 'spam'
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))
    // Confirm-Button im Pending-Panel (single review → einziger Button mit diesem Namen)
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce()
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/admin/reviews/1/invalidate')
      const body = JSON.parse(init.body)
      // Key, not localised string
      expect(body.reason).toBe('spam')
      expect(body.reason).not.toBe(tr.reviews_reason_spam) // 'Spam' in DE — same here, but key matters
    })
  })

  it('sendet den korrekten Proxy-Pfad /api/admin/... (nicht /api/customer/admin/...)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ReviewModerationTable reviews={[VISIBLE_REVIEW]} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_invalidate }))

    await waitFor(() => {
      const [url] = fetchMock.mock.calls[0]
      expect(url).toMatch(/^\/api\/admin\/reviews\/\d+\/invalidate$/)
      expect(url).not.toContain('/api/customer/')
    })
  })

  it('Restore sendet an /api/admin/... (nicht /api/customer/admin/...)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <ReviewModerationTable
        reviews={[INVALIDATED_REVIEW]}
        tr={tr}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_restore }))

    await waitFor(() => {
      const [url] = fetchMock.mock.calls[0]
      expect(url).toMatch(/^\/api\/admin\/reviews\/\d+\/restore$/)
      expect(url).not.toContain('/api/customer/')
    })
  })
})
