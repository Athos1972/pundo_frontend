import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Next.js mocks ─────────────────────────────────────────────────────────────
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/account',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

// ── SessionProvider ────────────────────────────────────────────────────────────
import { SessionProvider } from '@/components/auth/SessionProvider'
import type { CustomerSession, AuthUser, LinkedAccountsResponse } from '@/types/customer'

const mockUser: AuthUser = {
  id: 1,
  email: 'test@example.com',
  display_name: 'Test User',
  is_verified: true,
  provider: 'email',
  has_password: true,
  created_at: '2024-01-01T00:00:00Z',
}

function withSession(ui: React.ReactElement, session: CustomerSession = { user: mockUser, is_authenticated: true }) {
  return render(<SessionProvider initialSession={session}>{ui}</SessionProvider>)
}

// ── UserMenu ──────────────────────────────────────────────────────────────────
import { UserMenu } from '@/components/layout/UserMenu'

describe('UserMenu — unauthenticated', () => {
  it('shows login button when not authenticated', () => {
    render(
      <SessionProvider initialSession={{ user: null, is_authenticated: false }}>
        <UserMenu lang="en" />
      </SessionProvider>
    )
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/login')
  })

  it('shows German login button for DE', () => {
    render(
      <SessionProvider initialSession={{ user: null, is_authenticated: false }}>
        <UserMenu lang="de" />
      </SessionProvider>
    )
    expect(screen.getByRole('link', { name: /anmelden/i })).toBeInTheDocument()
  })
})

