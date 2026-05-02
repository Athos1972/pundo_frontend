import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Next.js mocks ──────────────────────────────────────────────────────────────
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

// ── oauth-api mock ─────────────────────────────────────────────────────────────
const mockPostDecision = vi.fn()
const mockDisconnect = vi.fn()
vi.mock('@/lib/oauth-api', () => ({
  postAuthorizationDecision: (...args: unknown[]) => mockPostDecision(...args),
  disconnectOAuthClient: (...args: unknown[]) => mockDisconnect(...args),
}))

// ── Imports under test ─────────────────────────────────────────────────────────
import { OAuthConsentClient } from '../app/(oauth)/oauth/authorize/OAuthConsentClient'
import { McpConnectionsClient } from '../app/(customer)/account/mcp/McpConnectionsClient'
import { t } from '@/lib/translations'
import type { OAuthAuthorizationContext, OAuthConnection } from '@/types/customer'
import { translations } from '@/lib/translations'
import { LANGS } from '@/lib/lang'

const tr_en = t('en')
const tr_de = t('de')

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockContext: OAuthAuthorizationContext = {
  client: { client_id: 'mcp_client_test123', client_name: 'Claude Desktop' },
  scope: 'mcp:read',
  scope_descriptions: [
    {
      scope: 'mcp:read',
      description_de: 'Lesezugriff auf öffentliche Pundo-Daten',
      description_en: 'Read access to public Pundo data',
    },
  ],
  redirect_uri: 'http://localhost:33418/callback',
  state: 'abc123',
  code_challenge: 'challenge_xyz',
  code_challenge_method: 'S256',
}

const mockParams = {
  client_id: 'mcp_client_test123',
  redirect_uri: 'http://localhost:33418/callback',
  scope: 'mcp:read',
  state: 'abc123',
  code_challenge: 'challenge_xyz',
  code_challenge_method: 'S256',
}

const mockConnections: OAuthConnection[] = [
  {
    client_id: 'mcp_client_aaa',
    client_name: 'Claude Desktop',
    scope: 'mcp:read',
    first_authorized_at: '2026-05-01T10:00:00Z',
    last_used_at: '2026-05-02T11:30:00Z',
  },
  {
    client_id: 'mcp_client_bbb',
    client_name: 'Cursor',
    scope: 'mcp:read',
    first_authorized_at: '2026-05-01T12:00:00Z',
    last_used_at: null,
  },
]

// ── OAuthConsentClient tests ──────────────────────────────────────────────────

