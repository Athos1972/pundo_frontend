// @seo-allow-default — noindex/nofollow covered by src/app/(customer)/auth/layout.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getLangFromCookie } from '@/lib/lang'

// Google OAuth redirects here after the backend sets the customer_token cookie.
// We just refresh and forward to home (or show an error).
export default function AuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()
  const success = params.get('success')
  const error = params.get('error')

  useEffect(() => {
    if (success === '1') {
      router.replace(`/${getLangFromCookie()}`)
      router.refresh()
    } else {
      // Error: redirect to login with query param so page can show a message
      router.replace(`/auth/login?error=${error ?? 'oauth_failed'}`)
    }
  }, [success, error, router])

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </main>
  )
}
