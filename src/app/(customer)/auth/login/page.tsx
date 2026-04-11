import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { LoginForm } from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign in | Pundo' }

export default async function LoginPage() {
  const lang = await getLangServer()
  const tr = t(lang)

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <h1
          className="text-2xl font-extrabold text-text mb-6"
          style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}
        >
          {tr.auth_login}
        </h1>
        <LoginForm tr={tr} lang={lang} />
      </div>
    </main>
  )
}
