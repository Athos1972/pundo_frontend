import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { t } from '@/lib/translations'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignupForm } from '@/components/auth/SignupForm'
import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm'
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'
import { SessionProvider, useSession, useSetSession } from '@/components/auth/SessionProvider'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn(), back: vi.fn() }),
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))

// Turnstile stub: exposes buttons to deliver a token / an error and shows the resetKey.
vi.mock('@/components/ui/TurnstileWidget', () => ({
  TurnstileWidget: ({ onToken, onError, resetKey }: { onToken: (t: string) => void; onError?: () => void; resetKey?: number }) =>
    React.createElement('div', null,
      React.createElement('button', { type: 'button', onClick: () => onToken('tok-1') }, 'give-token'),
      React.createElement('button', { type: 'button', onClick: () => onError?.() }, 'fail-captcha'),
      React.createElement('span', { 'data-testid': 'reset-key' }, String(resetKey ?? 0)),
    ),
}))

const mockFetch = vi.fn()

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

beforeEach(() => {
  push.mockReset()
  refresh.mockReset()
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LoginForm', () => {
  const tr = t('en')

  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(tr.auth_email), 'a@b.io')
    await user.type(screen.getByLabelText(tr.auth_password), 'secret123')
    await user.click(screen.getByRole('button', { name: tr.auth_login }))
  }

  it('sends credentials with Accept-Language and redirects to /{lang} before refreshing', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(200, {}))
    render(<LoginForm lang="de" />)
    await user.type(screen.getByLabelText(t('de').auth_email), 'a@b.io')
    await user.type(screen.getByLabelText(t('de').auth_password), 'secret123')
    await user.click(screen.getByRole('button', { name: t('de').auth_login }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/de'))
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/customer/customer/auth/login')
    expect(init.headers['Accept-Language']).toBe('de')
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.io', password: 'secret123' })
    // push must come before refresh (documented ordering requirement)
    expect(push.mock.invocationCallOrder[0]).toBeLessThan(refresh.mock.invocationCallOrder[0])
  })

  it('modal mode: refreshes and calls onSuccess instead of navigating', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    mockFetch.mockResolvedValue(jsonResponse(200, {}))
    render(<LoginForm lang="en" onSuccess={onSuccess} />)
    await fillAndSubmit(user)
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(refresh).toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('shows an alert on invalid credentials and stays on the page', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(401, {}))
    render(<LoginForm lang="en" />)
    await fillAndSubmit(user)
    expect((await screen.findByRole('alert')).textContent).toBe(tr.auth_invalid_credentials)
    expect(push).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: tr.auth_login }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('redirects to email verification (encoded) when the backend answers 403', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(403, {}))
    render(<LoginForm lang="en" />)
    await user.type(screen.getByLabelText(tr.auth_email), 'a+b@b.io')
    await user.type(screen.getByLabelText(tr.auth_password), 'secret123')
    await user.click(screen.getByRole('button', { name: tr.auth_login }))
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/auth/verify-email?email=a%2Bb%40b.io&purpose=signup'),
    )
  })

  it('shows the generic error on network failure', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))
    render(<LoginForm lang="en" />)
    await fillAndSubmit(user)
    expect((await screen.findByRole('alert')).textContent).toBe(tr.error_generic)
  })

  it('disables the submit button while the request is pending', async () => {
    const user = userEvent.setup()
    let resolve!: (v: unknown) => void
    mockFetch.mockReturnValue(new Promise((r) => { resolve = r }))
    render(<LoginForm lang="en" />)
    await user.type(screen.getByLabelText(tr.auth_email), 'a@b.io')
    await user.type(screen.getByLabelText(tr.auth_password), 'x')
    await user.click(screen.getByRole('button', { name: tr.auth_login }))
    const busy = screen.getByRole('button', { name: '...' }) as HTMLButtonElement
    expect(busy.disabled).toBe(true)
    await act(async () => { resolve(jsonResponse(401, {})) })
    await screen.findByRole('alert')
  })

  it('renders Arabic labels and an alert in Arabic', async () => {
    const user = userEvent.setup()
    const ar = t('ar')
    expect(ar.auth_email).not.toBe(tr.auth_email)
    mockFetch.mockResolvedValue(jsonResponse(401, {}))
    render(<LoginForm lang="ar" />)
    await user.type(screen.getByLabelText(ar.auth_email), 'a@b.io')
    await user.type(screen.getByLabelText(ar.auth_password), 'x')
    await user.click(screen.getByRole('button', { name: ar.auth_login }))
    expect((await screen.findByRole('alert')).textContent).toBe(ar.auth_invalid_credentials)
  })

  it('links to password reset and signup', () => {
    render(<LoginForm lang="en" />)
    expect(screen.getByRole('link', { name: tr.auth_password_reset }).getAttribute('href')).toBe('/auth/password-reset')
    expect(screen.getByRole('link', { name: tr.auth_signup }).getAttribute('href')).toBe('/auth/signup')
  })
})

