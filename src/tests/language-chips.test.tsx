import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageChips } from '@/components/ui/LanguageChips'
import { LanguageSelector } from '@/components/shop-admin/LanguageSelector'
import { SUPPORTED_LANGUAGES } from '@/lib/lang'

// ─── LanguageChips (read-only, customer-facing) ───────────────────────────────

describe('LanguageChips', () => {
  it('renders all provided language codes as chips', () => {
    render(<LanguageChips languages={['DE', 'EN', 'RU']} label="Languages spoken" />)
    expect(screen.getByText('DE')).toBeInTheDocument()
    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(screen.getByText('RU')).toBeInTheDocument()
  })

  it('renders nothing when languages array is empty', () => {
    const { container } = render(<LanguageChips languages={[]} label="Languages spoken" />)
    expect(container.firstChild).toBeNull()
  })

  it('sets aria-label on the chip container', () => {
    render(<LanguageChips languages={['EN']} label="Languages spoken" />)
    expect(screen.getByRole('list', { name: 'Languages spoken' })).toBeInTheDocument()
  })

  it('chips are not interactive (no button role)', () => {
    render(<LanguageChips languages={['EN', 'DE']} label="Languages spoken" />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('renders exactly the number of chips passed', () => {
    render(<LanguageChips languages={['EN', 'DE', 'EL', 'RU', 'AR', 'HE']} label="Languages spoken" />)
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
  })

  it('uppercases language codes', () => {
    render(<LanguageChips languages={['de', 'en']} label="Languages spoken" />)
    expect(screen.getByText('DE')).toBeInTheDocument()
    expect(screen.getByText('EN')).toBeInTheDocument()
  })
})

// ─── LanguageSelector (interactive, shop-admin) ───────────────────────────────

describe('LanguageSelector', () => {
  it('renders all 6 supported languages as buttons', () => {
    render(<LanguageSelector value={[]} onChange={() => {}} label="Languages spoken" />)
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(screen.getByRole('button', { name: lang })).toBeInTheDocument()
    }
  })

  it('marks selected languages as aria-pressed=true', () => {
    render(<LanguageSelector value={['DE', 'EN']} onChange={() => {}} label="Languages spoken" />)
    expect(screen.getByRole('button', { name: 'DE' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'RU' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with added language on click', () => {
    const onChange = vi.fn()
    render(<LanguageSelector value={['DE']} onChange={onChange} label="Languages spoken" />)
    fireEvent.click(screen.getByRole('button', { name: 'RU' }))
    expect(onChange).toHaveBeenCalledWith(['DE', 'RU'])
  })

  it('calls onChange with removed language on click when already selected', () => {
    const onChange = vi.fn()
    render(<LanguageSelector value={['DE', 'EN']} onChange={onChange} label="Languages spoken" />)
    fireEvent.click(screen.getByRole('button', { name: 'DE' }))
    expect(onChange).toHaveBeenCalledWith(['EN'])
  })

  it('calls onChange with empty array when last language is deselected', () => {
    const onChange = vi.fn()
    render(<LanguageSelector value={['HE']} onChange={onChange} label="Languages spoken" />)
    fireEvent.click(screen.getByRole('button', { name: 'HE' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('renders label text', () => {
    render(<LanguageSelector value={[]} onChange={() => {}} label="Gesprochene Sprachen" />)
    expect(screen.getByText('Gesprochene Sprachen')).toBeInTheDocument()
  })
})
