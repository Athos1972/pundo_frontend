import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Verify email | Pundo' }

interface Props {
  searchParams: Promise<{ email?: string; purpose?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { email, purpose } = await searchParams
  if (!email || !purpose) redirect('/auth/signup')

  const resolvedPurpose = purpose === 'password_reset' ? 'password_reset' : 'signup'
  const lang = await getLangServer()
  const tr = t(lang)

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <h1
          className="text-2xl font-extrabold text-text mb-6"
          style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}
        >
          {tr.auth_verify_email}
        </h1>
        <VerifyEmailForm tr={tr} lang={lang} email={email} purpose={resolvedPurpose} />
      </div>
    </main>
  )
}