describe('UserMenu — authenticated', () => {
  it('shows user initial in avatar button', () => {
    withSession(<UserMenu lang="en" />)
    const btn = screen.getByRole('button', { name: mockUser.display_name })
    expect(btn).toBeInTheDocument()
    expect(btn.textContent).toContain('T') // first letter of "Test User"
  })

  it('opens dropdown on click', async () => {
    const user = userEvent.setup()
    withSession(<UserMenu lang="en" />)
    await user.click(screen.getByRole('button', { name: mockUser.display_name }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /my account/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument()
  })

  it('closes dropdown on Escape', async () => {
    const user = userEvent.setup()
    withSession(<UserMenu lang="en" />)
    await user.click(screen.getByRole('button', { name: mockUser.display_name }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('calls logout endpoint and redirects on sign out', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    global.fetch = fetchMock
    const user = userEvent.setup()
    withSession(<UserMenu lang="en" />)
    await user.click(screen.getByRole('button', { name: mockUser.display_name }))
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/customer/auth/logout'),
        expect.objectContaining({ method: 'POST' })
      )
    })
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('shows avatar image when avatar_url is set', () => {
    const userWithAvatar: AuthUser = { ...mockUser, avatar_url: 'https://cdn.example.com/avatar.jpg' }
    render(
      <SessionProvider initialSession={{ user: userWithAvatar, is_authenticated: true }}>
        <UserMenu lang="en" />
      </SessionProvider>
    )
    const img = screen.getByAltText(userWithAvatar.display_name)
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/avatar.jpg')
  })

  it('RTL — my account link exists for AR', async () => {
    const user = userEvent.setup()
    withSession(<UserMenu lang="ar" />)
    await user.click(screen.getByRole('button', { name: mockUser.display_name }))
    expect(screen.getByRole('menuitem', { name: /حسابي/i })).toBeInTheDocument()
  })
})

// ── AccountTabs ───────────────────────────────────────────────────────────────
import { AccountTabs } from '@/components/account/AccountTabs'
import type { Review } from '@/types/api'

const mockLinkedAccounts: LinkedAccountsResponse = {
  providers: [{ provider: 'google', linked: false, can_unlink: false }],
  has_password: true,
}

const mockReviews: Review[] = [
  {
    id: 42,
    user_id: 1,
    user_display_name: 'Test User',
    entity_type: 'product',
    entity_id: 5,
    stars: 4,
    comment: 'Great product',
    photos: [],
    is_visible: true,
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
  },
]

describe('AccountTabs', () => {
  it('renders all 4 tabs', () => {
    withSession(
      <AccountTabs
        initialUser={mockUser}
        linkedAccounts={mockLinkedAccounts}
        reviews={[]}
        trustProfile={null}
        lang="en"
      />
    )
    expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /my reviews/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /privacy/i })).toBeInTheDocument()
  })

  it('Profile tab is active by default', () => {
    withSession(
      <AccountTabs
        initialUser={mockUser}
        linkedAccounts={mockLinkedAccounts}
        reviews={[]}
        trustProfile={null}
        lang="en"
      />
    )
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to Security tab on click', async () => {
    const user = userEvent.setup()
    withSession(
      <AccountTabs
        initialUser={mockUser}
        linkedAccounts={mockLinkedAccounts}
        reviews={[]}
        trustProfile={null}
        lang="en"
      />
    )
    await user.click(screen.getByRole('tab', { name: /security/i }))
    expect(screen.getByRole('tab', { name: /security/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(tr_en.account_email_change)).toBeInTheDocument()
  })

  it('shows "no reviews" in Reviews tab when empty', async () => {
    const user = userEvent.setup()
    withSession(
      <AccountTabs
        initialUser={mockUser}
        linkedAccounts={mockLinkedAccounts}
        reviews={[]}
        trustProfile={null}
        lang="en"
      />
    )
    await user.click(screen.getByRole('tab', { name: /my reviews/i }))
    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument()
  })

  it('shows reviews in Reviews tab', async () => {
    const user = userEvent.setup()
    withSession(
      <AccountTabs
        initialUser={mockUser}
        linkedAccounts={mockLinkedAccounts}
        reviews={mockReviews}
        trustProfile={null}
        lang="en"
      />
    )
    await user.click(screen.getByRole('tab', { name: /my reviews/i }))
    expect(screen.getByText('Great product')).toBeInTheDocument()
  })

  it('DE — shows German tab labels', () => {
    withSession(
      <AccountTabs
        initialUser={mockUser}
        linkedAccounts={mockLinkedAccounts}
        reviews={[]}
        trustProfile={null}
        lang="de"
      />
    )
    expect(screen.getByRole('tab', { name: /profil/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /sicherheit/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /datenschutz/i })).toBeInTheDocument()
  })
})

// ── AvatarUploader ────────────────────────────────────────────────────────────
import { AvatarUploader } from '@/components/account/AvatarUploader'
import { t } from '@/lib/translations'
const tr_en = t('en')

describe('AvatarUploader', () => {
  const onUploaded = vi.fn()

  beforeEach(() => {
    onUploaded.mockClear()
    global.fetch = vi.fn()
  })

  it('shows initial letter when no avatar', () => {
    render(<AvatarUploader currentUrl={null} displayName="Alice" tr={tr_en} onUploaded={onUploaded} />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('shows error for oversized file', async () => {
    render(<AvatarUploader currentUrl={null} displayName="Alice" tr={tr_en} onUploaded={onUploaded} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = new File([new Uint8Array(3 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 3 * 1024 * 1024 })
    fireEvent.change(input, { target: { files: [bigFile] } })
    expect(await screen.findByText(tr_en.account_avatar_too_large)).toBeInTheDocument()
    expect(onUploaded).not.toHaveBeenCalled()
  })

  it('shows error for wrong file type', () => {
    render(<AvatarUploader currentUrl={null} displayName="Alice" tr={tr_en} onUploaded={onUploaded} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const gifFile = new File(['gif data'], 'anim.gif', { type: 'image/gif' })
    fireEvent.change(input, { target: { files: [gifFile] } })
    expect(screen.getByText(tr_en.account_avatar_wrong_type)).toBeInTheDocument()
  })

  it('calls onUploaded with URL on successful upload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ avatar_url: 'https://s3.example.com/avatars/1.jpg' }),
    })
    global.fetch = fetchMock

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock')

    render(<AvatarUploader currentUrl={null} displayName="Alice" tr={tr_en} onUploaded={onUploaded} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith('https://s3.example.com/avatars/1.jpg')
    })
  })
})

// ── DeleteAccountModal ────────────────────────────────────────────────────────
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal'

describe('DeleteAccountModal', () => {
  const onConfirmed = vi.fn()
  const onClose = vi.fn()

  beforeEach(() => {
    onConfirmed.mockClear()
    onClose.mockClear()
    global.fetch = vi.fn()
  })

  it('renders warning phase by default', () => {
    render(<DeleteAccountModal lang="en" email="test@example.com" onConfirmed={onConfirmed} onClose={onClose} />)
    expect(screen.getByText(tr_en.account_delete_warning)).toBeInTheDocument()
    expect(screen.getByText(tr_en.account_delete_send_code)).toBeInTheDocument()
  })

  it('closes on Escape key', async () => {
    const user = userEvent.setup()
    render(<DeleteAccountModal lang="en" email="test@example.com" onConfirmed={onConfirmed} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('advances to OTP phase after successful code request', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'otp_sent' }) })
    const user = userEvent.setup()
    render(<DeleteAccountModal lang="en" email="test@example.com" onConfirmed={onConfirmed} onClose={onClose} />)
    await user.click(screen.getByText(tr_en.account_delete_send_code))
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })
  })

  it('shows error for invalid OTP', async () => {
    // First call: request-deletion succeeds; second call: DELETE returns 400
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'otp_sent' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'Invalid OTP' }) })

    const user = userEvent.setup()
    render(<DeleteAccountModal lang="en" email="test@example.com" onConfirmed={onConfirmed} onClose={onClose} />)
    await user.click(screen.getByText(tr_en.account_delete_send_code))
    await waitFor(() => screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), '123456')
    await user.click(screen.getByText(tr_en.account_delete_confirm_btn))
    await waitFor(() => {
      expect(screen.getByText('Invalid OTP')).toBeInTheDocument()
    })
    expect(onConfirmed).not.toHaveBeenCalled()
  })

  it('calls onConfirmed after successful deletion', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'otp_sent' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'account_deleted' }) })

    const user = userEvent.setup()
    render(<DeleteAccountModal lang="en" email="test@example.com" onConfirmed={onConfirmed} onClose={onClose} />)
    await user.click(screen.getByText(tr_en.account_delete_send_code))
    await waitFor(() => screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), '654321')
    await user.click(screen.getByText(tr_en.account_delete_confirm_btn))
    await waitFor(() => {
      expect(onConfirmed).toHaveBeenCalled()
    })
  })
})

// ── Translation completeness ───────────────────────────────────────────────────
import { translations } from '@/lib/translations'
import { LANGS } from '@/lib/lang'

describe('Account translations present in all languages', () => {
  const requiredKeys = [
    'account_tab_profile',
    'account_tab_security',
    'account_tab_reviews',
    'account_tab_danger',
    'account_save',
    'account_delete_title',
    'account_delete_warning',
    'account_delete_confirm_btn',
    'account_avatar_too_large',
    'account_avatar_wrong_type',
    'account_password_mismatch',
    'account_email_updated',
    'account_password_updated',
  ] as const

  for (const lang of LANGS) {
    it(`has all account keys for ${lang}`, () => {
      const tr = translations[lang as keyof typeof translations] as Record<string, unknown>
      for (const key of requiredKeys) {
        expect(tr[key], `Missing key "${key}" in lang "${lang}"`).toBeDefined()
      }
    })
  }
})
