import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getCustomerSession } from '@/lib/customer-api'
import { getOAuthConnections } from '@/lib/oauth-api'
import { BackButton } from '@/components/ui/BackButton'
import { McpConnectionsClient } from './McpConnectionsClient'

export const metadata: Metadata = { title: 'AI Agent Connections | Pundo' }

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
              tr={tr}
            />
          )}
        </div>
      </div>
    </main>
  )
}
