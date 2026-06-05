import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { SignupForm } from '@/components/auth/SignupForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create account | Pundo',
  robots: { index: false, follow: false },
}

// @seo-allow-default — noindex page, no description needed
export default async function SignupPage() {
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY && process.env.NODE_ENV === 'production') {
    console.error('[SignupPage] CRITICAL: NEXT_PUBLIC_TURNSTILE_SITEKEY not configured — all signups blocked')
  }

  const lang = await getLangServer()
  const { auth_signup } = t(lang)

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <h1
          className="text-2xl font-extrabold text-text mb-6 font-heading"
        >
          {auth_signup}
        </h1>
        <SignupForm lang={lang} />
      </div>
    </main>
  )
}
