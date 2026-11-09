/**
 * A11y: FormField (Shop-Admin) verknüpft Hinweis und Fehlermeldung per aria-describedby
 * mit dem Eingabefeld (Passwort-Hinweis im Onboarding).
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField } from '@/components/shop-admin/FormField'

describe('FormField hint', () => {
  it('verknüpft den Hinweis per aria-describedby', () => {
    render(<FormField label="Passwort" name="password" type="password" hint="Mindestens 8 Zeichen" />)
    const input = screen.getByLabelText('Passwort')
    expect(input.getAttribute('aria-describedby')).toBe('password-hint')
    expect(document.getElementById('password-hint')?.textContent).toBe('Mindestens 8 Zeichen')
  })

  it('nennt bei Fehler Fehlermeldung und Hinweis, beide bleiben sichtbar', () => {
    render(<FormField label="Passwort" name="password" type="password" hint="Mindestens 8 Zeichen" error="Zu kurz" />)
    const input = screen.getByLabelText('Passwort')
    expect(input.getAttribute('aria-describedby')).toBe('password-error password-hint')
    expect(document.getElementById('password-error')?.textContent).toBe('Zu kurz')
    expect(document.getElementById('password-hint')).not.toBeNull()
  })

  it('setzt ohne Hinweis und Fehler kein aria-describedby', () => {
    render(<FormField label="E-Mail" name="email" />)
    expect(screen.getByLabelText('E-Mail').hasAttribute('aria-describedby')).toBe(false)
  })
})
