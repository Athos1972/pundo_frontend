// B6220-003 — StepCredentials: submit blocked without Turnstile token, token handed to onSubmit.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))
vi.mock('@/components/shop-admin/onboarding/ShopOwnerOAuthButton', () => ({ ShopOwnerOAuthButton: () => null }))

let issueToken = true
vi.mock('@/components/ui/TurnstileWidget', async () => {
  const { useEffect } = await import('react')
  return {
    TurnstileWidget: ({ onToken, loadingText }: { onToken: (t: string) => void; loadingText: string }) => {
      useEffect(() => { if (issueToken) onToken('cf-token-1') }, [onToken])
      return <span data-testid="widget">{loadingText}</span>
    },
  }
})

import { StepCredentials } from '@/components/shop-admin/onboarding/StepCredentials'
import { tAdmin } from '@/lib/shop-admin-translations'

const tr = tAdmin('en')

function setup(onSubmit = vi.fn()) {
  render(
    <StepCredentials
      tr={tr}
      emailTakenError={false}
      submitError={null}
      isPending={false}
      captchaResetKey={0}
      onSubmit={onSubmit}
      onBack={() => {}}
    />,
  )
  fireEvent.change(document.querySelector('input[name="email"]')!, { target: { value: 'a@pundo-e2e.io' } })
  fireEvent.change(document.querySelector('input[name="password"]')!, { target: { value: 'secret123' } })
  return onSubmit
}

describe('StepCredentials captcha', () => {
  it('passes the Turnstile token to onSubmit and uses the shop-admin loading text', () => {
    issueToken = true
    const onSubmit = setup()
    expect(screen.getByTestId('widget').textContent).toBe(tr.onboarding_turnstile_loading)
    fireEvent.submit(document.querySelector('form')!)
    expect(onSubmit).toHaveBeenCalledWith('a@pundo-e2e.io', 'secret123', 'cf-token-1')
  })

  it('keeps the submit button disabled and does not submit without a token', () => {
    issueToken = false
    const onSubmit = setup()
    const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    fireEvent.submit(document.querySelector('form')!)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
