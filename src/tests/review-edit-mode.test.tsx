import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import type { Review } from '@/types/api'
import { t } from '@/lib/translations'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const tr = t('en')

const SESSION_AUTH = { user: { id: 1, email: 'x@x.com', display_name: 'X', avatar_url: undefined, is_verified: true, provider: 'email' as const, created_at: '2024-01-01T00:00:00Z' }, is_authenticated: true }
const SESSION_ANON = { user: null, is_authenticated: false }

const EXISTING_REVIEW: Review = {
  id: 42,
  user_id: 1,
  user_display_name: 'X',
  entity_type: 'shop',
  entity_id: 91,
  stars: 4,
  comment: 'Pretty good',
  photos: [],
  is_visible: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

function renderForm(props: Partial<Parameters<typeof ReviewForm>[0]> = {}, authenticated = true) {
  const session = authenticated ? SESSION_AUTH : SESSION_ANON
  return render(
    <SessionProvider initialSession={session}>
      <ReviewForm entityType="shop" entityId={91} lang="en" {...props} />
    </SessionProvider>
  )
}

// ── Edit-Modus: Vorausgefüllte Werte ─────────────────────────────────────────

describe('ReviewForm — Edit-Modus (existingReview)', () => {
  it('zeigt "Update review" Button wenn existingReview übergeben', () => {
    renderForm({ existingReview: EXISTING_REVIEW })
    expect(screen.getByRole('button', { name: tr.reviews_update })).toBeInTheDocument()
  })

  it('zeigt "Submit review" Button wenn kein existingReview', () => {
    renderForm()
    expect(screen.getByRole('button', { name: tr.reviews_submit })).toBeInTheDocument()
  })

  it('füllt Kommentar-Textarea mit existingReview.comment vor', () => {
    renderForm({ existingReview: EXISTING_REVIEW })
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox')
    expect(textarea.value).toBe('Pretty good')
  })

  it('lässt Kommentar leer wenn existingReview.comment null', () => {
    renderForm({ existingReview: { ...EXISTING_REVIEW, comment: null } })
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox')
    expect(textarea.value).toBe('')
  })
})

// ── Submit: POST vs. PUT ──────────────────────────────────────────────────────

describe('ReviewForm — Submit-Methode', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 42 }),
    })
  })

  it('schickt PUT an /reviews/{id} wenn existingReview vorhanden', async () => {
    renderForm({ existingReview: EXISTING_REVIEW })

    // Kommentar ändern und absenden
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox')
    fireEvent.change(textarea, { target: { value: 'Updated comment' } })
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_update }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/customer/customer/reviews/42',
        expect.objectContaining({ method: 'PUT' })
      )
    })
  })

  it('schickt POST an /reviews wenn kein existingReview', async () => {
    renderForm()

    // Sterne setzen — Buttons sind die Stern-Inputs
    const starBtns = screen.getAllByRole('button')
    fireEvent.click(starBtns[2]) // 3 Sterne
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_submit }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/customer/customer/reviews',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('enthält keine entity_type/entity_id im PUT-Body (nur stars/comment)', async () => {
    renderForm({ existingReview: EXISTING_REVIEW })
    fireEvent.click(screen.getByRole('button', { name: tr.reviews_update }))

    await waitFor(() => {
      const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const body = JSON.parse(init.body)
      expect(body).not.toHaveProperty('entity_type')
      expect(body).not.toHaveProperty('entity_id')
      expect(body).toHaveProperty('stars')
    })
  })
})

// ── Nicht eingeloggt ──────────────────────────────────────────────────────────

describe('ReviewForm — Nicht authentifiziert', () => {
  it('zeigt Login-Link statt Formular', () => {
    renderForm({}, false)
    expect(screen.getByRole('link', { name: tr.auth_login })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
