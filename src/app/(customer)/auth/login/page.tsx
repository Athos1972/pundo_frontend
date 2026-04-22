import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { LoginForm } from '@/components/auth/LoginForm'
// t() used for heading string only — tr object not passed to client component
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign in | Pundo' }

export default async function LoginPage() {
  const lang = await getLangServer()
  const { auth_login } = t(lang)

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <h1
          className="text-2xl font-extrabold text-text mb-6 font-heading"
        >
          {auth_login}
        </h1>
        <LoginForm lang={lang} />
      </div>
    </main>
  )
}