describe('SignupForm', () => {
  const tr = t('en')

  async function fill(user: ReturnType<typeof userEvent.setup>, password = 'longenough1') {
    await user.type(screen.getByLabelText(tr.auth_display_name), 'Mia')
    await user.type(screen.getByLabelText(tr.auth_email), 'mia@b.io')
    await user.type(screen.getByLabelText(tr.auth_password), password)
  }
  const submit = () => screen.getByRole('button', { name: tr.auth_signup }) as HTMLButtonElement

  it('keeps submit disabled until the captcha delivered a token', async () => {
    const user = userEvent.setup()
    render(<SignupForm lang="en" />)
    await fill(user)
    expect(submit().disabled).toBe(true)
    await user.click(screen.getByText('give-token'))
    expect(submit().disabled).toBe(false)
  })

  it('rejects short passwords client-side without calling the API', async () => {
    const user = userEvent.setup()
    render(<SignupForm lang="en" />)
    await fill(user, 'short')
    await user.click(screen.getByText('give-token'))
    await user.click(submit())
    expect((await screen.findByRole('alert')).textContent).toBe(tr.auth_password_min)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('posts the turnstile token and goes to /account when already verified', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(200, { is_verified: true }))
    render(<SignupForm lang="en" />)
    await fill(user)
    await user.click(screen.getByText('give-token'))
    await user.click(submit())
    await waitFor(() => expect(push).toHaveBeenCalledWith('/account'))
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      email: 'mia@b.io', password: 'longenough1', display_name: 'Mia', turnstile_token: 'tok-1',
    })
  })

  it('sends unverified users to OTP verification', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(200, { is_verified: false }))
    render(<SignupForm lang="en" />)
    await fill(user)
    await user.click(screen.getByText('give-token'))
    await user.click(submit())
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/auth/verify-email?email=mia%40b.io&purpose=signup'),
    )
  })

  it('captcha_failed: shows error, drops the token and bumps the widget reset key', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(400, { error: 'captcha_failed' }))
    render(<SignupForm lang="en" />)
    await fill(user)
    await user.click(screen.getByText('give-token'))
    await user.click(submit())
    expect((await screen.findByRole('alert')).textContent).toBe(tr.turnstile_failed)
    expect(screen.getByTestId('reset-key').textContent).toBe('1')
    expect(submit().disabled).toBe(true)
  })

  it('429 shows the rate-limit message and requests a fresh captcha', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(429, {}))
    render(<SignupForm lang="en" />)
    await fill(user)
    await user.click(screen.getByText('give-token'))
    await user.click(submit())
    expect((await screen.findByRole('alert')).textContent).toBe(tr.rate_limited)
    expect(screen.getByTestId('reset-key').textContent).toBe('1')
  })

  it('maps a disposable-email validation error to its own message', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(422, { detail: [{ field: 'email', message: 'disposable address' }] }))
    render(<SignupForm lang="en" />)
    await fill(user)
    await user.click(screen.getByText('give-token'))
    await user.click(submit())
    expect((await screen.findByRole('alert')).textContent).toBe(tr.auth_disposable_email)
  })

  it('shows other field messages from the backend and falls back to generic', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(jsonResponse(422, { detail: [{ field: 'email', message: 'Invalid email' }] }))
    render(<SignupForm lang="en" />)
    await fill(user)
    await user.click(screen.getByText('give-token'))
    await user.click(submit())
    expect((await screen.findByRole('alert')).textContent).toBe('Invalid email')

    mockFetch.mockResolvedValueOnce(jsonResponse(422, { detail: [{ field: 'x' }] }))
    await user.click(submit())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(tr.error_generic))
  })

  it('maps "Already registered" to the have-account hint and shows other string details verbatim', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(jsonResponse(409, { detail: 'Already registered' }))
    render(<SignupForm lang="en" />)
    await fill(user)
    await user.click(screen.getByText('give-token'))
    await user.click(submit())
    expect((await screen.findByRole('alert')).textContent).toBe(tr.auth_have_account)

    mockFetch.mockResolvedValueOnce(jsonResponse(400, { detail: 'Boom' }))
    await user.click(submit())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Boom'))
  })

  it('uses the generic error for unknown error bodies and network failures', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(jsonResponse(500, {}))
    render(<SignupForm lang="en" />)
    await fill(user)
    await user.click(screen.getByText('give-token'))
    await user.click(submit())
    expect((await screen.findByRole('alert')).textContent).toBe(tr.error_generic)

    mockFetch.mockRejectedValueOnce(new Error('offline'))
    await user.click(submit())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(tr.error_generic))
  })

  it('shows the captcha error from the widget callback', async () => {
    const user = userEvent.setup()
    render(<SignupForm lang="en" />)
    await user.click(screen.getByText('fail-captcha'))
    expect((await screen.findByRole('alert')).textContent).toBe(tr.turnstile_failed)
  })

  it('renders in Hebrew', () => {
    const he = t('he')
    render(<SignupForm lang="he" />)
    expect(screen.getByLabelText(he.auth_display_name)).toBeTruthy()
    expect(screen.getByRole('button', { name: he.auth_signup })).toBeTruthy()
  })
})

