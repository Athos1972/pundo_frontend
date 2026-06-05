import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getCustomerSession } from '@/lib/customer-api'
import { getOAuthConnections } from '@/lib/oauth-api'
import { BackButton } from '@/components/ui/BackButton'
import { McpConnectionsClient, type McpClientTr } from './McpConnectionsClient'

export const metadata: Metadata = {
  title: 'AI Agent Connections | Pundo',
  robots: { index: false, follow: false },
}

// @seo-allow-default — noindex page, no description needed
export default async function McpPage() {
  const lang = await getLangServer()
  const tr = t(lang)
  const session = await getCustomerSession(lang)

  if (!session.is_authenticated || !session.user) {
    redirect('/auth/login?next=/account/mcp')
  }

  const connectionsData = await getOAuthConnections(lang)

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <BackButton />

        <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
          <h1 className="text-xl font-extrabold text-text mb-1 font-heading">
            {tr.mcp_heading}
          </h1>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          {connectionsData === null ? (
            <p className="text-sm text-red-600">{tr.mcp_error_load}</p>
          ) : (
            <McpConnectionsClient
              initialConnections={connectionsData.connections}
              lang={lang}
              tr={{
                mcp_intro: tr.mcp_intro,
                mcp_url_copy: tr.mcp_url_copy,
                mcp_url_copied: tr.mcp_url_copied,
                mcp_setup_heading: tr.mcp_setup_heading,
                mcp_snippet_hint: tr.mcp_snippet_hint,
                mcp_tab_claude: tr.mcp_tab_claude,
                mcp_tab_cursor: tr.mcp_tab_cursor,
                mcp_tab_openclaw: tr.mcp_tab_openclaw,
                mcp_connections_heading: tr.mcp_connections_heading,
                mcp_connection_last_used: tr.mcp_connection_last_used,
                mcp_connection_never_used: tr.mcp_connection_never_used,
                mcp_connection_disconnect: tr.mcp_connection_disconnect,
                mcp_connection_disconnect_confirm: tr.mcp_connection_disconnect_confirm,
                mcp_connection_disconnect_yes: tr.mcp_connection_disconnect_yes,
                mcp_connection_disconnect_no: tr.mcp_connection_disconnect_no,
                mcp_connection_disconnected: tr.mcp_connection_disconnected,
                mcp_connection_scope_badge: tr.mcp_connection_scope_badge,
                mcp_error_load: tr.mcp_error_load,
              } satisfies McpClientTr}
            />
          )}
        </div>
      </div>
    </main>
  )
}
