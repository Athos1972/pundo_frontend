import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriceTierSummary } from '@/components/product/PriceTierSummary'
import type { TierRow } from '@/lib/price-tiers'

const row = (min: number, max: number | null, price: number, suffix: string | null = 'Stück'): TierRow => ({
  minQty: min, maxQty: max, amount: `${price.toFixed(2)} EUR`, price, currency: 'EUR',
  unit: 'per_piece', unitLabel: suffix, unitSuffix: suffix,
})

describe('PriceTierSummary', () => {
  it('rendert nichts ohne Zeilen', () => {
    const { container } = render(<PriceTierSummary rows={[]} lang="de" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('1 Zeile: Präfix, Betrag in bdi, Suffix, aria-label, text-end', () => {
    const { container } = render(<PriceTierSummary rows={[row(6, null, 4)]} lang="de" />)
    const ul = screen.getByLabelText('Mengenpreise')
    expect(ul).toHaveClass('text-end')
    expect(ul.textContent).toBe('ab 6: 4.00 EUR / Stück')
    expect(container.querySelectorAll('bdi').length).toBe(2)
    expect(screen.getByText('4.00 EUR').tagName).toBe('BDI')
    expect(container.querySelector('details')).toBeNull()
  })

  it('3 Zeilen: kein details', () => {
    const { container } = render(<PriceTierSummary rows={[row(2, null, 4), row(3, null, 3), row(4, null, 2)]} lang="en" />)
    expect(container.querySelectorAll('li')).toHaveLength(3)
    expect(container.querySelector('details')).toBeNull()
  })

  it('5 Zeilen: 3 sichtbar + details "Alle Preise (5)"', () => {
    const rows = [2, 3, 4, 5, 6].map((m) => row(m, null, 10 - m))
    const { container } = render(<PriceTierSummary rows={rows} lang="de" />)
    expect(screen.getByText('Alle Preise (5)').tagName).toBe('SUMMARY')
    const details = container.querySelector('details')!
    expect(details.querySelectorAll('ul > li')).toHaveLength(2)
    expect(container.querySelectorAll('li')).toHaveLength(6) // 3 + Wrapper + 2
  })

  it('ohne Suffix kein " / ", nie null/undefined/NaN', () => {
    const { container } = render(<PriceTierSummary rows={[row(1, null, 30, null)]} lang="de" />)
    expect(container.textContent).toBe('30.00 EUR')
    expect(container.textContent).not.toMatch(/null|undefined|NaN/)
  })

  it('ar: übersetzte Labels', () => {
    render(<PriceTierSummary rows={[row(6, null, 4)]} lang="ar" />)
    expect(screen.getByLabelText('أسعار حسب الكمية').textContent).toContain('من 6')
  })
})
