import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { SignupForm } from '@/components/auth/SignupForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Create account | Pundo' }

export default async function SignupPage() {
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
