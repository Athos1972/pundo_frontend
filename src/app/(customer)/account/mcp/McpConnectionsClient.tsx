'use client'

import { useState } from 'react'
import type { OAuthConnection } from '@/types/customer'
import { disconnectOAuthClient } from '@/lib/oauth-api'

export interface McpClientTr {
  mcp_intro: string
  mcp_url_copy: string
  mcp_url_copied: string
  mcp_setup_heading: string
  mcp_snippet_hint: string
  mcp_tab_claude: string
  mcp_tab_cursor: string
  mcp_tab_openclaw: string
  mcp_connections_heading: string
  mcp_connection_last_used: string
  mcp_connection_never_used: string
  mcp_connection_disconnect: string
  mcp_connection_disconnect_confirm: string
  mcp_connection_disconnect_yes: string
  mcp_connection_disconnect_no: string
  mcp_connection_disconnected: string
  mcp_connection_scope_badge: string
  mcp_error_load: string
}

interface Props {
  initialConnections: OAuthConnection[]
  lang: string
  tr: McpClientTr
}

const MCP_SERVER_URL = 'https://mcp.pundo.cy'

const CLAUDE_SNIPPET = JSON.stringify(
  {
    mcpServers: {
      pundo: {
        url: MCP_SERVER_URL,
        transport: 'streamable-http',
      },
    },
  },
  null,
  2,
)

const CURSOR_SNIPPET = JSON.stringify(
  {
    mcpServers: {
      pundo: {
        url: MCP_SERVER_URL,
      },
    },
  },
  null,
  2,
)

const OPENCLAW_SNIPPET = JSON.stringify(
  {
    servers: [
      {
        name: 'pundo',
        url: MCP_SERVER_URL,
      },
    ],
  },
  null,
  2,
)

type ClientTab = 'claude' | 'cursor' | 'openclaw'

function formatDate(iso: string | null, tr: McpClientTr, lang: string): string {
  if (!iso) return tr.mcp_connection_never_used
  try {
    return new Date(iso).toLocaleDateString(lang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

interface DisconnectDialogProps {
  clientName: string
  tr: McpClientTr
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function DisconnectDialog({ clientName, tr, onConfirm, onCancel, loading }: DisconnectDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      data-testid="disconnect-dialog"
    >
      <div className="w-full max-w-xs bg-surface border border-border rounded-2xl p-5 shadow-lg">
        <p className="text-sm font-semibold text-text mb-4">
          {tr.mcp_connection_disconnect_confirm}
        </p>
        <p className="text-xs text-text-muted mb-5">{clientName}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
            data-testid="disconnect-confirm-btn"
          >
            {tr.mcp_connection_disconnect_yes}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-xl border border-border text-text text-sm font-semibold hover:bg-bg transition-colors disabled:opacity-60"
            data-testid="disconnect-cancel-btn"
          >
            {tr.mcp_connection_disconnect_no}
          </button>
        </div>
      </div>
    </div>
  )
}

export function McpConnectionsClient({ initialConnections, lang, tr }: Props) {
  const [connections, setConnections] = useState<OAuthConnection[]>(initialConnections)
  const [activeTab, setActiveTab] = useState<ClientTab>('claude')
  const [copied, setCopied] = useState(false)
  const [disconnectTarget, setDisconnectTarget] = useState<OAuthConnection | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(MCP_SERVER_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: noop (clipboard API may not be available in all environments)
    }
  }

  async function handleDisconnectConfirm() {
    if (!disconnectTarget) return
    setDisconnecting(true)
    setDisconnectError(null)
    try {
      await disconnectOAuthClient(disconnectTarget.client_id)
      setConnections((prev) => prev.filter((c) => c.client_id !== disconnectTarget.client_id))
      setSuccessMsg(tr.mcp_connection_disconnected)
      setDisconnectTarget(null)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setDisconnectError(tr.mcp_error_load)
    } finally {
      setDisconnecting(false)
    }
  }

  const snippets: Record<ClientTab, string> = {
    claude: CLAUDE_SNIPPET,
    cursor: CURSOR_SNIPPET,
    openclaw: OPENCLAW_SNIPPET,
  }

  const tabs: { id: ClientTab; label: string }[] = [
    { id: 'claude', label: tr.mcp_tab_claude },
    { id: 'cursor', label: tr.mcp_tab_cursor },
    { id: 'openclaw', label: tr.mcp_tab_openclaw },
  ]

  return (
    <div>
      {/* Active connections (shown if any) */}
      {connections.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-bold text-text mb-3">{tr.mcp_connections_heading}</h2>
          {successMsg && (
            <p role="status" className="text-sm text-green-600 mb-3">{successMsg}</p>
          )}
          {disconnectError && (
            <p role="alert" className="text-sm text-red-600 mb-3">{disconnectError}</p>
          )}
          <ul className="space-y-3">
            {connections.map((conn) => (
              <li
                key={conn.client_id}
                className="bg-surface border border-border rounded-xl p-4 flex items-start justify-between gap-3"
                data-testid="mcp-connection-item"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text truncate">{conn.client_name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium me-2">
                      {tr.mcp_connection_scope_badge}
                    </span>
                    {tr.mcp_connection_last_used}:{' '}
                    {formatDate(conn.last_used_at, tr, lang)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDisconnectTarget(conn)}
                  className="shrink-0 text-xs text-red-600 hover:text-red-700 font-medium whitespace-nowrap py-1 px-2 rounded-lg hover:bg-red-50 transition-colors"
                  data-testid="disconnect-btn"
                >
                  {tr.mcp_connection_disconnect}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* MCP URL section */}
      <section className="mb-6">
        <p className="text-sm text-text-muted mb-3">{tr.mcp_intro}</p>

        <div className="flex items-center gap-2 bg-surface border border-border rounded-xl p-3">
          <p className="text-xs font-mono text-text flex-1 truncate select-all" data-testid="mcp-url">
            {MCP_SERVER_URL}
          </p>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="shrink-0 text-xs font-medium text-brand hover:opacity-80 transition-opacity py-1 px-2 rounded-lg border border-border"
            data-testid="mcp-copy-btn"
          >
            {copied ? tr.mcp_url_copied : tr.mcp_url_copy}
          </button>
        </div>
      </section>

      {/* Setup instructions with tabs */}
      <section>
        <h2 className="text-base font-bold text-text mb-3">{tr.mcp_setup_heading}</h2>

        {/* Tab navigation */}
        <nav
          role="tablist"
          aria-label="MCP client tabs"
          className="flex gap-1 mb-3 bg-bg p-1 rounded-xl border border-border overflow-x-auto"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`mcp-panel-${tab.id}`}
              id={`mcp-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab panels */}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`mcp-panel-${tab.id}`}
            aria-labelledby={`mcp-tab-${tab.id}`}
            hidden={activeTab !== tab.id}
          >
            <pre className="text-xs font-mono bg-surface border border-border rounded-xl p-4 overflow-x-auto text-text">
              {snippets[tab.id]}
            </pre>
          </div>
        ))}

        <p className="text-xs text-text-muted mt-3">{tr.mcp_snippet_hint}</p>
      </section>

      {/* Disconnect confirmation dialog */}
      {disconnectTarget && (
        <DisconnectDialog
          clientName={disconnectTarget.client_name}
          tr={tr}
          onConfirm={handleDisconnectConfirm}
          onCancel={() => {
            setDisconnectTarget(null)
            setDisconnectError(null)
          }}
          loading={disconnecting}
        />
      )}
    </div>
  )
}
