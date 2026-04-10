'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getLangFromCookie } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { FormField } from '@/components/shop-admin/FormField'

interface FormErrors {
  email?: string
  password?: string
  name?: string
  shop_name?: string
  shop_address?: string
  general?: string
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.get('email')) errors.email = 'required'
  if (!data.get('password')) errors.password = 'required'
  if (!data.get('name')) errors.name = 'required'
  if (!data.get('shop_name')) errors.shop_name = 'required'
  if (!data.get('shop_address')) errors.shop_address = 'required'
  return errors
}

export default function RegisterPage() {
  const lang = getLangFromCookie()
  const tr = tAdmin(lang)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FormErrors>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const validationErrors = validate(data)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})

    startTransition(async () => {
      try {
        const res = await fetch('/api/shop-admin/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.get('email'),
            password: data.get('password'),
            name: data.get('name'),
            shop_name: data.get('shop_name'),
            shop_address: data.get('shop_address'),
          }),
        })
        if (res.ok) {
          router.push('/shop-admin/register/check-email')
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
          <h1 className="text-2xl font-bold text-gray-900">{tr.register_title}</h1>
          <p className="text-sm text-gray-500 mt-1">{tr.register_subtitle}</p>
        </div>

        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700" role="alert">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormField
            label={tr.name}
            name="name"
            type="text"
            autoComplete="name"
            required
            error={errors.name ? tr.required : undefined}
          />
          <FormField
            label={tr.email}
            name="email"
            type="email"
            autoComplete="email"
            required
            error={errors.email ? tr.required : undefined}
          />
          <FormField
            label={tr.password}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            error={errors.password ? tr.required : undefined}
          />
          <FormField
            label={tr.shop_name}
            name="shop_name"
            type="text"
            required
            error={errors.shop_name ? tr.required : undefined}
          />
          <FormField
            label={tr.shop_address}
            name="shop_address"
            type="text"
            required
            error={errors.shop_address ? tr.required : undefined}
          />

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-accent text-white py-2.5 rounded-lg font-semibold text-sm
              hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isPending ? '…' : tr.register_btn}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500">
          {tr.already_account}{' '}
          <Link href="/shop-admin/login" className="text-accent hover:underline font-medium">
            {tr.login_btn}
          </Link>
        </p>
      </div>
    </div>
  )
}
