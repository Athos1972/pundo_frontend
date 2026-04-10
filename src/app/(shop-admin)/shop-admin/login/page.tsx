'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getLangFromCookie } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { FormField } from '@/components/shop-admin/FormField'
import { Suspense } from 'react'

function LoginForm() {
  const lang = getLangFromCookie()
  const tr = tAdmin(lang)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/shop-admin/dashboard'

  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})

  useEffect(() => { document.body.dataset.hydrated = 'true' }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = data.get('email') as string
    const password = data.get('password') as string

    const newErrors: typeof errors = {}
    if (!email) newErrors.email = tr.required
    if (!password) newErrors.password = tr.required
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})

    startTransition(async () => {
      try {
        const res = await fetch('/api/shop-admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (res.ok) {
          const body = await res.json()
          if (body.status === 'pending') {
            router.push('/shop-admin/pending-approval')
          } else {
            router.push(nextPath)
          }
        } else {
          const body = await res.json().catch(() => ({}))
          setErrors({ general: body?.detail ?? tr.error_generic })
        }
      } catch {
        setErrors({ general: tr.error_generic })
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tr.login_title}</h1>
          <p className="text-sm text-gray-500 mt-1">{tr.login_subtitle}</p>
        </div>

        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700" role="alert">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormField
            label={tr.email}
            name="email"
            type="email"
            autoComplete="email"
            required
            error={errors.email}
          />
          <FormField
            label={tr.password}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            error={errors.password}
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-accent text-white py-2.5 rounded-lg font-semibold text-sm
              hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isPending ? '…' : tr.login_btn}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500">
          {tr.no_account}{' '}
          <Link href="/shop-admin/register" className="text-accent hover:underline font-medium">
            {tr.register_btn}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
