import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getAuthorizationContext } from '@/lib/oauth-api'
import { OAuthConsentClient } from './OAuthConsentClient'

export const metadata: Metadata = { title: 'Connect | Pundo' }

interface SearchParams {
  client_id?: string
  redirect_uri?: string
  scope?: string
  state?: string
  code_challenge?: string
  code_challenge_method?: string
}

export default async function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const lang = await getLangServer()
  const tr = t(lang)
  const sp = await searchParams

  const {
    client_id = '',
    redirect_uri = '',
    scope = 'mcp:read',
    state = '',
    code_challenge = '',
    code_challenge_method = 'S256',
  } = sp

  // If missing required params, show a simple error
  if (!client_id || !redirect_uri) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-sm text-center">
          <p className="text-sm text-text-muted">{tr.oauth_consent_error}</p>
        </div>
      </main>
    )
  }

  // Build the encoded return URL for login redirect
  const currentUrl = `/oauth/authorize?${new URLSearchParams({
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method,
  }).toString()}`

  // Fetch authorization context (checks cookie auth)
  const contextResult = await getAuthorizationContext(
    { client_id, redirect_uri, scope, state, code_challenge, code_challenge_method },
    lang,
  )

  // Not logged in → redirect to login with next= param
  if (contextResult === 'unauthorized') {
    redirect(`/auth/login?next=${encodeURIComponent(currentUrl)}`)
  }

  // Backend error (unknown client, bad redirect_uri, etc.)
  if (contextResult === null) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-sm text-center">
          <p className="text-sm text-text-muted">{tr.oauth_consent_error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <OAuthConsentClient
        context={contextResult}
        lang={lang}
        tr={tr}
        params={{ client_id, redirect_uri, scope, state, code_challenge, code_challenge_method }}
      />
    </main>
  )
}
