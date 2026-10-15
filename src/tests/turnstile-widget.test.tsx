// B6220-003 — TurnstileWidget is a generic ui primitive: caller-provided text, resetKey, no customer imports.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('next/script', () => ({ default: () => null }))

import { TurnstileWidget } from '@/components/ui/TurnstileWidget'

describe('TurnstileWidget', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITEKEY', '1x00000000000000000000AA')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    delete (window as { turnstile?: unknown }).turnstile
  })

  it('renders the loadingText passed by the caller', () => {
    const { getByText } = render(<TurnstileWidget onToken={() => {}} loadingText="Loading check…" />)
    expect(getByText('Loading check…')).toBeTruthy()
  })

  it('calls turnstile.reset when resetKey changes', () => {
    const reset = vi.fn()
    ;(window as unknown as { turnstile: unknown }).turnstile = { render: vi.fn(), reset, remove: vi.fn() }
    const { rerender } = render(<TurnstileWidget onToken={() => {}} loadingText="x" resetKey={0} />)
    expect(reset).not.toHaveBeenCalled()
    rerender(<TurnstileWidget onToken={() => {}} loadingText="x" resetKey={1} />)
    expect(reset).toHaveBeenCalledTimes(1)
  })
  // Clean Boundary (keine Customer-Imports): tests/unit/guards/shop-admin-boundary.test.ts
})
