import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CreditsLevelHelp } from '@/components/wallet/CreditsLevelHelp'
import { progressionAllowanceText, progressionEarningText, progressionHelpDetails, progressionIntroduction, progressionPriceText } from '@/lib/progression-help-text'

const rules = (ledger_enabled: boolean, price = 3) => ({
  ledger_enabled,
  earnings: [{ action: 'vote_language', xp: 5, credits: 1 }],
  prices: { homesick_credits: price, mcp_calls_per_block: 100, mcp_credits_per_100_calls: 1, product_mail_credits: 2 },
  allowances: { homesick_free_daily: 5, homesick_free_monthly: 20, mcp_free_calls_daily: 1000, product_mail_free_monthly: 5 },
})

describe('CreditsLevelHelp', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => { fetchSpy = vi.spyOn(globalThis, 'fetch') })
  afterEach(() => { fetchSpy.mockRestore() })

  it.each([false, true])('projects active rules when ledger flag is %s', async (ledgerEnabled) => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(rules(ledgerEnabled, 7)), { status: 200 }))
    render(<CreditsLevelHelp lang="en" brand="pundo" />)
    fireEvent.click(screen.getByRole('button'))
    await screen.findByText(/Homesick search: 7/)
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('brand=pundo'), expect.any(Object))
    expect(screen.getByText(ledgerEnabled ? /shown credit price applies/i : /within its free allowance/i)).toBeTruthy()
  })

  it('shows a non-numeric explanation after a 503 response', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 503 }))
    render(<CreditsLevelHelp lang="de" brand="pundo" />)
    fireEvent.click(screen.getByRole('button'))
    await screen.findByText(/aktuellen Regeln sind nicht verfügbar/i)
    expect(screen.queryByText(/100|20|5/)).toBeNull()
  })

  it('handles Escape and returns focus to its opener', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(rules(false)), { status: 200 }))
    render(<CreditsLevelHelp lang="en" brand="naidivse" />)
    const opener = screen.getByRole('button')
    fireEvent.click(opener)
    await screen.findByRole('dialog')
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(opener)
  })

  it('closes on outside click and keeps the dialog bounded on a 375px viewport', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(rules(false)), { status: 200 }))
    const { container } = render(<CreditsLevelHelp lang="en" brand="pundo" />)
    fireEvent.click(screen.getByRole('button'))
    const dialog = await screen.findByRole('dialog')
    expect(dialog.className).toContain('max-h-')
    expect(dialog.className).toContain('overflow-y-auto')
    expect(dialog.className).toContain('calc(100vw-2rem)')
    fireEvent.mouseDown(document.body)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(container.querySelector('section')).toBeNull()
  })

  it('renders without console errors in a preview container', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(rules(false)), { status: 200 }))
    render(<CreditsLevelHelp lang="en" brand="pundo" />)
    fireEvent.click(screen.getByRole('button'))
    await screen.findByRole('dialog')
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it.each(['ru', 'ar', 'he'] as const)('keeps %s resource strings free of German and English service wording', (lang) => {
    const rendered = Object.values(progressionHelpDetails[lang]).flatMap((brand) => [
      brand.loading, brand.unavailable, brand.legacy,
      brand.prices(3, 1, 100, 2, brand.names.currency),
      brand.allowance(5, 20, 1000, 5),
    ]).join(' ')
    expect(rendered).not.toMatch(/Homesick|Product Mail|Kosten|Gratis|search|per day/i)
  })

  it('isolates only Arabic numbers rather than its complete RTL sentence', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(rules(false)), { status: 200 }))
    const { container } = render(<CreditsLevelHelp lang="ar" brand="pundo" />)
    fireEvent.click(screen.getByRole('button'))
    await screen.findByRole('dialog')
    const isolates = container.querySelectorAll('bdi[dir="ltr"]')
    expect(isolates.length).toBeGreaterThan(3)
    expect([...isolates].every((node) => /^\d/.test(node.textContent ?? ''))).toBe(true)
  })

  it('uses the language-specific rank and currency plural forms at their boundaries', () => {
    expect(progressionEarningText('en', 'pundo', 'Vote', 1, 1)).toContain('1 Carob')
    expect(progressionEarningText('en', 'pundo', 'Vote', 2, 2)).toContain('2 Carobs')
    for (const [number, currency] of [[1, 'Монета'], [2, 'Монеты'], [5, 'Монет'], [11, 'Монет'], [21, 'Монета']] as const) {
      expect(progressionEarningText('ru', 'naidivse', 'Голос', number, number)).toContain(`${number} ${currency}`)
    }
    expect(progressionEarningText('he', 'naidivse', 'הצבעה', 1, 1)).toContain('1 מטבע')
    expect(progressionEarningText('he', 'naidivse', 'הצבעה', 2, 2)).toContain('2 מטבעות')
    expect(progressionEarningText('ar', 'pundo', 'تصويت', 1, 1)).toContain('1 قرن الخروب')
    expect(progressionEarningText('ar', 'pundo', 'تصويت', 2, 2)).toContain('2 قرنا الخروب')
    expect(progressionIntroduction('de', 'pundo')).toMatch(/bestätigten Beiträgen.*Carobs/)
  })

  it('pluralizes every numeric cost and allowance unit in all six languages', () => {
    for (const amount of [1, 2] as const) {
      expect(progressionPriceText('en', 'pundo', amount, amount, amount, amount)).toContain(`${amount} ${amount === 1 ? 'Carob' : 'Carobs'}`)
      expect(progressionPriceText('de', 'pundo', amount, amount, amount, amount)).toContain(`${amount} ${amount === 1 ? 'Aufruf' : 'Aufrufe'}`)
      expect(progressionPriceText('el', 'pundo', amount, amount, amount, amount)).toContain(`${amount} ${amount === 1 ? 'κλήση' : 'κλήσεις'}`)
      expect(progressionAllowanceText('he', 'naidivse', amount, amount, amount, amount)).toContain(`${amount} ${amount === 1 ? 'קריאה' : 'קריאות'}`)
      expect(progressionAllowanceText('ar', 'pundo', amount, amount, amount, amount)).toContain(`${amount} ${amount === 1 ? 'استدعاء' : 'استدعاءان'}`)
    }
    for (const amount of [1, 2, 5, 11, 21] as const) {
      const expected = amount === 1 || amount === 21 ? 'Монета' : amount === 2 ? 'Монеты' : 'Монет'
      expect(progressionPriceText('ru', 'naidivse', amount, amount, amount, amount)).toContain(`${amount} ${expected}`)
      const calls = amount === 1 || amount === 21 ? 'вызов' : amount === 2 ? 'вызова' : 'вызовов'
      const adjective = amount === 1 || amount === 21 ? 'бесплатный' : 'бесплатных'
      expect(progressionAllowanceText('ru', 'naidivse', amount, amount, amount, amount)).toContain(`${amount} ${adjective} ${calls}`)
      expect(progressionAllowanceText('ru', 'naidivse', amount, amount, amount, amount)).toContain(`${amount} ${adjective} ${amount === 1 || amount === 21 ? 'поиск' : amount === 2 ? 'поиска' : 'поисков'}`.replace(adjective, adjective))
    }
  })
})
