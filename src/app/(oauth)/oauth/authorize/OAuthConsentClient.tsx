'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OAuthAuthorizationContext } from '@/types/customer'
import type { Translations } from '@/lib/translations'
import { postAuthorizationDecision } from '@/lib/oauth-api'

interface Props {
  context: OAuthAuthorizationContext
  lang: string
  tr: Translations
  // Raw query params re-passed so we can POST them back
  params: {
    client_id: string
    redirect_uri: string
    scope: string
    state: string
    code_challenge: string
    code_challenge_method: string
  }
}

export function OAuthConsentClient({ context, lang, tr, params }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDecision(decision: 'allow' | 'deny') {
    setLoading(true)
    setError(null)
    try {
      const result = await postAuthorizationDecision(
        {
          decision,
          client_id: params.client_id,
          redirect_uri: params.redirect_uri,
          scope: params.scope,
          state: params.state,
          code_challenge: params.code_challenge,
          code_challenge_method: params.code_challenge_method,
        },
        lang,
      )
      // Follow the redirect URL returned by the backend
      router.push(result.redirect_to)
    } catch {
      setError(tr.oauth_consent_error)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-sm">
      {/* Pundo Logo / Brand indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm select-none">
          P
        </div>
        <span className="font-bold text-text text-sm">Pundo</span>
      </div>

      {/* Client request heading */}
      <h1 className="text-lg font-extrabold text-text mb-1 font-heading">
        {tr.oauth_consent_requesting(context.client.client_name)}
      </h1>

      {/* Scope list */}
      <div className="mt-4 mb-6">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
          {tr.oauth_consent_scope_heading}
        </p>
        <ul className="space-y-2">
          {context.scope_descriptions.map((sd) => (
            <li key={sd.scope} className="flex items-start gap-2 text-sm text-text">
              <span className="mt-0.5 text-brand" aria-hidden="true">&#10003;</span>
              <span>
                {lang === 'de' ? sd.description_de : sd.description_en}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm text-red-600 mb-4">
          {error}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleDecision('allow')}
          className="w-full py-2.5 px-4 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          data-testid="oauth-allow-btn"
        >
          {loading ? tr.oauth_consent_loading : tr.oauth_consent_allow}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleDecision('deny')}
          className="w-full py-2.5 px-4 rounded-xl border border-border text-text font-semibold text-sm hover:bg-bg transition-colors disabled:opacity-60"
          data-testid="oauth-deny-btn"
        >
          {tr.oauth_consent_deny}
        </button>
      </div>
    </div>
  )
}