describe('OAuthConsentClient', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockPostDecision.mockClear()
  })

  it('renders client name in heading', () => {
    render(
      <OAuthConsentClient
        context={mockContext}
        lang="en"
        tr={tr_en}
        params={mockParams}
      />
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Claude Desktop')
  })

  it('renders scope description in English', () => {
    render(
      <OAuthConsentClient
        context={mockContext}
        lang="en"
        tr={tr_en}
        params={mockParams}
      />
    )
    expect(screen.getByText('Read access to public Pundo data')).toBeInTheDocument()
  })

  it('renders scope description in German', () => {
    render(
      <OAuthConsentClient
        context={mockContext}
        lang="de"
        tr={tr_de}
        params={mockParams}
      />
    )
    expect(screen.getByText('Lesezugriff auf öffentliche Pundo-Daten')).toBeInTheDocument()
  })

  it('Allow button triggers POST with decision=allow and follows redirect', async () => {
    mockPostDecision.mockResolvedValue({ redirect_to: 'http://localhost:33418/callback?code=ac_abc&state=abc123' })
    const user = userEvent.setup()
    render(
      <OAuthConsentClient
        context={mockContext}
        lang="en"
        tr={tr_en}
        params={mockParams}
      />
    )
    await user.click(screen.getByTestId('oauth-allow-btn'))
    await waitFor(() => {
      expect(mockPostDecision).toHaveBeenCalledWith(
        expect.objectContaining({ decision: 'allow', client_id: 'mcp_client_test123' }),
        'en',
      )
      expect(mockPush).toHaveBeenCalledWith('http://localhost:33418/callback?code=ac_abc&state=abc123')
    })
  })

  it('Deny button triggers POST with decision=deny', async () => {
    mockPostDecision.mockResolvedValue({ redirect_to: 'http://localhost:33418/callback?error=access_denied&state=abc123' })
    const user = userEvent.setup()
    render(
      <OAuthConsentClient
        context={mockContext}
        lang="en"
        tr={tr_en}
        params={mockParams}
      />
    )
    await user.click(screen.getByTestId('oauth-deny-btn'))
    await waitFor(() => {
      expect(mockPostDecision).toHaveBeenCalledWith(
        expect.objectContaining({ decision: 'deny' }),
        'en',
      )
    })
  })

  it('shows error message when POST fails', async () => {
    mockPostDecision.mockRejectedValue(new Error('network error'))
    const user = userEvent.setup()
    render(
      <OAuthConsentClient
        context={mockContext}
        lang="en"
        tr={tr_en}
        params={mockParams}
      />
    )
    await user.click(screen.getByTestId('oauth-allow-btn'))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(tr_en.oauth_consent_error)
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('buttons are disabled while loading', async () => {
    // Never resolve so we stay in loading state
    mockPostDecision.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(
      <OAuthConsentClient
        context={mockContext}
        lang="en"
        tr={tr_en}
        params={mockParams}
      />
    )
    await user.click(screen.getByTestId('oauth-allow-btn'))
    expect(screen.getByTestId('oauth-allow-btn')).toBeDisabled()
    expect(screen.getByTestId('oauth-deny-btn')).toBeDisabled()
  })
})

// ── McpConnectionsClient tests ────────────────────────────────────────────────

describe('McpConnectionsClient — empty state', () => {
  it('shows intro text when no connections', () => {
    render(<McpConnectionsClient initialConnections={[]} lang="en" tr={tr_en} />)
    expect(screen.getByText(tr_en.mcp_intro)).toBeInTheDocument()
  })

  it('does NOT show connections heading when no connections', () => {
    render(<McpConnectionsClient initialConnections={[]} lang="en" tr={tr_en} />)
    expect(screen.queryByText(tr_en.mcp_connections_heading)).not.toBeInTheDocument()
  })

  it('shows MCP server URL', () => {
    render(<McpConnectionsClient initialConnections={[]} lang="en" tr={tr_en} />)
    expect(screen.getByTestId('mcp-url')).toHaveTextContent('https://mcp.pundo.cy')
  })

  it('shows three tabs: Claude Desktop, Cursor, openclaw', () => {
    render(<McpConnectionsClient initialConnections={[]} lang="en" tr={tr_en} />)
    expect(screen.getByRole('tab', { name: tr_en.mcp_tab_claude })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: tr_en.mcp_tab_cursor })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: tr_en.mcp_tab_openclaw })).toBeInTheDocument()
  })

  it('Claude Desktop tab is selected by default', () => {
    render(<McpConnectionsClient initialConnections={[]} lang="en" tr={tr_en} />)
    expect(screen.getByRole('tab', { name: tr_en.mcp_tab_claude })).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to Cursor tab on click', async () => {
    const user = userEvent.setup()
    render(<McpConnectionsClient initialConnections={[]} lang="en" tr={tr_en} />)
    await user.click(screen.getByRole('tab', { name: tr_en.mcp_tab_cursor }))
    expect(screen.getByRole('tab', { name: tr_en.mcp_tab_cursor })).toHaveAttribute('aria-selected', 'true')
  })

  it('copy button shows "Copied!" after click', async () => {
    // Mock clipboard API via vi.stubGlobal pattern
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
    })
    const user = userEvent.setup()
    render(<McpConnectionsClient initialConnections={[]} lang="en" tr={tr_en} />)
    await user.click(screen.getByTestId('mcp-copy-btn'))
    await waitFor(() => {
      expect(screen.getByTestId('mcp-copy-btn')).toHaveTextContent(tr_en.mcp_url_copied)
    })
    vi.unstubAllGlobals()
  })
})