describe('VerifyEmailForm', () => {
  const tr = t('en')

  it('only accepts digits and enables submit at exactly six', async () => {
    const user = userEvent.setup()
    render(<VerifyEmailForm lang="en" email="a@b.io" purpose="signup" />)
    const input = screen.getByLabelText(tr.auth_otp_label) as HTMLInputElement
    const btn = screen.getByRole('button', { name: tr.auth_verify_email }) as HTMLButtonElement
    await user.type(input, '12a3-4')
    expect(input.value).toBe('1234')
    expect(btn.disabled).toBe(true)
    await user.type(input, '56')
    expect(btn.disabled).toBe(false)
  })

  it('signup: verifies, navigates to /{lang} and refreshes the session', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(200, {}))
    render(<VerifyEmailForm lang="el" email="a@b.io" purpose="signup" />)
    await user.type(screen.getByLabelText(t('el').auth_otp_label), '123456')
    await user.click(screen.getByRole('button', { name: t('el').auth_verify_email }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/el'))
    expect(refresh).toHaveBeenCalled()
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ email: 'a@b.io', otp: '123456', purpose: 'signup' })
  })

  it('password reset: continues to the confirm step with the email', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(200, {}))
    render(<VerifyEmailForm lang="en" email="a+b@b.io" purpose="password_reset" />)
    await user.type(screen.getByLabelText(tr.auth_otp_label), '123456')
    await user.click(screen.getByRole('button', { name: tr.auth_verify_email }))
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/auth/password-reset/confirm?email=a%2Bb%40b.io'),
    )
    expect(refresh).not.toHaveBeenCalled()
  })

  it('shows the invalid-code error and does not navigate', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(400, {}))
    render(<VerifyEmailForm lang="en" email="a@b.io" purpose="signup" />)
    await user.type(screen.getByLabelText(tr.auth_otp_label), '000000')
    await user.click(screen.getByRole('button', { name: tr.auth_verify_email }))
    expect((await screen.findByRole('alert')).textContent).toBe(tr.auth_otp_invalid)
    expect(push).not.toHaveBeenCalled()
  })

  it('shows the generic error when the request throws', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))
    render(<VerifyEmailForm lang="en" email="a@b.io" purpose="signup" />)
    await user.type(screen.getByLabelText(tr.auth_otp_label), '000000')
    await user.click(screen.getByRole('button', { name: tr.auth_verify_email }))
    expect((await screen.findByRole('alert')).textContent).toBe(tr.error_generic)
  })

  it('resend posts to resend-otp and confirms; a failing resend stays silent', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(jsonResponse(200, {}))
    render(<VerifyEmailForm lang="en" email="a@b.io" purpose="signup" />)
    expect(screen.getByText(tr.auth_otp_sent('a@b.io'))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: tr.auth_otp_resend }))
    expect(await screen.findByText(tr.auth_otp_resent)).toBeTruthy()
    expect(mockFetch.mock.calls[0][0]).toBe('/api/customer/customer/auth/resend-otp')

    mockFetch.mockRejectedValueOnce(new Error('offline'))
    await user.click(screen.getByRole('button', { name: tr.auth_otp_resend }))
    await waitFor(() => expect(screen.queryByText(tr.auth_otp_resent)).toBeNull())
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('GoogleOAuthButton', () => {
  const tr = t('en')
  const original = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: { href: 'http://localhost/' } })
  })
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: original })
  })

  it('redirects to the Google auth URL returned by the backend', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(200, { google_auth_url: 'https://accounts.google.com/o/oauth2/x' }))
    render(<GoogleOAuthButton tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.auth_google_login }))
    await waitFor(() => expect(window.location.href).toBe('https://accounts.google.com/o/oauth2/x'))
  })

  it('re-enables the button when the authorize call fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse(500, {}))
    render(<GoogleOAuthButton tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.auth_google_login }))
    await waitFor(() =>
      expect((screen.getByRole('button', { name: tr.auth_google_login }) as HTMLButtonElement).disabled).toBe(false),
    )
    expect(window.location.href).toBe('http://localhost/')
  })
})

describe('SessionProvider', () => {
  const anon = { user: null, is_authenticated: false }
  const authed = { user: { id: 1, display_name: 'Mia' }, is_authenticated: true } as never

  function Probe() {
    const s = useSession()
    const set = useSetSession()
    return (
      <div>
        <span data-testid="state">{s.is_authenticated ? 'in' : 'out'}</span>
        <button onClick={() => set(authed)}>login</button>
      </div>
    )
  }

  it('defaults to anonymous without a provider', () => {
    render(<Probe />)
    expect(screen.getByTestId('state').textContent).toBe('out')
  })

  it('allows setting the session and re-syncs when the server passes a new initialSession', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<SessionProvider initialSession={anon}><Probe /></SessionProvider>)
    expect(screen.getByTestId('state').textContent).toBe('out')
    await user.click(screen.getByText('login'))
    expect(screen.getByTestId('state').textContent).toBe('in')

    rerender(<SessionProvider initialSession={{ ...anon }}><Probe /></SessionProvider>)
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('out'))
  })
})
