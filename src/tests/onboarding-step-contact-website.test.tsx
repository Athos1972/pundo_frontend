import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepContact } from '@/components/shop-admin/onboarding/StepContact'
import { LANGS } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'

describe('StepContact website field', () => {
  const tr = tAdmin('en')
  it('is a text input with url keyboard so scheme-less input reaches the backend', () => {
    render(<StepContact tr={tr} initialContact={{}} onNext={vi.fn()} onBack={vi.fn()} />)
    const input = screen.getByPlaceholderText(tr.onboarding_contact_website) as HTMLInputElement
    expect(input.type).toBe('text')
    expect(input.getAttribute('inputmode')).toBe('url')
  })

  it.each(LANGS)('shows the localized server error under the website field (%s)', (lang) => {
    const t = tAdmin(lang)
    render(<StepContact tr={t} initialContact={{ website: 'javascript:alert(1)' }} websiteError={t.error_invalid_url} onNext={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toBe(t.error_invalid_url)
  })

  it('shows no alert without error', () => {
    render(<StepContact tr={tr} initialContact={{ phone: '1' }} onNext={vi.fn()} onBack={vi.fn()} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
