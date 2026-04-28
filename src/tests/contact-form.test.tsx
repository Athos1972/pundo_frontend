import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from '@/components/contact/ContactForm'
import { t, translations } from '@/lib/translations'
import { LANGS } from '@/lib/lang'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

// TurnstileWidget: in tests call onToken immediately so forms are not blocked by CAPTCHA
vi.mock('@/components/security/TurnstileWidget', async () => {
  const { useEffect } = await import('react')
  return {
    TurnstileWidget: ({ onToken }: { onToken: (token: string) => void }) => {
      useEffect(() => { onToken('test-bypass-token') }, [onToken])
      return null
    },
  }
})

// ContactForm takes lang: string and calls t() internally

// ── Translation key coverage ──────────────────────────────────────────────────

describe('Contact translation keys — alle 6 Sprachen', () => {
  const contactKeys = [
    'contact_missing_something',
    'contact_subject',
    'contact_category',
    'contact_description',
    'contact_name',
    'contact_email',
    'contact_send',
    'contact_cat_missing_shop',
    'contact_cat_missing_product',
    'contact_cat_wrong_info',
    'contact_cat_suggestion',
    'contact_cat_other',
    'contact_success',
    'contact_error',
    'contact_sending',
  ] as const

  for (const lang of LANGS) {
    it(`lang="${lang}" hat alle contact_* Keys`, () => {
      const tr = translations[lang]
      for (const key of contactKeys) {
        expect(tr[key], `missing "${key}" for lang "${lang}"`).toBeTruthy()
        expect(typeof tr[key]).toBe('string')
        expect((tr[key] as string).length).toBeGreaterThan(0)
      }
    })
  }
})

describe('Hero translation keys — hero_tagline_pundo', () => {
  for (const lang of LANGS) {
    it(`lang="${lang}" hat hero_tagline_pundo`, () => {
      const tr = translations[lang]
      expect(tr.hero_tagline_pundo).toBeTruthy()
      expect(typeof tr.hero_tagline_pundo).toBe('string')
    })
  }

  for (const lang of LANGS) {
    it(`lang="${lang}" hat neuen hero_title_pundo Text`, () => {
      const tr = translations[lang]
      // Old text was "Find Local Shops & Products" / "Lokale Shops & Produkte finden"
      expect(tr.hero_title_pundo).not.toMatch(/local shops & products/i)
      expect(tr.hero_title_pundo.length).toBeGreaterThan(5)
    })
  }
})

// ── ContactForm rendering ─────────────────────────────────────────────────────

describe('ContactForm — Rendering', () => {
  it('zeigt alle 5 Felder auf Englisch', () => {
    render(<ContactForm lang="en" />)
    expect(screen.getByText('Subject')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('zeigt Submit-Button mit Übersetzung', () => {
    render(<ContactForm lang="en" />)
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('zeigt alle 5 Kategorie-Optionen', () => {
    render(<ContactForm lang="en" />)
    expect(screen.getByText('Shop missing / not found')).toBeInTheDocument()
    expect(screen.getByText('Product not available')).toBeInTheDocument()
    expect(screen.getByText('Incorrect info / data issue')).toBeInTheDocument()
    expect(screen.getByText('Idea or suggestion')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('rendert auf Deutsch', () => {
    render(<ContactForm lang="de" />)
    expect(screen.getByText('Thema')).toBeInTheDocument()
    expect(screen.getByText('Absenden')).toBeInTheDocument()
    expect(screen.getByText('Shop fehlt / nicht gefunden')).toBeInTheDocument()
  })

  it('zeigt keinen Fehler-Banner initial', () => {
    render(<ContactForm lang="en" />)
    expect(screen.queryByText(t('en').contact_error)).not.toBeInTheDocument()
  })

  it('zeigt keine Erfolgsmeldung initial', () => {
    render(<ContactForm lang="en" />)
    expect(screen.queryByText(t('en').contact_success)).not.toBeInTheDocument()
  })
})

// ── ContactForm interactions ──────────────────────────────────────────────────

describe('ContactForm — Interaktionen', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Felder sind editierbar', async () => {
    const user = userEvent.setup()
    render(<ContactForm lang="en" />)

    const inputs = screen.getAllByRole('textbox')
    // subject, description (textarea), name are textbox roles
    await user.type(inputs[0], 'Test subject')
    expect(inputs[0]).toHaveValue('Test subject')
  })

  it('zeigt Sending-Text während des Sendens', async () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch

    const { container } = render(<ContactForm lang="en" />)
    const textboxes = screen.getAllByRole('textbox')
    fireEvent.change(textboxes[0], { target: { value: 'My subject' } })
    fireEvent.change(textboxes[1], { target: { value: 'This is a longer description that meets the min length' } })
    fireEvent.change(textboxes[2], { target: { value: 'Alice' } })
    fireEvent.change(container.querySelector('input[type="email"]')!, { target: { value: 'alice@example.com' } })

    fireEvent.submit(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Sending…')
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  it('zeigt Erfolgsmeldung bei ok=true Response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch

    render(<ContactForm lang="en" />)
    fireEvent.submit(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText(t('en').contact_success)).toBeInTheDocument()
    })
    // Form verschwindet nach Erfolg
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('zeigt Fehlermeldung bei ok=false Response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch

    render(<ContactForm lang="en" />)
    fireEvent.submit(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText(t('en').contact_error)).toBeInTheDocument()
    })
    // Button bleibt sichtbar
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('zeigt Fehlermeldung bei Netzwerkfehler', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch

    render(<ContactForm lang="en" />)
    fireEvent.submit(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText(t('en').contact_error)).toBeInTheDocument()
    })
  })

  it('sendet POST an /api/contact', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    global.fetch = mockFetch as unknown as typeof fetch

    render(<ContactForm lang="en" />)
    fireEvent.submit(screen.getByRole('button'))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/contact')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Content-Type']).toBe('application/json')
  })

  it('Kategorie-Select ändert Wert', async () => {
    const user = userEvent.setup()
    render(<ContactForm lang="en" />)

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'contact_cat_suggestion')
    expect(select).toHaveValue('contact_cat_suggestion')
  })
})

// ── ContactForm RTL ───────────────────────────────────────────────────────────

describe('ContactForm — RTL Sprachen', () => {
  it('rendert auf Arabisch ohne Fehler', () => {
    const { container } = render(<ContactForm lang="ar" />)
    expect(container.querySelector('form')).toBeInTheDocument()
    expect(screen.getByText(t('ar').contact_subject)).toBeInTheDocument()
  })

  it('rendert auf Hebräisch ohne Fehler', () => {
    const { container } = render(<ContactForm lang="he" />)
    expect(container.querySelector('form')).toBeInTheDocument()
    expect(screen.getByText(t('he').contact_send)).toBeInTheDocument()
  })
})
