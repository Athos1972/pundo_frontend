'use client'

import { useState, useTransition, useEffect } from 'react'
import { getLangFromCookie, DEFAULT_LANG } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'

export default function AdminLoginPage() {
  const [tr, setTr] = useState(() => tSysAdmin(DEFAULT_LANG))
  useEffect(() => { setTr(tSysAdmin(getLangFromCookie())) }, [])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (res.status === 401 || res.status === 403) {
          setError(tr.invalid_credentials)
          return
        }
        if (!res.ok) {
          setError(tr.error_generic)
          return
        }
        // Hard navigation bypasses the Next.js router cache entirely.
        // router.push would hit the cached redirect (→ /admin/login) that was
        // stored before the cookie existed; a full reload always sees the cookie.
        window.location.href = '/admin/dashboard'
      } catch {
        setError(tr.error_backend)
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-xl font-semibold text-gray-900">{tr.login_title}</h1>
            <p className="text-sm text-gray-500">{tr.login_subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                {tr.email}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                disabled={isPending}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-transparent
                  disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                {tr.password}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                disabled={isPending}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-transparent
                  disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50
                text-white font-medium text-sm py-2 rounded-lg transition-colors"
            >
              {isPending ? tr.signing_in : tr.sign_in}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