describe('McpConnectionsClient — with connections', () => {
  beforeEach(() => {
    mockDisconnect.mockClear()
  })

  it('shows connection list items', () => {
    render(<McpConnectionsClient initialConnections={mockConnections} lang="en" tr={tr_en} />)
    const items = screen.getAllByTestId('mcp-connection-item')
    expect(items).toHaveLength(2)
    // Check for client names inside connection list items specifically
    expect(items[0]).toHaveTextContent('Claude Desktop')
    expect(items[1]).toHaveTextContent('Cursor')
  })

  it('shows connections heading', () => {
    render(<McpConnectionsClient initialConnections={mockConnections} lang="en" tr={tr_en} />)
    expect(screen.getByText(tr_en.mcp_connections_heading)).toBeInTheDocument()
  })

  it('shows "never used" for null last_used_at', () => {
    render(<McpConnectionsClient initialConnections={mockConnections} lang="en" tr={tr_en} />)
    expect(screen.getByText(new RegExp(tr_en.mcp_connection_never_used))).toBeInTheDocument()
  })

  it('still shows URL and tabs when connections are present', () => {
    render(<McpConnectionsClient initialConnections={mockConnections} lang="en" tr={tr_en} />)
    expect(screen.getByTestId('mcp-url')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: tr_en.mcp_tab_claude })).toBeInTheDocument()
  })

  it('disconnect button opens confirmation dialog', async () => {
    const user = userEvent.setup()
    render(<McpConnectionsClient initialConnections={mockConnections} lang="en" tr={tr_en} />)
    const disconnectBtns = screen.getAllByTestId('disconnect-btn')
    await user.click(disconnectBtns[0])
    expect(screen.getByTestId('disconnect-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('disconnect-confirm-btn')).toBeInTheDocument()
    expect(screen.getByTestId('disconnect-cancel-btn')).toBeInTheDocument()
  })

  it('cancel button closes dialog without disconnecting', async () => {
    const user = userEvent.setup()
    render(<McpConnectionsClient initialConnections={mockConnections} lang="en" tr={tr_en} />)
    const disconnectBtns = screen.getAllByTestId('disconnect-btn')
    await user.click(disconnectBtns[0])
    await user.click(screen.getByTestId('disconnect-cancel-btn'))
    expect(screen.queryByTestId('disconnect-dialog')).not.toBeInTheDocument()
    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it('confirm disconnect calls API and removes item from list', async () => {
    mockDisconnect.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<McpConnectionsClient initialConnections={mockConnections} lang="en" tr={tr_en} />)
    const disconnectBtns = screen.getAllByTestId('disconnect-btn')
    // Disconnect first item (Claude Desktop)
    await user.click(disconnectBtns[0])
    await user.click(screen.getByTestId('disconnect-confirm-btn'))
    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalledWith('mcp_client_aaa')
      // After disconnect, only 1 connection item remains
      expect(screen.getAllByTestId('mcp-connection-item')).toHaveLength(1)
    })
    // Success message appears
    expect(screen.getByRole('status')).toHaveTextContent(tr_en.mcp_connection_disconnected)
  })

  it('shows error when disconnect API fails', async () => {
    mockDisconnect.mockRejectedValue(new Error('network error'))
    const user = userEvent.setup()
    render(<McpConnectionsClient initialConnections={mockConnections} lang="en" tr={tr_en} />)
    const disconnectBtns = screen.getAllByTestId('disconnect-btn')
    await user.click(disconnectBtns[0])
    await user.click(screen.getByTestId('disconnect-confirm-btn'))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    // Both connection items should still be in list
    expect(screen.getAllByTestId('mcp-connection-item')).toHaveLength(2)
  })
})

// ── Translation completeness ───────────────────────────────────────────────────

describe('MCP translations present in all languages', () => {
  const requiredKeys = [
    'mcp_page_title',
    'mcp_heading',
    'mcp_intro',
    'mcp_url_label',
    'mcp_url_copy',
    'mcp_url_copied',
    'mcp_setup_heading',
    'mcp_tab_claude',
    'mcp_tab_cursor',
    'mcp_tab_openclaw',
    'mcp_snippet_hint',
    'mcp_connections_heading',
    'mcp_connection_last_used',
    'mcp_connection_never_used',
    'mcp_connection_disconnect',
    'mcp_connection_disconnect_confirm',
    'mcp_connection_disconnect_yes',
    'mcp_connection_disconnect_no',
    'mcp_connection_disconnected',
    'mcp_connection_scope_badge',
    'mcp_connections_empty',
    'mcp_error_load',
    'oauth_consent_title',
    'oauth_consent_scope_heading',
    'oauth_consent_allow',
    'oauth_consent_deny',
    'oauth_consent_loading',
    'oauth_consent_error',
  ] as const

  for (const lang of LANGS) {
    it(`has all MCP keys for ${lang}`, () => {
      const tr = translations[lang as keyof typeof translations] as Record<string, unknown>
      for (const key of requiredKeys) {
        expect(tr[key], `Missing key "${key}" in lang "${lang}"`).toBeDefined()
      }
    })
  }

  it('oauth_consent_requesting is a function in all languages', () => {
    for (const lang of LANGS) {
      const tr = t(lang)
      expect(typeof tr.oauth_consent_requesting).toBe('function')
      const result = tr.oauth_consent_requesting('TestClient')
      expect(result).toContain('TestClient')
    }
  })
})
